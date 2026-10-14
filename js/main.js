/* Visual Addicts — site behaviors */
(function () {
  'use strict';

  /* ---- content protection (deterrent) ---- */
  document.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  document.addEventListener('dragstart', function (e) { if (e.target.tagName === 'IMG') e.preventDefault(); });
  ['copy', 'cut', 'selectstart'].forEach(function (ev) {
    document.addEventListener(ev, function (e) { e.preventDefault(); });
  });
  document.addEventListener('keydown', function (e) {
    var k = (e.key || '').toLowerCase();
    if ((e.ctrlKey || e.metaKey) && (k === 's' || k === 'u' || k === 'c' || k === 'a' || k === 'p')) e.preventDefault();
  });
  document.querySelectorAll('img').forEach(function (im) { im.setAttribute('draggable', 'false'); });

  var GOOGLE_MAPS_KEY = 'AIzaSyBk1qtVhghFGVqhizp72DqdpDJf1MP1pSA';
  var SECTION_IDS = ['sec-capture', 'sec-services', 'sec-commissions', 'sec-clients', 'sec-contact'];

  /* ---- hero: reveal background + GIF together, GIF starts on frame 1 ---- */
  (function () {
    var hero = document.getElementById('hero');
    var gif = document.getElementById('hero-gif');
    if (!hero || !gif) return;
    var BG = 'uploads/chat2.jpg', GIF = 'assets/hero-loop.gif';
    function load(src) {
      return new Promise(function (res) {
        var im = new Image();
        im.onload = im.onerror = function () {
          if (im.decode) im.decode().then(res, res); else res();
        };
        im.src = src;
      });
    }
    Promise.all([load(BG), load(GIF)]).then(function () {
      requestAnimationFrame(function () {
        hero.style.backgroundImage = "url('" + BG + "')";
        gif.src = GIF;                 /* assigned now, so playback starts from the first frame */
        gif.style.visibility = 'visible';
      });
    });
  })();

  var header = document.getElementById('site-header');
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('#va-nav a'));
  var suppressUntil = 0;

  /* ---- header auto-hide (idle 0.8s; always visible at top of page) ---- */
  var overHeader = false;
  var idleTimer = null;
  function scrollTop() {
    var se = document.scrollingElement || document.documentElement;
    return Math.max(window.scrollY || 0, se.scrollTop || 0);
  }
  function onActivity() {
    header.classList.remove('va-hidden');
    if (idleTimer) clearTimeout(idleTimer);
    if (scrollTop() <= 10) return; /* at top: never re-arm the hide timer */
    idleTimer = setTimeout(function () {
      if (!overHeader && scrollTop() > 10) header.classList.add('va-hidden');
    }, 800);
  }
  window.addEventListener('mousemove', onActivity, { passive: true });
  window.addEventListener('scroll', onActivity, { passive: true });
  header.addEventListener('mouseenter', function () {
    overHeader = true;
    if (idleTimer) clearTimeout(idleTimer);
    header.classList.remove('va-hidden');
  });
  header.addEventListener('mouseleave', function () { overHeader = false; onActivity(); });

  /* ---- nav: scroll spy + click-to-section ---- */
  function setActive(i) {
    navLinks.forEach(function (a, j) { a.classList.toggle('active', j === i); });
  }
  function onScrollSpy() {
    if (Date.now() < suppressUntil) return;
    var probe = window.scrollY + 160;
    var active = -1;
    SECTION_IDS.forEach(function (id, i) {
      var el = document.getElementById(id);
      if (el && el.offsetTop <= probe) active = i;
    });
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) {
      active = SECTION_IDS.length - 1;
    }
    setActive(active);
  }
  window.addEventListener('scroll', onScrollSpy, { passive: true });
  onScrollSpy();

  function scrollToSection(i) {
    var el = document.getElementById(SECTION_IDS[i]);
    if (!el) return;
    var hdr = document.querySelector('[data-va-hdr="' + SECTION_IDS[i] + '"]');
    if (hdr) {
      hdr.classList.remove('va-anim-hdr', 'va-anim-shimmer');
      void hdr.offsetWidth;
      hdr.classList.add('va-anim-hdr');
      setTimeout(function () { hdr.classList.remove('va-anim-hdr'); }, 7500);
    }
    suppressUntil = Date.now() + 900;
    setActive(i);
    window.scrollTo({ top: el.offsetTop - 88, behavior: 'smooth' });
  }
  navLinks.forEach(function (a, i) {
    a.addEventListener('click', function (e) { e.preventDefault(); scrollToSection(i); });
    a.addEventListener('touchend', function (e) { e.preventDefault(); scrollToSection(i); }, { passive: false });
  });
  var logo = document.getElementById('logo-home');
  if (logo) logo.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  /* ---- gold shimmer on section headers entering the viewport ---- */
  var hdrObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting) {
        var hdr = en.target;
        hdr.classList.remove('va-anim-shimmer');
        void hdr.offsetWidth;
        hdr.classList.add('va-anim-shimmer');
        setTimeout(function () { hdr.classList.remove('va-anim-shimmer'); }, 7500);
      } else {
        en.target.classList.remove('va-anim-shimmer');
      }
    });
  }, { threshold: 0.6 });
  document.querySelectorAll('[data-va-hdr]').forEach(function (el) { hdrObserver.observe(el); });

  /* ---- flex-gap fallback for older Safari (iPadOS < 14.5 ignores gap on flex boxes) ---- */
  var flexGapOK = (function () {
    var d = document.createElement('div');
    d.style.cssText = 'display:flex;flex-direction:column;row-gap:1px;position:absolute;visibility:hidden';
    d.appendChild(document.createElement('div'));
    d.appendChild(document.createElement('div'));
    document.body.appendChild(d);
    var ok = d.scrollHeight === 1;
    d.remove();
    return ok;
  })();
  function applyFlexGapFallback() {
    if (flexGapOK) return;
    document.querySelectorAll('[data-va-gap]').forEach(function (el) {
      el.style.marginTop = el.dataset.vaMt; el.style.marginLeft = el.dataset.vaMl; el.style.marginRight = el.dataset.vaMr;
      el.removeAttribute('data-va-gap');
    });
    var all = document.body.querySelectorAll('*');
    for (var i = 0; i < all.length; i++) {
      var box = all[i];
      if (box.closest('#va-map, .gm-style')) continue; /* never touch Google Maps' own layout */
      var cs = getComputedStyle(box);
      if (cs.display !== 'flex' && cs.display !== 'inline-flex') continue;
      var rg = parseFloat(cs.rowGap) || 0, cg = parseFloat(cs.columnGap) || 0;
      if (!rg && !cg) continue;
      var kids = Array.prototype.filter.call(box.children, function (k) {
        return getComputedStyle(k).display !== 'none' && getComputedStyle(k).position !== 'absolute' && getComputedStyle(k).position !== 'fixed';
      });
      var col = cs.flexDirection.indexOf('column') === 0, wrap = cs.flexWrap !== 'nowrap';
      var endAligned = cs.justifyContent === 'flex-end' || cs.justifyContent === 'end';
      kids.forEach(function (k, j) {
        k.dataset.vaMt = k.style.marginTop; k.dataset.vaMl = k.style.marginLeft; k.dataset.vaMr = k.style.marginRight;
        k.setAttribute('data-va-gap', '');
        if (col) { if (j > 0 && rg) k.style.marginTop = rg + 'px'; }
        else if (wrap) { if (cg && j < kids.length - 1) k.style.marginRight = cg + 'px'; if (rg) k.style.marginTop = rg + 'px'; }
        else if (cg && j > 0) { if (endAligned) k.style.marginLeft = cg + 'px'; else k.style.marginLeft = cg + 'px'; }
      });
    }
  }
  var gapTimer = null;
  function scheduleFlexGapFallback() {
    if (flexGapOK) return;
    clearTimeout(gapTimer);
    gapTimer = setTimeout(applyFlexGapFallback, 60);
  }

  /* ---- iPad landscape: menu gaps = half of the evenly-spread spacing ---- */
  var navLandMQ = window.matchMedia('(min-width:1024px) and (max-width:1180px) and (orientation:landscape)');
  function sizeNavGaps() {
    var nav = document.getElementById('va-nav');
    if (!nav) return;
    if (!navLandMQ.matches) { nav.style.removeProperty('--va-nav-gap-tab'); return; }
    var links = Array.prototype.slice.call(nav.children);
    var textW = links.reduce(function (s, a) { return s + a.getBoundingClientRect().width; }, 0);
    var free = nav.parentElement.clientWidth - textW;
    var gap = Math.max(12, Math.floor(free / (links.length - 1) / 2));
    nav.style.setProperty('--va-nav-gap-tab', gap + 'px');
    scheduleFlexGapFallback();
  }
  sizeNavGaps();
  window.addEventListener('resize', sizeNavGaps);
  window.addEventListener('resize', scheduleFlexGapFallback);
  window.addEventListener('orientationchange', scheduleFlexGapFallback);
  applyFlexGapFallback();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(sizeNavGaps);

  /* ---- tablet galleries: refill 4 column stacks into 3 even columns ---- */
  var tabletMQ = window.matchMedia('(min-width:761px) and (max-width:1024px)');
  var galleries = [];
  var eqGrid = document.querySelector('#sec-capture div[style*="repeat(4,1fr)"]');
  if (eqGrid) galleries.push(eqGrid);
  var cmGrid = document.getElementById('commissions-gallery');
  if (cmGrid) galleries.push(cmGrid);
  galleries.forEach(function (g) {
    g._origCols = Array.prototype.slice.call(g.children);
    g._items = [];
    var rows = Math.max.apply(null, g._origCols.map(function (c) { return c.children.length; }));
    var perCol = g._origCols.map(function (c) { return Array.prototype.slice.call(c.children); });
    perCol.forEach(function (list, ci) { list.forEach(function (el, ri) { el._vaHome = [ci, ri]; }); });
    for (var r = 0; r < rows; r++) perCol.forEach(function (list) { if (list[r]) g._items.push(list[r]); });
  });
  function itemRatio(el) {
    var img = el.tagName === 'IMG' ? el : el.querySelector('img');
    return img && img.naturalWidth ? img.naturalHeight / img.naturalWidth : 1;
  }
  function layoutTablet(g) {
    if (g._tabletCols) return;
    var cols = [0, 1, 2].map(function () { return g._origCols[0].cloneNode(false); });
    var h = [0, 0, 0];
    g._items.forEach(function (el) {
      var k = h.indexOf(Math.min.apply(null, h));
      cols[k].appendChild(el);
      h[k] += itemRatio(el);
    });
    g._origCols.forEach(function (c) { c.style.display = 'none'; });
    cols.forEach(function (c) { g.appendChild(c); });
    g._tabletCols = cols;
  }
  function layoutDesktop(g) {
    if (!g._tabletCols) return;
    var sorted = g._items.slice().sort(function (a, b) { return a._vaHome[1] - b._vaHome[1]; });
    sorted.forEach(function (el) { g._origCols[el._vaHome[0]].appendChild(el); });
    g._tabletCols.forEach(function (c) { c.remove(); });
    g._origCols.forEach(function (c) { c.style.display = ''; });
    g._tabletCols = null;
  }
  function applyGalleryLayout() {
    galleries.forEach(function (g) { if (tabletMQ.matches) layoutTablet(g); else layoutDesktop(g); });
    scheduleFlexGapFallback();
  }
  function whenImagesReady(cb) {
    var imgs = [];
    galleries.forEach(function (g) { imgs = imgs.concat(Array.prototype.slice.call(g.querySelectorAll('img'))); });
    var pending = imgs.filter(function (im) { return !(im.complete && im.naturalWidth); });
    if (!pending.length) return cb();
    var left = pending.length;
    pending.forEach(function (im) {
      im.loading = 'eager';
      var done = function () { if (--left === 0) cb(); };
      im.addEventListener('load', done, { once: true });
      im.addEventListener('error', done, { once: true });
    });
  }
  if (galleries.length) {
    whenImagesReady(applyGalleryLayout);
    (tabletMQ.addEventListener ? tabletMQ.addEventListener('change', applyGalleryLayout) : tabletMQ.addListener(applyGalleryLayout));
  }

  /* ---- commissions lightbox ---- */
  var lightbox = document.getElementById('lightbox');
  var lightboxImg = document.getElementById('lightbox-img');
  var gallery = document.getElementById('commissions-gallery');
  var lbSrcs = [];
  var lbIndex = null;

  function lbOpen(i) {
    lbIndex = i;
    lightboxImg.src = lbSrcs[i];
    lightbox.style.display = 'flex';
  }
  function lbClose() {
    lbIndex = null;
    lightbox.style.display = 'none';
    lightboxImg.removeAttribute('src');
  }
  function lbStep(d) {
    if (lbIndex == null) return;
    var n = lbSrcs.length;
    lbOpen((lbIndex + d + n) % n);
  }
  if (gallery) {
    gallery.addEventListener('click', function (e) {
      if (e.target.tagName !== 'IMG') return;
      var imgs = Array.prototype.slice.call(gallery.querySelectorAll('img'));
      lbSrcs = imgs.map(function (im) { return im.getAttribute('src'); });
      lbOpen(imgs.indexOf(e.target));
    });
  }
  lightbox.addEventListener('click', function (e) {
    if (e.target === lightbox) lbClose();
  });
  lightboxImg.addEventListener('click', function (e) { e.stopPropagation(); });
  document.getElementById('lb-close').addEventListener('click', function (e) { e.stopPropagation(); lbClose(); });
  document.getElementById('lb-prev').addEventListener('click', function (e) { e.stopPropagation(); lbStep(-1); });
  document.getElementById('lb-next').addEventListener('click', function (e) { e.stopPropagation(); lbStep(1); });
  window.addEventListener('keydown', function (e) {
    if (lbIndex == null) return;
    if (e.key === 'Escape') lbClose();
    else if (e.key === 'ArrowLeft') lbStep(-1);
    else if (e.key === 'ArrowRight') lbStep(1);
  });

  /* ---- Google Map (Gilded night theme, V/A pin, Open in Maps) ---- */
  function initMap() {
    var el = document.getElementById('va-map');
    if (!el || el._vaMap || !window.google || !window.google.maps) return;
    var pos = { lat: 41.38316, lng: 2.16554 };
    var map = new google.maps.Map(el, {
      center: pos, zoom: 14, streetViewControl: false, mapTypeControl: false,
      styles: [
        { elementType: 'geometry', stylers: [{ color: '#0b0906' }] },
        { elementType: 'labels.text.fill', stylers: [{ color: '#ac7031' }] },
        { elementType: 'labels.text.stroke', stylers: [{ color: '#050403' }] },
        { featureType: 'poi', stylers: [{ visibility: 'off' }] },
        { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2a2118' }] },
        { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#3a2d1e' }] },
        { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#8d5a1b' }] },
        { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#050403' }] },
        { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#e7aa51' }] },
        { featureType: 'transit', stylers: [{ visibility: 'off' }] },
        { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#04070d' }] },
        { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#4a3518' }] }
      ]
    });
    new google.maps.Marker({
      position: pos, map: map,
      title: 'Visual Addicts — c/o Unida Studio',
      icon: {
        url: 'assets/pin-glow.png',
        scaledSize: new google.maps.Size(115, 80),
        anchor: new google.maps.Point(58, 40)
      }
    });
    var btn = document.createElement('a');
    btn.href = 'https://www.google.com/maps/search/?api=1&query=Visual+Addicts,+Carrer+de+Joaquin+Costa+24,+08001+Barcelona,+Spain';
    btn.target = '_blank';
    btn.rel = 'noopener';
    btn.textContent = 'Open in Maps';
    btn.style.cssText = 'margin:10px;padding:8px 14px;background:#fff;color:#1a73e8;font:500 14px/1 Roboto,Arial,sans-serif;border-radius:2px;box-shadow:0 1px 4px rgba(0,0,0,.3);text-decoration:none;cursor:pointer';
    map.controls[google.maps.ControlPosition.TOP_LEFT].push(btn);
    el._vaMap = map;
  }
  if (window.google && window.google.maps) {
    initMap();
  } else {
    var s = document.createElement('script');
    s.id = 'va-gmaps-script';
    s.src = 'https://maps.googleapis.com/maps/api/js?key=' + GOOGLE_MAPS_KEY;
    s.async = true;
    s.onload = initMap;
    document.head.appendChild(s);
  }

  /* ---- imprint / privacy overlay ---- */
  (function () {
    var legal = document.getElementById('legal');
    if (!legal) return;
    function open(e) { if (e) e.preventDefault(); legal.classList.add('open'); legal.scrollTop = 0; document.documentElement.classList.add('legal-open'); }
    function close() { legal.classList.remove('open'); document.documentElement.classList.remove('legal-open'); if (location.hash === '#imprint') history.replaceState(null, '', location.pathname + location.search); }
    document.getElementById('legal-open').addEventListener('click', open);
    document.getElementById('legal-close').addEventListener('click', close);
    window.addEventListener('keydown', function (e) { if (e.key === 'Escape' && legal.classList.contains('open')) close(); });
    legal.querySelectorAll('#legal-lang button').forEach(function (b) {
      b.addEventListener('click', function () {
        legal.setAttribute('data-show', b.getAttribute('data-set'));
        legal.querySelectorAll('#legal-lang button').forEach(function (x) { x.classList.toggle('on', x === b); });
        legal.scrollTop = 0;
      });
    });
    if ((navigator.language || '').toLowerCase().indexOf('es') === 0) legal.querySelector('[data-set="es"]').click();
    if (location.hash === '#imprint') open();
  })();
})();
