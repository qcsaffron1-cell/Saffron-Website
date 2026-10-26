/* S-LAB home banners: rendered from json/banners.json, editable in Pages CMS. */
(function () {
  'use strict';
  var root = document.querySelector('[data-slider].hero-slider');
  var track = root && root.querySelector('[data-slider-track]');
  if (!root || !track) return;

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
  }
  function safeHref(value) {
    var v = String(value || '').trim();
    if (!v) return '';
    if (/^(https?:\/\/|mailto:|tel:)/i.test(v)) return v;
    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(v) || v.startsWith('//')) return '';
    return v;
  }
  function renderBanner(banner, index) {
    var themes = {
      anniversary: 'hero-slide--anniversary',
      factory: 'hero-slide--photo hero-slide--factory',
      'herbal-process': 'hero-slide--photo hero-slide--herbal-process',
      'botanical-feature': 'hero-slide--botanical-feature',
      'hero-products': 'hero-slide--hero-products'
    };
    var link = safeHref(banner.link);
    var accessibleName = banner.ariaLabel || banner.alt || banner.title || 'Saffron Laboratories';

    // The Hero Products animation is an isolated page so its animation CSS/JS cannot clash with site styles.
    // site.js sends slab:hero-play/slab:hero-pause when this slide becomes active/inactive.
    if (banner.theme === 'hero-products') {
      var animationSrc = window.slabAssetHref('hero-products-animation.html?embed=1');
      var targetAttrs = link ? ' href="' + escapeHtml(link) + '"' +
        (banner.openInNewTab ? ' target="_blank" rel="noopener noreferrer"' : '') : '';
      var keyboardLink = link ? '<a class="hero-products-link"' + targetAttrs +
        ' aria-label="' + escapeHtml(accessibleName) + '" tabindex="0"></a>' : '';
      return '<div class="hero-slide hero-slide--hero-products" data-banner-theme="hero-products" aria-roledescription="slide" aria-label="' +
        escapeHtml(accessibleName) + '">' +
        '<iframe data-hero-animation src="' + escapeHtml(animationSrc) + '" title="' + escapeHtml(accessibleName) +
        '" loading="' + (index === 0 ? 'eager' : 'lazy') + '" tabindex="-1" aria-hidden="true"></iframe>' +
        keyboardLink + '</div>';
    }

    var theme = themes[banner.theme] || themes.factory;
    var tag = link ? 'a' : 'div';
    var linkAttrs = link ? ' href="' + escapeHtml(link) + '"' + (banner.openInNewTab ? ' target="_blank" rel="noopener noreferrer"' : '') : '';
    var content = '<img loading="' + (index === 0 ? 'eager' : 'lazy') + '" fetchpriority="' + (index === 0 ? 'high' : 'auto') + '" alt="' + escapeHtml(banner.alt || accessibleName) + '" src="' + escapeHtml(window.slabAssetHref(banner.image)) + '" draggable="false">';
    if (banner.kicker || banner.title || banner.caption) {
      content += '<div class="hero-caption">' +
        (banner.kicker ? '<p class="hero-kicker">' + escapeHtml(banner.kicker) + '</p>' : '') +
        (banner.title ? '<h2>' + escapeHtml(banner.title).replace(/\n/g,'<br>') + '</h2>' : '') +
        (banner.caption ? '<p>' + escapeHtml(banner.caption) + '</p>' : '') + '</div>';
    }
    return '<' + tag + ' class="hero-slide ' + theme + '" aria-roledescription="slide" aria-label="' + escapeHtml(accessibleName) + '"' + linkAttrs + '>' + content + '</' + tag + '>';
  }

  fetch(window.slabAssetHref('json/banners.json'), { cache: 'no-cache', headers: { Accept: 'application/json' } })
    .then(function (res) { if (!res.ok) throw new Error('Unable to load banners'); return res.json(); })
    .then(function (data) {
      if (!Array.isArray(data)) throw new Error('banners.json must be a list');
      var active = data.filter(function (item) { return item && item.enabled !== false && (item.image || item.theme === 'hero-products'); });
      if (!active.length) return;
      track.innerHTML = active.map(renderBanner).join('');
      var dots = root.querySelector('[data-slider-dots]');
      if (dots) dots.innerHTML = '';
      root.removeAttribute('data-defer-slider');
      root.removeAttribute('data-slider-initialized');
      document.dispatchEvent(new Event('slab:hero-ready'));
    })
    .catch(function (err) {
      console.warn('[S-LAB banners] Using built-in fallback banners.', err);
      root.removeAttribute('data-defer-slider');
      document.dispatchEvent(new Event('slab:hero-ready'));
    });
})();
