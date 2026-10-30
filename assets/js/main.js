/* Uncommonly Well — interactions and motion
   Everything works without this file; it adds smoothness, motion and form handling. */

(() => {
  'use strict';

  /* ------------------------------------------------------------------
     Settings. Connect forms here when you're ready (see README).
     mode: 'preview'  → forms validate and confirm, but nothing is sent
           'sheet'    → posts to the Google Sheet script (paste its Web app URL into `endpoint`)
           'netlify'  → posts to Netlify Forms
           'endpoint' → posts JSON to `endpoint` (e.g. Formspree)
  ------------------------------------------------------------------ */
  const CONFIG = {
    forms: { mode: 'sheet', endpoint: 'https://script.google.com/macros/s/AKfycbwSoU2QTHoM9j0BiSTqLoPmwpfGmlVKhtMGUjFytgbCJjs8a2aUo9O0bAeMop9ohS7B/exec' },
    // Your Amway MyShop link. Until it's set, shop buttons read "Shop opening soon".
    shopUrl: 'https://www.amway.com/myshop/uncommonlywell',
    // Launch days (year-month-day). From that day on, "Opening…"/"launching…" wording switches to its after-launch
    // version by itself: anything marked data-until="membership" hides, anything marked data-from="membership" shows.
    launches: { health: '2026-11-02', membership: '2026-11-15' },
  };

  const html = document.documentElement;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const hasGsap = !!(window.gsap && window.ScrollTrigger);
  const motion = hasGsap && !reduced;
  if (reduced) html.classList.add('reduced');
  let menuOpen = false;

  /* ---------- Images: fade in once decoded ---------- */
  $$('.ph img').forEach((img) => {
    const done = () => img.classList.add('is-loaded');
    if (img.complete && img.naturalWidth) done();
    else img.addEventListener('load', done, { once: true });
  });

  $$('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });
  const launched = (key) => { const d = CONFIG.launches[key]; return !!d && new Date() >= new Date(`${d}T00:00:00`); };
  const applyLaunches = (root = document) => {
    $$('[data-until]', root).forEach((el) => { el.hidden = launched(el.dataset.until); });
    $$('[data-from]', root).forEach((el) => { el.hidden = !launched(el.dataset.from); });
  };
  applyLaunches();

  /* ---------- Smooth scroll (Lenis) ---------- */
  let lenis = null;
  if (motion && window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.1, wheelMultiplier: 0.9 });
    gsap.registerPlugin(ScrollTrigger);
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  } else if (hasGsap) {
    gsap.registerPlugin(ScrollTrigger);
  }
  const lockScroll = (on) => {
    if (lenis) on ? lenis.stop() : lenis.start();
    document.body.style.overflow = on ? 'hidden' : '';
  };

  // Shared by the message drawer and the quiz: open with a soft entrance, close after it plays out.
  function showDialog(dlg) {
    // Lenis pauses while a dialog is open and would otherwise swallow wheel and touch scrolling inside it.
    dlg.setAttribute('data-lenis-prevent', '');
    dlg.showModal();
    lockScroll(true);
    requestAnimationFrame(() => requestAnimationFrame(() => dlg.classList.add('is-in')));
  }
  function hideDialog(dlg, then) {
    dlg.classList.remove('is-in');
    const finish = () => { dlg.close(); if (!document.querySelector('dialog[open]')) lockScroll(false); if (then) then(); };
    reduced ? finish() : setTimeout(finish, 420);
  }
  const glideTo = (sel) => {
    const t = $(sel);
    if (!t) return;
    if (lenis) lenis.scrollTo(t, { duration: 1.4 }); else t.scrollIntoView();
  };

  // In-page links: glide, then move focus for keyboard and screen reader users.
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    if (a.hasAttribute('data-open-quiz')) { e.preventDefault(); return; }
    const id = a.getAttribute('href');
    const target = id === '#top' ? document.body : $(id);
    if (!target) return;
    e.preventDefault();
    if (menuOpen) closeMenu(false);
    const land = () => {
      const focusEl = id === '#top' ? $('#main') : target;
      if (!focusEl.hasAttribute('tabindex')) focusEl.setAttribute('tabindex', '-1');
      focusEl.focus({ preventScroll: true });
    };
    const offset = target.matches && target.matches('.product-group') ? -(($('[data-header]') || {}).offsetHeight || 0) - 16 : 0;
    // Pages that build their content after load (like the Nutrition groups) can outgrow Lenis's last measurement
    if (lenis) { if (lenis.resize) lenis.resize(); lenis.scrollTo(id === '#top' ? 0 : target, { duration: 1.4, offset, onComplete: land }); }
    else { (id === '#top' ? window.scrollTo({ top: 0 }) : target.scrollIntoView()); land(); }
    history.replaceState(null, '', id === '#top' ? location.pathname : id);
  });

  /* ---------- Header: solid past the hero, hides on the way down ---------- */
  const header = $('[data-header]');
  const hero = $('.hero');
  let lastY = window.scrollY;
  let ticking = false;
  const updateHeader = () => {
    ticking = false;
    if (menuOpen) return;
    const y = window.scrollY;
    const heroEnd = (hero ? hero.offsetHeight : 0) - header.offsetHeight;
    header.classList.toggle('is-solid', y > heroEnd);
    const goingDown = y > lastY;
    header.classList.toggle('is-hidden', goingDown && y > heroEnd + 200 && !header.contains(document.activeElement));
    lastY = y;
  };
  window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(updateHeader); } }, { passive: true });
  header.addEventListener('focusin', () => header.classList.remove('is-hidden'));
  updateHeader();

  // The membership banner: closing it hides it for this visitor (bump the key to show a new message to everyone).
  const promoClose = $('[data-promo-close]');
  if (promoClose) promoClose.addEventListener('click', () => {
    html.classList.remove('has-promo');
    try { localStorage.setItem('uw-promo-closed', 'membership-1'); } catch { /* storage unavailable */ }
    $('.brand', header).focus({ preventScroll: true });
    if (window.ScrollTrigger) ScrollTrigger.refresh();
  });

  // Mark the nav item for the section in view.
  const navLinks = $$('.nav a');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        navLinks.forEach((l) => l.setAttribute('aria-current', l.getAttribute('href') === '#' + en.target.id ? 'true' : 'false'));
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    ['shelves', 'gather', 'note'].forEach((id) => { const s = $('#' + id); if (s) io.observe(s); });
  }

  /* ---------- "The Shelves" dropdown (desktop header) ----------
     Pointing at it opens the card, with a short delay before closing so it doesn't flicker; the chevron opens it
     by click or keyboard. Esc, a click elsewhere, or focus moving away closes it. */
  $$('[data-nav-drop]').forEach((drop) => {
    const btn = $('.nav__toggle', drop);
    const panel = $('.nav__panel', drop);
    let timer = 0;
    const set = (open) => {
      clearTimeout(timer);
      drop.classList.toggle('is-open', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      panel.hidden = !open;
    };
    drop.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') set(true); });
    drop.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') timer = setTimeout(() => set(false), 220); });
    btn.addEventListener('click', () => set(btn.getAttribute('aria-expanded') !== 'true'));
    drop.addEventListener('keydown', (e) => { if (e.key === 'Escape' && drop.classList.contains('is-open')) { set(false); btn.focus(); } });
    drop.addEventListener('focusout', (e) => { if (!drop.contains(e.relatedTarget)) set(false); });
    document.addEventListener('click', (e) => { if (!drop.contains(e.target)) set(false); });
    $$('a', panel).forEach((a) => a.addEventListener('click', () => set(false)));
  });

  /* ---------- Mobile menu ---------- */
  const menu = $('[data-menu]');
  const toggle = $('[data-menu-toggle]');
  function openMenu() {
    menuOpen = true;
    menu.hidden = false;
    toggle.setAttribute('aria-expanded', 'true');
    toggle.querySelector('.menu-toggle__label').textContent = 'Close';
    document.body.classList.add('menu-open');
    header.classList.remove('is-hidden');
    lockScroll(true);
    requestAnimationFrame(() => menu.classList.add('is-open'));
    if (motion) {
      gsap.fromTo($$('.menu__list a', menu), { yPercent: 110 }, { yPercent: 0, duration: 1, ease: 'expo.out', stagger: 0.06, delay: 0.25 });
      gsap.fromTo($('.menu__foot', menu), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.6, delay: 0.55 });
    }
    setTimeout(() => $('.menu__list a', menu).focus({ preventScroll: true }), 50);
  }
  function closeMenu(returnFocus = true) {
    menuOpen = false;
    toggle.setAttribute('aria-expanded', 'false');
    toggle.querySelector('.menu-toggle__label').textContent = 'Menu';
    menu.classList.remove('is-open');
    document.body.classList.remove('menu-open');
    lockScroll(false);
    setTimeout(() => { if (!menuOpen) menu.hidden = true; }, reduced ? 0 : 700);
    if (returnFocus) toggle.focus();
    updateHeader();
  }
  toggle.addEventListener('click', () => (menuOpen ? closeMenu() : openMenu()));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && menuOpen) closeMenu(); });
  // Keep Tab inside the open menu (toggle + menu contents).
  document.addEventListener('keydown', (e) => {
    if (!menuOpen || e.key !== 'Tab') return;
    const items = [toggle, ...$$('a, button', menu)];
    const i = items.indexOf(document.activeElement);
    if (e.shiftKey && i <= 0) { e.preventDefault(); items[items.length - 1].focus(); }
    else if (!e.shiftKey && i === items.length - 1) { e.preventDefault(); items[0].focus(); }
  });
  window.matchMedia('(min-width: 1000px)').addEventListener('change', (m) => { if (m.matches && menuOpen) closeMenu(false); });

  /* ---------- Message drawer ---------- */
  const drawer = $('[data-drawer]');
  const mform = $('[data-form="message"]', drawer);
  const done = $('[data-done]', drawer);
  let opener = null;
  let submitLabel = 'Send message';

  // Gift questions show only when the topic is a gift or a wishlist. "Which gift?" lists the gifts from products.js;
  // each topic shows its own questions (the other group is disabled, so it's neither sent nor checked), and the
  // budget question is just for a custom gift.
  const GIFTS = window.UW_GIFTS || [];
  const giftFields = $('[data-gift-fields]', mform);
  const giftSel = $('#m-gift');
  if (giftSel) GIFTS.forEach((g) => giftSel.add(new Option(g.name)));
  function syncGift() {
    if (!giftFields) return;
    const topic = $('#m-topic').value;
    const gift = topic === 'A custom gift', wish = topic === 'Wishlist a gift';
    giftFields.hidden = giftFields.disabled = !(gift || wish);
    $$('[data-gift-only]', giftFields).forEach((g) => { g.hidden = g.disabled = !gift; });
    $$('[data-wish-only]', giftFields).forEach((g) => { g.hidden = g.disabled = !wish; });
    $('[data-gift-budget]', giftFields).hidden = giftSel.value !== 'Something custom';
  }
  $('#m-topic').addEventListener('change', syncGift);
  if (giftSel) giftSel.addEventListener('change', syncGift);

  // Gathering questions show only when the topic is "Gatherings". "Which gathering?" lists the upcoming events.
  const eventDay = (e) => { const [y, m, d] = e.date.split('-').map(Number); return new Date(y, m - 1, d); };
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const EVENTS = (window.UW_EVENTS || []).filter((e) => eventDay(e) >= today).sort((a, b) => eventDay(a) - eventDay(b));
  // With nothing scheduled, the "coming up" wording (Gather hero, homepage line) gives way to its no-events version.
  $$('[data-if-events]').forEach((el) => { el.hidden = !EVENTS.length; });
  $$('[data-no-events]').forEach((el) => { el.hidden = !!EVENTS.length; });
  const gatherFields = $('[data-gather-fields]', mform);
  const eventSel = $('#m-event');
  const shortDay = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
  // Each choice sends the gathering's name and date, so the RSVP says exactly which one.
  const eventLabel = (e) => `${e.title} (${shortDay.format(eventDay(e))})`;
  if (eventSel) EVENTS.forEach((e) => eventSel.add(new Option(eventLabel(e), eventLabel(e))));
  function syncGather() {
    if (!gatherFields) return;
    // Which gathering / how many only make sense when there's something to save a spot for.
    gatherFields.hidden = gatherFields.disabled = $('#m-topic').value !== 'Gatherings' || !EVENTS.length;
  }
  $('#m-topic').addEventListener('change', syncGather);

  // The message box's label and hint follow the topic; any other topic keeps the wording in the page.
  const MSG_PROMPTS = {
    'Just saying hello': ['Anything you’d like me to know', 'Say hi, ask anything, or tell me a little about you…'],
    'A product question': ['Your question', 'Which product, and what you’d like to know…'],
    'An order or a return': ['About your order', 'What you ordered, about when, and what’s going on…'],
    'A custom gift': ['Tell me about them', 'What they love, what they’re into, anything to avoid…'],
    'Wishlist a gift': ['Anything I should know for the hint?', 'Keep it a surprise? A good time to reach them?'],
    'Gatherings': EVENTS.length
      ? ['Anything I should know?', 'Bringing a friend, food allergies, questions about the event…']
      : ['What would you love to do?', 'The kind of gathering you’d come to, good days and times, any questions…'],
    'Host a gathering': ['Tell me about your gathering', 'Who you’d invite, a few dates that work, your place or online…'],
    'Personalized health': ['Anything you’d like me to know', 'What you’re hoping for, and any questions you have…'],
    'Amway Membership': ['Your question', 'What you’d like to know about the membership…'],
  };
  const msgBox = $('#m-msg');
  const msgLabel = $('label[for="m-msg"]', mform);
  const msgDefault = [msgLabel.firstChild.textContent.trim(), msgBox.placeholder];
  function syncMsgPrompt() {
    const [label, hint] = MSG_PROMPTS[$('#m-topic').value] || msgDefault;
    msgLabel.firstChild.textContent = `${label} `;
    msgBox.placeholder = hint;
  }
  $('#m-topic').addEventListener('change', syncMsgPrompt);

  // The drawer names what the visitor asked for, so the button they clicked and the form agree.
  function openDrawer(topic, note = '', gift = '', event = '') {
    if (menuOpen) closeMenu(false);
    if (!done.hidden) resetMessageForm();
    $('#m-topic').value = topic || 'Just saying hello';
    if (giftSel) giftSel.value = (GIFTS.find((g) => g.id === gift) || {}).name || 'Something custom';
    syncGift();
    const picked = EVENTS.find((e) => e.id === event);
    if (eventSel) eventSel.value = picked ? eventLabel(picked) : eventSel.options[0].value;
    syncGather();
    syncMsgPrompt();
    $('button[type="submit"]', mform).textContent = submitLabel;
    $('#m-msg').value = note;
    showDialog(drawer);
    setTimeout(() => $('#m-first').focus(), reduced ? 0 : 350);
  }
  function closeDrawer() {
    hideDialog(drawer, () => { if (opener) opener.focus({ preventScroll: true }); });
  }
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-open-message]');
    if (!btn) return;
    opener = btn;
    openDrawer(btn.dataset.topic, btn.dataset.note || '', btn.dataset.gift || '', btn.dataset.event || '');
  });
  $$('[data-close-drawer]', drawer).forEach((b) => b.addEventListener('click', closeDrawer));
  drawer.addEventListener('cancel', (e) => { e.preventDefault(); closeDrawer(); });
  drawer.addEventListener('click', (e) => { if (e.target === drawer) closeDrawer(); });

  /* ---------- Form validation ---------- */
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const phoneOk = (v) => v.replace(/\D/g, '').length >= 10;
  const messages = {
    name: 'Please add your first name so I know who I’m talking to.',
    contact: 'Please add an email address or a mobile number with area code.',
    email: 'Please add an email address, like name@example.com.',
    consent: 'Please check this box so I’m allowed to reply.',
    wish_name: 'Please add their first name.',
    wish_contact: 'Please add their email address or mobile number.',
    wish_ok: 'Please check this box so I can reach out to them.',
    first_name: 'Please add your first name.',
    last_name: 'Please add your last name.',
    phone: 'Please add a mobile number with area code.',
    address: 'Please add the address where I can drop off your samples.',
  };
  function check(input) {
    let msg = '';
    const v = input.value.trim();
    if (input.name === 'name' && !v) msg = messages.name;
    if (input.name === 'contact' && !(emailRe.test(v) || phoneOk(v))) msg = messages.contact;
    if (input.name === 'email' && !emailRe.test(v)) msg = messages.email;
    if (input.name === 'consent' && !input.checked) msg = messages.consent;
    if (input.name === 'wish_name' && !v) msg = messages.wish_name;
    if (input.name === 'wish_contact' && !(emailRe.test(v) || phoneOk(v))) msg = messages.wish_contact;
    if (input.name === 'wish_ok' && !input.checked) msg = messages.wish_ok;
    if (['first_name', 'last_name', 'address'].includes(input.name) && !v) msg = messages[input.name];
    if (input.name === 'phone' && !phoneOk(v)) msg = messages.phone;
    const err = $('#' + (input.getAttribute('aria-describedby') || '').split(' ').find((id) => id.endsWith('error')));
    input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    if (err) err.textContent = msg;
    return !msg;
  }
  function wireValidation(form) {
    const fields = $$('input[required]', form);
    fields.forEach((f) => {
      f.addEventListener('blur', () => { if (f.dataset.touched) check(f); });
      f.addEventListener('input', () => { f.dataset.touched = '1'; if (f.getAttribute('aria-invalid') === 'true') check(f); });
      f.addEventListener('change', () => { f.dataset.touched = '1'; if (f.type === 'checkbox') check(f); });
    });
    return () => {
      const bad = fields.filter((f) => !f.matches(':disabled') && !check(f));
      if (bad.length) bad[0].focus();
      return bad.length === 0;
    };
  }

  // Accepts a form or a plain object. Repeated fields (checkbox groups) are joined with commas.
  async function send(source, name) {
    let data = source;
    if (source instanceof HTMLFormElement) {
      data = {};
      for (const [k, v] of new FormData(source)) data[k] = k in data ? `${data[k]}, ${v}` : v;
    }
    if (CONFIG.forms.mode === 'netlify') {
      const body = new URLSearchParams({ 'form-name': name, ...data }).toString();
      const r = await fetch('/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
      if (!r.ok) throw new Error('send failed');
    } else if (CONFIG.forms.mode === 'sheet' && CONFIG.forms.endpoint) {
      // Sent as plain text so the browser doesn't ask first (Google's script can't answer that); the script reads the JSON.
      const r = await fetch(CONFIG.forms.endpoint, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ form: name, ...data }) });
      const res = r.ok ? await r.json().catch(() => null) : null;
      if (!res || !res.ok) throw new Error('send failed');
    } else if (CONFIG.forms.mode === 'endpoint' && CONFIG.forms.endpoint) {
      const r = await fetch(CONFIG.forms.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ form: name, ...data }) });
      if (!r.ok) throw new Error('send failed');
    }
    return CONFIG.forms.mode === 'preview';
  }

  // The thank-you names what they asked about: the gathering, the gift, or who to tell about their wish list.
  // Returns the header and up to two paragraphs.
  const BY = { Text: 'by text', Call: 'with a call', Email: 'by email' };
  const picked = (name) => ($(`input[name="${name}"]:checked`, mform) || {}).value || 'Text';
  function doneText(first) {
    const reply = `I read every message myself, so expect a real reply from me ${BY[picked('reach')]}.`;
    const topic = $('#m-topic').value;
    if (topic === 'Wishlist a gift') {
      const who = ($('#m-wish-name', mform).value || '').trim() || 'they';
      return ['Consider it done!', doneLine(), `I read every message myself, so ${who} can expect a real reply from me ${BY[picked('wish_reach')]}.`];
    }
    const line = doneLine();
    return [`Got it! Thanks, ${first}.`, line || `I’ll be in touch soon. ${reply}`, line ? reply : ''];
  }

  // Wish list: "How should I reach Sam?" uses their name, and follows what was typed:
  // an email address picks Email, a phone number picks Text (Call stays if they chose it).
  const wishWho = $('[data-wish-who]', mform);
  const wishContact = $('#m-wish-contact', mform);
  const wishReachError = $('#m-wish-reach-error', mform);
  const setWishReach = (val) => { const r = $(`input[name="wish_reach"][value="${val}"]`, mform); if (r) r.checked = true; };
  if (wishWho) {
    $('#m-wish-name', mform).addEventListener('input', (e) => { wishWho.textContent = e.target.value.trim().split(' ')[0] || 'them'; });
    wishContact.addEventListener('input', () => {
      const v = wishContact.value.trim();
      if (emailRe.test(v)) setWishReach('Email');
      else if (phoneOk(v) && picked('wish_reach') === 'Email') setWishReach('Text');
      wishReachError.textContent = '';
    });
    $$('input[name="wish_reach"]', mform).forEach((r) => r.addEventListener('change', () => { wishReachError.textContent = ''; }));
  }
  // The way to reach them has to match what was typed in their contact box.
  function wishReachOk() {
    const fields = $('[data-wish-only]', mform);
    if (!wishWho || !fields || fields.disabled) return true;
    const v = wishContact.value.trim();
    const how = picked('wish_reach');
    const who = wishWho.textContent === 'them' ? 'their' : `${wishWho.textContent}’s`;
    let msg = '';
    if (how === 'Email' && !emailRe.test(v)) msg = `Add ${who} email, or choose Text or Call.`;
    if (how !== 'Email' && emailRe.test(v)) msg = `Add ${who} mobile number, or choose Email.`;
    wishReachError.textContent = msg;
    return !msg;
  }
  function doneLine() {
    const topic = $('#m-topic').value;
    const val = (sel) => { const el = $(sel, mform); return el && !el.disabled && !el.closest('[disabled]') ? el.value.trim() : ''; };
    const event = val('#m-event');
    if (topic === 'Gatherings' && event && !/^Tell me about future/.test(event)) return `I’ll reach out to confirm your spot at ${event}.`;
    if (topic === 'Wishlist a gift') return `I’ll reach out to ${val('#m-wish-name') || 'them'} about your wish list, just like you asked.`;
    if (topic === 'A custom gift') {
      const gift = val('#m-gift');
      return `I’ll reach out soon to plan ${gift && gift !== 'Something custom' ? `the ${gift} gift` : 'the gift'} together.`;
    }
    return '';
  }

  const validateMessage = wireValidation(mform);
  mform.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validateMessage()) return;
    if (!wishReachOk()) { $('input[name="wish_reach"]:checked', mform).focus(); return; }
    const btn = $('button[type="submit"]', mform);
    btn.disabled = true;
    btn.textContent = 'Sending…';
    try {
      const preview = await send(mform, 'message');
      const [title, text, more] = doneText($('#m-first').value.trim().split(' ')[0]);
      $('.mdone__title', done).textContent = title;
      $('[data-done-text]', done).textContent = text;
      const moreEl = $('[data-done-more]', done);
      moreEl.textContent = more;
      moreEl.hidden = !more;
      $('[data-preview-note]', done).hidden = !preview;
      mform.hidden = true;
      done.hidden = false;
      $('.drawer__panel', drawer).scrollTop = 0;
      requestAnimationFrame(() => done.classList.add('is-shown'));
      done.focus();
    } catch {
      let err = $('.send-error', mform);
      if (!err) { err = document.createElement('p'); err.className = 'field-error send-error'; err.setAttribute('role', 'alert'); mform.append(err); }
      err.textContent = 'That didn’t go through. Please try again in a moment.';
    } finally {
      btn.disabled = false;
      btn.textContent = submitLabel;
    }
  });
  function resetMessageForm() {
    mform.reset();
    $$('[aria-invalid]', mform).forEach((f) => f.removeAttribute('aria-invalid'));
    $$('.field-error', mform).forEach((f) => { f.textContent = ''; });
    $$('[data-touched]', mform).forEach((f) => delete f.dataset.touched);
    if (wishWho) wishWho.textContent = 'them';
    done.classList.remove('is-shown');
    done.hidden = true;
    mform.hidden = false;
  }

  const nform = $('[data-form="notify"]');
  if (nform) {
    const validateNotify = wireValidation(nform);
    nform.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!validateNotify()) return;
      try {
        const preview = await send(nform, 'gatherings');
        const first = esc($('#notify-first', nform).value.trim().split(' ')[0]);
        nform.innerHTML = `<p class="notify__status" role="status">You’re on the list, ${first}!<br>Keep an eye on your inbox for when the next gathering is announced!</p>` +
          (preview ? '<p class="mdone__preview">Preview only: this form isn’t connected yet, so nothing was sent.</p>' : '');
      } catch {
        $('#notify-error').textContent = 'That didn’t go through. Please try again in a moment.';
      }
    });
  }

  /* ---------- The quiz ----------
     One question per screen. The path branches on the first answer (new or returning),
     on how many categories they pick, and on whether they'd rather just browse. */
  const quiz = $('[data-quiz]');
  const qform = $('[data-quiz-form]', quiz);
  const qsteps = $('[data-quiz-steps]', quiz);
  const qfinish = $('[data-quiz-finish]', quiz);
  const qnext = $('[data-quiz-next]', quiz);
  const qback = $('[data-quiz-back]', quiz);
  const qbar = $('[data-quiz-bar]', quiz);
  let quizOpener = null;
  let current = 'connected';
  let finished = false;

  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const lc = (t) => t.charAt(0).toLowerCase() + t.slice(1);
  // The Instagram button on the thank-you screens.
  const IG_FOLLOW = '<a class="btn btn--line-dark ig-follow__btn" href="https://www.instagram.com/uncommonly.well/" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#uw-ig"/></svg>Follow along on Instagram<span class="sr-only"> (opens a new tab)</span></a>';
  const listOf = (arr) => (arr.length < 2 ? arr.join('') : `${arr.slice(0, -1).join(', ')} and ${arr[arr.length - 1]}`);

  const CATS = ['Energy', 'Sleep', 'Gut health', 'Protein & workouts', 'Weight goals', 'Skin care', 'Stress & focus', 'Immunity', 'Joints & recovery', 'Cleaning & home', 'Family & kids'];
  const SHELVES = {
    home: { name: 'Home', img: 'home', page: 'home.html' },
    wellness: { name: 'Nutrition', img: 'wellness', page: 'nutrition.html' },
    beauty: { name: 'Beauty', img: 'beauty', page: 'beauty.html' },
  };
  const shelvesFor = (cat) => (cat === 'Skin care' ? ['beauty'] : cat === 'Cleaning & home' ? ['home'] : cat === 'Family & kids' ? ['wellness', 'home'] : ['wellness']);
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const chips = (name, opts, { multi = false, stack = false } = {}) =>
    `<div class="chips${stack ? ' chips--stack' : ''}" role="${multi ? 'group' : 'radiogroup'}">${opts.map(([v, l, attrs = '']) =>
      `<label class="chip${multi ? ' chip--multi' : ''}"${attrs}><input type="${multi ? 'checkbox' : 'radio'}" name="${name}" value="${esc(v)}"><span>${esc(l)}</span></label>`).join('')}</div>`;
  const field = (id, label, input, attrs = '') =>
    `<div class="field"${attrs}><label for="${id}">${label}</label>${input}<p class="field-error" id="${id}-error" aria-live="polite"></p></div>`;
  const text = (id, name, extra = '') => `<input id="${id}" name="${name}" type="text" aria-describedby="${id}-error" ${extra}>`;
  const opt = ' <span class="opt">(optional)</span>';

  const STEPS = {
    connected: {
      title: 'Have we connected before?',
      help: 'Let’s find what actually works for you. Takes about 2 minutes.',
      body: chips('connected', [['new', 'I’m new here'], ['friend', 'I’m a friend or I know Chelsea'], ['existing', 'I already order from Chelsea']], { stack: true }),
      check: (v) => (v.connected ? [] : [['err-connected', 'Choose the one that fits best.']]),
    },
    help: {
      title: 'What would you love some help with?',
      help: 'Pick as many as you like.',
      body: chips('help', CATS.map((c) => [c, c]), { multi: true }),
      check: (v) => (v.help.length ? [] : [['err-help', 'Pick at least one, even if it’s just a hunch.']]),
    },
    focus: {
      title: 'Out of those, which matters most right now?',
      body: '<div data-focus-chips></div>',
      enter: (v) => {
        const box = $('[data-focus-chips]', quiz);
        const keep = v.focus;
        box.innerHTML = chips('focus', v.help.map((c) => [c, c]));
        const match = $$('input', box).find((i) => i.value === keep);
        if (match) match.checked = true;
      },
      check: (v) => (v.focus ? [] : [['err-focus', 'Choose the one that matters most.']]),
    },
    story: {
      cls: 'qstep--story',
      title: (v) => `What’s going on with ${lc(focusOf(v) || 'that')} right now?`,
      help: 'Tell me in your own words.',
      body: '<label class="sr-only" for="q-story">Your answer</label><textarea id="q-story" name="story" rows="5" aria-describedby="q-story-error" placeholder="Like ‘I crash around 3pm’ or ‘my skin feels dry all winter’"></textarea><p class="field-error" id="q-story-error" aria-live="polite"></p>',
      check: (v) => (v.story.trim() ? [] : [['q-story', 'Even a sentence helps me point you the right way.']]),
    },
    using: {
      title: 'What are you using for that now?',
      body: chips('using', [['nothing', 'Nothing yet'], ['not-much', 'Something, but it’s not doing much'], ['like-it', 'Something I like, just curious']], { stack: true }) +
        `<div class="qfields">${field('q-using-what', 'What is it?' + opt, text('q-using-what', 'using_what'), ' data-show-if="using:not-much,like-it" hidden')}</div>`,
      check: (v) => (v.using ? [] : [['err-using', 'Choose the one that fits best.']]),
    },
    avoid: {
      title: 'Anything you avoid?',
      help: 'Pick any that apply.',
      body: chips('avoid', [['Caffeine', 'Caffeine'], ['Dairy', 'Dairy'], ['Soy', 'Soy'], ['Gluten', 'Gluten'], ['Plant-based only', 'Plant-based only'], ['Other', 'Other'], ['Nothing', 'Nothing I avoid']], { multi: true }) +
        `<div class="qfields">${field('q-avoid-other', 'What else do you avoid?', text('q-avoid-other', 'avoid_other'), ' data-show-if="avoid:Other" hidden')}</div>`,
      check: (v) => (v.avoid.includes('Other') && !v.avoid_other.trim() ? [['q-avoid-other', 'Tell me what else you avoid, or uncheck Other.']] : []),
    },
    e_love: {
      title: 'What are you using right now that you love?',
      body: '<label class="sr-only" for="q-e-love">Your answer</label><textarea id="q-e-love" name="e_love" rows="4"></textarea>',
      check: () => [],
    },
    e_low: {
      title: 'Getting close to running out of anything?',
      help: 'Tell me what’s getting low, or skip this one.',
      body: '<label class="sr-only" for="q-e-low">Your answer</label><textarea id="q-e-low" name="e_low" rows="4"></textarea>',
      check: () => [],
    },
    e_try: {
      title: 'Anything you’ve been wanting to try?',
      help: 'Pick any that catch your eye.',
      body: chips('e_try', CATS.map((c) => [c, c]), { multi: true }) +
        `<div class="qfields">${field('q-e-try-other', 'Anything else?' + opt, text('q-e-try-other', 'e_try_other'))}</div>`,
      check: () => [],
    },
    e_recur: {
      title: 'Would a recurring order that ships automatically make life easier?',
      body: chips('e_recur', [['yes', 'Yes'], ['tell-me-more', 'Tell me more'], ['as-needed', 'I’m good ordering as-needed']], { stack: true }),
      check: (v) => (v.e_recur ? [] : [['err-e_recur', 'Choose the one that fits best.']]),
    },
    contact: {
      title: (v) => (v.connected === 'existing' ? 'What’s the best way to reach you?' : 'What’s the best way to reach you?'),
      // Their own name boxes (e_first/e_last), so they don't clash with the new-visitor path's; sent as first_name/last_name.
      body: `<div class="qfields qfields--names" data-show-if="connected:existing" hidden>${field('q-first', 'First name', text('q-first', 'e_first', 'autocomplete="given-name"'))}${field('q-last', 'Last name', text('q-last', 'e_last', 'autocomplete="family-name"'))}</div>` +
        '<div class="qfields">' +
        field('q-phone', 'Phone number', '<input id="q-phone" name="phone" type="tel" autocomplete="tel" inputmode="tel" aria-describedby="q-phone-error">') +
        '<div class="field"><label id="q-reach-label">How should I reach you?</label><div class="chips" role="radiogroup" aria-labelledby="q-reach-label">' +
        '<label class="chip"><input type="radio" name="reach" value="Text" checked><span>Text</span></label>' +
        '<label class="chip"><input type="radio" name="reach" value="Call"><span>Call</span></label></div></div>' +
        `<div class="field field--check"><input id="q-consent" name="consent" type="checkbox" aria-describedby="q-consent-error"><label for="q-consent">Yes, you may text or call me about my answers. I can opt out anytime.</label><p class="field-error" id="q-consent-error" aria-live="polite"></p></div>` +
        '</div>',
      check: (v) => {
        const e = [];
        if (v.connected === 'existing' && !v.e_first.trim()) e.push(['q-first', 'Please add your first name.']);
        if (v.connected === 'existing' && !v.e_last.trim()) e.push(['q-last', 'Please add your last name.']);
        if (!phoneOk(v.phone)) e.push(['q-phone', 'Please add a phone number with area code.']);
        if (!v.consent) e.push(['q-consent', 'Please check this box so I’m allowed to reach out.']);
        return e;
      },
    },
    address: {
      title: 'Where should I send your samples?',
      body: '<div class="qfields">' +
        '<div class="qfields qfields--names" style="margin-top:0">' +
        field('q-first-name', 'First name', text('q-first-name', 'first_name', 'autocomplete="given-name"')) +
        field('q-last-name', 'Last name', text('q-last-name', 'last_name', 'autocomplete="family-name"')) +
        '</div>' +
        field('q-street', 'Street address', text('q-street', 'street', 'autocomplete="address-line1"')) +
        field('q-apt', 'Apartment, suite, etc.' + opt, text('q-apt', 'apt', 'autocomplete="address-line2"')) +
        '<div class="qfields qfields--row" style="margin-top:0">' +
        field('q-city', 'City', text('q-city', 'city', 'autocomplete="address-level2"')) +
        field('q-state', 'State', text('q-state', 'state', 'autocomplete="address-level1"')) +
        field('q-zip', 'ZIP code', text('q-zip', 'zip', 'autocomplete="postal-code" inputmode="numeric"')) +
        '</div>' +
        '<div class="field field--check"><input id="q-local" name="local" type="checkbox"><label for="q-local">I’m in the Lincoln, CA area &amp; happy to have them dropped off.</label></div>' +
        '</div>',
      check: (v) => {
        const e = [];
        if (!v.first_name.trim()) e.push(['q-first-name', 'Please add your first name.']);
        if (!v.last_name.trim()) e.push(['q-last-name', 'Please add your last name.']);
        if (!v.street.trim()) e.push(['q-street', 'Please add your street address.']);
        if (!v.city.trim()) e.push(['q-city', 'Please add your city.']);
        if (!v.state.trim()) e.push(['q-state', 'Please add your state.']);
        if (!/^\d{5}(-\d{4})?$/.test(v.zip.trim())) e.push(['q-zip', 'Please add a 5-digit ZIP code.']);
        return e;
      },
    },
    birthday: {
      title: 'Want a little something on your birthday?',
      help: 'Optional. Just the month and day, no year.',
      body: '<div class="qfields qfields--two">' +
        field('q-bmonth', 'Month', `<div class="select"><select id="q-bmonth" name="bmonth" autocomplete="bday-month"><option value="">Month</option>${MONTHS.map((m) => `<option>${m}</option>`).join('')}</select></div>`) +
        field('q-bday', 'Day', `<div class="select"><select id="q-bday" name="bday" autocomplete="bday-day"><option value="">Day</option>${Array.from({ length: 31 }, (_, i) => `<option>${i + 1}</option>`).join('')}</select></div>`) +
        '</div>',
      check: (v) => ((v.bmonth && !v.bday) || (!v.bmonth && v.bday) ? [['q-bday', 'Choose both a month and a day, or leave both blank.']] : []),
    },
  };

  // Build every step once; showing and hiding them keeps answers intact when people go back.
  qsteps.innerHTML = Object.entries(STEPS).map(([id, st]) =>
    `<fieldset class="qstep ${st.cls || ''}" data-qstep="${id}" hidden>
       <legend><span class="q-title" tabindex="-1" data-q-title></span><span class="q-help" data-q-help></span></legend>
       <div>${st.body}<p class="field-error" id="err-${id}" aria-live="polite"></p></div>
     </fieldset>`).join('');

  const SINGLE = ['reach', 'e_first', 'e_last', 'connected', 'focus', 'story', 'using', 'using_what', 'avoid_other', 'name', 'phone', 'consent', 'first_name', 'last_name', 'street', 'apt', 'city', 'state', 'zip', 'local', 'bmonth', 'bday', 'e_love', 'e_low', 'e_try_other', 'e_recur'];
  function values() {
    const fd = new FormData(qform);
    const v = { help: fd.getAll('help'), avoid: fd.getAll('avoid'), e_try: fd.getAll('e_try') };
    SINGLE.forEach((k) => { v[k] = fd.get(k) || ''; });
    return v;
  }
  const focusOf = (v) => (v.help.length > 1 ? v.focus : v.help[0] || '');
  function pathOf(v) {
    if (v.connected === 'existing') return ['connected', 'e_love', 'e_low', 'e_try', 'e_recur', 'contact'];
    const p = ['connected', 'help'];
    if (v.help.length > 1) p.push('focus');
    p.push('story', 'using', 'avoid', 'address', 'contact', 'birthday');
    return p;
  }

  // Show or hide follow-up fields based on other answers.
  function syncConditionals() {
    const v = values();
    const has = (name, list) => [].concat(v[name] || []).some((x) => list.includes(x));
    $$('[data-show-if]', quiz).forEach((el) => {
      const [name, vals] = el.dataset.showIf.split(':');
      el.hidden = !has(name, vals.split(','));
    });
    $$('[data-hide-if]', quiz).forEach((el) => {
      const [name, vals] = el.dataset.hideIf.split(':');
      const hide = has(name, vals.split(','));
      el.hidden = hide;
      if (hide) $('input', el).checked = false;
    });
  }
  // Single-choice questions move on by themselves once a choice is tapped. "Using" waits when it
  // reveals the optional "What is it?" field, and the last question never sends on its own.
  // Only taps and clicks count, so arrowing through the choices with a keyboard doesn't jump ahead.
  const AUTO = { connected: () => true, focus: () => true, using: (v) => v.using === 'nothing', e_recur: () => true };
  let tappedAt = 0;
  let autoTimer = 0;
  qform.addEventListener('pointerdown', () => { tappedAt = Date.now(); });
  qform.addEventListener('change', (e) => {
    clearTimeout(autoTimer);
    if (e.target.type === 'radio' && AUTO[current] && Date.now() - tappedAt < 1500) {
      const v = values();
      const path = pathOf(v);
      const step = current;
      if (AUTO[step](v) && path.indexOf(step) < path.length - 1) {
        autoTimer = setTimeout(() => { if (current === step) qform.requestSubmit(); }, reduced ? 0 : 320);
      }
    }
  });
  qform.addEventListener('change', (e) => {
    // "Nothing I avoid" can't sit alongside anything else.
    if (e.target.name === 'avoid') {
      const boxes = $$('input[name="avoid"]', qform);
      if (e.target.value === 'Nothing' && e.target.checked) boxes.forEach((b) => { if (b !== e.target) b.checked = false; });
      if (e.target.value !== 'Nothing' && e.target.checked) boxes.find((b) => b.value === 'Nothing').checked = false;
    }
    clearErrors($(`[data-qstep="${current}"]`, quiz), true);
    syncConditionals();
    updateNav();
  });

  function clearErrors(scope, chipsOnly = false) {
    $$('.field-error', scope).forEach((p) => { if (!chipsOnly || p.id.startsWith('err-')) p.textContent = ''; });
    if (!chipsOnly) $$('[aria-invalid]', scope).forEach((f) => f.removeAttribute('aria-invalid'));
  }
  function showErrors(errs) {
    errs.forEach(([id, msg]) => {
      const el = document.getElementById(id);
      const out = document.getElementById(id.startsWith('err-') ? id : `${id}-error`);
      if (out) out.textContent = msg;
      if (el && !id.startsWith('err-')) el.setAttribute('aria-invalid', 'true');
    });
    const [id] = errs[0];
    const target = id.startsWith('err-') ? $('input', $(`[data-qstep="${current}"]`, quiz)) : document.getElementById(id);
    if (target) target.focus();
  }

  function updateNav() {
    const v = values();
    const path = pathOf(v);
    const i = path.indexOf(current);
    qback.style.visibility = i > 0 ? 'visible' : 'hidden';
    const last = i === path.length - 1;
    qnext.textContent = !last ? 'Next' : 'Send my answers';
    const p = Math.max(0.04, i / path.length);
    qbar.style.setProperty('--p', p);
    $('.quiz__progress', quiz).setAttribute('aria-valuenow', Math.round(p * 100));
  }

  function go(id, dir = 1) {
    const from = $(`[data-qstep="${current}"]`, quiz);
    const to = $(`[data-qstep="${id}"]`, quiz);
    const st = STEPS[id];
    const v = values();
    if (st.enter) st.enter(v);
    $('[data-q-title]', to).textContent = typeof st.title === 'function' ? st.title(v) : st.title;
    const help = typeof st.help === 'function' ? st.help(v) : st.help || '';
    $('[data-q-help]', to).textContent = help;
    $('[data-q-help]', to).hidden = !help;
    from.hidden = true;
    to.hidden = false;
    current = id;
    syncConditionals();
    updateNav();
    $('.quiz__steps', quiz).scrollTop = 0;
    if (motion) gsap.fromTo(to, { autoAlpha: 0, y: 14 * dir }, { autoAlpha: 1, y: 0, duration: 0.5, ease: 'power3.out' });
    $('[data-q-title]', to).focus({ preventScroll: true });
  }

  qback.addEventListener('click', () => {
    const path = pathOf(values());
    const i = path.indexOf(current);
    if (i > 0) go(path[i - 1], -1);
  });

  qform.addEventListener('submit', async (e) => {
    e.preventDefault();
    const v = values();
    const step = $(`[data-qstep="${current}"]`, quiz);
    clearErrors(step);
    const errs = STEPS[current].check(v);
    if (errs.length) { showErrors(errs); return; }
    const path = pathOf(v);
    const i = path.indexOf(current);
    if (i < path.length - 1) { go(path[i + 1]); return; }

    qnext.disabled = true;
    qnext.textContent = 'Sending…';
    try {
      const flat = Object.fromEntries(Object.entries(v).map(([k, x]) => [k, Array.isArray(x) ? x.join(', ') : x]));
      if (v.connected === 'existing') { flat.first_name = v.e_first; flat.last_name = v.e_last; }
      delete flat.e_first; delete flat.e_last;
      const saved = ys.map((id) => byId[id].name);
      const preview = await send({
        ...flat,
        path: v.connected,
        focus: focusOf(v),
        local_dropoff: v.local ? 'yes' : 'no',
        birthday: v.bmonth && v.bday ? `${v.bmonth} ${v.bday}` : '',
        picks: saved.join('; '),
      }, 'quiz');
      renderFinish(v.connected === 'existing' ? 'existing' : 'samples', v, preview, saved);
      // Their shelf went along with the survey, so it doesn't get sent twice.
      if (saved.length) { ys = []; ysSave(); syncShelf(); }
    } catch {
      $(`#err-${current}`).textContent = 'That didn’t go through. Please try again in a moment.';
    } finally {
      qnext.disabled = false;
      updateNav();
    }
  });

  // Shelves that match what they picked, each with one line on why.
  function shelfCards(picks) {
    const order = [];
    const why = {};
    picks.forEach((c) => shelvesFor(c).forEach((s) => { if (!order.includes(s)) order.push(s); (why[s] = why[s] || []).push(lc(c)); }));
    ['home', 'wellness', 'beauty'].forEach((s) => { if (order.length < 2 && !order.includes(s)) order.push(s); });
    return order.slice(0, 3).map((s) => {
      const sh = SHELVES[s];
      const reason = why[s] ? `Because you mentioned ${listOf(why[s].slice(0, 3))}.` : 'A good place to begin.';
      return `<div class="qf-card">
        <span class="arch"><picture class="ph" style="--ph:#b8a88e"><source type="image/avif" srcset="assets/img/${sh.img}-480.avif"><source type="image/webp" srcset="assets/img/${sh.img}-480.webp"><img src="assets/img/${sh.img}-800.jpg" width="480" height="600" alt="" loading="lazy" class="is-loaded"></picture></span>
        <p class="qf-card__name">${sh.name}</p>
        <p class="qf-card__why">${reason}</p>
        <a class="link" href="${sh.page}">Browse the ${lc(sh.name)} shelf</a>
      </div>`;
    }).join('');
  }

  function renderFinish(kind, v, preview = false, saved = []) {
    finished = true;
    const first = (kind === 'existing' ? v.e_first : v.first_name).trim().split(' ')[0];
    // Back to the site, or follow along on Instagram (same as the other thank-you screens).
    const keepLooking = `<div class="qf-actions"><button class="btn btn--line-dark" type="button" data-quiz-browse>Keep looking around</button>${IG_FOLLOW}</div>`;
    const note = preview ? '<p class="mdone__preview">Preview only: the survey isn’t connected yet, so nothing was sent.</p>' : '';
    const reply = `<p class="qf-text">I read every answer myself, so expect a real reply from me ${v.reach === 'Call' ? 'with a call' : 'by text'}.</p>`;
    let html = '';

    if (kind === 'samples') {
      const picks = v.help.length > 1 && v.focus ? [v.focus, ...v.help.filter((c) => c !== v.focus)] : v.help;
      html = `<h2 class="qf-title">Thanks, ${esc(first)}. Here’s where I’d start.</h2>
        <p class="qf-text">Based on what you shared, these are a few good places to begin. I chose them because of what you told me, not because they’re what everyone gets.</p>
        <div class="qf-cards">${shelfCards(picks)}</div>
        <p class="qf-text">${saved.length ? `I’ll reach out about the ${esc(listOf(saved))} you shelved` : 'I’ll reach out soon'} &amp; we’ll chat about free samples, where it makes sense.</p>
        ${reply}
        ${note}
        ${keepLooking}`;
    } else {
      html = `<h2 class="qf-title">Good to hear from you, ${esc(first)}! I’ll be in touch about what you need next.</h2>
        ${reply}
        ${saved.length ? `<p class="qf-text">I’ll bring up the ${esc(listOf(saved))} you shelved, too.</p>` : ''}
        ${note}
        ${keepLooking}`;
    }
    html += '<p class="qf-disclaimer">These products aren’t intended to diagnose, treat or cure anything. If you have a medical condition or take medication, check with your healthcare provider before trying something new.</p>';

    qfinish.innerHTML = html;
    qform.hidden = true;
    qfinish.hidden = false;
    qbar.style.setProperty('--p', 1);
    $('.quiz__progress', quiz).setAttribute('aria-valuenow', 100);
    if (motion) gsap.fromTo(qfinish.children, { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.7, stagger: 0.06, ease: 'power3.out' });
    qfinish.focus();
  }

  function resetQuiz() {
    qform.reset();
    clearErrors(qform);
    qfinish.hidden = true;
    qfinish.innerHTML = '';
    qform.hidden = false;
    finished = false;
    $$('[data-qstep]', quiz).forEach((s) => { s.hidden = true; });
    current = 'connected';
    $('[data-qstep="connected"]', quiz).hidden = false;
  }

  function openQuiz(from) {
    if (menuOpen) closeMenu(false);
    quizOpener = from || null;
    if (finished) resetQuiz();
    showDialog(quiz);
    go(current);
  }
  function closeQuiz(then) {
    hideDialog(quiz, then || (() => { if (quizOpener) quizOpener.focus({ preventScroll: true }); }));
  }
  resetQuiz();
  // From inside another dialog (Your shelf, a need), close that one first so the survey isn't stacked on it.
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-open-quiz]');
    if (!b) return;
    const host = b.closest('dialog');
    if (host && host !== quiz && host.open) hideDialog(host, () => openQuiz(b)); else openQuiz(b);
  });
  $('[data-close-quiz]', quiz).addEventListener('click', () => closeQuiz());
  quiz.addEventListener('cancel', (e) => { e.preventDefault(); closeQuiz(); });
  quiz.addEventListener('click', (e) => {
    if (e.target === quiz) { closeQuiz(); return; }
    if (e.target.closest('[data-quiz-browse]')) closeQuiz(() => glideTo($('#shelves') ? '#shelves' : '#products'));
  });

  /* ---------- Products: shelves, quick view and "Your shelf" ----------
     The catalog lives in assets/js/products.js. Visitors can open any product, then add up to
     three to "Your shelf" and send that shelf to Chelsea to talk through (free samples where she has them). */
  const PRODUCTS = window.UW_PRODUCTS || [];
  const SHELF_INFO = window.UW_SHELVES || {};
  const byId = Object.fromEntries(PRODUCTS.map((p) => [p.id, p]));
  const YS_MAX = 3;
  const YS_KEY = 'uw-your-shelf';
  const ICON = {
    check: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8.5l3 3 7-7"/></svg>',
    x: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19"/></svg>',
    prev: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
    next: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>',
    shelf: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 21V10a7 7 0 0 1 14 0v11M3 21h18M8 15h8"/></svg>',
  };
  const shelfVars = (p) => `--cm:${p.cm}${p.base ? `;--base:${p.base}` : ''}${p.back ? `;--back:${p.back}` : ''}`;
  const isTodo = (t) => /^\s*\[/.test(t || '');

  // Your shelf: remembered on this device. If storage is blocked, it still works for this page.
  let ys = [];
  try { ys = JSON.parse(localStorage.getItem(YS_KEY) || '[]'); } catch { ys = []; }
  ys = Array.isArray(ys) ? ys.filter((id) => byId[id]).slice(0, YS_MAX) : [];
  const ysSave = () => { try { localStorage.setItem(YS_KEY, JSON.stringify(ys)); } catch { /* storage unavailable */ } };
  const onShelf = (id) => ys.includes(id);

  // Homepage shelves: the first five products marked `home` for each shelf.
  $$('[data-shelf-items]').forEach((ul) => {
    const list = PRODUCTS.filter((p) => p.shelf === ul.dataset.shelfItems && p.home).slice(0, 5);
    if (!list.length) return;
    ul.innerHTML = list.map((p) => `<li style="${shelfVars(p)}"><button class="pick" type="button" data-product="${p.id}" aria-label="${esc(p.name)}: see details"><img src="${p.img}" width="${p.w}" height="${p.h}" alt="" loading="lazy" decoding="async"></button></li>`).join('');
  });

  // Gifts page: each gift's photo beside its products, standing together on one shelf, with one action.
  const giftPhoto = (g) => {
    const src = (ext) => `assets/img/gift-${g.photo}-480.${ext}?v=4 480w, assets/img/gift-${g.photo}-800.${ext}?v=4 800w`;
    return `<div class="bundle__photo arch${g.wide ? ' bundle__photo--wide' : ''}" data-reveal-img><picture class="ph"><source type="image/avif" srcset="${src('avif')}" sizes="(min-width: 900px) 34vw, 90vw"><img src="assets/img/gift-${g.photo}-800.jpg?v=4" srcset="${src('jpg')}" sizes="(min-width: 900px) 34vw, 90vw" width="800" height="${g.wide ? 600 : 1066}" alt="${esc(g.alt || g.name)}" loading="lazy" decoding="async"></picture></div>`;
  };
  $$('[data-gift-bundles]').forEach((ul) => {
    const list = (window.UW_GIFTS || []).map((g) => ({ ...g, items: g.products.filter((id) => byId[id]).map((id) => byId[id]) })).filter((g) => g.items.length);
    ul.innerHTML = list.map((g) => `<li class="bundle${g.photo ? ' bundle--photo' : ''}" data-bundle="${g.id}">
        ${g.photo ? giftPhoto(g) : ''}
        <div class="bundle__body">
          <div class="shelf-unit">
            <ul class="shelf-unit__items">${g.items.map((p) => `<li style="${shelfVars(p)}"><button class="pick" type="button" data-product="${p.id}" aria-label="${esc(p.name)}: see details"><img src="${p.img}" width="${p.w}" height="${p.h}" alt="" loading="lazy" decoding="async"></button></li>`).join('')}</ul>
            <div class="plank" aria-hidden="true"><span class="plank__top"></span><span class="plank__front"></span></div>
          </div>
          <h2 class="bundle__name">${esc(g.name)}</h2>
          <p class="bundle__line">${esc(g.line)}</p>
          <ul class="bundle__items" aria-label="What’s inside">${g.items.map((p) => `<li><button class="product__open" type="button" data-product="${p.id}">${esc(p.name)}</button></li>`).join('')}</ul>
          <div class="bundle__actions">
            <button class="btn btn--harbor" type="button" data-open-message data-topic="A custom gift" data-gift="${g.id}">Gift it</button>
            <button class="btn btn--line-dark" type="button" data-open-message data-topic="Wishlist a gift" data-gift="${g.id}">Wishlist it</button>
          </div>
        </div>
      </li>`).join('');
    $$('.ph img', ul).forEach((img) => {
      const done = () => img.classList.add('is-loaded');
      if (img.complete && img.naturalWidth) done();
      else img.addEventListener('load', done, { once: true });
    });
  });

  // Gather page: each upcoming event as a card: its photo with a date badge, the details, and one action.
  $$('[data-events]').forEach((ol) => {
    const fmt = (o) => new Intl.DateTimeFormat('en-US', o);
    const kind = { virtual: 'Virtual', 'in-person': 'In person' };
    const photo = (e) => {
      const src = (ext) => `assets/img/event-${e.photo}-480.${ext} 480w, assets/img/event-${e.photo}-800.${ext} 800w`;
      return `<picture class="ph"><source type="image/avif" srcset="${src('avif')}" sizes="(min-width: 900px) 44vw, 92vw"><img src="assets/img/event-${e.photo}-800.jpg" srcset="${src('jpg')}" sizes="(min-width: 900px) 44vw, 92vw" width="800" height="600" alt="${esc(e.alt || e.title)}" loading="lazy" decoding="async"></picture>`;
    };
    ol.innerHTML = EVENTS.map((e) => {
      const d = eventDay(e);
      return `<li class="event">
        <div class="event__media">
          <div class="event__photo${e.photo ? '' : ' event__photo--none'}" data-reveal-img>${e.photo ? photo(e) : ''}</div>
          <p class="event__badge"><span class="event__month">${fmt({ month: 'short' }).format(d)}</span><span class="event__day">${d.getDate()}</span></p>
        </div>
        <div class="event__body">
          <p class="event__kind event__kind--${e.kind}">${kind[e.kind] || esc(e.kind)}</p>
          <h3 class="event__title">${esc(e.title)}</h3>
          <p class="event__meta">${fmt({ weekday: 'long', month: 'long', day: 'numeric' }).format(d)} · ${esc(e.time)}<br>${esc(e.place)}</p>
          <p class="event__line">${esc(e.line)}</p>
          <button class="btn btn--harbor" type="button" data-open-message data-topic="Gatherings" data-event="${e.id}">Save my spot</button>
        </div>
      </li>`;
    }).join('');
    $$('.ph img', ol).forEach((img) => {
      const done = () => img.classList.add('is-loaded');
      if (img.complete && img.naturalWidth) done();
      else img.addEventListener('load', done, { once: true });
    });
  });

  // Past gatherings, beside what each one was: prints scattered on a table (they lift when hovered or tapped),
  // or a photo-booth strip with one caption along the bottom.
  const kindLabel = { virtual: 'Virtual', 'in-person': 'In person' };
  // Where the four prints land on the table (left, top, tilt)
  const PRINT_SPOTS = [['6%', '6%', '-7deg'], ['53%', '3%', '5deg'], ['10%', '50%', '4deg'], ['51%', '47%', '-5deg']];
  $$('[data-past-events]').forEach((list) => {
    const long = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    const pic = (sn, alt) => {
      const src = (ext) => `assets/img/past-${sn.photo}-480.${ext} 480w, assets/img/past-${sn.photo}-800.${ext} 800w`;
      return `<picture><source type="image/avif" srcset="${src('avif')}" sizes="(min-width: 900px) 20vw, 45vw"><img src="assets/img/past-${sn.photo}-480.jpg" srcset="${src('jpg')}" sizes="(min-width: 900px) 20vw, 45vw" width="480" height="600" alt="${alt}" loading="lazy" decoding="async"${sn.pos ? ` style="object-position:${sn.pos}"` : ''}></picture>`;
    };
    const table = (e) => `<div class="table-prints" role="group" aria-label="Photos from ${esc(e.title)}">${(e.snaps || []).slice(0, 4).map((sn, i) => {
      const [x, y, r] = PRINT_SPOTS[i];
      return `<button class="tprint" type="button" style="--x:${x};--y:${y};--r:${r}" aria-pressed="false" aria-label="${esc(sn.alt)}">${pic(sn, '')}</button>`;
    }).join('')}</div>`;
    const strip = (e) => `<figure class="photostrip"><div class="photostrip__frames">${(e.snaps || []).slice(0, 4).map((sn) => `<div class="photostrip__frame">${pic(sn, esc(sn.alt))}</div>`).join('')}</div><figcaption>${esc(e.stripCaption || '')}</figcaption></figure>`;
    list.innerHTML = (window.UW_PAST_EVENTS || []).map((e) => `<article class="past-event">
        <div class="past-event__snaps">${e.style === 'strip' ? strip(e) : table(e)}</div>
        <div class="past-event__body">
          <p class="event__kind event__kind--${e.kind}">${kindLabel[e.kind] || esc(e.kind)}</p>
          <h3 class="event__title">${esc(e.title)}</h3>
          ${e.sub ? `<p class="past-event__sub">${esc(e.sub)}</p>` : ''}
          <p class="event__meta">${long.format(eventDay(e))}<br>${esc(e.place)}</p>
          <p class="event__line">${esc(e.line)}</p>
        </div>
      </article>`).join('');
    // Tap (or click, or Enter) lifts a print off the table; tapping it again, or another, sets it back down.
    list.addEventListener('click', (ev) => {
      const print = ev.target.closest('.tprint');
      if (!print) return;
      const up = !print.classList.contains('is-up');
      $$('.tprint', print.parentElement).forEach((p) => { p.classList.remove('is-up'); p.setAttribute('aria-pressed', 'false'); });
      print.classList.toggle('is-up', up);
      print.setAttribute('aria-pressed', String(up));
    });
  });

  // While nothing is scheduled: a few gatherings I'd love to host next (no dates, so they never read as scheduled).
  $$('[data-event-ideas]').forEach((list) => {
    list.innerHTML = (window.UW_EVENT_IDEAS || []).map((e) => `<li class="idea">
        <p class="event__kind event__kind--${e.kind}">${kindLabel[e.kind] || esc(e.kind)}</p>
        <h3 class="idea__title">${esc(e.title)}</h3>
        <p class="idea__line">${esc(e.line)}</p>
      </li>`).join('');
  });

  // Shelf pages: every product on that shelf, each with one action.
  // Under its name: Chelsea's own note when she's written one, otherwise the first sentence of Amway's description.
  const firstLine = (t) => { const m = (t || '').match(/^.*?[.!?][*†]*(?=\s|$)/); return m ? m[0] : (t || ''); };
  const productCard = (p) => {
    const line = p.note && !isTodo(p.note) ? p.note : firstLine(p.about);
    return `<li class="product">
        <div class="shelf-unit">
          <ul class="shelf-unit__items"><li style="${shelfVars(p)}"><button class="pick" type="button" data-product="${p.id}" aria-label="${esc(p.name)}: see details"><img src="${p.img}" width="${p.w}" height="${p.h}" alt="" loading="lazy" decoding="async"></button></li></ul>
          <div class="plank" aria-hidden="true"><span class="plank__top"></span><span class="plank__front"></span></div>
        </div>
        <h2 class="product__name"><button class="product__open" type="button" data-product="${p.id}">${esc(p.name)}</button></h2>
        ${line ? `<p class="product__note">${esc(line)}</p>` : ''}
        <button class="btn btn--small btn--line-dark" type="button" data-ys-toggle="${p.id}"></button>
      </li>`;
  };
  $$('[data-shelf-products]').forEach((ul) => {
    const list = PRODUCTS.filter((p) => p.shelf === ul.dataset.shelfProducts);
    if (!list.length) return;
    const cards = list.map(productCard);
    const todo = Math.max(0, 4 - list.length);
    for (let i = 0; i < todo; i += 1) {
      cards.push('<li class="product product--todo" aria-hidden="true"><div class="shelf-unit"><div class="shelf-unit__items"><p class="todo-card">[Another favorite goes here]</p></div><div class="plank" aria-hidden="true"><span class="plank__top"></span><span class="plank__front"></span></div></div><p class="product__name">[Product name]</p></li>');
    }
    ul.innerHTML = cards.join('');
  });
  // The Nutrition page: one group per need, in the order of UW_NEEDS, so someone after better sleep finds every
  // sleep product together (a product that fits two needs shows in both). Anything not tied to a need closes the page.
  $$('[data-shelf-groups]').forEach((wrap) => {
    const shelf = wrap.dataset.shelfGroups;
    const shelfItems = PRODUCTS.filter((p) => p.shelf === shelf);
    const placed = new Set();
    const groups = (window.UW_NEEDS || []).map((n) => {
      const items = n.products.map((id) => byId[id]).filter((p) => p && p.shelf === shelf);
      items.forEach((p) => placed.add(p.id));
      return { id: `need-${n.id}`, name: n.name, line: n.line, items };
    }).filter((g) => g.items.length);
    const rest = shelfItems.filter((p) => !placed.has(p.id));
    if (rest.length) groups.push({ id: 'need-more', name: 'More favorites', line: '', items: rest });
    wrap.innerHTML = groups.map((g) => `<section class="product-group" id="${g.id}" aria-labelledby="${g.id}-title">
        <header class="product-group__head">
          <h2 class="product-group__name" id="${g.id}-title">${esc(g.name)}</h2>
          ${g.line ? `<p class="product-group__line">${esc(g.line)}</p>` : ''}
        </header>
        <ul class="products">${g.items.map(productCard).join('')}</ul>
      </section>`).join('');
    const jump = $('[data-group-jump]');
    if (jump) jump.innerHTML = groups.map((g) => `<li><a class="need-pill" href="#${g.id}">${esc(g.name)}</a></li>`).join('');
  });

  // A shelf too long for the screen splits onto a second glass shelf (or a third) below it, as evenly as it can,
  // so every product keeps its true size and nothing scrolls sideways.
  const PLANK = '<div class="plank" aria-hidden="true"><span class="plank__top"></span><span class="plank__front"></span></div>';
  function stackShelf(unit) {
    const first = $('.shelf-unit__items', unit);
    $$('.shelf-tier', unit).forEach((t) => { first.append(...$('.shelf-unit__items', t).children); t.remove(); });
    unit.classList.remove('is-stacked');
    // Desktop pairs keep to one shelf: they show as many products as fit and hide the rest from the end
    const paired = unit.closest('.shelf-row--full') && window.matchMedia('(min-width: 900px)').matches;
    [...first.children].forEach((li) => { li.hidden = false; });
    if (paired) {
      const cs0 = getComputedStyle(first);
      const room0 = unit.clientWidth - 20 - parseFloat(cs0.paddingLeft) - parseFloat(cs0.paddingRight);
      const gap0 = parseFloat(cs0.columnGap) || 0;
      const lis = [...first.children];
      let used = 0;
      lis.forEach((li, i) => {
        used += li.getBoundingClientRect().width + (i ? gap0 : 0);
        if (i && used > room0) li.hidden = true;
      });
      return;
    }
    // Products hidden at this width (desktop pairs show only three) stay put and don't count
    const items = [...first.children].filter((li) => getComputedStyle(li).display !== 'none');
    if (items.length < 2) return;
    const cs = getComputedStyle(first);
    const gap = parseFloat(cs.columnGap) || 0;
    const pad = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
    // A gift's shelf is only as long as its products, so its room is the column it sits in.
    // 20px of air is kept at the ends, so products never crowd the edge of the glass.
    const room = (unit.closest('.bundle') ? unit.parentElement.clientWidth : unit.clientWidth) - 20;
    const widths = items.map((li) => li.getBoundingClientRect().width);
    const fits = (from, to) => widths.slice(from, to).reduce((a, b) => a + b, 0) + gap * (to - from - 1) + pad <= room + 1;
    let rows = null;
    for (let k = 1; k <= items.length && !rows; k += 1) {
      const sizes = Array.from({ length: k }, (_, i) => Math.floor(items.length / k) + (i < items.length % k ? 1 : 0));
      let at = 0;
      const ok = sizes.every((n) => { const f = fits(at, at + n); at += n; return f; });
      if (ok || k === items.length) rows = sizes;
    }
    if (rows.length < 2) return;
    unit.classList.add('is-stacked');
    let at = rows[0];
    rows.slice(1).forEach((n) => {
      const tier = document.createElement('div');
      tier.className = 'shelf-tier';
      tier.innerHTML = `<ul class="${first.className}"></ul>${PLANK}`;
      $('ul', tier).append(...items.slice(at, at + n));
      unit.append(tier);
      at += n;
    });
  }
  const stackShelves = () => $$('.shelf-unit').forEach(stackShelf);
  stackShelves();
  // Phones fire resize as the address bar slides; only a change in width can change what fits.
  let shelfW = window.innerWidth;
  let shelfTimer = 0;
  window.addEventListener('resize', () => {
    if (window.innerWidth === shelfW) return;
    shelfW = window.innerWidth;
    clearTimeout(shelfTimer);
    shelfTimer = setTimeout(stackShelves, 150);
  }, { passive: true });
  window.addEventListener('load', stackShelves);

  /* Quick view */
  const qv = document.createElement('dialog');
  qv.className = 'qv';
  qv.setAttribute('aria-labelledby', 'qv-name');
  qv.innerHTML = `<div class="qv__inner">
      <div class="qv__stage" data-qv-stage>
        <img data-qv-img alt="">
        <img class="qv__print qv__main" data-qv-main alt="" hidden>
        <img class="qv__print qv__photo" data-qv-photo alt="" hidden>
        <div class="qv__video" data-qv-video hidden></div>
        <div class="qv__thumbs" data-qv-thumbs role="group" aria-label="Photos" hidden>
          <button type="button" data-qv-view="photo" aria-label="Amway photo"><img data-qv-thumb-photo alt=""></button>
          <button type="button" data-qv-view="product" aria-label="Product"><img data-qv-thumb-product alt=""></button>
          <button type="button" data-qv-view="video" aria-label="Video"><img data-qv-thumb-video alt=""></button>
        </div>
        <button class="qv__nav qv__nav--prev" type="button" data-qv-prev aria-label="Previous product">${ICON.prev}</button>
        <button class="qv__nav qv__nav--next" type="button" data-qv-next aria-label="Next product">${ICON.next}</button>
      </div>
      <div class="qv__body">
        <a class="qv__shelf" data-qv-shelf href="#"></a>
        <h2 class="qv__name" id="qv-name" data-qv-name></h2>
        <p class="qv__size" data-qv-size></p>
        <p class="qv__about" data-qv-about></p>
        <ul class="qv__points" data-qv-points></ul>
        <p class="qv__note" data-qv-note></p>
        <div class="qv__actions">
          <button class="btn btn--brass" type="button" data-qv-add></button>
          <a class="link" data-qv-buy target="_blank" rel="noopener">Buy on Amway<span class="sr-only"> (opens Amway)</span></a>
        </div>
        <p class="qv__member">New<span data-until="membership"> mid-November</span>: members save $40 on orders of $150 or more. <a href="membership.html" data-qv-member>About Amway Membership</a></p>
        <p class="qv__status" role="status" aria-live="polite" data-qv-status></p>
        <p class="qv__fine" data-qv-fine hidden>*†These statements have not been evaluated by the Food and Drug Administration. This product is not intended to diagnose, treat, cure or prevent any disease.</p>
      </div>
    </div>
    <button class="qv__close" type="button" data-qv-close aria-label="Close">${ICON.x}</button>`;
  document.body.append(qv);
  applyLaunches(qv);
  let qvId = null;
  let qvOpener = null;
  let qvList = null; // when opened from a need, the arrows step through that need's products
  const qvSiblings = (p) => (qvList ? qvList.map((id) => byId[id]).filter(Boolean) : PRODUCTS.filter((x) => x.shelf === p.shelf));

  function fillQuickView(id) {
    const p = byId[id];
    if (!p) return;
    qvId = id;
    const shelf = SHELF_INFO[p.shelf] || {};
    $('[data-qv-img]', qv).src = p.img;
    // Amway's lifestyle photo, when there is one: the quick view opens on it.
    const photo = $('[data-qv-photo]', qv);
    photo.hidden = !p.alt;
    photo.src = p.alt || '';
    photo.alt = p.alt ? `${p.name}, another view` : '';
    $('[data-qv-view="photo"]', qv).hidden = !p.alt;
    $('[data-qv-thumb-photo]', qv).src = p.alt || '';
    // Amway's own video, when there is one: the second slide, loaded only when chosen.
    $('[data-qv-video]', qv).hidden = !p.video;
    if (p.video) $('[data-qv-video]', qv).style.setProperty('--r', p.video.ratio || '16 / 9');
    $('[data-qv-view="video"]', qv).hidden = !p.video;
    $('[data-qv-thumb-video]', qv).src = p.video ? p.video.poster : '';
    // Slide order: lifestyle photo, video, main photo; or main photo, video when there's no lifestyle photo.
    // With mainFirst, the main photo and lifestyle photo trade places.
    const thumbs = $('[data-qv-thumbs]', qv);
    const [tPhoto, tProduct, tVideo] = ['photo', 'product', 'video'].map((v) => $(`[data-qv-view="${v}"]`, qv));
    if (p.alt && p.mainFirst) thumbs.append(tProduct, tVideo, tPhoto);
    else if (p.alt) thumbs.append(tPhoto, tVideo, tProduct); else thumbs.append(tPhoto, tProduct, tVideo);
    thumbs.hidden = !(p.alt || p.video);
    // Amway's main photo on white stands in for the cut-out here, when there is one.
    const main = $('[data-qv-main]', qv);
    main.hidden = !p.main;
    main.src = p.main || '';
    main.alt = p.main ? p.name : '';
    $('[data-qv-thumb-product]', qv).src = p.main || p.img;
    $('[data-qv-stage]', qv).classList.toggle('has-thumbs', !!(p.alt || p.video));
    $('[data-qv-stage]', qv).classList.toggle('photo-whole', !!p.altWhole);
    $('[data-qv-stage]', qv).classList.toggle('has-main', !!p.main);
    showQvView(p.alt && !p.mainFirst ? 'photo' : 'product');
    const sh = $('[data-qv-shelf]', qv);
    sh.textContent = shelf.name ? `The ${shelf.name.toLowerCase()} shelf` : '';
    sh.href = shelf.page || '#';
    $('[data-qv-name]', qv).textContent = p.name;
    $('[data-qv-size]', qv).textContent = p.size || '';
    $('[data-qv-size]', qv).hidden = !p.size;
    $('[data-qv-about]', qv).textContent = p.about || '';
    $('[data-qv-points]', qv).innerHTML = (p.points || []).map((t) => `<li>${esc(t)}</li>`).join('');
    const note = $('[data-qv-note]', qv);
    note.textContent = p.note && !isTodo(p.note) ? p.note : '';
    note.hidden = !note.textContent;
    $('[data-qv-buy]', qv).href = p.buyUrl || CONFIG.shopUrl;
    $('[data-qv-fine]', qv).hidden = !/[*†]/.test(`${p.about} ${(p.points || []).join(' ')}`);
    $('[data-qv-status]', qv).textContent = '';
    const sibs = qvSiblings(p);
    $('[data-qv-prev]', qv).hidden = sibs.length < 2;
    $('[data-qv-next]', qv).hidden = sibs.length < 2;
    syncAddButtons();
  }
  // Amway's video plays in Amway's own player, placed in the page (not a frame) so it can be told to stay sharp:
  // only the highest quality Amway offers, in the pop-up and in full screen, instead of starting blurry and catching up.
  let qvPlayer = null;
  let bcScript = null;
  function stopQvVideo() {
    if (qvPlayer) { qvPlayer.dispose(); qvPlayer = null; }
    $('[data-qv-video]', qv).replaceChildren();
  }
  function sharpenVideo(player) {
    // Set as soon as the source starts loading, so even the first seconds come in at the top quality
    const pick = () => {
      const vhs = player.tech(true) && player.tech(true).vhs;
      if (!vhs) return; // Safari plays it natively and picks its own quality
      const height = (pl) => (pl.attributes && pl.attributes.RESOLUTION ? pl.attributes.RESOLUTION.height : 0);
      vhs.selectPlaylist = () => {
        const main = vhs.playlists.main || vhs.playlists.master;
        return main.playlists.reduce((best, pl) => (height(pl) > height(best) ? pl : best));
      };
    };
    player.on('loadstart', pick);
    player.on('fullscreenchange', pick);
  }
  function playQvVideo(p) {
    const m = p.video.src.match(/brightcove\.net\/(\d+)\/([\w-]+)_default\/index\.html\?videoId=(\d+)/);
    if (!m) return;
    const [, account, player, videoId] = m;
    const el = document.createElement('video-js');
    Object.assign(el.dataset, { account, player, embed: 'default', videoId });
    el.className = 'video-js';
    el.setAttribute('controls', '');
    el.setAttribute('playsinline', '');
    el.setAttribute('poster', p.video.poster);
    el.setAttribute('aria-label', p.video.title || `${p.name} video`);
    $('[data-qv-video]', qv).append(el);
    const start = () => {
      if (!el.isConnected || !window.bc) return;
      qvPlayer = window.bc(el);
      sharpenVideo(qvPlayer);
      qvPlayer.ready(() => { const go = qvPlayer.play(); if (go && go.catch) go.catch(() => {}); });
    };
    if (window.bc) { start(); return; }
    if (!bcScript) {
      bcScript = document.createElement('script');
      bcScript.src = `https://players.brightcove.net/${account}/${player}_default/index.min.js`;
      document.head.append(bcScript);
    }
    bcScript.addEventListener('load', start, { once: true });
  }
  function showQvView(view) {
    const p = byId[qvId];
    stopQvVideo();
    if (view === 'video' && p && p.video) playQvVideo(p);
    $('[data-qv-stage]', qv).classList.toggle('is-photo', view === 'photo');
    $('[data-qv-stage]', qv).classList.toggle('is-video', view === 'video');
    $$('[data-qv-view]', qv).forEach((b) => b.setAttribute('aria-pressed', b.dataset.qvView === view));
  }
  qv.addEventListener('click', (e) => {
    const b = e.target.closest('[data-qv-view]');
    if (b) showQvView(b.dataset.qvView);
  });
  function openQuickView(id, from, list = null) {
    if (!byId[id]) return;
    if (menuOpen) closeMenu(false);
    qvOpener = from || null;
    qvList = list;
    fillQuickView(id);
    showDialog(qv);
    qv.dispatchEvent(new Event('qv:filled'));
    setTimeout(() => $('[data-qv-add]', qv).focus({ preventScroll: true }), reduced ? 0 : 60);
  }
  function closeQuickView(then) {
    stopQvVideo();
    hideDialog(qv, () => { if (then) then(); else if (qvOpener) qvOpener.focus({ preventScroll: true }); });
  }
  function stepQuickView(dir) {
    const p = byId[qvId];
    const sibs = qvSiblings(p);
    const i = sibs.findIndex((x) => x.id === qvId);
    fillQuickView(sibs[(i + dir + sibs.length) % sibs.length].id);
    qv.dispatchEvent(new Event('qv:filled'));
  }
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-product]');
    if (!b || qv.contains(b)) return;
    const inNeed = b.closest('[data-need-dialog]');
    const inBundle = b.closest('[data-bundle]');
    const bundle = inBundle && (window.UW_GIFTS || []).find((g) => g.id === inBundle.dataset.bundle);
    openQuickView(b.dataset.product, b, inNeed && needId ? needOf(needId).products : bundle ? bundle.products.filter((id) => byId[id]) : null);
  });
  $('[data-qv-close]', qv).addEventListener('click', () => closeQuickView());
  // On the Membership page, the membership line closes the pop-up (and any dialog under it) and glides to the card.
  $('[data-qv-member]', qv).addEventListener('click', (e) => {
    if (!$('.member__card')) return;
    e.preventDefault();
    closeQuickView(() => {
      $$('dialog[open]').forEach((d) => hideDialog(d));
      glideTo('#membership');
    });
  });
  $('[data-qv-prev]', qv).addEventListener('click', () => stepQuickView(-1));
  $('[data-qv-next]', qv).addEventListener('click', () => stepQuickView(1));
  qv.addEventListener('cancel', (e) => { e.preventDefault(); closeQuickView(); });
  qv.addEventListener('click', (e) => { if (e.target === qv) closeQuickView(); });
  qv.addEventListener('keydown', (e) => {
    if (e.target.closest('input, textarea, select')) return;
    if (e.key === 'ArrowLeft') stepQuickView(-1);
    if (e.key === 'ArrowRight') stepQuickView(1);
  });
  $('[data-qv-add]', qv).addEventListener('click', () => {
    const r = toggleShelf(qvId);
    const status = $('[data-qv-status]', qv);
    if (r === 'full') status.innerHTML = 'Your shelf holds 3. <button class="link" type="button" data-ys-open>Open your shelf</button> to swap one out.';
    else status.textContent = r === 'added' ? `Added. ${ys.length} of ${YS_MAX} on your shelf.` : 'Removed from your shelf.';
  });

  /* Your shelf: add, remove, and keep every button in step */
  function toggleShelf(id) {
    if (onShelf(id)) { ys = ys.filter((x) => x !== id); ysSave(); syncShelf(); return 'removed'; }
    if (ys.length >= YS_MAX) return 'full';
    ys.push(id); ysSave(); syncShelf(true); return 'added';
  }
  function syncAddButtons() {
    const add = $('[data-qv-add]', qv);
    if (qvId) {
      const on = onShelf(qvId);
      add.textContent = on ? 'On your shelf ✓' : 'Add to your shelf';
      add.setAttribute('aria-pressed', on ? 'true' : 'false');
    }
    $$('[data-ys-toggle]').forEach((b) => {
      const on = onShelf(b.dataset.ysToggle);
      b.textContent = on ? 'On your shelf ✓' : 'Add to your shelf';
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      b.classList.toggle('btn--brass', on);
      b.classList.toggle('btn--line-dark', !on);
    });
    $$('.pick, .fav').forEach((b) => {
      const li = b.parentElement;
      const mark = $('.pick__added', li);
      if (onShelf(b.dataset.product) && !mark) li.insertAdjacentHTML('beforeend', `<span class="pick__added" aria-hidden="true">${ICON.check}</span>`);
      else if (!onShelf(b.dataset.product) && mark) mark.remove();
    });
  }
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-ys-toggle]');
    if (!b) return;
    const r = toggleShelf(b.dataset.ysToggle);
    if (r === 'full') openShelfPanel(b, 'Your shelf holds 3. Remove one to add another.');
  });

  // The pill that follows visitors around once something is on their shelf.
  const pill = document.createElement('button');
  pill.type = 'button';
  pill.className = 'ys-pill';
  pill.innerHTML = `<span class="ys-pill__mark">${ICON.shelf}</span><span>Your shelf</span><span class="ys-pill__count" data-ys-count>0</span>`;
  document.body.append(pill);
  pill.addEventListener('click', () => openShelfPanel(pill));

  // The panel: the visitor's picks, then one request form for all of them.
  const panel = document.createElement('dialog');
  panel.className = 'drawer';
  panel.setAttribute('aria-labelledby', 'ys-title');
  panel.innerHTML = `<div class="drawer__panel">
      <div class="drawer__head">
        <h2 class="drawer__title" id="ys-title">Your shelf</h2>
        <button class="drawer__close" type="button" data-ys-close aria-label="Close">${ICON.x}</button>
      </div>
      <div data-ys-main>
        <p class="ys-intro">Save up to 3 you’re curious about. Send me your shelf and I’ll reach out to talk them through &amp; we’ll chat about free samples, where it makes sense.</p>
        <p class="qv__status" role="status" aria-live="polite" data-ys-status></p>
        <ul class="ys-list" data-ys-list></ul>
        <p class="ys-start" data-ys-start hidden>Not sure what to pick? <button class="btn btn--small btn--brass" type="button" data-open-quiz>Start here</button></p>
        <form class="mform" data-form="shelf" novalidate data-ys-form>
          <input type="hidden" name="picks" data-ys-samples>
          <div class="field--row field--names">
            <div class="field">
              <label for="ys-first">First name</label>
              <input id="ys-first" name="first_name" type="text" autocomplete="given-name" required aria-describedby="ys-first-error">
              <p class="field-error" id="ys-first-error"></p>
            </div>
            <div class="field">
              <label for="ys-last">Last name</label>
              <input id="ys-last" name="last_name" type="text" autocomplete="family-name" required aria-describedby="ys-last-error">
              <p class="field-error" id="ys-last-error"></p>
            </div>
          </div>
          <div class="field">
            <label for="ys-phone">Mobile number</label>
            <input id="ys-phone" name="phone" type="tel" autocomplete="tel" inputmode="tel" required aria-describedby="ys-phone-error">
            <p class="field-error" id="ys-phone-error"></p>
          </div>
          <div class="field">
            <label id="ys-reach-label">How should I reach you?</label>
            <div class="chips" role="radiogroup" aria-labelledby="ys-reach-label">
              <label class="chip"><input type="radio" name="reach" value="Text" checked><span>Text</span></label>
              <label class="chip"><input type="radio" name="reach" value="Call"><span>Call</span></label>
            </div>
          </div>
          <div class="field">
            <label for="ys-time">Best time to reach me <span class="opt">(optional)</span></label>
            <input id="ys-time" name="best_time" type="text" placeholder="Weekday evenings, Saturday mornings…">
          </div>
          <div class="field">
            <label for="ys-address">Address for samples <span class="opt">(optional)</span></label>
            <input id="ys-address" name="address" type="text" autocomplete="street-address" aria-describedby="ys-address-hint">
            <p class="field-hint" id="ys-address-hint">Samples on me, while supplies last. Dropped off near Lincoln, or mailed anywhere in the US.</p>
          </div>
          <div class="field field--check">
            <input id="ys-consent" name="consent" type="checkbox" required aria-describedby="ys-consent-error">
            <label for="ys-consent">Yes, you may contact me about my shelf. I can opt out anytime.</label>
            <p class="field-error" id="ys-consent-error"></p>
          </div>
          <button class="btn btn--brass btn--block" type="submit">Send my Shelf</button>
        </form>
      </div>
      <div class="mdone" data-ys-done hidden tabindex="-1">
        <svg class="mdone__arch" viewBox="0 0 60 72" aria-hidden="true"><path d="M2 70V30a28 28 0 0 1 56 0v40"/><path d="M18 40l9 9 16-18"/></svg>
        <p class="mdone__title">Thanks, <span data-ys-done-name>friend</span>!</p>
        <p data-ys-done-text></p>
        <p data-ys-done-reply></p>
        <p class="mdone__preview" data-ys-preview hidden>Preview only: this form isn’t connected yet, so nothing was sent.</p>
        <div class="mdone__actions"><button class="btn btn--line-dark" type="button" data-ys-close>Keep looking around</button>${IG_FOLLOW}</div>
      </div>
    </div>`;
  document.body.append(panel);
  const ysForm = $('[data-ys-form]', panel);
  const validateSamples = wireValidation(ysForm);
  let ysOpener = null;

  function renderShelfList() {
    const list = $('[data-ys-list]', panel);
    const items = ys.map((id) => {
      const p = byId[id];
      const shelf = SHELF_INFO[p.shelf] || {};
      return `<li class="ys-item"><img src="${p.img}" alt=""><div><p class="ys-item__name">${esc(p.name)}</p><p class="ys-item__shelf">${esc(shelf.name || '')}</p></div><button class="ys-item__remove" type="button" data-ys-remove="${id}" aria-label="Remove ${esc(p.name)}">${ICON.x}</button></li>`;
    });
    for (let i = ys.length; i < YS_MAX; i += 1) items.push(`<li class="ys-slot">${i === 0 ? 'Tap “Add to your shelf” on any product' : 'Room for one more'}</li>`);
    list.innerHTML = items.join('');
    ysForm.hidden = ys.length === 0;
    $('[data-ys-start]', panel).hidden = ys.length > 0;
    $('[data-ys-samples]', panel).value = ys.map((id) => byId[id].name).join('; ');
  }
  function syncShelf(added = false) {
    $('[data-ys-count]', pill).textContent = ys.length;
    pill.setAttribute('aria-label', `Your shelf: ${ys.length} of ${YS_MAX} picks`);
    pill.classList.toggle('is-shown', ys.length > 0);
    if (added && !reduced) { pill.classList.remove('is-bump'); void pill.offsetWidth; pill.classList.add('is-bump'); }
    renderShelfList();
    syncAddButtons();
  }
  function openShelfPanel(from, message = '') {
    if (menuOpen) closeMenu(false);
    const go = () => {
      ysOpener = from || null;
      if (!$('[data-ys-done]', panel).hidden) resetShelfForm();
      $('[data-ys-status]', panel).textContent = message;
      renderShelfList();
      showDialog(panel);
      setTimeout(() => $('[data-ys-close]', panel).focus({ preventScroll: true }), reduced ? 0 : 350);
    };
    if (qv.open) closeQuickView(go); else go();
  }
  function closeShelfPanel() {
    hideDialog(panel, () => { if (ysOpener && document.body.contains(ysOpener)) ysOpener.focus({ preventScroll: true }); });
  }
  function resetShelfForm() {
    ysForm.reset();
    $$('[aria-invalid]', ysForm).forEach((f) => f.removeAttribute('aria-invalid'));
    $$('.field-error', ysForm).forEach((f) => { f.textContent = ''; });
    $$('[data-touched]', ysForm).forEach((f) => delete f.dataset.touched);
    $('[data-ys-done]', panel).hidden = true;
    $('[data-ys-done]', panel).classList.remove('is-shown');
    $('[data-ys-main]', panel).hidden = false;
  }
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-ys-open]')) openShelfPanel(e.target.closest('[data-ys-open]'));
  });
  panel.addEventListener('click', (e) => {
    if (e.target === panel || e.target.closest('[data-ys-close]')) { closeShelfPanel(); return; }
    const rm = e.target.closest('[data-ys-remove]');
    if (rm) { toggleShelf(rm.dataset.ysRemove); $('[data-ys-status]', panel).textContent = ''; const next = $('[data-ys-remove]', panel) || $('[data-ys-close]', panel); next.focus(); }
  });
  panel.addEventListener('cancel', (e) => { e.preventDefault(); closeShelfPanel(); });
  ysForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!ys.length || !validateSamples()) return;
    const btn = $('button[type="submit"]', ysForm);
    btn.disabled = true;
    btn.textContent = 'Sending…';
    try {
      const names = ys.map((id) => byId[id].name);
      const preview = await send(ysForm, 'shelf');
      $('[data-ys-done-name]', panel).textContent = $('#ys-first').value.trim().split(' ')[0];
      $('[data-ys-done-text]', panel).textContent = `I’ll reach out about the ${listOf(names)} you shelved & we’ll chat about free samples, where it makes sense.`;
      // The reply line follows how they asked to be reached.
      const by = ($('input[name="reach"]:checked', ysForm) || {}).value === 'Call' ? 'with a call' : 'by text';
      $('[data-ys-done-reply]', panel).textContent = `I read every one myself, so expect a real reply from me ${by}.`;
      $('[data-ys-preview]', panel).hidden = !preview;
      $('[data-ys-main]', panel).hidden = true;
      const doneEl = $('[data-ys-done]', panel);
      doneEl.hidden = false;
      requestAnimationFrame(() => doneEl.classList.add('is-shown'));
      doneEl.focus();
      ys = []; ysSave(); syncShelf();
    } catch {
      $('[data-ys-status]', panel).textContent = 'That didn’t go through. Please try again in a moment.';
    } finally {
      btn.disabled = false;
      btn.textContent = 'Send my Shelf';
    }
  });
  syncShelf();

  /* Shop by need: a row of needs; each opens a pop-up with that need's products */
  const NEEDS = (window.UW_NEEDS || []).filter((n) => n.products.some((id) => byId[id]));
  const needOf = (id) => NEEDS.find((n) => n.id === id);
  let needId = null;
  $$('[data-needs-list]').forEach((ul) => {
    ul.innerHTML = NEEDS.map((n) => `<li><button class="need-pill" type="button" data-need="${n.id}">${esc(n.name)}</button></li>`).join('');
  });
  const needDlg = document.createElement('dialog');
  needDlg.className = 'qv need';
  needDlg.setAttribute('aria-labelledby', 'need-name');
  needDlg.setAttribute('data-need-dialog', '');
  needDlg.innerHTML = `<div class="need__inner">
      <p class="eyebrow">Shop by need</p>
      <h2 class="need__name" id="need-name" data-need-name></h2>
      <p class="need__line" data-need-line></p>
      <ul class="need__grid" data-need-grid></ul>
      <div class="need__foot">
        <a class="link" data-need-amway target="_blank" rel="noopener"></a>
        <p class="need__start">Not sure what fits? <button class="btn btn--small btn--brass" type="button" data-open-quiz>Start here</button></p>
      </div>
      <p class="qv__fine">*†These statements have not been evaluated by the Food and Drug Administration. These products are not intended to diagnose, treat, cure or prevent any disease.</p>
    </div>
    <button class="qv__close" type="button" data-need-close aria-label="Close">${ICON.x}</button>`;
  document.body.append(needDlg);
  let needOpener = null;
  function openNeed(id, from) {
    const n = needOf(id);
    if (!n) return;
    if (menuOpen) closeMenu(false);
    needId = id;
    needOpener = from || null;
    $('[data-need-name]', needDlg).textContent = n.name;
    $('[data-need-line]', needDlg).textContent = n.line;
    $('[data-need-grid]', needDlg).innerHTML = n.products.map((pid) => byId[pid]).filter(Boolean).map((p) => `<li class="need-card">
        <div class="shelf-unit">
          <ul class="shelf-unit__items"><li style="${shelfVars(p)}"><button class="pick" type="button" data-product="${p.id}" aria-label="${esc(p.name)}: see details"><img src="${p.img}" width="${p.w}" height="${p.h}" alt="" loading="lazy" decoding="async"></button></li></ul>
          <div class="plank" aria-hidden="true"><span class="plank__top"></span><span class="plank__front"></span></div>
        </div>
        <p class="need-card__name"><button class="product__open" type="button" data-product="${p.id}">${esc(p.name)}</button></p>
        <button class="btn btn--small btn--line-dark" type="button" data-ys-toggle="${p.id}"></button>
      </li>`).join('');
    // Shelves are only as tall as the tallest product in this need, so nothing floats in empty space.
    const tallest = Math.max(...n.products.map((pid) => (byId[pid] ? byId[pid].cm : 0)));
    $('[data-need-grid]', needDlg).style.setProperty('--tall', tallest);
    const a = $('[data-need-amway]', needDlg);
    a.href = n.amwayUrl || CONFIG.shopUrl;
    a.innerHTML = `Shop all ${esc(n.name)} on Amway<span class="sr-only"> (opens Amway)</span>`;
    syncAddButtons();
    const inner = $('.need__inner', needDlg);
    inner.scrollTop = 0;
    showDialog(needDlg);
    requestAnimationFrame(() => needFade(inner));
    setTimeout(() => $('[data-need-close]', needDlg).focus({ preventScroll: true }), reduced ? 0 : 60);
  }
  function closeNeed() {
    hideDialog(needDlg, () => { needId = null; if (needOpener && document.body.contains(needOpener)) needOpener.focus({ preventScroll: true }); });
  }
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-need]');
    if (b) openNeed(b.dataset.need, b);
  });
  // A soft fade at the bottom says "there's more below" until you reach the end.
  const needFade = (el) => el.classList.toggle('has-more', el.scrollHeight - el.scrollTop - el.clientHeight > 8);
  $('.need__inner', needDlg).addEventListener('scroll', (e) => needFade(e.currentTarget), { passive: true });
  window.addEventListener('resize', () => { if (needDlg.open) needFade($('.need__inner', needDlg)); }, { passive: true });
  // The product pop-up gets the same fade, and each product starts at the top.
  const qvInner = $('.qv__inner', qv);
  qvInner.addEventListener('scroll', () => needFade(qvInner), { passive: true });
  window.addEventListener('resize', () => { if (qv.open) needFade(qvInner); }, { passive: true });
  qv.addEventListener('qv:filled', () => { qvInner.scrollTop = 0; requestAnimationFrame(() => needFade(qvInner)); });
  $('[data-need-close]', needDlg).addEventListener('click', closeNeed);
  needDlg.addEventListener('cancel', (e) => { e.preventDefault(); closeNeed(); });
  needDlg.addEventListener('click', (e) => { if (e.target === needDlg) closeNeed(); });
  // Starting the survey from a need closes the need first, so the survey isn't stacked on top.
  $('[data-open-quiz]', needDlg).addEventListener('click', () => { hideDialog(needDlg, () => { needId = null; }); }, true);

  /* ---------- The doorbell ----------
     A soft two-note ding-dong, made in the browser (no sound file). Browsers only allow sound after a
     tap, click or key, so it rings on the visitor's first one during the opening, or on clicking the door,
     and only once a visit. */
  function ringDoorbell() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try { if (sessionStorage.getItem('uw-bell-rung') === '1') return; sessionStorage.setItem('uw-bell-rung', '1'); } catch (e) {
      if (ringDoorbell.rung) return;
    }
    ringDoorbell.rung = true;
    const ctx = new AC();
    if (ctx.state === 'suspended') ctx.resume();
    const out = ctx.createGain();
    out.gain.value = 0.32;
    out.connect(ctx.destination);
    const tone = (freq, at, peak, fade) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(peak, at + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, at + fade);
      osc.connect(g).connect(out);
      osc.start(at);
      osc.stop(at + fade + 0.05);
    };
    // The faint tap of the striker on the bar.
    const tap = (at) => {
      const len = Math.ceil(ctx.sampleRate * 0.01);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const ch = buf.getChannelData(0);
      for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 4);
      const src = ctx.createBufferSource();
      const hp = ctx.createBiquadFilter();
      const g = ctx.createGain();
      src.buffer = buf;
      hp.type = 'highpass';
      hp.frequency.value = 2500;
      g.gain.value = 0.04;
      src.connect(hp).connect(g).connect(out);
      src.start(at);
    };
    // Each bar: a long-ringing tone plus brief, quiet overtones (a metal bar's partials), struck softly.
    const bar = (freq, partials, at, level) => {
      tone(freq, at, level, 5.5);
      partials.forEach(([mult, l, fade]) => tone(freq * mult, at, level * l * 0.4, fade));
      tap(at);
    };
    const t = ctx.currentTime + 0.05;
    bar(759, [[2.68, 0.13, 0.45], [5.29, 0.08, 0.3]], t, 0.5);                     // ding
    bar(624, [[2.68, 0.1, 0.4], [5.3, 0.1, 0.35], [9.3, 0.04, 0.25]], t + 0.42, 0.4); // dong, a minor third down
    setTimeout(() => ctx.close(), 6500);
  }

  /* ---------- The front door (hero) ----------
     One value, --o, drives the swing, the light in the room, the beams, the spill on the floor
     and the sheen on the brass. It rests slightly ajar after the page loads; scrolling opens it;
     hovering the door or the Start here button opens it further. */
  const scene = $('[data-scene]');
  const welcome = $('[data-welcome]');
  const door = { rest: 0, scroll: 0, hover: 0 };
  const sheen = $('#uw-brass-body');
  // Only touch the page when the door actually moves: rewriting the same value still makes
  // Chrome repaint the scene, and a repaint while the scene is zooming shows as flicker.
  let lastO = '';
  const renderDoor = () => {
    if (!scene) return;
    const o = Math.max(door.rest, door.scroll, door.hover * 0.85);
    const v = o.toFixed(3);
    if (v === lastO) return;
    lastO = v;
    scene.style.setProperty('--o', v);
    if (sheen) sheen.setAttribute('gradientTransform', `translate(${(-0.24 * o).toFixed(3)} 0)`);
  };
  if (scene) {
    // Clicking the door rings the bell (once a visit) and walks you through it, to meet Chelsea.
    scene.addEventListener('click', () => { ringDoorbell(); glideTo('#note'); });
    if (motion) {
      renderDoor();
      const hoverTo = (val) => gsap.to(door, {
        hover: val, duration: val ? 1.8 : 1.2, ease: val ? 'power3.out' : 'power2.inOut', onUpdate: renderDoor, overwrite: 'auto',
      });
      if (finePointer) {
        scene.addEventListener('pointerenter', () => hoverTo(1));
        scene.addEventListener('pointerleave', () => hoverTo(0));
      }
      const qbtn = $('[data-open-quiz]', welcome);
      qbtn.addEventListener('focus', () => hoverTo(1));
      qbtn.addEventListener('blur', () => hoverTo(0));
      qbtn.addEventListener('pointerenter', () => hoverTo(1));
      qbtn.addEventListener('pointerleave', () => hoverTo(0));
    }
  }

  /* ---------- Shelf preview that trails the pointer ---------- */
  const preview = $('[data-shelf-preview]');
  const shelfList = $('[data-shelves]');
  if (preview && shelfList && finePointer && hasGsap) {
    const imgs = Object.fromEntries($$('[data-preview-img]', preview).map((p) => [p.dataset.previewImg, p]));
    const w = () => preview.offsetWidth;
    const xTo = gsap.quickTo(preview, 'x', { duration: reduced ? 0 : 0.7, ease: 'power3' });
    const yTo = gsap.quickTo(preview, 'y', { duration: reduced ? 0 : 0.7, ease: 'power3' });
    const rTo = gsap.quickTo(preview, 'rotation', { duration: 0.9, ease: 'power3' });
    let px = 0;
    let shown = false;
    // The preview lives in the empty right-hand column and glides with the pointer's height.
    shelfList.addEventListener('pointermove', (e) => {
      const r = shelfList.getBoundingClientRect();
      const x = r.right - w() + (e.clientX - r.left - r.width / 2) * 0.05;
      const y = e.clientY - w() * 0.62;
      if (!shown) { gsap.set(preview, { x, y }); }
      xTo(x); yTo(y);
      if (!reduced) rTo(gsap.utils.clamp(-7, 7, (e.clientX - px) * 0.5));
      px = e.clientX;
    });
    $$('.shelf', shelfList).forEach((s) => {
      s.addEventListener('pointerenter', () => {
        Object.values(imgs).forEach((p) => p.classList.toggle('is-active', p === imgs[s.dataset.preview]));
        if (!shown) {
          shown = true;
          gsap.to(preview, { autoAlpha: 1, scale: 1, duration: reduced ? 0 : 0.5, ease: 'expo.out', overwrite: 'auto' });
        }
      });
    });
    gsap.set(preview, { scale: 0.85, transformOrigin: '50% 100%' });
    shelfList.addEventListener('pointerleave', () => {
      shown = false;
      gsap.to(preview, { autoAlpha: 0, scale: 0.85, duration: reduced ? 0 : 0.35, ease: 'power2.in', overwrite: 'auto' });
    });
    // Load the preview images as soon as the shelves come near.
    $$('img', preview).forEach((i) => { i.loading = 'eager'; });
  }

  /* ---------- Opening intro ----------
     First visit per session (decided in the homepage <head>): the logo's arch draws itself in brass,
     its double door swings open onto warm light, the name rises in, then the screen parts like two
     doors and the hero's own entrance begins. Any tap, click, key or scroll skips ahead to the doors. */
  function playIntro(el, then) {
    const q = (s) => $(s, el);
    const words = $$('.intro__mask > span', el);
    let handedOff = false;
    const handOff = () => { if (handedOff) return; handedOff = true; lockScroll(false); then(); };
    lockScroll(true);
    gsap.set(words, { yPercent: 110 });
    const tl = gsap.timeline({ onComplete: () => { html.classList.remove('has-intro'); el.remove(); } })
      .to(q('.intro__sill'), { strokeDashoffset: 0, duration: 0.45, ease: 'power2.inOut' }, 0)
      .to(q('.intro__arch'), { strokeDashoffset: 0, duration: 0.9, ease: 'power2.inOut' }, 0.15)
      .to($$('.intro__leaf', el), { scaleX: 0.12, duration: 0.8, ease: 'power3.inOut' }, 0.95)
      .fromTo(q('.intro__light'), { opacity: 0.25 }, { opacity: 1, duration: 0.8, ease: 'power2.out' }, 1)
      .to(words, { yPercent: 0, duration: 0.9, stagger: 0.12, ease: 'expo.out' }, 1.15)
      .addLabel('out', 2.45)
      .to(q('.intro__stage'), { autoAlpha: 0, duration: 0.35, ease: 'power1.in' }, 'out')
      .add(handOff, 'out+=0.1')
      .to(q('.intro__panel--l'), { xPercent: -100, duration: 0.9, ease: 'power3.inOut' }, 'out+=0.1')
      .to(q('.intro__panel--r'), { xPercent: 100, duration: 0.9, ease: 'power3.inOut' }, 'out+=0.1');
    const skip = () => {
      ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach((ev) => window.removeEventListener(ev, skip));
      if (tl.time() < tl.labels.out) tl.seek('out');
    };
    ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach((ev) => window.addEventListener(ev, skip, { passive: true }));
    // The first tap, click or key while the doors open rings the bell (phones only allow it once a tap ends).
    const bellEvents = ['click', 'touchend', 'keydown'];
    const ring = () => { bellEvents.forEach((ev) => window.removeEventListener(ev, ring)); ringDoorbell(); };
    bellEvents.forEach((ev) => window.addEventListener(ev, ring, { passive: true }));
    tl.eventCallback('onComplete', () => { bellEvents.forEach((ev) => window.removeEventListener(ev, ring)); html.classList.remove('has-intro'); el.remove(); });
  }

  /* ---------- Motion ---------- */
  if (!motion) { html.classList.remove('will-intro', 'has-intro'); return; }

  const ready = Promise.race([
    document.fonts ? document.fonts.ready : Promise.resolve(),
    new Promise((r) => setTimeout(r, 700)),
  ]);

  ready.then(() => {
    /* Hero: the headline rises, then the door eases open a crack. */
    // Shelf pages have no hero, so this only runs on the homepage.
    const title = $('[data-hero-title]');
    if (title) {
      const split = window.SplitText ? new SplitText(title, { type: 'lines', mask: 'lines', linesClass: 'line' }) : null;
      const lines = split ? split.lines : [title];

      gsap.set(lines, { yPercent: 108 });
      gsap.set(title, { autoAlpha: 1 });
      gsap.set('[data-hero-fade]', { autoAlpha: 0, y: 18 });
      gsap.set(header, { autoAlpha: 0 });
      html.classList.remove('will-intro');

      // The living scene (palm, shadows, glow, motes) starts with the hero's entrance, and rests while off-screen.
      if (scene && 'IntersectionObserver' in window) {
        new IntersectionObserver(([e]) => {
          scene.classList.toggle('is-still', !e.isIntersecting);
          html.classList.toggle('hero-in-view', e.isIntersecting);
        }).observe(scene);
      }
      const heroIn = () => (scene && scene.classList.add('is-live'), gsap.timeline({ defaults: { ease: 'expo.out' } }))
        .to(lines, { yPercent: 0, duration: 1.1, stagger: 0.08 }, 0.1)
        .to('[data-hero-fade]', { autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.08 }, 0.5)
        .to(header, { autoAlpha: 1, duration: 0.8 }, 0.4)
        .to(door, { rest: 0.22, duration: 2.2, ease: 'power2.inOut', onUpdate: renderDoor }, 0.6);

      const intro = $('[data-intro]');
      if (intro && html.classList.contains('has-intro')) playIntro(intro, heroIn);
      else { if (intro) intro.remove(); heroIn(); }
    } else {
      html.classList.remove('will-intro');
    }

    /* Scroll: on desktop the hero holds while the door opens, then we walk through it.
       On phones the door simply opens as it scrolls past. */
    if (scene) {
      const copy = $('[data-hero-copy]');
      const doorOrigin = () => {
        const o = $('.opening', scene).getBoundingClientRect();
        const r = scene.getBoundingClientRect();
        return `${((o.left + o.width * 0.74 - r.left) / r.width) * 100}% ${((o.top + o.height * 0.6 - r.top) / r.height) * 100}%`;
      };
      const mm = gsap.matchMedia();
      mm.add('(min-width: 900px) and (min-height: 600px)', () => {
        gsap.set(scene, { transformOrigin: doorOrigin() });
        gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: {
            trigger: welcome, start: 'top top', end: 'bottom bottom', scrub: 0.6,
            onRefresh: () => gsap.set(scene, { transformOrigin: doorOrigin() }),
            // The living scene rests while it zooms, so nothing inside the scaling scene redraws
            // (it used to wake up mid-zoom when scrolling back up, and Chrome flickered).
            onUpdate: (self) => scene.classList.toggle('is-zooming', self.progress > 0.55),
          },
        })
          // The door opens all the way before the zoom starts: changing it mid-zoom made Chrome
          // repaint the whole scaling scene every frame, which flickered.
          .to(door, { scroll: 1.2, duration: 0.55, ease: 'power2.inOut', onUpdate: renderDoor }, 0)
          .to(copy, { autoAlpha: 0, x: -40, duration: 0.22, ease: 'power1.in' }, 0.58)
          // A gentle step toward the doorway (a deep zoom just magnifies the photo into a blur),
          // then the scene gives way to the next section's oat.
          .to(scene, { scale: 2.4, duration: 0.42, ease: 'power2.in' }, 0.58)
          .to('[data-hero-veil]', { autoAlpha: 1, duration: 0.16, ease: 'power1.in' }, 0.84);
      });
      mm.add('(max-width: 899px), (max-height: 599px)', () => {
        gsap.to(door, { scroll: 1, ease: 'power2.inOut', onUpdate: renderDoor, scrollTrigger: { trigger: scene, start: 'top 85%', end: 'bottom 35%', scrub: 1.2 } });
      });
    }

    /* Section headings marked data-rise: the lines rise into place once, like the hero title,
       and their eyebrow and intro follow. */
    $$('[data-rise]').forEach((h) => {
      const head = h.closest('.section-head') || h.parentElement;
      const lines = window.SplitText ? new SplitText(h, { type: 'lines', mask: 'lines', linesClass: 'line' }).lines : [h];
      const after = $$('[data-rise-after]', head);
      gsap.set(lines, { yPercent: 108 });
      gsap.set(after, { autoAlpha: 0, y: 14 });
      gsap.timeline({ defaults: { ease: 'expo.out' }, scrollTrigger: { trigger: head, start: 'top 80%', toggleActions: 'play none none none' } })
        .to(lines, { yPercent: 0, duration: 1.1, stagger: 0.09 }, 0)
        .to(after, { autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.08 }, 0.35);
    });

    /* Amway Membership: the card rises in, its figures count up, and the tiles land one by one as their icons draw. */
    const card = $('.member__card');
    if (card) {
      const count = (el) => {
        const end = +el.dataset.count;
        const n = { v: 0 };
        el.textContent = '0';
        return gsap.to(n, { v: end, duration: 1.6, ease: 'power2.out', onUpdate: () => { el.textContent = Math.round(n.v); } });
      };
      const tiles = (list) => {
        const items = $$('li', list);
        const marks = items.map((li) => $$('svg path, svg circle', li));
        gsap.set(items, { autoAlpha: 0, y: 24 });
        marks.flat().forEach((m) => gsap.set(m, { strokeDasharray: 1, strokeDashoffset: 1 }));
        const t = gsap.timeline();
        items.forEach((li, i) => {
          t.to(li, { autoAlpha: 1, y: 0, duration: 0.8, ease: 'expo.out' }, i * 0.12)
            .to(marks[i], { strokeDashoffset: 0, duration: 1, ease: 'power2.inOut' }, i * 0.12 + 0.1);
          const num = $('[data-count]', li);
          if (num) t.add(count(num), i * 0.12 + 0.1);
        });
        return t;
      };
      gsap.set(card, { autoAlpha: 0, y: 60 });
      gsap.set('.member__actions', { autoAlpha: 0, y: 14 });
      const tl = gsap.timeline({ scrollTrigger: { trigger: card, start: 'top 80%', toggleActions: 'play none none none' } })
        .to(card, { autoAlpha: 1, y: 0, duration: 1.2, ease: 'expo.out' }, 0);
      $$('.member__fig [data-count]', card).forEach((el, i) => tl.add(count(el), 0.35 + i * 0.2));
      $$('.member__perks', card).forEach((list, i) => tl.add(tiles(list), 0.5 + i * 0.45));
      tl.to('.member__actions', { autoAlpha: 1, y: 0, duration: 0.8, ease: 'expo.out' }, 1.2);
    }

    /* Statement: words brighten at reading pace. */
    const st = $('[data-statement]');
    if (st && window.SplitText) {
      const words = new SplitText(st, { type: 'words' }).words;
      gsap.fromTo(words, { opacity: 0.16 }, {
        opacity: 1, stagger: 0.12, ease: 'none',
        scrollTrigger: { trigger: st, start: 'top 80%', end: 'bottom 45%', scrub: true },
      });
    }
    if ($('.statement__arch')) gsap.fromTo('.statement__arch', { yPercent: -30 }, { yPercent: -54, ease: 'none', scrollTrigger: { trigger: '.statement', start: 'top bottom', end: 'bottom top', scrub: true } });

    /* Follow-through (How it works, and the About page's promises): the brass line fills as you read, each step lights up. */
    $$('[data-follow-fill]').forEach((fill) => gsap.to(fill, {
      scaleY: 1, ease: 'none',
      scrollTrigger: { trigger: $('ol, ul', fill.closest('.follow__steps, .creed-wrap')), start: 'top 62%', end: 'bottom 62%', scrub: true },
    }));
    $$('[data-step]').forEach((s) => {
      ScrollTrigger.create({ trigger: s, start: 'top 62%', onEnter: () => s.classList.add('is-active'), onLeaveBack: () => s.classList.remove('is-active') });
    });

    /* Arched photos open like doorways as they arrive. */
    $$('[data-reveal-img]').forEach((el) => {
      const ph = $('.ph', el);
      gsap.timeline({ scrollTrigger: { trigger: el, start: 'top 88%', toggleActions: 'play none none none' } })
        .fromTo(el, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.5, ease: 'expo.inOut', clearProps: 'clipPath' })
        .fromTo(ph, { scale: 1.2 }, { scale: 1, duration: 2.2, ease: 'expo.out' }, 0.1);
    });

    /* About page snapshots: each print settles onto the pile once, then hands its tilt back to CSS (for the hover). */
    if ($('.snaps')) gsap.from('.snap', {
      autoAlpha: 0, y: 28, scale: 0.96, duration: 0.9, stagger: 0.12, ease: 'power3.out', clearProps: 'transform,opacity,visibility',
      scrollTrigger: { trigger: '.snaps', start: 'top 80%', toggleActions: 'play none none none' },
    });

    /* Interlude: slow parallax. */
    if ($('[data-parallax]')) gsap.fromTo('[data-parallax]', { yPercent: -7 }, { yPercent: 7, ease: 'none', scrollTrigger: { trigger: '.interlude', start: 'top bottom', end: 'bottom top', scrub: true } });

    ScrollTrigger.refresh();
  });
})();
