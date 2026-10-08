/* ==========================================================================
   Demorestaurant – Interaktionen & Animationen
   Reines JavaScript, keine Bibliotheken.
   ========================================================================== */
(function () {
  'use strict';

  var reduceMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
  var reduced = function () { return reduceMQ.matches; };
  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };

  /* ---------- Header beim Scrollen ---------- */
  var header = $('.site-header');
  var onScrollHeader = function () {
    if (header) header.classList.toggle('is-scrolled', window.scrollY > 40);
  };
  onScrollHeader();
  window.addEventListener('scroll', onScrollHeader, { passive: true });

  /* ---------- Mobile Navigation ---------- */
  var toggle = $('.nav-toggle');
  var nav = $('#main-nav');
  if (toggle && nav) {
    $$('li', nav).forEach(function (li, i) { li.style.setProperty('--i', i); });
    var setNav = function (open) {
      toggle.setAttribute('aria-expanded', String(open));
      toggle.querySelector('.sr-only').textContent = open ? 'Menü schliessen' : 'Menü öffnen';
      nav.classList.toggle('is-open', open);
      document.body.classList.toggle('nav-open', open);
    };
    toggle.addEventListener('click', function () {
      setNav(toggle.getAttribute('aria-expanded') !== 'true');
    });
    nav.addEventListener('click', function (e) { if (e.target.closest('a')) setNav(false); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) { setNav(false); toggle.focus(); }
    });
    window.addEventListener('resize', function () { if (window.innerWidth >= 1024) setNav(false); });
  }

  /* ---------- Scroll-Animationen (Elemente gleiten herein) ---------- */
  var revealEls = $$('[data-reveal]');
  if ('IntersectionObserver' in window && !reduced()) {
    var revealIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          revealIO.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0 });
    revealEls.forEach(function (el) { revealIO.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* ---------- Zähler ---------- */
  var counters = $$('[data-count]');
  var runCounter = function (el) {
    var target = parseFloat(el.getAttribute('data-count'));
    var suffix = el.getAttribute('data-suffix') || '';
    if (reduced()) { el.textContent = target + suffix; return; }
    var start = null, dur = 1800;
    var step = function (ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 4);
      el.textContent = Math.round(target * eased) + suffix;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  if (counters.length && 'IntersectionObserver' in window) {
    var countIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { runCounter(entry.target); countIO.unobserve(entry.target); }
      });
    }, { threshold: 0.6 });
    counters.forEach(function (el) { countIO.observe(el); });
  }

  /* ---------- Videos: erst laden, wenn sichtbar; Pause bei reduzierter Bewegung ---------- */
  var videos = $$('video[data-src]');
  var loadVideo = function (v) {
    if (v.dataset.loaded) return;
    var src = v.getAttribute('data-src');
    var mobile = v.getAttribute('data-src-mobile');
    if (mobile && window.innerWidth < 760) src = mobile;
    v.src = src;
    v.dataset.loaded = '1';
  };
  var playVideo = function (v) {
    if (reduced() || v.dataset.userPaused) return;
    loadVideo(v);
    var p = v.play();
    if (p && p.catch) p.catch(function () { /* Autoplay blockiert – Poster bleibt sichtbar */ });
  };
  if (videos.length) {
    if ('IntersectionObserver' in window) {
      var videoIO = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          var v = entry.target;
          if (entry.isIntersecting) playVideo(v);
          else if (!v.paused) v.pause();
        });
      }, { rootMargin: '200px 0px' });
      videos.forEach(function (v) { v.muted = true; videoIO.observe(v); });
    } else {
      videos.forEach(playVideo);
    }
  }
  var vToggle = $('.video-toggle');
  if (vToggle) {
    var heroVideo = $('.hero video');
    var syncToggle = function () {
      var paused = !heroVideo || heroVideo.paused;
      vToggle.setAttribute('aria-pressed', String(paused));
      vToggle.setAttribute('aria-label', paused ? 'Hintergrundvideo abspielen' : 'Hintergrundvideo pausieren');
    };
    if (heroVideo) {
      heroVideo.addEventListener('play', syncToggle);
      heroVideo.addEventListener('pause', syncToggle);
    }
    syncToggle();
    vToggle.addEventListener('click', function () {
      if (!heroVideo) return;
      if (heroVideo.paused) {
        delete heroVideo.dataset.userPaused;
        loadVideo(heroVideo);
        heroVideo.play();
      } else {
        heroVideo.dataset.userPaused = '1';
        heroVideo.pause();
      }
    });
  }
  reduceMQ.addEventListener && reduceMQ.addEventListener('change', function () {
    if (reduced()) videos.forEach(function (v) { v.pause(); });
  });

  /* ---------- Morph-Wort im Hero ---------- */
  var morph = $('.morph-word');
  if (morph && !reduced()) {
    var words = $$('span', morph);
    var idx = 0;
    setInterval(function () {
      words[idx].classList.remove('is-active');
      idx = (idx + 1) % words.length;
      words[idx].classList.add('is-active');
    }, 2800);
  }

  /* ---------- Parallax ---------- */
  var parallaxEls = $$('[data-parallax]');
  if (parallaxEls.length && !reduced()) {
    var ticking = false;
    var updateParallax = function () {
      var vh = window.innerHeight;
      parallaxEls.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.bottom < -100 || r.top > vh + 100) return;
        var speed = parseFloat(el.getAttribute('data-parallax')) || 0.1;
        var offset = (r.top + r.height / 2 - vh / 2) * -speed;
        el.style.transform = 'translate3d(0,' + offset.toFixed(1) + 'px,0)';
      });
      ticking = false;
    };
    window.addEventListener('scroll', function () {
      if (!ticking) { requestAnimationFrame(updateParallax); ticking = true; }
    }, { passive: true });
    updateParallax();
  }

  /* ---------- Morph-Story (Startseite) ---------- */
  var story = $('.story');
  if (story && 'IntersectionObserver' in window) {
    var shape = $('.story__shape', story);
    var imgs = $$('img', shape);
    var steps = $$('.story__step', story);
    var storyIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var n = entry.target.getAttribute('data-step');
        shape.setAttribute('data-step', n);
        steps.forEach(function (s) { s.classList.toggle('is-active', s === entry.target); });
        imgs.forEach(function (img) { img.classList.toggle('is-active', img.getAttribute('data-step') === n); });
      });
    }, { rootMargin: '-45% 0px -45% 0px' });
    steps.forEach(function (s) { storyIO.observe(s); });
  }

  /* ---------- Speisekarte: aktive Kategorie ---------- */
  var menuLinks = $$('.menu-nav a');
  if (menuLinks.length && 'IntersectionObserver' in window) {
    var menuIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var id = entry.target.id;
        menuLinks.forEach(function (a) {
          var active = a.getAttribute('href') === '#' + id;
          a.classList.toggle('is-active', active);
          if (active && a.scrollIntoView && a.parentElement.parentElement.scrollWidth > a.parentElement.parentElement.clientWidth) {
            a.parentElement.parentElement.scrollTo({ left: a.offsetLeft - 20, behavior: reduced() ? 'auto' : 'smooth' });
          }
        });
      });
    }, { rootMargin: '-30% 0px -60% 0px' });
    menuLinks.forEach(function (a) {
      var target = document.querySelector(a.getAttribute('href'));
      if (target) menuIO.observe(target);
    });
  }

  /* ---------- Fleisch-Guide: Cuts ---------- */
  var cutTabs = $$('.cut-tabs .cut-tab');
  if (cutTabs.length) {
    var panels = $$('.cut-panel');
    var regions = $$('.cow .region');
    var selectCut = function (id, origin, focus) {
      cutTabs.forEach(function (t) {
        var on = t.getAttribute('data-cut') === id;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        if (on && focus) t.focus();
      });
      panels.forEach(function (p) {
        var on = p.id === 'cut-' + id;
        p.hidden = !on;
        if (on) {
          p.classList.remove('is-entering');
          if (origin) { p.style.setProperty('--ox', origin.x); p.style.setProperty('--oy', origin.y); }
          void p.offsetWidth;
          if (!reduced()) p.classList.add('is-entering');
        }
      });
      var active = (document.getElementById('cut-' + id).getAttribute('data-regions') || '').split(' ');
      regions.forEach(function (r) {
        r.classList.toggle('is-active', active.indexOf(r.getAttribute('data-region')) > -1);
      });
    };
    cutTabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () { selectCut(tab.getAttribute('data-cut')); });
      tab.addEventListener('keydown', function (e) {
        var dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (!dir) return;
        e.preventDefault();
        var next = cutTabs[(i + dir + cutTabs.length) % cutTabs.length];
        selectCut(next.getAttribute('data-cut'), null, true);
      });
    });
    regions.forEach(function (r) {
      var cut = r.getAttribute('data-cut');
      if (!cut) return;
      var go = function () {
        selectCut(cut, { x: '50%', y: '50%' });
        var panel = document.getElementById('cut-' + cut);
        if (window.innerWidth < 960 && panel) panel.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' });
      };
      r.addEventListener('click', go);
      r.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
    });
    selectCut(cutTabs[0].getAttribute('data-cut'));
    panels.forEach(function (p) { p.classList.remove('is-entering'); });
  }

  /* ---------- Fleisch-Guide: Garstufen ---------- */
  var range = $('#doneness-range');
  if (range) {
    var LEVELS = window.DONENESS || [];
    var svg = $('#steak-big');
    var lGrey = $('.l-grey', svg), lPink = $('.l-pink', svg), lCore = $('.l-core', svg), lJuice = $('.l-juice', svg);
    var nameEl = $('#d-name'), altEl = $('#d-alt'), tempEl = $('#d-temp'), descEl = $('#d-desc');
    var dCards = $$('.d-card');
    var hex = function (h) { return [parseInt(h.substr(1, 2), 16), parseInt(h.substr(3, 2), 16), parseInt(h.substr(5, 2), 16)]; };
    var mix = function (a, b, t) {
      var A = hex(a), B = hex(b);
      return 'rgb(' + A.map(function (v, i) { return Math.round(v + (B[i] - v) * t); }).join(',') + ')';
    };
    var lerp = function (a, b, t) { return a + (b - a) * t; };
    var lastIdx = -1;
    var render = function (v) {
      var t = Math.max(0, Math.min(LEVELS.length - 1, v / 100));
      var i = Math.min(Math.floor(t), LEVELS.length - 2), f = t - i;
      var A = LEVELS[i], B = LEVELS[i + 1];
      lGrey.style.transform = 'scale(' + lerp(A.grey, B.grey, f) + ')';
      lPink.style.transform = 'scale(' + lerp(A.pink, B.pink, f) + ')';
      lCore.style.transform = 'scale(' + lerp(A.core, B.core, f) + ')';
      lGrey.style.fill = mix(A.cGrey, B.cGrey, f);
      lPink.style.fill = mix(A.cPink, B.cPink, f);
      lCore.style.fill = mix(A.cCore, B.cCore, f);
      if (lJuice) lJuice.style.opacity = lerp(A.juice, B.juice, f);
      var idx = Math.round(t);
      if (idx !== lastIdx) {
        lastIdx = idx;
        var L = LEVELS[idx];
        nameEl.textContent = L.name;
        altEl.textContent = L.alt;
        tempEl.innerHTML = L.temp + '<small>°C KERN</small>';
        descEl.textContent = L.desc;
        range.setAttribute('aria-valuetext', L.name + ', ' + L.temp + ' Grad Kerntemperatur');
        dCards.forEach(function (c, ci) { c.classList.toggle('is-active', ci === idx); c.setAttribute('aria-pressed', String(ci === idx)); });
      }
    };
    range.addEventListener('input', function () { render(+range.value); });
    var animTo = function (target) {
      if (reduced()) { range.value = target; render(target); return; }
      var from = +range.value, start = null;
      var step = function (ts) {
        if (!start) start = ts;
        var p = Math.min((ts - start) / 700, 1);
        var e = 1 - Math.pow(1 - p, 3);
        var val = from + (target - from) * e;
        range.value = val;
        render(val);
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    dCards.forEach(function (c, ci) { c.addEventListener('click', function () { animTo(ci * 100); }); });
    render(+range.value);
  }

  /* ---------- Galerie: Filter & Lightbox ---------- */
  var gallery = $('.gallery');
  if (gallery) {
    var items = $$('.g-item', gallery);
    var filterBtns = $$('.filters .cut-tab');
    var applyFilter = function (cat) {
      filterBtns.forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-filter') === cat)); b.setAttribute('aria-selected', String(b.getAttribute('data-filter') === cat)); });
      items.forEach(function (it) {
        var show = cat === 'alle' || (it.getAttribute('data-cat') || '').split(' ').indexOf(cat) > -1;
        it.classList.toggle('is-hidden', !show);
      });
    };
    filterBtns.forEach(function (b) {
      b.addEventListener('click', function () {
        var cat = b.getAttribute('data-filter');
        if (document.startViewTransition && !reduced()) {
          items.forEach(function (it, i) { it.style.viewTransitionName = 'g' + i; });
          var vt = document.startViewTransition(function () { applyFilter(cat); });
          vt.finished.then(function () { items.forEach(function (it) { it.style.viewTransitionName = ''; }); });
        } else {
          applyFilter(cat);
        }
      });
    });

    var lb = $('#lightbox');
    var lbFig = $('.lightbox__figure', lb);
    var lbCap = $('.lightbox__caption', lb);
    var current = 0;
    var visibleItems = function () { return items.filter(function (it) { return !it.classList.contains('is-hidden'); }); };
    var fill = function (item) {
      var media = lbFig.querySelector('img, video');
      if (media) media.remove();
      var node;
      if (item.getAttribute('data-video')) {
        node = document.createElement('video');
        node.src = item.getAttribute('data-video');
        node.controls = true; node.muted = true; node.loop = true; node.playsInline = true;
        if (!reduced()) node.autoplay = true;
      } else {
        node = document.createElement('img');
        node.src = item.getAttribute('data-full');
        node.alt = item.querySelector('img').alt;
      }
      lbFig.insertBefore(node, lbCap);
      lbCap.textContent = item.querySelector('.g-cap') ? item.querySelector('.g-cap').textContent : '';
    };
    var thumbOf = function (item) { return item.querySelector('img, video'); };
    var open = function (item) {
      var vis = visibleItems();
      current = vis.indexOf(item);
      var thumb = thumbOf(item);
      if (document.startViewTransition && !reduced()) {
        thumb.style.viewTransitionName = 'lightbox-media';
        var vt = document.startViewTransition(function () {
          thumb.style.viewTransitionName = '';
          fill(item);
          lb.showModal();
        });
        vt.finished.then(function () {});
      } else {
        fill(item);
        lb.showModal();
        lbFig.classList.remove('lightbox-fallback-in'); void lbFig.offsetWidth;
        if (!reduced()) lbFig.classList.add('lightbox-fallback-in');
      }
    };
    var close = function () {
      var vis = visibleItems();
      var item = vis[current];
      var thumb = item && thumbOf(item);
      if (document.startViewTransition && !reduced() && thumb) {
        var vt = document.startViewTransition(function () {
          lb.close();
          thumb.style.viewTransitionName = 'lightbox-media';
        });
        vt.finished.then(function () { thumb.style.viewTransitionName = ''; });
      } else {
        lb.close();
      }
    };
    var go = function (dir) {
      var vis = visibleItems();
      current = (current + dir + vis.length) % vis.length;
      fill(vis[current]);
      if (!reduced()) { lbFig.classList.remove('lightbox-fallback-in'); void lbFig.offsetWidth; lbFig.classList.add('lightbox-fallback-in'); }
    };
    items.forEach(function (it) { it.addEventListener('click', function () { open(it); }); });
    $('.lightbox__close', lb).addEventListener('click', close);
    $('.lightbox__prev', lb).addEventListener('click', function () { go(-1); });
    $('.lightbox__next', lb).addEventListener('click', function () { go(1); });
    lb.addEventListener('cancel', function (e) { e.preventDefault(); close(); });
    lb.addEventListener('click', function (e) { if (e.target === lb) close(); });
    lb.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
    });
    lb.addEventListener('close', function () { var v = lbFig.querySelector('video'); if (v) v.pause(); });
  }

  /* ---------- Öffnungszeiten: Status «jetzt geöffnet» ---------- */
  // 0 = Sonntag … 6 = Samstag; Zeiten in Minuten ab Mitternacht (Europe/Zurich)
  var HOURS = {
    0: [[690, 900], [1050, 1320]],
    1: [],
    2: [[1050, 1380]],
    3: [[1050, 1380]],
    4: [[1050, 1380]],
    5: [[1050, 1440]],
    6: [[720, 870], [1050, 1440]]
  };
  var DAYS = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  var fmt = function (m) { var h = Math.floor(m / 60) % 24; return (h < 10 ? '0' : '') + h + ':' + ('0' + (m % 60)).slice(-2); };
  var zurichNow = function () {
    try {
      var parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Zurich', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
      var o = {};
      parts.forEach(function (p) { o[p.type] = p.value; });
      return { day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(o.weekday), min: (+o.hour % 24) * 60 + (+o.minute) };
    } catch (e) {
      var d = new Date();
      return { day: d.getDay(), min: d.getHours() * 60 + d.getMinutes() };
    }
  };
  var updateStatus = function () {
    var now = zurichNow();
    var today = HOURS[now.day];
    var open = null;
    today.forEach(function (s) { if (now.min >= s[0] && now.min < s[1]) open = s; });
    var text;
    if (open) {
      text = 'Jetzt geöffnet · bis ' + fmt(open[1]) + ' Uhr';
    } else {
      var next = null;
      for (var k = 0; k < 8 && !next; k++) {
        var d = (now.day + k) % 7;
        HOURS[d].forEach(function (s) {
          if (!next && (k > 0 || s[0] > now.min)) next = { day: d, k: k, start: s[0] };
        });
      }
      var when = next.k === 0 ? 'heute' : next.k === 1 ? 'morgen' : 'am ' + DAYS[next.day];
      text = 'Geschlossen · öffnet ' + when + ' um ' + fmt(next.start) + ' Uhr';
    }
    $$('[data-status]').forEach(function (el) {
      el.textContent = text;
      el.classList.toggle('is-open', !!open);
      el.classList.toggle('is-closed', !open);
    });
    $$('[data-day]').forEach(function (row) {
      row.classList.toggle('is-today', +row.getAttribute('data-day') === now.day);
    });
  };
  if ($('[data-status]') || $('[data-day]')) {
    updateStatus();
    setInterval(updateStatus, 60000);
  }

  /* ---------- Demo-Formulare ---------- */
  $$('form[data-demo]').forEach(function (form) {
    var dateInput = $('input[type="date"]', form);
    if (dateInput) {
      var d = new Date();
      var iso = function (x) { return x.getFullYear() + '-' + ('0' + (x.getMonth() + 1)).slice(-2) + '-' + ('0' + x.getDate()).slice(-2); };
      dateInput.min = iso(d);
      var max = new Date(d); max.setMonth(max.getMonth() + 6);
      dateInput.max = iso(max);
      dateInput.addEventListener('change', function () {
        var picked = new Date(dateInput.value + 'T12:00:00');
        dateInput.setCustomValidity(picked.getDay() === 1 ? 'Montag ist Ruhetag – bitte wählen Sie einen anderen Tag.' : '');
      });
    }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.reportValidity()) return;
      var dlg = document.getElementById(form.getAttribute('data-demo'));
      var summary = dlg && $('[data-summary]', dlg);
      if (summary) {
        var data = new FormData(form);
        var parts = [];
        if (data.get('datum')) {
          var dt = new Date(data.get('datum') + 'T12:00:00');
          parts.push(dt.toLocaleDateString('de-CH', { weekday: 'long', day: 'numeric', month: 'long' }));
        }
        if (data.get('zeit')) parts.push(data.get('zeit') + ' Uhr');
        if (data.get('personen')) parts.push(data.get('personen') + (data.get('personen') === '1' ? ' Person' : ' Personen'));
        var name = data.get('name') ? ', ' + data.get('name') : '';
        summary.textContent = parts.length
          ? 'Danke' + name + '! Ihr Tisch für ' + parts.join(' · ') + ' wäre jetzt reserviert – wenn das hier keine Demo wäre.'
          : 'Danke' + name + '! Ihre Nachricht wäre jetzt bei uns – wenn das hier keine Demo wäre.';
      }
      if (dlg && dlg.showModal) {
        dlg.showModal();
        var closeBtn = $('[data-close]', dlg);
        if (closeBtn) closeBtn.onclick = function () { dlg.close(); };
      }
      form.reset();
    });
  });

  /* ---------- Seitenübergänge (Fallback ohne View Transitions) ---------- */
  var hasVT = 'CSSViewTransitionRule' in window;
  if (!hasVT && !reduced()) {
    document.addEventListener('click', function (e) {
      var a = e.target.closest('a');
      if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (a.target && a.target !== '_self') return;
      if (a.hasAttribute('download')) return;
      var href = a.getAttribute('href') || '';
      if (!/\.html(#.*)?$/.test(href) || /^[a-z]+:/i.test(href)) return;
      var url = new URL(a.href, location.href);
      if (url.pathname === location.pathname) return;
      e.preventDefault();
      document.documentElement.classList.add('is-leaving');
      setTimeout(function () { location.href = a.href; }, 340);
    });
    window.addEventListener('pageshow', function () { document.documentElement.classList.remove('is-leaving'); });
  }

  /* ---------- Jahr im Footer ---------- */
  $$('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });
})();
