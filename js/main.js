/* Visual Addicts — site behaviors */
(function () {
  'use strict';

  var GOOGLE_MAPS_KEY = 'AIzaSyBk1qtVhghFGVqhizp72DqdpDJf1MP1pSA';
  var SECTION_IDS = ['sec-capture', 'sec-services', 'sec-commissions', 'sec-clients', 'sec-contact'];

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
      center: pos, zoom: 13, streetViewControl: false, mapTypeControl: false,
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
        url: 'assets/va-mark-pin.png',
        scaledSize: new google.maps.Size(83, 47),
        anchor: new google.maps.Point(42, 40)
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
})();
