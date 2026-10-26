/* S-LAB v20 bundle: activities.js */

/* [อธิบาย S-LAB] บทบาทไฟล์: โหลดข้อมูลกิจกรรมจาก JSON แล้วแสดงการ์ดกิจกรรมบนหน้าแรก หน้ารายการกิจกรรม และหน้ารายละเอียดบทความ */

/* ===== BEGIN activity data loader ===== */
/* S-LAB · ACTIVITY DATA LOADER
   Activity content is maintained in json/activities.json.
*/
(function (global) {
  'use strict';
  var ACTIVITIES_URL = 'json/activities.json';
  var cache = null;

  // [อธิบาย S-LAB] โหลดไฟล์ json/activities.json และแคชคำขอเพื่อป้องกันการโหลดซ้ำโดยไม่จำเป็น.
  function loadActivities() {
    if (cache) return cache;
    cache = fetch(ACTIVITIES_URL, { cache: 'no-cache', headers: { 'Accept': 'application/json' } })
      .then(function (res) {
        if (!res.ok) throw new Error('Failed to load ' + ACTIVITIES_URL + ' (HTTP ' + res.status + ')');
        return res.json();
      })
      .then(function (data) {
        if (Array.isArray(data)) {
          var mapped = {};
          data.forEach(function (item) { if (item && item.id != null) mapped[String(item.id)] = item; });
          return mapped;
        }
        if (!data || typeof data !== 'object') throw new Error('activities.json must contain an array or object.');
        return data;
      })
      .catch(function (err) {
        cache = null;
        console.error('[activities-loader]', err);
        throw err;
      });
    return cache;
  }
  global.loadActivities = loadActivities;
})(window);
/* ===== END activity data loader ===== */

/* ===== BEGIN home activity cards ===== */
(function () {
  'use strict';
  var grid = document.getElementById('homeActivityList');
  if (!grid || typeof window.loadActivities !== 'function') return;

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  window.loadActivities().then(function (data) {
    var items = Object.keys(data || {}).map(function (id) { return { id: id, item: data[id] || {} }; }).slice(0, 3);
    grid.innerHTML = items.map(function (entry) {
      var item = entry.item;
      return '<a class="activity-article-card home-activity-card" href="activity-detail.html?id=' + encodeURIComponent(entry.id) + '">' +
        '<div class="activity-article-image"><img src="' + escapeHtml(window.slabAssetHref(item.image)) + '" alt="' + escapeHtml(item.title) + '" loading="lazy"></div>' +
        '<div class="activity-article-content"><p class="activity-article-date">' + escapeHtml(item.date) + '</p>' +
        '<h3>' + escapeHtml(item.title) + '</h3><p>' + escapeHtml(item.excerpt) + '</p>' +
        '<span class="activity-read-more">อ่านเพิ่มเติม <b>→</b></span></div></a>';
    }).join('');
  }).catch(function () {
    grid.innerHTML = '<p class="activity-load-error">ไม่สามารถโหลดข้อมูลกิจกรรมได้ในขณะนี้</p>';
  });
})();
/* ===== END home activity cards ===== */

/* ===== BEGIN activities listing page ===== */
(function () {
  'use strict';
  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
  }
  // [อธิบาย S-LAB] สร้างการ์ดรายการกิจกรรมจากข้อมูล JSON แล้วใส่ลงในพื้นที่ activityList.
  function init(data) {
    var grid = document.getElementById('activityList');
    if (!grid) return;
    var items = Object.keys(data || {}).map(function (id) { return { id:id, item:data[id] || {} }; });
    grid.innerHTML = items.map(function (entry) {
      var a = entry.item;
      return '<a class="activity-article-card" href="activity-detail.html?id=' + encodeURIComponent(entry.id) + '">' +
        '<div class="activity-article-image"><img src="' + escapeHtml(window.slabAssetHref(a.image)) + '" alt="' + escapeHtml(a.title) + '" loading="lazy"></div>' +
        '<div class="activity-article-content"><p class="activity-article-date">' + escapeHtml(a.date) + '</p>' +
        '<h3>' + escapeHtml(a.title) + '</h3><p>' + escapeHtml(a.excerpt) + '</p>' +
        '<span class="activity-read-more">อ่านบทความ <b>→</b></span></div></a>';
    }).join('');
  }
  document.addEventListener('DOMContentLoaded', function () {
    if (typeof window.loadActivities !== 'function') return;
    window.loadActivities().then(init).catch(function () {
      var grid = document.getElementById('activityList');
      if (grid) grid.innerHTML = '<p class="activity-load-error">ไม่สามารถโหลดข้อมูลกิจกรรมได้ กรุณาเปิดเว็บไซต์ผ่าน Live Server หรือ localhost</p>';
    });
  });
})();
/* ===== END activities listing page ===== */

/* ===== BEGIN activity detail page ===== */
(function () {
  'use strict';
  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
  }
  // [อธิบาย S-LAB] อ่านรหัสกิจกรรมจาก URL แล้วแสดงรายละเอียดบทความและลิงก์บทความอื่นที่เกี่ยวข้อง.
  function init(data) {
    var detail = document.getElementById('articleDetail');
    var related = document.getElementById('relatedArticles');
    var id = new URLSearchParams(window.location.search).get('id') || Object.keys(data)[0];
    var item = data[id];
    if (!detail || !item) { if (detail) detail.innerHTML='<p class="activity-load-error">ไม่พบบทความนี้</p>'; return; }
    var breadcrumbCurrent = document.getElementById('breadcrumbCurrent');
    if (breadcrumbCurrent) breadcrumbCurrent.textContent = item.title || 'รายละเอียดกิจกรรม';
    var fallbackHeading = document.getElementById('activityDetailFallbackHeading');
    if (fallbackHeading) fallbackHeading.remove();
    var body = Array.isArray(item.body) ? item.body : [item.body];
    detail.innerHTML = '<article class="activity-detail-card"><img src="' + escapeHtml(window.slabAssetHref(item.image)) + '" alt="' + escapeHtml(item.title) + '"><div class="activity-detail-content"><p class="activity-detail-date">' + escapeHtml(item.date) + '</p><p class="activity-detail-category">' + escapeHtml(item.category || 'กิจกรรม') + '</p><h1>' + escapeHtml(item.title) + '</h1><p class="activity-detail-lead">' + escapeHtml(item.excerpt) + '</p><div class="activity-detail-body">' + body.map(function(p){return '<p>'+escapeHtml(p)+'</p>';}).join('') + '</div></div></article>';
    if (related) {
      related.innerHTML = Object.keys(data).filter(function (key) { return key !== id; }).map(function (key) {
        var a=data[key];
        return '<a class="activity-related-card" href="activity-detail.html?id='+encodeURIComponent(key)+'"><img src="'+escapeHtml(window.slabAssetHref(a.image))+'" alt="'+escapeHtml(a.title)+'" loading="lazy"><div><p>'+escapeHtml(a.date)+'</p><h3>'+escapeHtml(a.title)+'</h3><span>อ่านบทความ →</span></div></a>';
      }).join('');
    }
  }
  document.addEventListener('DOMContentLoaded', function () {
    if (typeof window.loadActivities !== 'function') return;
    window.loadActivities().then(init).catch(function(){
      var detail=document.getElementById('articleDetail');
      if(detail) detail.innerHTML='<p class="activity-load-error">ไม่สามารถโหลดข้อมูลกิจกรรมได้ กรุณาเปิดเว็บไซต์ผ่าน Live Server หรือ localhost</p>';
    });
  });
})();
/* ===== END activity detail page ===== */
