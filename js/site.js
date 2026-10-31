/* S-LAB media URL helper: supports custom domains, localhost, and GitHub project pages. */
(function (global) {
  'use strict';
  global.slabAssetHref = function (path) {
    if (!path) return '';
    var value = String(path).trim();
    if (/^(?:https?:|data:|blob:)/i.test(value)) return value;
    var clean = value.replace(/^\/+/, '');
    var base = '';
    if (global.location && /\.github\.io$/i.test(global.location.hostname)) {
      var first = (global.location.pathname.split('/').filter(Boolean)[0] || '');
      var knownRoots = ['index','about','service','products','herbal','activity','activity-detail','contact','inquiry','privacy','product-detail','hero-products-animation','index.html','about.html','service.html','products.html','herbal.html','activity.html','activity-detail.html','contact.html','inquiry.html','product-detail.html','product','css','js','images','fonts','json','CNAME'];
      if (first && knownRoots.indexOf(first) === -1 && !/\.html?$/i.test(first)) base = '/' + first + '/';
    }
    return base + clean;
  };
})(window);

/* S-LAB v20 bundle: site.js */

/* [อธิบาย S-LAB] บทบาทไฟล์: พฤติกรรมส่วนกลางของทุกหน้า ได้แก่ เมนูนำทาง ปุ่มย้อนขึ้นด้านบน แอนิเมชันตามการเลื่อน ตัวเลข/หัวข้อเคลื่อนไหว สไลเดอร์ หน้าต่างดูภาพ ใบรับรอง แบบฟอร์มสอบถาม และตัวโหลดหน้าเว็บไซต์ */

/* ===== BEGIN navigation, shared behavior, no Stats width scaling ===== */
(function(){
  'use strict';
  var nav = document.querySelector('.ref-nav');
  if(nav){
    var onScroll = function(){ nav.classList.toggle('scrolled', window.scrollY > 10); };
    window.addEventListener('scroll', onScroll, {passive:true});
    onScroll();
  }

  var menu = document.getElementById('refMenu');
  var links = document.getElementById('refLinks');
  if(!menu || !links) return;

  // Keep the active navigation state aligned with the current document.
  // Compare normalized file/path segments so clean URLs, trailing slashes,
  // nested static product pages, and old query-string routes all work.
  function lastPathPart(value) {
    var clean = String(value || '').split(/[?#]/)[0].replace(/\\/g, '/');
    var parts = clean.split('/').filter(Boolean);
    if (!parts.length || parts[parts.length - 1] === '.') return 'index.html';
    return parts[parts.length - 1].toLowerCase();
  }
  var pathname = (window.location.pathname || '/').toLowerCase();
  var trimmedPathname = pathname.replace(/\/+$/, '');
  var currentFile = trimmedPathname ? lastPathPart(trimmedPathname) : 'index.html';
  var isPrettyProduct = /\/product\/[^/]+(?:\/index\.html)?\/?$/.test(pathname);
  var isPrettyActivity = /\/activity\/[^/]+(?:\/index\.html)?\/?$/.test(pathname);
  var activeFile = isPrettyProduct
    ? (document.body.getAttribute('data-product-kind') === 'herbal' ? 'herbal' : 'products')
    : (isPrettyActivity || currentFile === 'activity-detail' || currentFile === 'activity-detail.html' ? 'activity'
      : (currentFile === 'product-detail' || currentFile === 'product-detail.html' ? 'products'
      : (currentFile === 'index.html' ? 'index.html' : currentFile)));
  links.querySelectorAll('a[href]').forEach(function (link) {
    var target = lastPathPart(link.getAttribute('href') || '');
    var active = target === activeFile;
    link.classList.toggle('active', active);
    if (active) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });

  // [อธิบาย S-LAB] ตรวจว่าหน้าจออยู่ในช่วงเดสก์ท็อปเพื่อเลือกพฤติกรรมเมนูให้เหมาะกับอุปกรณ์.
  function isDesktop(){ return window.matchMedia ? window.matchMedia('(min-width: 1280px)').matches : window.innerWidth >= 1280; }
  function setMenu(open, returnFocus){
    links.classList.toggle('open', open);
    menu.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-label', open ? 'ปิดเมนู' : 'เปิดเมนู');
    if (!isDesktop()) document.body.style.overflow = open ? 'hidden' : '';
    else document.body.style.overflow = '';
    if (open) {
      var firstItem = links.querySelector('a');
      if (firstItem && !isDesktop()) firstItem.focus({preventScroll:true});
    } else if (returnFocus) menu.focus();
  }

  menu.addEventListener('click', function(){
    setMenu(!links.classList.contains('open'), false);
  });
  links.querySelectorAll('a').forEach(function(a){
    a.addEventListener('click', function(){ setMenu(false, false); });
  });
  document.addEventListener('click', function(event){
    if (!links.classList.contains('open')) return;
    if (links.contains(event.target) || menu.contains(event.target)) return;
    setMenu(false, false);
  });
  document.addEventListener('keydown', function(event){
    if(event.key === 'Escape' && links.classList.contains('open')) setMenu(false, true);
  });
  window.addEventListener('resize', function(){
    if (isDesktop()) document.body.style.overflow = '';
    if (!isDesktop() && links.classList.contains('open')) setMenu(false, false);
  }, {passive:true});
})();

/* Desktop navigation uses the shared CSS pill states; no JS magnification is required. */


(function(){
  var btn = document.getElementById('backToTop');
  if(!btn) return;
  function update(){ btn.classList.toggle('show', window.scrollY > 500); }
  window.addEventListener('scroll', update, {passive:true});
  btn.addEventListener('click', function(){ window.scrollTo({top:0, behavior:'smooth'}); });
  update();
})();


/* Scroll-proximity expansion for framed panels across the site.
   Section shells narrow slightly when far from the viewport centre and
   expand smoothly as the visitor scrolls them towards the centre. */
(function () {
  // The herbal page is intentionally static while scrolling: do not apply
  // scroll-proximity width or card-scale animation to any part of that page.
  if (document.body && document.body.classList.contains('herbal-page')) return;

  // Keep scroll-proximity animation for general content, but exclude product
  // catalog grids and every individual product card from scroll transforms.
  var selectors = [
    '.product-toolbar',
    '.standards-slider', '.home-activities-track', '.ref-partners',
    '.ref-steps', '.ref-process-grid', '.activity-grid', '.activities-grid'
  ].join(',');
  var cardSelectors = [
    '.ref-card', '.activity-article-grid article',
    '.activity-article-card', '.herbal-process-card', '.slab-service-item',
    '.standards-cert', '.ref-partner-item', '.ref-pillar',
    '.about-assurance-card', '.rnd-item', '.about-photo'
  ].join(',');

  function initScrollFrames() {
    var frames = Array.prototype.slice.call(document.querySelectorAll(selectors));
    var cards = Array.prototype.slice.call(document.querySelectorAll(cardSelectors));
    if (!frames.length && !cards.length) return;
    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      frames.forEach(function (frame) {
        frame.classList.add('scroll-proximity-frame');
        frame.style.width = '100%';
        frame.style.marginInline = 'auto';
      });
      cards.forEach(function (card) {
        card.classList.add('scroll-proximity-card');
        card.style.scale = '1';
      });
      return;
    }

    var ticking = false;
    function update() {
      var viewportHeight = window.innerHeight || document.documentElement.clientHeight;
      var viewportCenter = viewportHeight / 2;
      frames.forEach(function (frame) {
        frame.classList.add('scroll-proximity-frame');
        var rect = frame.getBoundingClientRect();
        var center = rect.top + rect.height / 2;
        var range = Math.max(1, (viewportHeight + rect.height) / 2);
        var distance = Math.min(1, Math.abs(center - viewportCenter) / range);
        var progress = 1 - distance;
        var width = 92 + 8 * progress;
        frame.style.width = width.toFixed(2) + '%';
        frame.style.marginInline = 'auto';
      });
      cards.forEach(function (card) {
        card.classList.add('scroll-proximity-card');
        var rect = card.getBoundingClientRect();
        var center = rect.top + rect.height / 2;
        var range = Math.max(1, (viewportHeight + rect.height) / 2);
        var distance = Math.min(1, Math.abs(center - viewportCenter) / range);
        var progress = 1 - distance;
        card.style.scale = (0.975 + 0.025 * progress).toFixed(3);
      });
      ticking = false;
    }
    function requestUpdate() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(update);
    }
    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate, { passive: true });
    update();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initScrollFrames);
  else initScrollFrames();
})();
/* ===== END navigation, shared behavior, no Stats width scaling ===== */

/* ===== BEGIN general reveal and Stats grid pop ===== */
(function(){
  var reveal = document.querySelectorAll('.ref-reveal');
  if('IntersectionObserver' in window){
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(entry.isIntersecting){
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, {threshold:.12});
    reveal.forEach(function(el){ io.observe(el); });
  } else {
    reveal.forEach(function(el){ el.classList.add('in'); });
  }
})();

/* S-LAB Services: reveal + scroll spotlight */
(function(){
  var items = document.querySelectorAll('.slab-service-item');
  if(!items.length) return;

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if(reduce){
    items.forEach(function(item){ item.classList.add('is-visible'); });
    return;
  }

  if('IntersectionObserver' in window){
    var reveal = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(entry.isIntersecting) entry.target.classList.add('is-visible');
      });
    }, {threshold:.08, rootMargin:'0px 0px -8% 0px'});
    items.forEach(function(item){ reveal.observe(item); });

    var spotlight = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(entry.isIntersecting){
          items.forEach(function(item){ item.classList.remove('is-active'); });
          entry.target.classList.add('is-active');
        }
      });
    }, {threshold:0.35, rootMargin:'-20% 0px -45% 0px'});
    items.forEach(function(item){ spotlight.observe(item); });
  } else {
    items.forEach(function(item){ item.classList.add('is-visible','is-active'); });
  }
})();


/* Stats grid pop in/out: replay every time it enters or leaves the viewport. */
(function () {
  'use strict';
  var grid = document.querySelector('[data-stats-grid]');
  if (!grid) return;
  grid.classList.add('stats-grid-pop-ready');
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion || !('IntersectionObserver' in window)) {
    grid.classList.add('is-in-view');
    return;
  }
  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      grid.classList.toggle('is-in-view', entry.isIntersecting);
    });
  }, { threshold: 0.16, rootMargin: '0px 0px -3% 0px' });
  observer.observe(grid);
})();
/* ===== END general reveal and Stats grid pop ===== */

/* ===== BEGIN counters, headline flair and small interactions ===== */
/* =========================================================
   S-LAB · FLAIR LAYER (behaviour)
   Progressive enhancement — safe to load on every page.
   Works alongside main.js without touching it.
   ========================================================= */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 1. Page fade-in ---------- */
  document.addEventListener('DOMContentLoaded', function () {
    requestAnimationFrame(function () {
      document.body.classList.add('is-ready');
    });
  });

  /* ---------- 2. Scroll progress bar ---------- */
  var progress = document.createElement('div');
  progress.className = 'slab-progress';
  progress.setAttribute('aria-hidden', 'true');
  document.addEventListener('DOMContentLoaded', function () {
    document.body.appendChild(progress);
  });

  /* ---------- 3. Back-to-top button ---------- */
  var topBtn = document.createElement('button');
  topBtn.type = 'button';
  topBtn.className = 'slab-top';
  topBtn.setAttribute('aria-label', 'Back to top');
  topBtn.innerHTML =
    '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M12 19V5M12 5L5 12M12 5L19 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
    '</svg>';
  topBtn.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  });
  document.addEventListener('DOMContentLoaded', function () {
    document.body.appendChild(topBtn);
  });

  /* ---------- 4. Reveal stagger ---------- */
  document.addEventListener('DOMContentLoaded', function () {
    // group .ref-reveal elements by parent so siblings fade in with a stagger
    var map = new Map();
    document.querySelectorAll('.ref-reveal').forEach(function (el) {
      var p = el.parentElement;
      if (!p) return;
      if (!map.has(p)) map.set(p, []);
      map.get(p).push(el);
    });
    map.forEach(function (list) {
      if (list.length < 2) return;
      list.forEach(function (el, i) {
        if (!el.style.transitionDelay) {
          el.style.transitionDelay = Math.min(i, 6) * 90 + 'ms';
        }
      });
    });
  });

  /* ---------- 6. Animated counters ---------- */
  // [อธิบาย S-LAB] ค่อย ๆ เพิ่มตัวเลขสถิติจากค่าเริ่มต้นไปยังค่าเป้าหมายเมื่อส่วนสถิติแสดงบนหน้าจอ.
  function animateCounter(el) {
    var target = parseFloat(el.getAttribute('data-target') || '0');
    var decimals = (el.getAttribute('data-target') || '').includes('.') ? 1 : 0;
    var duration = 1400;
    var start = null;
    var wrap = el.closest('.slab-stat-num');

    function finish() {
      el.textContent = target.toFixed(decimals);
      if (wrap && !reduceMotion) {
        wrap.classList.add('pulse');
        window.setTimeout(function () { wrap.classList.remove('pulse'); }, 550);
      }
    }

    if (reduceMotion) { finish(); return; }

    function step(ts) {
      if (start === null) start = ts;
      var p = Math.min(1, (ts - start) / duration);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = (target * eased).toFixed(decimals);
      if (p < 1) requestAnimationFrame(step);
      else finish();
    }
    requestAnimationFrame(step);
  }

  document.addEventListener('DOMContentLoaded', function () {
    var counters = document.querySelectorAll('[data-counter]');
    if (!counters.length) return;
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            animateCounter(entry.target);
            io.unobserve(entry.target);
          }
        });
      }, { threshold: 0.4 });
      counters.forEach(function (el) { io.observe(el); });
    } else {
      counters.forEach(animateCounter);
    }
  });

  /* ---------- 8. Split-word headline reveal ---------- */
  document.addEventListener('DOMContentLoaded', function () {
    var selector = [
      '.ref-products h2', '.ref-quality h2', '.ref-cta-banner h2',
      '.ref-about-banner h4', '.ref-service-banner h4',
      '.ref-activity-hero h4', '.ref-contact-hero h4',
      '.ref-inquiry-hero h4', '.products-catalog-hero h4'
    ].join(',');
    var heads = document.querySelectorAll(selector);
    if (!heads.length) return;

    heads.forEach(function (el) {
      if (reduceMotion) { el.classList.add('slab-split-ready', 'in'); return; }
      var text = el.textContent;
      // Preserve manual <br> line breaks if present in the source markup
      var html = el.innerHTML;
      var lines = html.split(/<br\s*\/?>/i);
      el.innerHTML = '';
      lines.forEach(function (line, li) {
        var lineEl = document.createElement('span');
        lineEl.className = 'slab-split-line';
        line.trim().split(/\s+/).forEach(function (word, wi) {
          if (!word) return;
          var w = document.createElement('span');
          w.className = 'slab-split-word';
          w.style.transitionDelay = ((li * 4 + wi) * 55) + 'ms';
          w.textContent = word + '\u00A0';
          lineEl.appendChild(w);
        });
        el.appendChild(lineEl);
        if (li < lines.length - 1) el.appendChild(document.createElement('br'));
      });
      el.classList.add('slab-split-ready');
    });

    if ('IntersectionObserver' in window) {
      var io2 = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
            io2.unobserve(entry.target);
          }
        });
      }, { threshold: 0.3 });
      heads.forEach(function (el) { io2.observe(el); });
    } else {
      heads.forEach(function (el) { el.classList.add('in'); });
    }
  });

  /* ---------- 7. Split-word heading reveal ---------- */
  function wrapWords(el) {
    if (el.getAttribute('data-split-done')) return;
    el.setAttribute('data-split-done', '1');
    Array.prototype.slice.call(el.childNodes).forEach(function (node) {
      if (node.nodeType === 3) { // text node
        var parts = node.textContent.split(/(\s+)/).filter(function (s) { return s.length; });
        var frag = document.createDocumentFragment();
        parts.forEach(function (part) {
          if (/^\s+$/.test(part)) {
            frag.appendChild(document.createTextNode(part));
          } else {
            var span = document.createElement('span');
            span.className = 'word';
            span.textContent = part;
            frag.appendChild(span);
          }
        });
        node.parentNode.replaceChild(frag, node);
      }
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    var splits = document.querySelectorAll('.split-reveal');
    if (!splits.length) return;
    splits.forEach(wrapWords);

    if (reduceMotion) {
      splits.forEach(function (el) { el.classList.add('in'); });
      return;
    }

    if ('IntersectionObserver' in window) {
      var io2 = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            var words = entry.target.querySelectorAll('.word');
            words.forEach(function (w, i) { w.style.transitionDelay = (i * 45) + 'ms'; });
            entry.target.classList.add('in');
            io2.unobserve(entry.target);
          }
        });
      }, { threshold: 0.3 });
      splits.forEach(function (el) { io2.observe(el); });
    } else {
      splits.forEach(function (el) { el.classList.add('in'); });
    }
  });

})();
/* ===== END counters, headline flair and small interactions ===== */

/* ===== BEGIN sliders ===== */
/* S-LAB sliders — hero + certificates (native scroll-snap + leaf dots) */
(function () {
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // [อธิบาย S-LAB] ตั้งค่าตัวเลื่อนภาพและใบรับรอง: ปุ่มก่อน/ถัดไป จุดนำทาง การลาก การปรับความสูง และเล่นอัตโนมัติ.
  function init(root) {
    if (root.hasAttribute('data-defer-slider') || root.hasAttribute('data-slider-initialized')) return;
    var track = root.querySelector('[data-slider-track]');
    if (!track) return;
    var slides = [].slice.call(track.children).filter(function (el) {
      return !el.hasAttribute('data-slider-skip');
    });
    var n = slides.length;
    if (n < 2) return;
    root.setAttribute('data-slider-initialized', 'true');

    var label = root.getAttribute('data-slider-label') || 'สไลด์';
    var autoplay = reduce ? 0 : parseInt(root.getAttribute('data-autoplay') || '0', 10);

    /* leaf dots */
    var dotsWrap = root.querySelector('[data-slider-dots]');
    var dots = [];
    if (dotsWrap) {
      dotsWrap.classList.add('slider-dots');
      slides.forEach(function (_, i) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'slider-dot';
        b.setAttribute('aria-label', label + ' ' + (i + 1) + ' / ' + n);
        b.addEventListener('click', function () { go(i); });
        dotsWrap.appendChild(b);
        dots.push(b);
      });
    }

    function current() {
      var c = track.scrollLeft + track.clientWidth / 2, best = 0, bd = Infinity;
      slides.forEach(function (s, i) {
        var d = Math.abs(s.offsetLeft + s.offsetWidth / 2 - c);
        if (d < bd) { bd = d; best = i; }
      });
      return best;
    }

    function go(i) {
      i = (i + n) % n;
      var s = slides[i];
      var left = s.offsetLeft - (track.clientWidth - s.offsetWidth) / 2;
      track.scrollTo({ left: left, behavior: reduce ? 'auto' : 'smooth' });
    }

    var active = -1;
    function syncAdaptiveHeight(index) {
      if (!root.hasAttribute('data-adaptive-height')) return;
      var slide = slides[index];
      if (!slide) return;
      var height = Math.round(slide.getBoundingClientRect().height);
      if (height > 0) track.style.height = height + 'px';
    }
    function update() {
      var i = current();
      if (i === active) {
        syncAdaptiveHeight(i);
        return;
      }
      active = i;
      slides.forEach(function (s, k) {
        s.classList.toggle('is-active', k === i);
        var animatedFrame = s.querySelector('iframe[data-hero-animation]');
        if (animatedFrame) {
          var desiredMessage = k === i ? 'slab:hero-play' : 'slab:hero-pause';
          animatedFrame.dataset.slabDesiredMessage = desiredMessage;
          function sendAnimationState() {
            if (animatedFrame.contentWindow) animatedFrame.contentWindow.postMessage(animatedFrame.dataset.slabDesiredMessage || 'slab:hero-pause', '*');
          }
          if (animatedFrame.dataset.slabLoadHook !== '1') {
            animatedFrame.dataset.slabLoadHook = '1';
            animatedFrame.addEventListener('load', function () {
              animatedFrame.dataset.slabLoaded = '1';
              sendAnimationState();
            });
          }
          if (animatedFrame.dataset.slabLoaded === '1') sendAnimationState();
        }
      });
      dots.forEach(function (d, k) {
        d.classList.toggle('is-active', k === i);
        if (k === i) d.setAttribute('aria-current', 'true'); else d.removeAttribute('aria-current');
      });
      syncAdaptiveHeight(i);
    }

    var ticking = false;
    track.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () { ticking = false; update(); });
    }, { passive: true });
    window.addEventListener('resize', function () {
      go(active < 0 ? 0 : active);
      window.requestAnimationFrame(function () { syncAdaptiveHeight(active < 0 ? 0 : active); });
    });

    var prev = root.querySelector('[data-slider-prev]');
    var next = root.querySelector('[data-slider-next]');
    if (prev) prev.addEventListener('click', function () { go(current() - 1); });
    if (next) next.addEventListener('click', function () { go(current() + 1); });

    root.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { go(current() - 1); }
      else if (e.key === 'ArrowRight') { go(current() + 1); }
    });

    /* mouse drag for desktop */
    var down = false, sx = 0, sl = 0, moved = false;
    track.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse') return;
      down = true; moved = false; sx = e.clientX; sl = track.scrollLeft;
    });
    window.addEventListener('pointermove', function (e) {
      if (!down) return;
      var dx = e.clientX - sx;
      if (Math.abs(dx) > 4) {
        moved = true;
        track.style.scrollSnapType = 'none';
        track.style.cursor = 'grabbing';
        track.scrollLeft = sl - dx;
      }
    });
    window.addEventListener('pointerup', function () {
      if (!down) return;
      down = false;
      track.style.cursor = '';
      if (moved) {
        track.style.scrollSnapType = '';
        go(current());
      }
    });
    track.addEventListener('click', function (e) {
      if (!moved) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      moved = false;
    }, true);

    /* autoplay (hero) */
    var timer = null, hovering = false, visible = true;
    function stop() { if (timer) { clearInterval(timer); timer = null; } }
    function start() {
      stop();
      if (!autoplay || hovering || !visible || document.hidden) return;
      timer = setInterval(function () { go(current() + 1); }, autoplay);
    }
    if (autoplay) {
      root.addEventListener('mouseenter', function () { hovering = true; stop(); });
      root.addEventListener('mouseleave', function () { hovering = false; start(); });
      root.addEventListener('focusin', function () { hovering = true; stop(); });
      root.addEventListener('focusout', function () { hovering = false; start(); });
      track.addEventListener('touchstart', stop, { passive: true });
      track.addEventListener('touchend', function () { setTimeout(start, 4000); }, { passive: true });
      document.addEventListener('visibilitychange', start);
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (en) {
          visible = en[0].isIntersecting; start();
        }, { threshold: 0.25 }).observe(root);
      }
    }

    update();
    start();
  }

  function boot() { document.querySelectorAll('[data-slider]').forEach(init); }
  document.addEventListener('slab:hero-ready', boot);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
/* ===== END sliders ===== */

/* ===== BEGIN product image lightbox ===== */
/* Product photo viewer: click image/magnifier to open a modal with optional zoom.
   Hover zoom remains on the product frame itself and is managed by the detail page. */
(function () {
  'use strict';
  var areas = Array.prototype.slice.call(document.querySelectorAll('.slab-main-image'));
  if (!areas.length) return;

  var lightbox = document.createElement('div');
  lightbox.className = 'slab-lightbox product-lightbox';
  lightbox.setAttribute('role', 'dialog');
  lightbox.setAttribute('aria-modal', 'true');
  lightbox.setAttribute('aria-label', 'ดูภาพผลิตภัณฑ์ขนาดใหญ่');
  lightbox.setAttribute('aria-hidden', 'true');
  lightbox.innerHTML = [
    '<button type="button" class="slab-lightbox-close" aria-label="ปิดหน้าต่าง">×</button>',
    '<div class="slab-lightbox-toolbar" aria-label="เครื่องมือขยายภาพ">',
      '<button type="button" data-zoom="out" aria-label="ย่อภาพ" title="ย่อภาพ">−</button>',
      '<span class="slab-zoom-value" aria-live="polite">100%</span>',
      '<button type="button" data-zoom="in" aria-label="ขยายภาพ" title="ขยายภาพ">+</button>',
      '<button type="button" data-zoom="reset" aria-label="ปรับภาพให้พอดีหน้าจอ" title="ปรับภาพให้พอดีหน้าจอ">↺</button>',
    '</div>',
    '<div class="slab-lightbox-stage"><img alt=""></div>'
  ].join('');
  document.body.appendChild(lightbox);

  var stage = lightbox.querySelector('.slab-lightbox-stage');
  var viewImage = stage.querySelector('img');
  var closeButton = lightbox.querySelector('.slab-lightbox-close');
  var zoomValue = lightbox.querySelector('.slab-zoom-value');
  var scale = 1, baseScale = 1, x = 0, y = 0;
  var dragging = false, startX = 0, startY = 0, originX = 0, originY = 0;
  var previousFocus = null;

  // [อธิบาย S-LAB] จำกัดตำแหน่งเลื่อนภาพซูมไม่ให้ภาพหลุดออกนอกกรอบหน้าต่าง.
  function clampPan() {
    if (!viewImage.naturalWidth || !viewImage.naturalHeight) return;
    var rect = stage.getBoundingClientRect();
    var maxX = Math.max(0, (viewImage.naturalWidth * scale - rect.width) / 2);
    var maxY = Math.max(0, (viewImage.naturalHeight * scale - rect.height) / 2);
    x = Math.max(-maxX, Math.min(maxX, x));
    y = Math.max(-maxY, Math.min(maxY, y));
  }
  function fitScale() {
    var rect = stage.getBoundingClientRect();
    if (!viewImage.naturalWidth || !viewImage.naturalHeight) return 1;
    return Math.min((rect.width - 24) / viewImage.naturalWidth, (rect.height - 24) / viewImage.naturalHeight, 1);
  }
  function render() {
    if (!viewImage.naturalWidth || !viewImage.naturalHeight) return;
    clampPan();
    viewImage.style.width = (viewImage.naturalWidth * scale) + 'px';
    viewImage.style.height = (viewImage.naturalHeight * scale) + 'px';
    viewImage.style.transform = 'translate3d(calc(-50% + ' + x + 'px), calc(-50% + ' + y + 'px), 0)';
    zoomValue.textContent = Math.round(scale / Math.max(baseScale, 0.0001) * 100) + '%';
  }
  function resetZoom() {
    baseScale = fitScale();
    scale = baseScale;
    x = 0; y = 0;
    render();
  }
  function setZoom(next, centerX, centerY) {
    var old = scale;
    scale = Math.max(baseScale, Math.min(baseScale * 4, next));
    if (scale <= baseScale) { x = 0; y = 0; }
    else if (centerX !== undefined && centerY !== undefined && old > 0) {
      var ratio = scale / old;
      x = centerX - (centerX - x) * ratio;
      y = centerY - (centerY - y) * ratio;
    }
    render();
  }
  function open(area) {
    var sourceImage = area.querySelector('img');
    if (!sourceImage || !(sourceImage.currentSrc || sourceImage.src)) return;
    previousFocus = document.activeElement;
    viewImage.alt = sourceImage.alt || 'ภาพผลิตภัณฑ์ Saffron Laboratories';
    lightbox.classList.add('is-open');
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.classList.add('lightbox-open');
    viewImage.onload = resetZoom;
    viewImage.onerror = function () { viewImage.alt = 'ไม่สามารถโหลดภาพผลิตภัณฑ์ได้'; };
    viewImage.src = sourceImage.currentSrc || sourceImage.src;
    if (viewImage.complete && viewImage.naturalWidth) resetZoom();
    closeButton.focus();
  }
  function close() {
    if (!lightbox.classList.contains('is-open')) return;
    lightbox.classList.remove('is-open');
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('lightbox-open');
    dragging = false;
    if (previousFocus && typeof previousFocus.focus === 'function') previousFocus.focus({ preventScroll: true });
  }

  areas.forEach(function (area) {
    // Capture phase prevents the old button handler from locking the frame zoom on click.
    area.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      open(area);
    }, true);
  });
  closeButton.addEventListener('click', close);
  lightbox.addEventListener('click', function (event) { if (event.target === lightbox) close(); });
  lightbox.querySelector('[data-zoom="in"]').addEventListener('click', function () { setZoom(scale + baseScale * .25); });
  lightbox.querySelector('[data-zoom="out"]').addEventListener('click', function () { setZoom(scale - baseScale * .25); });
  lightbox.querySelector('[data-zoom="reset"]').addEventListener('click', resetZoom);
  document.addEventListener('keydown', function (event) {
    if (!lightbox.classList.contains('is-open')) return;
    if (event.key === 'Escape') close();
    else if (event.key === '+' || event.key === '=') setZoom(scale + baseScale * .25);
    else if (event.key === '-') setZoom(scale - baseScale * .25);
    else if (event.key === '0') resetZoom();
  });
  stage.addEventListener('wheel', function (event) {
    event.preventDefault();
    var rect = stage.getBoundingClientRect();
    setZoom(scale + (event.deltaY < 0 ? .2 : -.2), event.clientX - rect.left - rect.width / 2, event.clientY - rect.top - rect.height / 2);
  }, { passive: false });
  stage.addEventListener('pointerdown', function (event) {
    if (event.button !== undefined && event.button !== 0) return;
    if (scale <= baseScale) return;
    dragging = true;
    startX = event.clientX; startY = event.clientY; originX = x; originY = y;
    try { stage.setPointerCapture(event.pointerId); } catch (_) {}
  });
  stage.addEventListener('pointermove', function (event) {
    if (!dragging) return;
    x = originX + event.clientX - startX; y = originY + event.clientY - startY; render();
  });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (name) { stage.addEventListener(name, function () { dragging = false; }); });
  window.addEventListener('resize', function () { if (lightbox.classList.contains('is-open')) resetZoom(); });
})();
/* ===== END product image lightbox ===== */

/* ===== BEGIN certificate lightbox ===== */
/* Certificate viewer shares the product modal styling but deliberately has no zoom controls or zoom interactions. */
(function () {
  'use strict';
  var links = Array.prototype.slice.call(document.querySelectorAll('.certificate-view-link'));
  if (!links.length) return;

  var lightbox = document.createElement('div');
  lightbox.className = 'slab-lightbox certificate-lightbox';
  lightbox.setAttribute('role', 'dialog');
  lightbox.setAttribute('aria-modal', 'true');
  lightbox.setAttribute('aria-label', 'ดูใบรับรองขนาดใหญ่');
  lightbox.setAttribute('aria-hidden', 'true');
  lightbox.innerHTML = [
    '<button type="button" class="slab-lightbox-close" aria-label="ปิดหน้าต่าง">×</button>',
    '<div class="slab-lightbox-stage"><img alt=""></div>'
  ].join('');
  document.body.appendChild(lightbox);

  var image = lightbox.querySelector('.slab-lightbox-stage img');
  var closeButton = lightbox.querySelector('.slab-lightbox-close');
  var previousFocus = null;
  function open(link) {
    var source = link.getAttribute('href');
    if (!source) return;
    previousFocus = document.activeElement;
    var thumb = link.querySelector('img');
    image.alt = thumb ? thumb.alt : 'ใบรับรองมาตรฐาน Saffron Laboratories';
    image.src = source;
    lightbox.classList.add('is-open');
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.classList.add('lightbox-open');
    closeButton.focus();
  }
  function close() {
    if (!lightbox.classList.contains('is-open')) return;
    lightbox.classList.remove('is-open');
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('lightbox-open');
    if (previousFocus && typeof previousFocus.focus === 'function') previousFocus.focus({ preventScroll: true });
  }
  links.forEach(function (link) {
    link.setAttribute('aria-haspopup', 'dialog');
    link.addEventListener('click', function (event) { event.preventDefault(); open(link); });
  });
  closeButton.addEventListener('click', close);
  lightbox.addEventListener('click', function (event) { if (event.target === lightbox) close(); });
  document.addEventListener('keydown', function (event) {
    if (lightbox.classList.contains('is-open') && event.key === 'Escape') close();
  });
})();
/* ===== END certificate lightbox ===== */

/* ===== BEGIN inquiry form ===== */
(function () {
  'use strict';

  const form = document.getElementById('inquiryForm');
  if (!form) return;

  // Google Apps Script Web App URL
  const EXCEL_ENDPOINT = 'https://script.google.com/macros/s/AKfycbykPIhiKcw_FWRRdEOKaP4XdVQyW_U951BSecVlJCDQfjUlEoWQgNi3CclLVcll_anF/exec';

  const modal = document.getElementById('inquiryModal');
  const modalTitle = document.getElementById('inquiryModalTitle');
  const modalMessage = document.getElementById('inquiryModalMessage');
  const modalIcon = document.getElementById('inquiryModalIcon');
  const modalOk = document.getElementById('inquiryModalOk');
  const modalClose = document.getElementById('inquiryModalClose');
  const backdrop = modal ? modal.querySelector('[data-close-modal]') : null;
  const note = document.getElementById('inquiryNote');
  const submitButton = form.querySelector('button[type="submit"]');
  const submitButtonStatus = document.getElementById('submitButtonStatus');
  let isSubmitting = false;
  let submitResetTimer = null;

  // [อธิบาย S-LAB] เปลี่ยนข้อความ/สถานะของปุ่มส่งแบบฟอร์มตามสถานะกำลังส่ง สำเร็จ หรือผิดพลาด.
  function setSubmitState(state) {
    if (!submitButton) return;
    submitButton.dataset.submitState = state;
    submitButton.disabled = state === 'pending';
    submitButton.setAttribute('aria-label', {
      idle: 'ส่งข้อมูลสอบถาม',
      pending: 'กำลังส่งข้อมูลสอบถาม',
      success: 'ส่งข้อมูลสำเร็จ',
      error: 'ส่งข้อมูลไม่สำเร็จ ลองอีกครั้ง'
    }[state] || 'ส่งข้อมูลสอบถาม');
    if (state === 'pending') {
      submitButton.setAttribute('aria-busy', 'true');
      if (submitButtonStatus) submitButtonStatus.textContent = 'กำลังส่งข้อมูลสอบถาม';
    } else {
      submitButton.removeAttribute('aria-busy');
      if (submitButtonStatus) submitButtonStatus.textContent = state === 'idle' ? '' : ({
        success: 'ส่งข้อมูลสำเร็จ',
        error: 'ส่งข้อมูลไม่สำเร็จ กรุณาตรวจสอบแล้วลองอีกครั้ง'
      }[state] || '');
    }
  }

  function scheduleSubmitStateReset() {
    if (submitResetTimer) window.clearTimeout(submitResetTimer);
    submitResetTimer = window.setTimeout(function () {
      if (!isSubmitting) setSubmitState('idle');
    }, 1500);
  }

  // If a visitor came from a product page, carry the product context into the inquiry.
  const inquiryParams = new URLSearchParams(window.location.search);
  const requestedProduct = inquiryParams.get('product');
  const requestedCategory = (inquiryParams.get('category') || '').toLowerCase();
  const messageField = document.getElementById('message');
  const categoryField = document.getElementById('category');
  if (requestedProduct && messageField && !messageField.value.trim()) {
    messageField.value = 'สนใจสอบถามการผลิตสินค้า: ' + requestedProduct + '\n\nรายละเอียดเพิ่มเติม: ';
  }
  if (categoryField && requestedCategory) {
    const normalized = requestedCategory.replace(/\s+care$/, '').trim();
    const desired = normalized === 'face' || normalized === 'body' ? normalized + ' care' : normalized + ' care';
    const option = Array.from(categoryField.options).find(function (item) {
      return item.value.toLowerCase() === desired || item.textContent.trim().toLowerCase() === desired;
    });
    if (option) categoryField.value = option.value;
  }

  // [อธิบาย S-LAB] เปิดหน้าต่างแจ้งผลการส่งแบบฟอร์มและตั้งค่าหัวข้อ ข้อความ และไอคอน.
  function openModal(type, title, message) {
    if (!modal) return;
    modalIcon.textContent = type === 'success' ? '✓' : '!';
    modalIcon.classList.toggle('error', type !== 'success');
    modalTitle.textContent = title;
    modalMessage.textContent = message;
    modal.classList.add('show');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    if (modalClose) modalClose.focus();
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.remove('show');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
    if (submitButton) submitButton.focus();
  }

  [modalOk, modalClose, backdrop].forEach(function (el) {
    if (el) el.addEventListener('click', closeModal);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && modal && modal.classList.contains('show')) closeModal();
  });

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    if (isSubmitting) return;

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    if (!EXCEL_ENDPOINT || EXCEL_ENDPOINT.includes('YOUR_GOOGLE_APPS_SCRIPT')) {
      openModal('error', 'ยังไม่ได้เชื่อมต่อ', 'กรุณาใส่ Apps Script URL');
      return;
    }

    const data = {
      timestamp: new Date().toISOString(),
      name: document.getElementById('name').value.trim(),
      company: document.getElementById('company').value.trim(),
      email: document.getElementById('email').value.trim(),
      phone: document.getElementById('phone').value.trim(),
      category: document.getElementById('category').value,
      message: document.getElementById('message').value.trim(),
      page: window.location.href,
      // Honeypot: real visitors never see or fill this field (hidden via CSS).
      // Bots that auto-fill every input will trip it; the server silently
      // discards submissions where this is non-empty.
      website: document.getElementById('website') ? document.getElementById('website').value.trim() : ''
    };

    isSubmitting = true;
    if (submitResetTimer) window.clearTimeout(submitResetTimer);
    setSubmitState('pending');
    form.setAttribute('aria-busy', 'true');
    note.classList.remove('show');
    note.textContent = '';

    try {
      // NOTE: mode is intentionally left as default ('cors'), not 'no-cors'.
      // Apps Script web apps (deployed for "Anyone") return
      // Access-Control-Allow-Origin: * on simple requests, and a
      // text/plain content-type keeps this a "simple request" that
      // skips the CORS preflight — so this works without any extra
      // server-side CORS handling, while still letting us read the
      // actual success/error result the server sends back.
      const response = await fetch(EXCEL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(data)
      });

      let result;
      try {
        result = await response.json();
      } catch (parseError) {
        throw new Error('การตอบกลับจากเซิร์ฟเวอร์ไม่ถูกต้อง');
      }

      if (!response.ok || !result || result.success !== true) {
        const serverMessage = result && result.error ? result.error : 'กรุณาตรวจสอบข้อมูลแล้วลองใหม่อีกครั้ง';
        throw new Error(serverMessage);
      }

      form.reset();
      note.textContent = 'ส่งข้อมูลเรียบร้อยแล้ว';
      note.classList.add('show');
      if (window.slabAnalytics && typeof window.slabAnalytics.track === 'function') {
        window.slabAnalytics.track('generate_lead', {
          form_name: 'website_inquiry',
          product_interest: requestedProduct || 'not_specified',
          product_category: requestedCategory || 'not_specified'
        });
      }
      setSubmitState('success');
      openModal(
        'success',
        'ส่งข้อมูลสำเร็จ',
        'ขอบคุณสำหรับข้อมูล ทีมงาน Saffron Laboratories จะติดต่อกลับโดยเร็วที่สุด'
      );
    } catch (error) {
      console.error('Inquiry submission failed:', error);
      setSubmitState('error');
      openModal(
        'error',
        'ส่งข้อมูลไม่สำเร็จ',
        error && error.message
          ? error.message
          : 'ไม่สามารถเชื่อมต่อระบบรับข้อมูลได้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่อีกครั้ง'
      );
    } finally {
      isSubmitting = false;
      form.removeAttribute('aria-busy');
      if (submitButton.dataset.submitState === 'pending') setSubmitState('idle');
      else scheduleSubmitStateReset();
    }
  });
})();
/* ===== END inquiry form ===== */


/* ===== v24: shared page-load water-drop reveal ===== */
(function () {
  'use strict';
  var loader = document.getElementById('siteLoader');
  if (!loader) return;
  var finished = false;
  // [อธิบาย S-LAB] ซ่อนตัวโหลดหน้าเมื่อโหลดเสร็จหรือเมื่อถึงเวลาสำรอง เพื่อไม่ให้บังหน้าเว็บค้าง.
  function finishLoading() {
    if (finished) return;
    finished = true;
    document.body.classList.add('site-ready');
    window.setTimeout(function () { loader.classList.add('loaded'); }, 220);
    loader.addEventListener('animationend', function (event) {
      if (event.animationName === 'siteWaterDropReveal') {
        loader.setAttribute('aria-hidden', 'true');
        loader.style.pointerEvents = 'none';
      }
    }, { once: true });
  }
  if (document.readyState === 'complete') {
    window.setTimeout(finishLoading, 220);
  } else {
    window.addEventListener('load', finishLoading, { once: true });
  }
  // Failsafe for slow or blocked resources so the page never stays covered.
  window.setTimeout(finishLoading, 8000);
})();
/* ===== End v24 shared loader ===== */
