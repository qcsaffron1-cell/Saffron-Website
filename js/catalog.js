/* S-LAB v20 bundle: catalog.js */

/* [อธิบาย S-LAB] บทบาทไฟล์: โหลดและรวมข้อมูลผลิตภัณฑ์จาก JSON สร้างรายการสินค้าเด่น/แคตตาล็อก ค้นหาและกรองหมวดหมู่ รวมทั้งเติมรายละเอียดและผลิตภัณฑ์ที่เกี่ยวข้อง */

/* ===== BEGIN product data loader (general + herbal JSON) ===== */
/* S-LAB Product Data Loader
   General products: json/products.json
   Herbal products:  json/herbal-products.json
   Add a new herbal item as another property in herbal-products.json.
*/
(function (global) {
  'use strict';
  var PRODUCTS_URL = 'json/products.json';
  var HERBAL_URL = 'json/herbal-products.json';
  var generalCache = null;
  var herbalCache = null;
  var mergedCache = null;

  // Convert a Pages CMS top-level list back into the keyed map used by existing pages.
  function normalizeProductData(data, url) {
    if (Array.isArray(data)) {
      var mapped = {};
      data.forEach(function (item) {
        if (!item || typeof item !== 'object' || !item.id) return;
        var id = String(item.id).trim();
        if (!id) return;
        item.id = id;
        mapped[id] = item;
      });
      return mapped;
    }
    if (!data || typeof data !== 'object') throw new Error(url + ' must contain a product array or object.');
    Object.keys(data).forEach(function (id) {
      if (data[id] && typeof data[id] === 'object') data[id].id = data[id].id || id;
    });
    return data;
  }

  // Load JSON and accept both legacy maps and the new CMS-friendly list format.
  function fetchProducts(url, required) {
    return fetch(url, { cache: 'no-cache', headers: { 'Accept': 'application/json' } })
      .then(function (res) {
        if (!res.ok) throw new Error('Failed to load ' + url + ' (HTTP ' + res.status + ')');
        return res.json();
      })
      .then(function (data) { return normalizeProductData(data, url); })
      .catch(function (err) {
        if (!required) {
          console.warn('[S-LAB product loader] Optional herbal data unavailable:', err);
          return {};
        }
        throw err;
      });
  }

  // [อธิบาย S-LAB] โหลดข้อมูลผลิตภัณฑ์ทั่วไปพร้อมเก็บผลลัพธ์ไว้ใช้ซ้ำ.
  function loadGeneralProducts() {
    if (!generalCache) {
      generalCache = fetchProducts(PRODUCTS_URL, true).catch(function (err) {
        generalCache = null;
        throw err;
      });
    }
    return generalCache;
  }

  // [อธิบาย S-LAB] โหลดข้อมูลเฉพาะผลิตภัณฑ์สมุนไพร โดยข้อมูลชุดนี้เป็นส่วนเสริมที่ไม่บังคับ.
  function loadHerbalProducts() {
    if (!herbalCache) {
      herbalCache = fetchProducts(HERBAL_URL, false).catch(function (err) {
        herbalCache = null;
        throw err;
      });
    }
    return herbalCache;
  }

  // [อธิบาย S-LAB] รวมข้อมูลผลิตภัณฑ์ทั้งสองชุด โดยให้ข้อมูลสมุนไพรมีสิทธิ์ทับซ้อนเมื่อ ID ซ้ำ.
  function loadProducts() {
    if (!mergedCache) {
      mergedCache = Promise.all([loadGeneralProducts(), loadHerbalProducts()])
        .then(function (sets) {
          // In case an ID is duplicated, the dedicated herbal JSON takes precedence.
          return Object.assign({}, sets[0] || {}, sets[1] || {});
        })
        .catch(function (err) {
          mergedCache = null;
          console.error('[S-LAB product loader]', err);
          throw err;
        });
    }
    return mergedCache;
  }

  global.slabPriceLabel = function (item) {
    var raw = item && item.price;
    if (raw === null || raw === undefined || String(raw).trim() === '') return 'สอบถามราคา';
    var price = Number(raw);
    if (!Number.isFinite(price) || price <= 0) return 'สอบถามราคา';
    return '฿' + price.toLocaleString('th-TH', { maximumFractionDigits: 2 });
  };
  global.loadProducts = loadProducts;
  global.loadHerbalProducts = loadHerbalProducts;
  // Public URLs use the display-name slug; JSON keys remain internal implementation IDs.
  global.slabProductHref = function (id, item) {
    if (item && item.detailPage === true && item.slug) return 'product/' + encodeURIComponent(item.slug) + '/';
    return 'product-detail.html?id=' + encodeURIComponent(id);
  };
})(window);
/* ===== END product data loader (general + herbal JSON) ===== */

/* ===== BEGIN home featured products ===== */
(function(){
  'use strict';

  var track = document.getElementById('featuredProductsTrack');
  if (!track || typeof window.loadProducts !== 'function') return;


  /* Homepage featured products are managed through Pages CMS.
     Set `featured` to true and use `featuredOrder` (1 = first) on the product record.
     This works for both general and herbal products, including newly added records. */
  var featured = [];

  function categoryLabel(cat){
    if (cat === 'FACE CARE' || cat === 'BODY CARE') return 'SKIN CARE';
    var labels = {
      'HAIR CARE':'HAIR CARE',
      'ORAL CARE':'ORAL CARE',
      'HEALTH CARE':'HEALTH CARE',
      'SKIN CARE':'SKIN CARE'
    };
    return labels[cat] || cat || 'PRODUCT';
  }

  function escapeHtml(value){
    return String(value == null ? '' : value)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#039;');
  }

  // [อธิบาย S-LAB] ประกอบข้อมูลหนึ่งรายการให้เป็นการ์ดผลิตภัณฑ์สำหรับหน้าแรก.
  function makeCard(item, index){
    var title = item.title || 'Saffron Product';
    var thai = item.thai || title;
    var cat = categoryLabel(String(item.category || '').toUpperCase());
    var size = item.size ? String(item.size) : '';
    var href = window.slabProductHref(item.id, item);

    return '<a class="ref-featured-card" href="'+href+'" aria-label="'+escapeHtml(thai)+'" data-analytics-product-id="'+escapeHtml(item.id || item.slug || title)+'" data-analytics-product-name="'+escapeHtml(thai)+'" data-analytics-product-category="'+escapeHtml(cat)+'" data-analytics-list="featured_products">'
      + '<div class="ref-featured-image">'
      +   '<img loading="lazy" src="'+escapeHtml(window.slabAssetHref(item.img || ''))+'" alt="'+escapeHtml(thai)+'">'
      + '</div>'
      + '<div class="ref-featured-info">'
      +   '<span class="ref-featured-category">'+escapeHtml(cat)+'</span>'
      +   '<h3>'+escapeHtml(thai)+'</h3>'
      +   (size ? '<p>'+escapeHtml(size)+'</p>' : '')
      +   '<span class="slab-catalog-price">'+escapeHtml(window.slabPriceLabel(item))+'</span>'
      + '</div>'
      + '</a>';
  }

  // [อธิบาย S-LAB] เลือกสินค้าแนะนำจากสวิตช์ featured ที่พนักงานตั้งใน Pages CMS.
  function chooseFeatured(data){
    var products = data || {};
    var values = Object.keys(products).map(function(id){
      var item = products[id] || {};
      item.id = item.id || id;
      return item;
    });

    var selected = values.filter(function(item){
      return item.featured === true || String(item.featured).toLowerCase() === 'true';
    }).sort(function(a,b){
      var orderA = Number(a.featuredOrder) || 9999;
      var orderB = Number(b.featuredOrder) || 9999;
      if (orderA !== orderB) return orderA - orderB;
      return String(a.thai || a.title || '').localeCompare(String(b.thai || b.title || ''), 'th');
    });

    /* Only show products explicitly enabled in CMS. Do not silently re-add unchecked products. */
    featured = selected.slice(0, 4);
  }


  window.loadProducts().then(function(data){
    chooseFeatured(data);
    if (!featured.length) {
      track.innerHTML = '<div class="ref-featured-empty">ยังไม่ได้เลือกผลิตภัณฑ์แนะนำ กรุณาเปิดใช้งานจาก Pages CMS</div>';
      return;
    }
    track.innerHTML = featured.map(makeCard).join('');
  }).catch(function(){
    track.innerHTML = '<div class="ref-featured-empty">Unable to load featured products.</div>';
  });
})();
/* ===== END home featured products ===== */

/* ===== BEGIN general Products page ===== */
/* S-LAB Products page
   Reads product data from json/products.json through products-loader.js.
   Product cards link directly to Product Detail.
*/
(function () {
  'use strict';

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  function categoryKey(category) {
    return String(category || '').toLowerCase().replace(/\s+care$/, '').trim();
  }

  function init(products) {
    var list = document.getElementById('productList');
    var count = document.getElementById('productCount');
    var search = document.getElementById('productSearch');
    var clear = document.getElementById('productSearchClear');
    var heading = document.getElementById('productsHeading');
    var filters = Array.prototype.slice.call(document.querySelectorAll('.product-filter'));

    if (!list) return;

    var entries = Object.keys(products || {}).filter(function (id) {
      var item = products[id] || {};
      return String(item.category || '').toUpperCase() !== 'HERBAL CARE' && !item.herbalType;
    }).map(function (id) {
      return { id: id, product: products[id] || {} };
    });
    var params = new URLSearchParams(window.location.search);
    var requestedCategory = String(params.get('category') || '').toLowerCase().trim();
    var validCategories = ['all', 'hair', 'skin', 'oral', 'health'];
    var activeFilter = validCategories.indexOf(requestedCategory) !== -1 ? requestedCategory : 'all';
    var query = '';

    // [อธิบาย S-LAB] ตรวจว่าสินค้าตรงกับข้อความค้นหาและหมวดหมู่ที่ผู้ใช้เลือกหรือไม่.
    function matches(item) {
      var p = item.product;
      var haystack = [p.title, p.thai, p.category, p.registration, p.size].join(' ').toLowerCase();
      var textOK = !query || haystack.indexOf(query) !== -1;
      var normalizedCategory = categoryKey(p.category);
      var catOK = activeFilter === 'all' || (activeFilter === 'skin' ? (normalizedCategory === 'face' || normalizedCategory === 'body') : normalizedCategory === activeFilter);
      return textOK && catOK;
    }

    // [อธิบาย S-LAB] สร้าง markup ของการ์ดสินค้าในแคตตาล็อก โดยใช้ข้อมูลของสินค้าแต่ละรายการ.
    function card(item, index) {
      var p = item.product;
      var href = window.slabProductHref(item.id, p);
      var img = escapeHtml(window.slabAssetHref(p.img || '/images/leaf.webp'));
      var title = escapeHtml(p.title || 'Untitled Product');
      var thai = escapeHtml(p.thai || '');
      var rawCategory = categoryKey(p.category);
      var cat = escapeHtml((rawCategory === 'face' || rawCategory === 'body') ? 'SKIN CARE' : (p.category || ''));
      var size = escapeHtml(p.size || '');

      return '<a class="product-row" href="' + href + '" aria-label="View ' + title + '" data-analytics-product-id="' + escapeHtml(item.id) + '" data-analytics-product-name="' + thai + '" data-analytics-product-category="' + cat + '" data-analytics-list="product_list">' +
        '<span class="product-number">' + String(index + 1).padStart(2, '0') + '</span>' +
        '<span class="product-thumb"><img src="' + img + '" alt="' + title + '" loading="lazy"></span>' +
        '<span class="product-info">' +
          '<span class="product-category">' + cat + '</span>' +
          '<h2>' + title + '</h2>' +
          '<p>' + thai + '</p>' +
          '<span class="slab-catalog-price">' + escapeHtml(window.slabPriceLabel(p)) + '</span>' +
        '</span>' +
        '<span class="product-arrow" aria-hidden="true">↗</span>' +
      '</a>';
    }

    // [อธิบาย S-LAB] เรนเดอร์รายการสินค้าที่ผ่านตัวกรองลงในพื้นที่รายการผลิตภัณฑ์.
    function render() {
      list.setAttribute('aria-busy', 'true');
      var visible = entries.filter(matches);
      count.textContent = visible.length;
      list.setAttribute('aria-busy', 'false');
      list.innerHTML = visible.length
        ? visible.map(card).join('')
        : '<div class="product-empty"><strong>' + (query ? 'ไม่พบสินค้าที่ตรงกับคำค้น' : 'ยังไม่มีสินค้าในหมวดนี้') + '</strong><p>' + (query ? 'ลองเปลี่ยนคำค้นหรือเลือกหมวดหมู่อื่น' : 'โปรดลองเลือกหมวดหมู่อื่นเพื่อดูผลิตภัณฑ์เพิ่มเติม') + '</p>' + (query ? '<button type="button" class="product-empty-clear" id="productEmptyClear">ล้างคำค้น</button>' : '') + '</div>';
      var emptyClear = document.getElementById('productEmptyClear');
      if (emptyClear) emptyClear.addEventListener('click', function () { if (search) search.value = ''; query = ''; render(); if (search) search.focus(); });
      if (clear) clear.hidden = !query;
    }

    var trigger = document.getElementById('filterTrigger');
    var triggerIcon = document.getElementById('filterTriggerIcon');
    var triggerLabel = document.getElementById('filterTriggerLabel');
    var toolbar = document.getElementById('productToolbar');

    function syncTrigger(button) {
      if (!trigger || !button) return;
      var iconSrc = button.querySelector('.product-filter-icon img');
      var labelText = button.querySelector('.product-filter-label');
      if (triggerIcon && iconSrc) triggerIcon.src = iconSrc.getAttribute('src');
      if (triggerLabel && labelText) triggerLabel.textContent = labelText.textContent;
    }

    function closeDropdown() {
      if (!toolbar || !trigger) return;
      toolbar.classList.remove('open');
      trigger.setAttribute('aria-expanded', 'false');
    }

    function openDropdown() {
      if (!toolbar || !trigger) return;
      toolbar.classList.add('open');
      trigger.setAttribute('aria-expanded', 'true');
    }

    if (trigger && toolbar) {
      trigger.addEventListener('click', function (event) {
        event.stopPropagation();
        var isOpen = toolbar.classList.contains('open');
        if (isOpen) closeDropdown(); else openDropdown();
      });
      document.addEventListener('click', function (event) {
        if (!toolbar.contains(event.target) && event.target !== trigger) closeDropdown();
      });
      document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') closeDropdown();
      });
    }

    filters.forEach(function (button) {
      button.addEventListener('click', function () {
        activeFilter = String(button.dataset.filter || 'all').toLowerCase();
        filters.forEach(function (b) { b.classList.toggle('is-active', b === button); });
        if (heading && button.dataset.heading) heading.textContent = button.dataset.heading;
        syncTrigger(button);
        closeDropdown();
        render();
      });
    });

    if (search) {
      search.addEventListener('input', function () {
        query = search.value.trim().toLowerCase();
        render();
      });
    }

    if (clear) {
      clear.addEventListener('click', function () {
        if (!search) return;
        search.value = '';
        query = '';
        search.focus();
        render();
      });
    }

    var initialButton = filters.find(function (button) {
      return String(button.dataset.filter || 'all').toLowerCase() === activeFilter;
    });
    if (initialButton) {
      filters.forEach(function (b) { b.classList.toggle('is-active', b === initialButton); });
      if (heading && initialButton.dataset.heading) heading.textContent = initialButton.dataset.heading;
      syncTrigger(initialButton);
    }

    render();
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (typeof window.loadProducts !== 'function') {
      console.error('[S-LAB Products] products-loader.js is missing.');
      return;
    }
    window.loadProducts().then(init).catch(function (err) {
      console.error('[S-LAB Products]', err);
      var list = document.getElementById('productList');
      var count = document.getElementById('productCount');
      if (count) count.textContent = '0';
      if (list) list.innerHTML = '<div class="product-empty">ไม่สามารถโหลดข้อมูลสินค้าได้ กรุณาเปิดเว็บไซต์ผ่าน Live Server หรือ localhost</div>';
    });
  });
})();
/* ===== END general Products page ===== */

/* ===== BEGIN Herbal catalogue page ===== */
(function () {
  'use strict';
  var grid = document.getElementById('herbalProductGrid');
  if (!grid || typeof window.loadProducts !== 'function') return;

  var labels = {
    inhaler: 'Inhaler', balm: 'Balm', oil: 'Oil', cream: 'Cream',
    ointment: 'Ointment', spray: 'Spray'
  };
  var thaiLabels = {
    inhaler: 'ยาดม', balm: 'ยาหม่อง', oil: 'ยาน้ำมัน', cream: 'ยาครีม',
    ointment: 'ยาขี้ผึ้ง', spray: 'ยาสเปรย์'
  };

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  function init(data) {
    var buttons = Array.prototype.slice.call(document.querySelectorAll('[data-herbal-type]'));
    var heading = document.getElementById('herbalProductsTitle');
    var desc = document.getElementById('herbalProductsDescription');
    var count = document.getElementById('herbalProductCount');
    var trigger = document.getElementById('herbalFilterTrigger');
    var triggerIcon = document.getElementById('herbalFilterTriggerIcon');
    var triggerLabel = document.getElementById('herbalFilterTriggerLabel');
    var toolbar = document.getElementById('herbalTypeToolbar');
    var filterWrap = document.querySelector('.herbal-type-filter-wrap');

    function syncTrigger(button) {
      if (!button) return;
      var image = button.querySelector('.product-filter-icon img');
      var label = button.querySelector('.product-filter-label');
      if (triggerIcon && image) triggerIcon.src = image.getAttribute('src');
      if (triggerLabel && label) triggerLabel.textContent = label.textContent;
    }
    function closeDropdown() {
      if (!toolbar || !trigger) return;
      toolbar.classList.remove('open');
      trigger.setAttribute('aria-expanded', 'false');
    }
    function openDropdown() {
      if (!toolbar || !trigger) return;
      toolbar.classList.add('open');
      trigger.setAttribute('aria-expanded', 'true');
    }
    if (trigger && toolbar) {
      trigger.addEventListener('click', function (event) {
        event.stopPropagation();
        if (toolbar.classList.contains('open')) closeDropdown(); else openDropdown();
      });
      document.addEventListener('click', function (event) {
        if (filterWrap && !filterWrap.contains(event.target)) closeDropdown();
      });
      document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') closeDropdown();
      });
    }

    var products = Object.keys(data || {}).map(function (id) {
      var product = data[id] || {};
      return { id: id, product: product };
    }).filter(function (entry) {
      return String(entry.product.herbalType || '').trim() && String(entry.product.category || '').trim().toUpperCase() === 'HERBAL CARE';
    });

    function render(type) {
      var title = labels[type] || 'Herbal Products';
      var thaiTitle = thaiLabels[type] || 'ผลิตภัณฑ์สมุนไพร';
      var visible = products.filter(function (entry) { return String(entry.product.herbalType || '').trim().toLowerCase() === String(type || '').trim().toLowerCase(); });
      if (heading) heading.textContent = thaiTitle + ' · ' + title.toUpperCase();
      if (desc) desc.textContent = visible.length ? 'เลือกชมรายละเอียดผลิตภัณฑ์และข้อมูลที่เกี่ยวข้อง' : 'ขณะนี้ยังไม่มีผลิตภัณฑ์ในหมวดนี้ที่พร้อมเผยแพร่บนเว็บไซต์';
      if (count) count.textContent = String(visible.length);
      if (!visible.length) {
        grid.innerHTML = '<div class="product-empty herbal-empty-state">❗<span aria-hidden="true"></span><h3>ขออภัยยังไม่มีผลิตภัณฑ์ในหมวดนี้</h3><p>รายการผลิตภัณฑ์หมวด' + escapeHtml(thaiTitle) + 'จะแสดงเมื่อมีข้อมูลที่พร้อมเผยแพร่</p></div>';
        return;
      }
      grid.innerHTML = visible.map(function (entry, index) {
        var p = entry.product;
        var image = window.slabAssetHref(p.img || '/images/leaf.webp');
        var productName = p.title || p.thai || 'Herbal Product';
        var thaiName = p.thai || '';
        var href = window.slabProductHref(entry.id, p);
        return '<a class="product-row herbal-product-row ref-reveal in" href="' + href + '" aria-label="ดูรายละเอียด ' + escapeHtml(thaiName || productName) + '" data-analytics-product-id="' + escapeHtml(entry.id) + '" data-analytics-product-name="' + escapeHtml(thaiName || productName) + '" data-analytics-product-category="HERBAL CARE" data-analytics-list="herbal_product_list">' +
          '<span class="product-number">' + String(index + 1).padStart(2, '0') + '</span>' +
          '<span class="product-thumb"><img src="' + escapeHtml(image) + '" alt="' + escapeHtml(productName) + '" loading="lazy"></span>' +
          '<span class="product-info"><span class="product-category">HERBAL · ' + escapeHtml(title.toUpperCase()) + '</span>' +
            '<h2>' + escapeHtml(productName) + '</h2>' +
            '<p>' + escapeHtml(thaiName) + '</p>' +
            (p.size ? '<span class="herbal-product-size">' + escapeHtml(p.size) + '</span>' : '') +
            '<span class="slab-catalog-price">' + escapeHtml(window.slabPriceLabel(p)) + '</span>' +
          '</span><span class="product-arrow" aria-hidden="true">↗</span></a>';
      }).join('');
    }

    // [อธิบาย S-LAB] เปลี่ยนประเภทสมุนไพรที่เลือกและสั่งแสดงรายการใหม่ตามประเภทนั้น.
    function selectType(type) {
      var selectedButton = null;
      buttons.forEach(function (button) {
        var active = String(button.getAttribute('data-herbal-type') || '').toLowerCase() === String(type || '').toLowerCase();
        button.classList.toggle('is-active', active);
        button.setAttribute('aria-pressed', String(active));
        if (active) selectedButton = button;
      });
      syncTrigger(selectedButton);
      closeDropdown();
      render(type);
    }

    buttons.forEach(function (button) {
      button.addEventListener('click', function () {
        selectType(button.getAttribute('data-herbal-type'));
      });
    });
    var initial = new URLSearchParams(window.location.search).get('type');
    var normalizedInitial = String(initial || '').trim().toLowerCase();
    var fallbackButton = buttons.find(function (b) { return b.classList.contains('is-active'); }) || buttons[0];
    var validType = Object.prototype.hasOwnProperty.call(labels, normalizedInitial) ? normalizedInitial : (fallbackButton ? fallbackButton.getAttribute('data-herbal-type') : 'spray');
    if (buttons.length) selectType(validType);
  }

  window.loadProducts().then(init).catch(function () {
    grid.innerHTML = '<div class="product-empty herbal-empty-state"><h3>ไม่สามารถโหลดข้อมูลผลิตภัณฑ์ได้</h3><p>กรุณาเปิดเว็บไซต์ผ่าน Live Server หรือ localhost แล้วลองอีกครั้ง</p></div>'; 
  });
})();
/* ===== END Herbal catalogue page ===== */
