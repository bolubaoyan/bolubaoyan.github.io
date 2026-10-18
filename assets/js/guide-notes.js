/* 本地清单渲染，不依赖小红书接口。 */
(function () {
  'use strict';
  var grid = document.getElementById('notes-grid');
  if (!grid) return;
  var notes = window.BOLU_GUIDE && window.BOLU_GUIDE.notes;
  if (!Array.isArray(notes)) return;
  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }
  notes.forEach(function (note) {
    if (!note || typeof note.title !== 'string' || !note.title.trim()) return;
    var url;
    try { url = new URL(note.url); } catch (_) { return; }
    if (url.protocol !== 'https:' || !(url.hostname === 'xiaohongshu.com' || url.hostname.endsWith('.xiaohongshu.com') || url.hostname === 'xhslink.com')) return;
    var card = el('a', 'note-card');
    card.href = url.href; card.target = '_blank'; card.rel = 'noopener noreferrer';
    card.setAttribute('aria-label', note.title + '（在新标签页打开小红书）');
    function fallback() { return el('div', 'note-cover-fallback', note.title); }
    var cover;
    try {
      var coverPath = typeof note.cover === 'string' && note.cover.trim()
        ? note.cover.trim()
        : '../assets/images/notes/' + encodeURIComponent(note.title.trim()) + '.png';
      var coverUrl = new URL(coverPath, location.href);
      if (!['https:', 'http:', 'file:'].includes(coverUrl.protocol)) throw new Error('Invalid cover');
      cover = el('img', 'note-cover'); cover.alt = ''; cover.loading = 'lazy'; cover.decoding = 'async';
      cover.addEventListener('error', function () { cover.replaceWith(fallback()); }, { once:true });
      cover.src = coverUrl.href;
    } catch (_) { cover = fallback(); }
    card.appendChild(cover);
    var copy = el('div', 'note-copy'); copy.appendChild(el('h2', '', note.title));
    if (typeof note.description === 'string' && note.description.trim()) copy.appendChild(el('p', '', note.description));
    var meta = el('div', 'note-meta'); meta.appendChild(el('span', '', '博路保研'));
    meta.appendChild(el('span', 'note-destination', '小红书笔记 ↗'));
    copy.appendChild(meta); card.appendChild(copy); grid.appendChild(card);
  });
})();
