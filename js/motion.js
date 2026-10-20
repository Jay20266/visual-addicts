/* Visual Addicts — motion layer (intro, text rise, picture reveal, lightbox) */
(function () {
  'use strict';
  var root = document.documentElement;
  if (!root.classList.contains('mo-on')) return;           /* reduced motion: nothing runs */
  var raf = window.requestAnimationFrame.bind(window);

  /* ---------- 1 · intro ---------- */
  var intro = document.getElementById('mo-intro');
  if (intro && root.classList.contains('mo-intro')) {
    try { sessionStorage.setItem('va-intro-seen', '1'); } catch (e) {}
    var box = intro.querySelector('.mo-box'), lock = intro.querySelector('.mo-lock');
    var t0 = Date.now();
    void intro.offsetWidth;
    intro.classList.add('mo-show');                                         /* VISUAL V/A ADDICTS fades in (1.33 s) */
    setTimeout(function () { intro.classList.add('mo-tagin'); }, 750);      /* tagline starts fading in */
    setTimeout(function () { intro.classList.add('mo-sweep'); }, 950);      /* shimmer (1.7 s) */
    var heroReady = function () { var g = document.getElementById('hero-gif'); return !g || g.style.visibility === 'visible'; };
    var finish = function () {
      var logo = document.getElementById('logo-home');
      var to = logo ? logo.getBoundingClientRect() : null;
      var b = box.getBoundingClientRect(), f = lock.getBoundingClientRect();
      var done = false, end = function () { if (done) return; done = true; root.classList.remove('mo-intro'); intro.remove(); };
      intro.classList.add('mo-out');
      if (to && to.width) {
        var s = to.width / f.width, ox = f.left - b.left, oy = f.top - b.top;
        var dx = to.left - b.left - ox * s, dy = (to.top + to.height / 2) - (b.top + (oy + f.height / 2) * s);
        box.style.transformOrigin = '0 0';
        box.style.transition = 'transform 820ms cubic-bezier(.65,0,.25,1), opacity 320ms ease 640ms';
        box.style.transform = 'translate(' + dx + 'px,' + dy + 'px) scale(' + s + ')';
        box.style.opacity = '0';
        box.addEventListener('transitionend', function (ev) { if (ev.target === box && ev.propertyName === 'opacity') end(); });
      } else box.style.opacity = '0';
      setTimeout(end, 1500);
    };
    (function wait() {
      var el = Date.now() - t0;
      if ((el > 2750 && heroReady()) || el > 5600) finish();   /* shimmer ends 2.65 s, +0.1 s → glide */ else setTimeout(wait, 80);
    })();
  }

  /* ---------- 3 · text rising in  /  4 · picture reveal ---------- */
  var texts = Array.prototype.filter.call(
    document.querySelectorAll('section[id^="sec-"] p, section[id^="sec-"] h3, section[id^="sec-"] li'),
    function (el) {
      if (el.closest('[data-va-hdr]') || el.closest('#legal')) return false;
      if (el.closest('#sec-contact')) return /^\s*Let/.test(el.textContent);   /* contact: only "Let's make…" */
      return true;
    });
  var gallery0 = document.getElementById('commissions-gallery');
  var pics = Array.prototype.filter.call(
    document.querySelectorAll('#sec-capture img, #commissions-gallery img'),
    function (el) { return !el.closest('[data-va-hdr]'); });
  texts.forEach(function (el) { el.classList.add('mo-rise'); });
  pics = pics.map(function (el) { return gallery0 && gallery0.contains(el) ? el.parentElement : el; });
  pics.forEach(function (el) { el.classList.add('mo-pic'); });

  var reveal = function (entries, obs) {
    var batch = entries.filter(function (e) { return e.isIntersecting; })
      .map(function (e) { return e.target; })
      .sort(function (a, b) {
        var ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
        return (ra.top - rb.top) || (ra.left - rb.left);
      });
    batch.forEach(function (el, i) {
      obs.unobserve(el);
      var step = el.classList.contains('mo-pic') ? 90 : 110;
      setTimeout(function () { el.classList.add('mo-in'); }, Math.min(i, 7) * step);
    });
  };
  var io = new IntersectionObserver(reveal, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  texts.forEach(function (el) { io.observe(el); });

  /* pictures start fully clipped, which hides them from IntersectionObserver —
     so check their layout boxes (unaffected by clip-path) on scroll instead */
  var pending = pics.slice(), ticking = false;
  var checkPics = function () {
    ticking = false;
    if (!pending.length) return;
    var vh = window.innerHeight, due = [];
    pending = pending.filter(function (el) {
      var r = el.getBoundingClientRect();
      if (r.height && r.top < vh * 0.94 && r.bottom > 0) { due.push({ el: el, r: r }); return false; }
      return true;
    });
    due.sort(function (a, b) { return (a.r.top - b.r.top) || (a.r.left - b.r.left); });
    due.forEach(function (d, i) { setTimeout(function () { d.el.classList.add('mo-in'); }, Math.min(i, 7) * 90); });
    if (!pending.length) { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); }
  };
  var onScroll = function () { if (!ticking) { ticking = true; raf(checkPics); } };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  window.addEventListener('load', onScroll);
  pics.forEach(function (el) { var im = el.tagName === 'IMG' ? el : el.querySelector('img'); if (im && !im.complete) im.addEventListener('load', onScroll); });
  onScroll();

  /* ---------- 7 · lightbox grows out of the picture, swipe on touch ---------- */
  var lb = document.getElementById('lightbox');
  var lbImg = document.getElementById('lightbox-img');
  var gallery = document.getElementById('commissions-gallery');
  if (!lb || !lbImg || !gallery) return;
  lb.classList.add('mo-lb');
  var fromRect = null, closing = false, busy = false;

  var whenLoaded = function (cb) {
    if (lbImg.complete && lbImg.naturalWidth) cb();
    else lbImg.addEventListener('load', function h() { lbImg.removeEventListener('load', h); cb(); });
  };
  var thumbFor = function (src) {
    var all = gallery.querySelectorAll('img');
    for (var i = 0; i < all.length; i++) if (all[i].getAttribute('src') === src) return all[i];
    return null;
  };
  var flyFrom = function (r) {
    var f = lbImg.getBoundingClientRect();
    if (!f.width) return;
    var s = r.width / f.width;
    lbImg.classList.remove('mo-fly');
    lbImg.style.transformOrigin = '0 0';
    lbImg.style.transform = 'translate(' + (r.left - f.left) + 'px,' + (r.top - f.top) + 'px) scale(' + s + ')';
    lbImg.style.opacity = '1';
    void lbImg.offsetWidth;
    lbImg.classList.add('mo-fly');
    lbImg.style.transform = 'none';
    lb.classList.remove('mo-dim');
  };

  /* open: remember the thumbnail, then fly from it once main.js has opened the lightbox */
  document.addEventListener('click', function (e) {
    if (e.target.tagName === 'IMG' && gallery.contains(e.target)) {
      fromRect = e.target.getBoundingClientRect();
      lb.classList.add('mo-dim');
      lbImg.style.opacity = '0';
    }
  }, true);
  document.addEventListener('click', function (e) {
    if (!(e.target.tagName === 'IMG' && gallery.contains(e.target)) || !fromRect) return;
    var r = fromRect; fromRect = null;
    whenLoaded(function () { raf(function () { flyFrom(r); }); });
  });

  /* close: fly back to the thumbnail, then let main.js close it */
  var animateClose = function () {
    if (busy) return;
    busy = true;
    var t = thumbFor(lbImg.getAttribute('src'));
    var r = t ? t.getBoundingClientRect() : null;
    var onScreen = r && r.bottom > 0 && r.top < window.innerHeight && r.width;
    lb.classList.add('mo-dim');
    if (onScreen) {
      var f = lbImg.getBoundingClientRect();
      lbImg.style.transformOrigin = '0 0';
      lbImg.classList.add('mo-fly');
      lbImg.style.transform = 'translate(' + (r.left - f.left) + 'px,' + (r.top - f.top) + 'px) scale(' + (r.width / f.width) + ')';
    } else {
      lbImg.classList.add('mo-step');
      lbImg.style.opacity = '0';
    }
    setTimeout(function () {
      closing = true;
      document.getElementById('lb-close').click();
      closing = false; busy = false;
      lbImg.classList.remove('mo-fly', 'mo-step');
      lbImg.style.transform = ''; lbImg.style.opacity = '';
      lb.classList.remove('mo-dim');
    }, onScreen ? 470 : 300);
  };
  var isOpen = function () { return lb.style.display === 'flex'; };
  document.addEventListener('click', function (e) {
    if (closing || !isOpen()) return;
    if (e.target === lb || e.target.closest('#lb-close')) {
      e.stopImmediatePropagation(); e.preventDefault(); animateClose();
    }
  }, true);
  window.addEventListener('keydown', function (e) {
    if (isOpen() && e.key === 'Escape' && !closing) {
      e.stopImmediatePropagation(); e.preventDefault(); animateClose();
    }
  }, true);

  /* next / previous: the new picture slides in from its side */
  var slideIn = function (dir) {
    lbImg.classList.remove('mo-fly', 'mo-step');
    lbImg.style.transformOrigin = '';
    lbImg.style.transform = 'translateX(' + (dir * 40) + 'px)';
    lbImg.style.opacity = '0';
    whenLoaded(function () {
      void lbImg.offsetWidth;
      lbImg.classList.add('mo-step');
      lbImg.style.transform = 'none';
      lbImg.style.opacity = '1';
    });
  };
  document.addEventListener('click', function (e) {
    if (!isOpen()) return;
    if (e.target.closest('#lb-next')) slideIn(1);
    else if (e.target.closest('#lb-prev')) slideIn(-1);
  });
  window.addEventListener('keydown', function (e) {
    if (!isOpen()) return;
    if (e.key === 'ArrowRight') slideIn(1);
    else if (e.key === 'ArrowLeft') slideIn(-1);
  });

  /* swipe on phones and iPads */
  var sx = 0, sy = 0;
  lb.addEventListener('touchstart', function (e) { var t = e.touches[0]; sx = t.clientX; sy = t.clientY; }, { passive: true });
  lb.addEventListener('touchend', function (e) {
    var t = e.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.3) {
      document.getElementById(dx < 0 ? 'lb-next' : 'lb-prev').click();
    }
  }, { passive: true });

  /* ---------- 5 · gold line under category headings ---------- */
  (function () {
    var hdrs = document.querySelectorAll('[data-va-hdr]');
    if (!hdrs.length || !('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        var r = e.target.querySelector('.mo-rule');
        if (!r) return;
        if (!e.isIntersecting) { r.classList.remove('mo-in'); return; }
        if (!root.classList.contains('mo-navscroll')) r.classList.add('mo-in');
      });
    }, { threshold: 0.6 });
    hdrs.forEach(function (h) {
      var r = document.createElement('span'); r.className = 'mo-rule'; r.setAttribute('aria-hidden', 'true');
      h.appendChild(r); io.observe(h);
    });
    /* Digital Capture: its heading is longer, so stretch that one line past the last letter */
    var cap = document.querySelector('[data-va-hdr="sec-capture"]');
    function sizeCapRule() {
      if (!cap) return;
      var r = cap.querySelector('.mo-rule'), h2 = cap.querySelector('h2');
      if (!r || !h2) return;
      var w = h2.getBoundingClientRect().right - cap.getBoundingClientRect().left;
      r.style.maxWidth = Math.max(520, Math.round(w / 0.8 + 16)) + 'px';   /* solid gold (first 80%) reaches past the last letter */
    }
    sizeCapRule();
    window.addEventListener('resize', sizeCapRule);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(sizeCapRule);
  })();

  /* ---------- 8 · custom cursor (desktop only) ---------- */
  (function () {
    if (!window.matchMedia('(hover:hover) and (pointer:fine)').matches) return;
    if (!root.getAttribute('data-cur')) root.setAttribute('data-cur', 'sc-file');   /* chosen: file-name shutter count */
    var cur = document.createElement('div');
    cur.id = 'mo-cursor'; cur.setAttribute('aria-hidden', 'true');
    var blades = '';
    for (var i = 0; i < 6; i++) blades += '<path d="M12 2 L19.5 9.2" transform="rotate(' + (i*60) + ' 12 12)" stroke="#e7aa51" stroke-width="1" fill="none"/>';
    cur.innerHTML =
      '<div class="mo-c mo-mark"></div>' +
      '<div class="mo-c mo-slash"></div>' +
      '<div class="mo-c mo-iris"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" stroke="#e7aa51" stroke-width="1" fill="none"/><g class="blades">' + blades + '</g><circle class="ap" cx="12" cy="12" r="3.2" stroke="#e7aa51" stroke-width="1" fill="none"/></svg></div>' +
      '<div class="mo-c mo-needle"></div><div class="mo-c mo-pivot"></div>' +
      '<div class="mo-c mo-tip"></div>' +
      '<div class="mo-c mo-film"></div>' +
      '<div class="mo-c mo-peak"></div><div class="mo-c mo-peakdot"></div>' +
      '<div class="mo-c mo-histo">' + new Array(9).join('<i></i>') + '</div>' +
      '<div class="mo-c mo-thirds"></div>' +
      '<div class="mo-c mo-cdot"></div><div class="mo-c mo-count">0001</div>' +
      '<div class="mo-c mo-wb"></div><div class="mo-c mo-wbk">5600K</div>' +
      '<div class="mo-c mo-zebra"></div>' +
      '<div class="mo-c mo-level"></div><div class="mo-c mo-lvdot"></div>' +
      '<div class="mo-c mo-plug"></div>' +
      '<div class="mo-scsq"></div>' +
      '<div class="mo-sc mo-scfile">VA_0001.IIQ</div>' +
      '<div class="mo-sc mo-scfilm">36</div>' +
      '<div class="mo-sc mo-scexif">f/8 &nbsp;1/125 &nbsp;ISO 50 &nbsp;<b>0001</b></div>' +
      '<div class="mo-sc mo-scroll">' + new Array(5).join('<span><i>0<br>1<br>2<br>3<br>4<br>5<br>6<br>7<br>8<br>9</i></span>') + '</div>' +
      '<div class="mo-sc mo-scframe">0001</div>' +
      '<div class="mo-sc mo-screc">SHOT 0001</div>' +
      '<div class="mo-c mo-timer"><svg viewBox="0 0 22 22"><circle class="bg" cx="11" cy="11" r="10" fill="none" stroke-width="1"/><circle class="fg" cx="11" cy="11" r="10" fill="none" stroke-width="1.4"/></svg></div><div class="mo-c mo-tdot"></div>';
    document.body.appendChild(cur);
    var trail = document.createElement('canvas'); trail.id = 'mo-trail'; document.body.appendChild(trail);
    var tx = trail.getContext('2d'), dpr = Math.min(2, window.devicePixelRatio || 1);
    function sizeTrail() { trail.width = innerWidth * dpr; trail.height = innerHeight * dpr; tx.setTransform(dpr, 0, 0, dpr, 0, 0); }
    sizeTrail(); window.addEventListener('resize', sizeTrail);
    root.classList.add('mo-cursor-on');
    var needle = cur.querySelector('.mo-needle');
    var bars = cur.querySelectorAll('.mo-histo i'), countEl = cur.querySelector('.mo-count'), wbk = cur.querySelector('.mo-wbk');
    var shots = 1, histoT = 0, bokT = 0, tilt = 0;
    var levelEl = cur.querySelector('.mo-level');
    var ghosts = [];
    for (var gi = 0; gi < 5; gi++) { var gh = document.createElement('div'); gh.className = 'mo-ghost'; document.body.appendChild(gh); ghosts.push(gh); }
    var cable = []; for (var ci = 0; ci < 14; ci++) cable.push([-100, -100]);
    var pad = function (n) { return ('000' + n).slice(-4); };
    var rollDigits = cur.querySelectorAll('.mo-scroll i');
    function paintShots() {
      var s = pad(shots);
      countEl.textContent = s;
      cur.querySelector('.mo-scfile').textContent = 'VA_' + s + '.IIQ';
      cur.querySelector('.mo-scfilm').textContent = String(36 - ((shots - 1) % 36)).padStart(2, '0');
      cur.querySelector('.mo-scexif b').textContent = s;
      cur.querySelector('.mo-scframe').textContent = s;
      cur.querySelector('.mo-screc').textContent = 'SHOT ' + s;
      for (var d = 0; d < 4; d++) rollDigits[d].style.transform = 'translateY(' + (-10 * +s[d]) + 'px)';
    }
    paintShots();
    window.addEventListener('mousedown', function () {
      var mode = root.getAttribute('data-cur') || '';
      if (mode.indexOf('sc-') === 0) {
        shots++;
        paintShots(); cur.classList.add('mo-click'); setTimeout(function () { cur.classList.remove('mo-click'); }, 140);
      }
    });
    window.addEventListener('mousedown', function (ev) {
      var mode = root.getAttribute('data-cur');
      if (mode === 'count') { shots++; paintShots(); cur.classList.add('mo-click'); setTimeout(function () { cur.classList.remove('mo-click'); }, 140); }
      if (mode === 'flash') { var b = document.createElement('div'); b.className = 'mo-burst'; b.style.left = ev.clientX + 'px'; b.style.top = ev.clientY + 'px'; document.body.appendChild(b); setTimeout(function () { b.remove(); }, 560); }
    });
    var x = -100, y = -100, cx = x, cy = y, px = x, shown = false, ang = 0, pts = [];
    window.addEventListener('mousemove', function (ev) {
      x = ev.clientX; y = ev.clientY;
      if (!shown) { cx = x; cy = y; px = x; shown = true; }
      var t = ev.target;
      cur.classList.toggle('mo-link', !!(t.closest && t.closest('a, button, [role="button"], #logo-home, .lb-ctl, #commissions-gallery img')));
      cur.classList.remove('mo-hide');
    }, { passive: true });
    document.addEventListener('mouseleave', function () { cur.classList.add('mo-hide'); pts = []; });
    (function loop() {
      cx += (x - cx) * 0.35; cy += (y - cy) * 0.35;
      cur.style.transform = 'translate(' + cx + 'px,' + cy + 'px)';
      var mode = root.getAttribute('data-cur');
      if (mode === 'needle') {
        var v = Math.max(-40, Math.min(40, (cx - px) * 3));
        ang += (v - ang) * 0.18; needle.style.transform = 'rotate(' + ang + 'deg)';
      }
      if (mode === 'histo' && Date.now() - histoT > 90) {
        histoT = Date.now();
        var sp = Math.min(1, Math.abs(cx - px) / 12);
        for (var b = 0; b < bars.length; b++) {
          var c = (b - (bars.length - 1) / 2) / 2.4, base = Math.exp(-c * c) * (0.55 + 0.35 * (cy / innerHeight));
          bars[b].style.height = Math.max(8, Math.min(100, (base + (Math.random() - .5) * (0.25 + sp * 0.5)) * 100)) + '%';
        }
      }
      if (mode === 'bokeh' && Date.now() - bokT > 70 && Math.abs(cx - px) + Math.abs(cy - (cur._py || cy)) > 2) {
        bokT = Date.now();
        var bk = document.createElement('div'), sz = 10 + Math.random() * 18;
        bk.className = 'mo-bok';
        bk.style.cssText = 'left:' + (cx - sz/2 + (Math.random()-.5)*16) + 'px;top:' + (cy - sz/2 + (Math.random()-.5)*16) + 'px;width:' + sz + 'px;height:' + sz + 'px';
        document.body.appendChild(bk); setTimeout(function (n) { return function () { n.remove(); }; }(bk), 1450);
      }
      if (mode === 'level') {
        var vx = cx - px; tilt += (Math.max(-28, Math.min(28, vx * 2.2)) - tilt) * 0.2;
        levelEl.style.transform = 'rotate(' + tilt.toFixed(2) + 'deg)';
        cur.classList.toggle('mo-level-ok', Math.abs(tilt) < 0.6);
      }
      if (mode === 'flare') {
        var mx = innerWidth / 2, my = innerHeight / 2;
        [[-.35, 34], [.25, 16], [.6, 46], [1.2, 22], [1.55, 60]].forEach(function (g, i) {
          var gx = mx + (mx - cx) * g[0], gy = my + (my - cy) * g[0], s = g[1];
          ghosts[i].style.cssText = 'left:' + (gx - s/2) + 'px;top:' + (gy - s/2) + 'px;width:' + s + 'px;height:' + (s * 0.9) + 'px;opacity:' + (0.5 + 0.5 * (i % 2)) + ';background:rgba(' + (i % 2 ? '255,206,129' : '255,228,153') + ',' + (0.07 + i * 0.015) + ')';
        });
      }
      if (mode === 'cable') {
        cable[0] = [cx, cy + 4];
        for (var k = 1; k < cable.length; k++) {
          var p0 = cable[k-1], p1 = cable[k];
          p1[1] += 0.9;
          var dx = p1[0] - p0[0], dy = p1[1] - p0[1], dist = Math.hypot(dx, dy) || 1, L = 7;
          p1[0] = p0[0] + dx / dist * L; p1[1] = p0[1] + dy / dist * L;
        }
        tx.clearRect(0, 0, innerWidth, innerHeight);
        tx.strokeStyle = '#e7aa51'; tx.lineWidth = 1.2; tx.lineCap = 'round'; tx.lineJoin = 'round';
        tx.beginPath(); tx.moveTo(cable[0][0], cable[0][1]);
        for (var k2 = 1; k2 < cable.length - 1; k2++) { var mx2 = (cable[k2][0] + cable[k2+1][0]) / 2, my2 = (cable[k2][1] + cable[k2+1][1]) / 2; tx.quadraticCurveTo(cable[k2][0], cable[k2][1], mx2, my2); }
        tx.stroke();
      }
      cur._py = cy;
      if (mode === 'wb') {
        var tt = cx / innerWidth;
        var kel = Math.round((3200 + tt * 4300) / 100) * 100;
        var rr = Math.round(255 - tt * 80), gg = Math.round(170 + tt * 40), bb = Math.round(81 + tt * 150);
        cur.style.setProperty('--wb', 'rgb(' + rr + ',' + gg + ',' + bb + ')');
        wbk.textContent = kel + 'K';
      }
      px = cx;
      if (mode === 'trail') {
        pts.push([cx, cy]); if (pts.length > 18) pts.shift();
        tx.clearRect(0, 0, innerWidth, innerHeight);
        for (var i = 1; i < pts.length; i++) {
          var k = i / pts.length;
          tx.strokeStyle = 'rgba(231,170,81,' + (k * 0.85).toFixed(3) + ')';
          tx.lineWidth = 0.5 + k * 1.5; tx.lineCap = 'round';
          tx.beginPath(); tx.moveTo(pts[i-1][0], pts[i-1][1]); tx.lineTo(pts[i][0], pts[i][1]); tx.stroke();
        }
      } else if (mode !== 'cable' && pts.length) { pts = []; tx.clearRect(0, 0, innerWidth, innerHeight); }
      if (mode !== 'cable' && cable._drawn) { tx.clearRect(0, 0, innerWidth, innerHeight); cable._drawn = false; }
      if (mode === 'cable') cable._drawn = true;
      if (mode !== 'flare' && ghosts[0].style.cssText) ghosts.forEach(function (g) { g.style.cssText = ''; });
      raf(loop);
    })();
    if (/preview/.test(location.pathname)) window.addEventListener('keydown', function (ev) {
      var m = { '1': 'count', '2': 'sc-file', '3': 'sc-film', '4': 'sc-exif', '5': 'sc-roll', '6': 'sc-frame', '7': 'sc-rec' }[ev.key];
      if (m) root.setAttribute('data-cur', m);
    });
  })();

  /* ---------- heading shimmer: exact text width per heading, replay on every nav click ---------- */
  (function () {
    var hdrs = Array.prototype.slice.call(document.querySelectorAll('[data-va-hdr]'));
    function measure() {
      hdrs.forEach(function (h) {
        var h2 = h.querySelector('h2'); if (!h2) return;
        var rg = document.createRange(); rg.selectNodeContents(h2);
        var tr = rg.getBoundingClientRect(), br = h2.getBoundingClientRect();
        var tw = Math.max(40, Math.round(tr.right - br.left));
        var band = Math.round(Math.max(160, Math.min(260, parseFloat(getComputedStyle(h2).fontSize) * 5.5)));
        h2.style.setProperty('--mo-tw', tw + 'px');
        h2.style.setProperty('--mo-band', band + 'px');
      });
    }
    measure();
    window.addEventListener('resize', measure);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);

    function replay(h) {
      h.classList.remove('va-anim-shimmer');
      var r = h.querySelector('.mo-rule'); if (r) r.classList.remove('mo-in');
      void h.offsetWidth;
      h.classList.add('va-anim-shimmer');
      if (r) r.classList.add('mo-in');
      clearTimeout(h._moT);
      h._moT = setTimeout(function () { h.classList.remove('va-anim-shimmer'); }, 7500);
    }
    document.querySelectorAll('#va-nav a').forEach(function (a) {
      a.addEventListener('click', function () {
        var id = (a.getAttribute('href') || '').replace('#', '');
        var h = document.querySelector('[data-va-hdr="' + id + '"]');
        if (!h) return;
        root.classList.add('mo-navscroll');
        var last = -1, still = 0, t0 = Date.now();
        (function wait() {
          var y = window.scrollY;
          still = (y === last) ? still + 1 : 0; last = y;
          if (still >= 4 || Date.now() - t0 > 2500) { root.classList.remove('mo-navscroll'); replay(h); }
          else setTimeout(wait, 50);
        })();
      });
    });
  })();

  /* ---------- 2 · header fills in after the hero ---------- */
  (function () {
    var hdr = document.getElementById('site-header'), hero = document.getElementById('hero');
    if (!hdr || !hero) return;
    function check() {
      var past = hero.getBoundingClientRect().bottom <= hdr.offsetHeight + 1;
      root.classList.toggle('mo-solid', past);
    }
    check();
    window.addEventListener('resize', check);
    window.addEventListener('scroll', check, { passive: true });
  })();

  /* ---------- 7 · clients wall lights up near the pointer ---------- */
  (function () {
    if (!window.matchMedia('(hover:hover) and (pointer:fine)').matches) return;
    var sec = document.getElementById('sec-clients'); if (!sec) return;
    var logos = Array.prototype.filter.call(sec.querySelectorAll('img'), function (im) { return !im.closest('[data-va-hdr]'); });
    var lit = null, tmr = 0;
    function visible(im) { var el = im; while (el && el !== sec) { if (parseFloat(getComputedStyle(el).opacity) < 0.5) return false; el = el.parentElement; } return true; }
    sec.addEventListener('mousemove', function (ev) {
      var best = null, bd = 150;
      for (var i = 0; i < logos.length; i++) {
        var r = logos[i].getBoundingClientRect(); if (!r.width) continue;
        var d = Math.hypot(ev.clientX - (r.left + r.width / 2), ev.clientY - (r.top + r.height / 2));
        if (d < bd && visible(logos[i])) { bd = d; best = logos[i]; }
      }
      if (!best || best === lit) return;
      if (lit) off(lit);
      lit = best; on(best);
      clearTimeout(tmr);
      tmr = setTimeout(function (el) { return function () { off(el); if (lit === el) lit = null; }; }(best), 480);
    }, { passive: true });
    sec.addEventListener('mouseleave', function () { if (lit) off(lit); lit = null; });
    function lay(im) {
      if (im._moLay) return im._moLay;
      var d = document.createElement('div'); d.className = 'mo-goldlay';
      var u = 'url("' + im.currentSrc + '")';
      d.style.webkitMaskImage = u; d.style.maskImage = u;
      im.parentElement.appendChild(d);
      return (im._moLay = d);
    }
    function place(im, d) {
      d.style.left = im.offsetLeft + 'px'; d.style.top = im.offsetTop + 'px';
      d.style.width = im.offsetWidth + 'px'; d.style.height = im.offsetHeight + 'px';
    }
    function on(im) { var d = lay(im); place(im, d); void d.offsetWidth; d.classList.add('mo-on'); }
    function off(im) { if (im._moLay) im._moLay.classList.remove('mo-on'); }
  })();
})();
