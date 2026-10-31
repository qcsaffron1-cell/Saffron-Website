/* S-LAB analytics: GA4 + privacy-first consent. Configure the Measurement ID below. */
(function (window, document) {
  'use strict';
  var GA_MEASUREMENT_ID = 'G-PZK5XHM1KJ'; // ใส่ Measurement ID จริง เช่น G-ABC1234567 หลังสร้าง GA4
  var CONSENT_KEY = 'slab_analytics_consent_v3';
  var configured = /^G-[A-Z0-9]+$/i.test(GA_MEASUREMENT_ID) && GA_MEASUREMENT_ID !== 'G-XXXXXXXXXX';
  var consent = 'unknown';
  var initialized = false;
  var active = false;
  var currentProduct = null;
  var currentProductSent = false;
  var notice = null;

  function readConsent() {
    try {
      var value = window.localStorage.getItem(CONSENT_KEY);
      return value === 'accepted' || value === 'rejected' ? value : 'unknown';
    } catch (e) { return 'unknown'; }
  }
  function saveConsent(value) {
    try { window.localStorage.setItem(CONSENT_KEY, value); } catch (e) {}
  }
  function baseTrack(name, params) {
    if (!configured || !active || typeof window.gtag !== 'function') return;
    window.gtag('event', name, params || {});
  }
  function loadTag() {
    if (!configured || consent !== 'accepted') return;
    if (!initialized) {
      initialized = true;
      window.dataLayer = window.dataLayer || [];
      window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
      window.gtag('js', new Date());
      window.gtag('consent', 'default', { analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
      window.gtag('config', GA_MEASUREMENT_ID, { allow_google_signals: false });
      var script = document.createElement('script');
      script.async = true;
      script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(GA_MEASUREMENT_ID);
      script.referrerPolicy = 'strict-origin-when-cross-origin';
      document.head.appendChild(script);
    } else if (typeof window.gtag === 'function') {
      window.gtag('consent', 'update', { analytics_storage: 'granted' });
    }
    active = true;
    if (currentProduct && !currentProductSent) {
      baseTrack('view_item', currentProduct);
      currentProductSent = true;
    }
  }
  function showNotice() {
    if (consent !== 'unknown' || notice || !document.body) return;
    var style = document.getElementById('slabAnalyticsConsentStyle');
    if (!style) {
      style = document.createElement('style');
      style.id = 'slabAnalyticsConsentStyle';
      style.textContent = '.slab-analytics-consent{position:fixed;z-index:100000;left:16px;right:16px;bottom:16px;max-width:920px;margin:0 auto;padding:16px 18px;background:#fff;border:1px solid #d6e3d8;border-radius:16px;box-shadow:0 8px 36px rgba(13,44,25,.18);display:flex;align-items:center;gap:16px;color:#183522;font:14px/1.55 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.slab-analytics-consent__copy{flex:1;min-width:0}.slab-analytics-consent__copy strong{display:block;font-size:15px;margin-bottom:3px}.slab-analytics-consent__copy a{color:#166534;text-decoration:underline}.slab-analytics-consent__actions{display:flex;gap:8px;flex-wrap:wrap}.slab-analytics-consent button{font:inherit;font-weight:650;cursor:pointer;border-radius:999px;padding:9px 14px;border:1px solid #17623a;background:#17623a;color:#fff}.slab-analytics-consent button[data-consent="reject"]{background:#fff;color:#21452e;border-color:#9eb6a3}@media(max-width:640px){.slab-analytics-consent{left:10px;right:10px;bottom:10px;display:block;padding:14px}.slab-analytics-consent__actions{margin-top:12px}.slab-analytics-consent__actions button{flex:1}}';
      document.head.appendChild(style);
    }
    notice = document.createElement('aside');
    notice.className = 'slab-analytics-consent';
    notice.setAttribute('role', 'dialog');
    notice.setAttribute('aria-label', 'การตั้งค่าคุกกี้วิเคราะห์การเข้าชม');
    var copy = document.createElement('div');
    copy.className = 'slab-analytics-consent__copy';
    var heading = document.createElement('strong');
    heading.textContent = 'อนุญาตความเป็นส่วนตัวของคุณ';
    var text = document.createElement('span');
    text.textContent = 'เว็บไซต์เก็บสถิติแบบรวมเพื่อวิเคราะห์การเข้าชมและปรับปรุงการให้บริการ ซึ่งคุณสามารถดูข้อมูลเพิ่มเติมได้ที่ ';
    var link = document.createElement('a');
    link.href = 'privacy/';
    link.textContent = 'นโยบายความเป็นส่วนตัว';
    copy.appendChild(heading); copy.appendChild(text); copy.appendChild(link);
    var actions = document.createElement('div');
    actions.className = 'slab-analytics-consent__actions';
    var accept = document.createElement('button');
    accept.type = 'button';
    accept.dataset.consent = 'accept';
    accept.textContent = 'ยอมรับ';
    accept.addEventListener('click', function () { setConsent('accepted'); });

    var reject = document.createElement('button');
    reject.type = 'button';
    reject.dataset.consent = 'reject';
    reject.textContent = 'ปฏิเสธ';
    reject.addEventListener('click', function () { setConsent('rejected'); });

    actions.appendChild(accept);
    actions.appendChild(reject);
    notice.appendChild(copy); notice.appendChild(actions);
    document.body.appendChild(notice);
  }
  function hideNotice() {
    if (notice && notice.parentNode) notice.parentNode.removeChild(notice);
    notice = null;
  }
  function setConsent(value) {
    consent = value;
    saveConsent(value);
    hideNotice();
    if (value === 'accepted') loadTag();
    else {
      active = false;
      currentProductSent = false;
      if (initialized && typeof window.gtag === 'function') {
        window.gtag('consent', 'update', { analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
      }
    }
  }
  function itemFromProduct(product, fallbackId) {
    product = product || {};
    var result = {
      item_id: String(product.id || fallbackId || product.slug || 'unknown-product'),
      item_name: String(product.thai || product.title || 'Product'),
      item_brand: 'S-LAB',
      item_category: String(product.category || 'Uncategorized')
    };
    if (product.herbalType) result.item_category2 = String(product.herbalType);
    var price = Number(product.price);
    if (product.price !== null && product.price !== undefined && String(product.price).trim() !== '' && Number.isFinite(price) && price > 0) result.price = price;
    return result;
  }
  window.slabAnalytics = {
    track: function (name, params) { baseTrack(name, params); },
    trackProductView: function (product, isHerbalProduct, fallbackId) {
      var item = itemFromProduct(product, fallbackId);
      if (isHerbalProduct && !item.item_category2) item.item_category2 = 'herbal';
      currentProduct = { currency: 'THB', items: [item] };
      if (item.price !== undefined) currentProduct.value = item.price;
      currentProductSent = false;
      if (consent === 'accepted') loadTag();
    },
    showConsentSettings: function () {
      consent = 'unknown';
      saveConsent('unknown');
      active = false;
      if (initialized && typeof window.gtag === 'function') {
        window.gtag('consent', 'update', { analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
      }
      showNotice();
    },
    getConsent: function () { return consent; }
  };

  consent = readConsent();
  if (consent === 'accepted') loadTag();
  else if (consent === 'unknown') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', showNotice, { once: true });
    else showNotice();
  }

  // Track meaningful interactions without sending form contents or personal identifiers.
  document.addEventListener('click', function (event) {
    var target = event.target && event.target.closest ? event.target : null;
    if (!target) return;
    var productLink = target.closest('[data-analytics-product-id]');
    if (productLink) {
      baseTrack('select_item', {
        item_list_name: productLink.dataset.analyticsList || 'product_list',
        items: [{
          item_id: productLink.dataset.analyticsProductId || 'unknown-product',
          item_name: productLink.dataset.analyticsProductName || 'Product',
          item_brand: 'S-LAB',
          item_category: productLink.dataset.analyticsProductCategory || 'Uncategorized'
        }]
      });
    }
    var banner = target.closest('.hero-slider a.hero-slide');
    if (banner) baseTrack('banner_click', { banner_name: banner.getAttribute('aria-label') || 'Homepage banner', link_path: (banner.getAttribute('href') || '').split('?')[0] });
    var social = target.closest('a[href*="facebook.com"],a[href*="tiktok.com"]');
    if (social) {
      var href = social.getAttribute('href') || '';
      baseTrack('social_click', { platform: href.indexOf('facebook.com') >= 0 ? 'facebook' : 'tiktok' });
    }
    var inquiry = target.closest('#detailInquiryCta');
    if (inquiry) {
      var item = currentProduct && currentProduct.items && currentProduct.items[0] ? currentProduct.items[0] : {};
      baseTrack('product_inquiry_click', {
        item_id: item.item_id || 'unknown-product',
        item_name: item.item_name || 'Product',
        item_category: item.item_category || 'Uncategorized'
      });
    }
  }, true);
})(window, document);
