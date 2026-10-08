/* Bessus Tattoo — interactions */
(() => {
  'use strict';

  /* ---------- Config ---------- */
  const CONFIG = {
    email: 'dima.b@mail.de',
    whatsapp: '4915772986692',
    // Optional: Web3Forms access key (https://web3forms.com). Leer = Anfrage öffnet das E-Mail-Programm.
    web3formsKey: '',
    initialTiles: 12,
  };

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const lerp = (a, b, t) => a + (b - a) * t;

  /* ---------- Loader ---------- */
  const loader = $('.loader');
  const ready = () => document.body.classList.add('is-ready');
  if (root.classList.contains('no-loader') || reduced || !loader) {
    ready();
  } else {
    const count = $('.loader__count', loader);
    const start = performance.now();
    const dur = 1300;
    const tick = (now) => {
      const p = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      count.textContent = String(Math.round(eased * 100)).padStart(2, '0');
      if (p < 1) return requestAnimationFrame(tick);
      loader.classList.add('is-done');
      setTimeout(ready, 350);
      try { sessionStorage.setItem('bessus-loaded', '1'); } catch (e) { /* ignore */ }
    };
    requestAnimationFrame(tick);
  }

  /* ---------- Split headings into words ---------- */
  $$('.split').forEach((el) => {
    let i = 0;
    const walk = (node) => {
      [...node.childNodes].forEach((child) => {
        if (child.nodeType === 3) {
          const frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            const w = document.createElement('span');
            w.className = 'w';
            const inner = document.createElement('span');
            inner.textContent = part;
            inner.style.transitionDelay = `${i++ * 0.07}s`;
            w.appendChild(inner);
            frag.appendChild(w);
          });
          child.replaceWith(frag);
        } else if (child.nodeType === 1) {
          walk(child);
        }
      });
    };
    walk(el);
  });

  /* ---------- Reveal on scroll ---------- */
  const groups = new Map();
  $$('.reveal-up').forEach((el) => {
    if (el.closest('.hero')) return;
    const p = el.parentElement;
    const n = groups.get(p) || 0;
    el.style.transitionDelay = `${Math.min(n, 6) * 0.08}s`;
    groups.set(p, n + 1);
  });
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-in');
      if (e.target.matches('.stat')) countUp(e.target);
      io.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.1 });
  $$('.reveal-up:not(.hero .reveal-up), .reveal-clip, .split, .step').forEach((el) => io.observe(el));
  // Hero elements are revealed by .is-ready
  const heroReveal = () => $$('.hero .reveal-up').forEach((el) => el.classList.add('is-in'));
  if (document.body.classList.contains('is-ready')) heroReveal();
  else new MutationObserver((_, obs) => {
    if (document.body.classList.contains('is-ready')) { heroReveal(); obs.disconnect(); }
  }).observe(document.body, { attributes: true, attributeFilter: ['class'] });

  /* ---------- Counters ---------- */
  function countUp(stat) {
    const el = $('[data-count]', stat);
    if (!el) return;
    const target = +el.dataset.count;
    if (reduced) { el.textContent = target; return; }
    const start = performance.now();
    const dur = 1600;
    const step = (now) => {
      const p = Math.min(1, (now - start) / dur);
      el.textContent = Math.round(target * (1 - Math.pow(1 - p, 4)));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  /* ---------- Header ---------- */
  const header = $('.header');
  const burger = $('.burger');
  const menu = $('#menu');
  let lastY = scrollY;

  const setMenu = (open) => {
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Menü schließen' : 'Menü öffnen');
    if (open) {
      menu.hidden = false;
      requestAnimationFrame(() => menu.classList.add('is-open'));
    } else {
      menu.classList.remove('is-open');
      setTimeout(() => { if (!menu.classList.contains('is-open')) menu.hidden = true; }, 700);
    }
    document.body.classList.toggle('is-locked', open);
  };
  burger.addEventListener('click', () => setMenu(burger.getAttribute('aria-expanded') !== 'true'));
  $$('a', menu).forEach((a) => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && menu.classList.contains('is-open')) setMenu(false); });

  // Active nav link
  const navLinks = $$('.nav a');
  const sections = navLinks.map((a) => $(a.getAttribute('href'))).filter(Boolean);
  const navIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      navLinks.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === `#${e.target.id}`));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  sections.forEach((s) => navIO.observe(s));

  /* ---------- Featured: pinned horizontal scroll ---------- */
  const featured = $('.featured');
  const fTrack = $('.featured__track');
  const fBar = $('.featured__progress i');
  let fDist = 0;
  // Pinned horizontal scroll only on large screens; touch devices get a native swipe carousel
  const pinMQ = matchMedia('(min-width: 1025px) and (hover: hover)');
  const setupFeatured = () => {
    const pin = pinMQ.matches && !reduced;
    featured.classList.toggle('is-pinned', pin);
    if (!pin) {
      featured.style.height = '';
      fTrack.style.transform = '';
      return;
    }
    fDist = Math.max(0, fTrack.scrollWidth - innerWidth);
    featured.style.height = `${innerHeight + fDist}px`;
  };
  const updateFeatured = () => {
    if (!featured.classList.contains('is-pinned')) {
      const max = fTrack.scrollWidth - fTrack.clientWidth;
      fBar.style.transform = `scaleX(${max > 0 ? fTrack.scrollLeft / max : 0})`;
      return;
    }
    const top = featured.getBoundingClientRect().top;
    const p = Math.min(1, Math.max(0, -top / (featured.offsetHeight - innerHeight || 1)));
    fTrack.style.transform = `translate3d(${-p * fDist}px,0,0)`;
    fBar.style.transform = `scaleX(${p})`;
  };
  fTrack.addEventListener('scroll', updateFeatured, { passive: true });
  $$('img', fTrack).forEach((img) => img.complete || img.addEventListener('load', () => { setupFeatured(); updateFeatured(); }, { once: true }));
  // Load featured images early so the scroll distance is correct
  if (pinMQ.matches && !reduced) $$('img', fTrack).forEach((img) => { img.loading = 'eager'; });

  /* ---------- Marquee ---------- */
  const mTrack = $('.marquee__track');
  let mX = 0;
  let velocity = 0;

  /* ---------- Hero parallax ---------- */
  const heroImg = $('.hero__img img');

  /* ---------- Main scroll / RAF loop ---------- */
  const onScroll = () => {
    const y = scrollY;
    const dy = y - lastY;
    velocity = Math.max(-60, Math.min(60, dy));
    header.classList.toggle('is-scrolled', y > 40);
    if (!menu.classList.contains('is-open')) header.classList.toggle('is-hidden', dy > 0 && y > 600);
    lastY = y;
    updateFeatured();
  };
  addEventListener('scroll', onScroll, { passive: true });

  let vSmooth = 0;
  const loop = () => {
    vSmooth = lerp(vSmooth, velocity, 0.08);
    velocity *= 0.9;
    if (mTrack && !reduced) {
      mX -= 0.6 + Math.abs(vSmooth) * 0.25;
      const half = mTrack.scrollWidth / 2;
      if (-mX >= half) mX += half;
      mTrack.style.transform = `translate3d(${mX}px,0,0) skewX(${-vSmooth * 0.08}deg)`;
    }
    if (heroImg && !reduced && scrollY < innerHeight * 1.2) {
      heroImg.style.translate = `0 ${scrollY * -0.08}px`;
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);

  /* ---------- Cursor ---------- */
  const cursor = $('.cursor');
  if (finePointer && !reduced && cursor) {
    let cx = innerWidth / 2, cy = innerHeight / 2, tx = cx, ty = cy;
    addEventListener('mousemove', (e) => { tx = e.clientX; ty = e.clientY; cursor.classList.remove('is-hidden'); }, { passive: true });
    document.addEventListener('mouseleave', () => cursor.classList.add('is-hidden'));
    const move = () => {
      cx = lerp(cx, tx, 0.2); cy = lerp(cy, ty, 0.2);
      cursor.style.transform = `translate3d(${cx}px,${cy}px,0)`;
      requestAnimationFrame(move);
    };
    requestAnimationFrame(move);
    document.addEventListener('mouseover', (e) => {
      const view = e.target.closest('.tile__btn, .feat__img');
      const link = !view && e.target.closest('a, button, summary, label, input, textarea');
      cursor.classList.toggle('is-view', !!view);
      cursor.classList.toggle('is-link', !!link);
    });
  }

  /* ---------- Touch: colour + images for whatever is centred on screen ---------- */
  if (!finePointer) {
    $$('.stile__item').forEach((item) => {
      const thumb = document.createElement('span');
      thumb.className = 'stile__thumb';
      thumb.setAttribute('aria-hidden', 'true');
      thumb.innerHTML = `<img src="${item.dataset.img}" alt="" loading="lazy">`;
      $('a', item).appendChild(thumb);
    });
    const litIO = new IntersectionObserver((entries) => {
      entries.forEach((e) => e.target.classList.toggle('is-lit', e.isIntersecting));
    }, { rootMargin: '-38% -15% -38% -15%' });
    $$('.tile__btn, .feat__img, .stile__item').forEach((el) => litIO.observe(el));
  }

  /* ---------- Stile: floating image ---------- */
  const float = $('.stile__float');
  if (finePointer && float) {
    const fImg = $('img', float);
    let fx = 0, fy = 0, ftx = 0, fty = 0, active = false;
    $$('.stile__item').forEach((item) => {
      item.addEventListener('mouseenter', (e) => {
        fImg.src = item.dataset.img;
        if (!active) { fx = ftx = e.clientX; fy = fty = e.clientY; }
        active = true;
        float.classList.add('is-visible');
      });
      item.addEventListener('mouseleave', () => { active = false; float.classList.remove('is-visible'); });
      item.addEventListener('mousemove', (e) => { ftx = e.clientX + 180; fty = e.clientY; });
    });
    const fl = () => {
      fx = lerp(fx, ftx, 0.12); fy = lerp(fy, fty, 0.12);
      float.style.left = `${fx}px`; float.style.top = `${fy}px`;
      requestAnimationFrame(fl);
    };
    requestAnimationFrame(fl);
  }

  /* ---------- Portfolio filter ---------- */
  const tiles = $$('.tile');
  const filters = $$('.filter');
  const moreBtn = $('#more');
  let current = 'all';
  let expanded = false;

  filters.forEach((f) => {
    const cat = f.dataset.filter;
    $('sup', f).textContent = cat === 'all' ? tiles.length : tiles.filter((t) => t.dataset.cat === cat).length;
  });

  const applyFilter = (cat, animate = true) => {
    current = cat;
    filters.forEach((f) => {
      const on = f.dataset.filter === cat;
      f.classList.toggle('is-active', on);
      f.setAttribute('aria-pressed', String(on));
    });
    let shown = 0;
    tiles.forEach((t) => {
      const match = cat === 'all' || t.dataset.cat === cat;
      t.classList.toggle('is-hidden', !match);
      const collapse = match && cat === 'all' && !expanded && shown >= CONFIG.initialTiles;
      t.classList.toggle('is-collapsed', collapse);
      if (match && !collapse) {
        if (animate) {
          t.classList.remove('is-in');
          void t.offsetWidth;
          t.style.animationDelay = `${Math.min(shown, 12) * 0.04}s`;
          t.classList.add('is-in');
        }
        shown++;
      }
    });
    moreBtn.hidden = !(cat === 'all' && !expanded && tiles.length > CONFIG.initialTiles);
  };
  filters.forEach((f) => f.addEventListener('click', () => applyFilter(f.dataset.filter)));
  moreBtn.addEventListener('click', () => {
    expanded = true;
    const hiddenBefore = tiles.filter((t) => t.classList.contains('is-collapsed'));
    applyFilter(current, false);
    hiddenBefore.forEach((t, i) => {
      t.style.animationDelay = `${Math.min(i, 12) * 0.04}s`;
      t.classList.add('is-in');
    });
  });
  $$('[data-filter]', $('.stile__list')).forEach((a) => a.addEventListener('click', () => applyFilter(a.dataset.filter)));
  applyFilter('all', false);

  /* ---------- Lightbox ---------- */
  const lb = $('.lightbox');
  const lbImg = $('img', lb);
  const lbCap = $('figcaption', lb);
  let lbList = [];
  let lbIndex = 0;
  let lastFocus = null;

  const lbShow = (i) => {
    lbIndex = (i + lbList.length) % lbList.length;
    const btn = lbList[lbIndex];
    const img = $('img', btn);
    lbImg.src = btn.dataset.full;
    lbImg.alt = img.alt;
    lbCap.textContent = `${img.alt} · ${lbIndex + 1} / ${lbList.length}`;
    lbImg.style.animation = 'none'; void lbImg.offsetWidth; lbImg.style.animation = '';
  };
  const lbOpen = (btn) => {
    lbList = btn.matches('.feat__img')
      ? $$('.feat__img')
      : $$('.tile:not(.is-hidden):not(.is-collapsed) .tile__btn');
    lastFocus = btn;
    lbShow(lbList.indexOf(btn));
    lb.showModal();
    document.body.classList.add('is-locked');
  };
  const lbClose = () => { lb.close(); };
  lb.addEventListener('close', () => { document.body.classList.remove('is-locked'); lastFocus && lastFocus.focus(); });
  $$('.tile__btn, .feat__img').forEach((b) => b.addEventListener('click', () => lbOpen(b)));
  $('.lightbox__close').addEventListener('click', lbClose);
  $('.lightbox__prev').addEventListener('click', () => lbShow(lbIndex - 1));
  $('.lightbox__next').addEventListener('click', () => lbShow(lbIndex + 1));
  lb.addEventListener('click', (e) => { if (e.target === lb || e.target.matches('.lightbox figure')) lbClose(); });
  lb.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') lbShow(lbIndex - 1);
    if (e.key === 'ArrowRight') lbShow(lbIndex + 1);
  });
  let touchX = null;
  lb.addEventListener('touchstart', (e) => { touchX = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', (e) => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 50) lbShow(lbIndex + (dx < 0 ? 1 : -1));
    touchX = null;
  });

  /* ---------- Reviews slider ---------- */
  const rTrack = $('.reviews__track');
  $$('.reviews__nav .round').forEach((b) => b.addEventListener('click', () => {
    const card = $('.review', rTrack);
    rTrack.scrollBy({ left: (+b.dataset.dir) * (card.offsetWidth + 24), behavior: reduced ? 'auto' : 'smooth' });
  }));
  if (finePointer) {
    let down = false, sx = 0, sl = 0, moved = false;
    rTrack.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') return; down = true; moved = false; sx = e.clientX; sl = rTrack.scrollLeft; });
    addEventListener('pointermove', (e) => {
      if (!down) return;
      const dx = e.clientX - sx;
      if (Math.abs(dx) > 4) { moved = true; rTrack.classList.add('is-drag'); }
      rTrack.scrollLeft = sl - dx;
    });
    addEventListener('pointerup', () => {
      if (!down) return;
      down = false;
      if (moved) {
        const card = $('.review', rTrack);
        const w = card.offsetWidth + 24;
        rTrack.classList.remove('is-drag');
        rTrack.scrollTo({ left: Math.round(rTrack.scrollLeft / w) * w, behavior: 'smooth' });
      }
    });
  }

  /* ---------- Opening hours status ---------- */
  const HOURS = { 0: null, 1: [600, 1080], 2: [600, 1080], 3: [600, 1080], 4: [600, 1080], 5: [600, 1080], 6: [600, 930] };
  const DAYS = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  const fmt = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  const updateStatus = () => {
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Berlin', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
    const get = (t) => parts.find((p) => p.type === t).value;
    const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
    const min = +get('hour') * 60 + +get('minute');
    $$('.hours tr').forEach((tr) => tr.classList.toggle('is-today', +tr.dataset.day === day));
    const box = $('[data-status]');
    const text = $('span', box);
    const today = HOURS[day];
    if (today && min >= today[0] && min < today[1]) {
      box.classList.add('is-open');
      text.textContent = `Jetzt geöffnet · bis ${fmt(today[1])} Uhr`;
      return;
    }
    box.classList.remove('is-open');
    if (today && min < today[0]) { text.textContent = `Geschlossen · öffnet heute um ${fmt(today[0])} Uhr`; return; }
    for (let i = 1; i <= 7; i++) {
      const d = (day + i) % 7;
      if (HOURS[d]) {
        text.textContent = `Geschlossen · öffnet ${i === 1 ? 'morgen' : DAYS[d]} um ${fmt(HOURS[d][0])} Uhr`;
        return;
      }
    }
  };
  updateStatus();
  setInterval(updateStatus, 60000);

  /* ---------- Booking form ---------- */
  const form = $('#booking-form');
  const msg = $('.form__msg', form);
  const val = (n) => (form.elements[n].value || '').trim();
  const say = (t, type) => { msg.textContent = t; msg.className = `form__msg ${type ? `is-${type}` : ''}`; };

  const buildText = () => {
    const lines = [
      'Hallo Dima, ich möchte einen Tattoo-Termin anfragen.',
      '',
      `Name: ${val('name')}`,
      val('telefon') ? `Telefon: ${val('telefon')}` : null,
      val('email') ? `E-Mail: ${val('email')}` : null,
      `Stil: ${form.elements.stil.value}`,
      val('stelle') ? `Körperstelle: ${val('stelle')}` : null,
      val('groesse') ? `Größe: ${val('groesse')}` : null,
      '',
      `Idee: ${val('idee')}`,
    ];
    return lines.filter((l) => l !== null).join('\n');
  };

  const validate = (fields) => {
    let ok = true;
    fields.forEach((n) => {
      const el = form.elements[n];
      const wrap = el.closest('.field, .check');
      const valid = el.type === 'checkbox' ? el.checked : el.checkValidity() && el.value.trim() !== '';
      wrap.classList.toggle('is-invalid', !valid);
      if (!valid && ok) { el.focus(); ok = false; }
    });
    return ok;
  };
  $$('input, textarea', form).forEach((el) => el.addEventListener('input', () => {
    const wrap = el.closest('.field, .check');
    if (wrap) wrap.classList.remove('is-invalid');
  }));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validate(['name', 'email', 'idee', 'datenschutz'])) {
      say('Bitte fülle die markierten Felder aus.', 'error');
      return;
    }
    const subject = `Tattoo-Anfrage von ${val('name')} (${form.elements.stil.value})`;
    const body = buildText();
    if (CONFIG.web3formsKey) {
      const btn = $('button[type=submit]', form);
      btn.disabled = true;
      say('Wird gesendet …');
      try {
        const res = await fetch('https://api.web3forms.com/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ access_key: CONFIG.web3formsKey, subject, from_name: 'bessusstattoo.de', replyto: val('email'), message: body }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.message);
        form.reset();
        say('Danke! Deine Anfrage ist angekommen. Ich melde mich so schnell wie möglich.', 'ok');
      } catch (err) {
        say(`Das hat leider nicht geklappt. Schreib mir gern direkt an ${CONFIG.email} oder per WhatsApp.`, 'error');
      } finally {
        btn.disabled = false;
      }
      return;
    }
    location.href = `mailto:${CONFIG.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    say('Dein E-Mail-Programm öffnet sich mit der fertigen Anfrage. Einfach absenden!', 'ok');
  });

  $('#send-wa').addEventListener('click', () => {
    if (!validate(['name', 'idee'])) {
      say('Bitte gib mindestens deinen Namen und deine Idee an.', 'error');
      return;
    }
    say('');
    window.open(`https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(buildText())}`, '_blank', 'noopener');
  });

  /* ---------- Misc ---------- */
  $$('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });

  const onResize = () => { setupFeatured(); updateFeatured(); };
  addEventListener('resize', onResize);
  addEventListener('load', onResize);
  onResize();
})();
