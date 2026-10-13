/* Progressive enhancement. Main content and navigation work without JavaScript. */
(function () {
  'use strict';
  document.documentElement.classList.add('has-js');
  // 静态托管使用目录 URL；file:// 预览补上实际入口文件。
  if (location.protocol === 'file:') {
    document.querySelectorAll('a[href]').forEach(function (a) {
      var u = new URL(a.getAttribute('href'), location.href);
      if (u.protocol === 'file:' && u.pathname.endsWith('/')) { u.pathname += 'index.html'; a.href = u.href; }
    });
  } else if (/\/index\.html$/.test(location.pathname)) {
    history.replaceState(null, '', location.pathname.replace(/index\.html$/, '') + location.search + location.hash);
  }
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.getElementById('site-nav');
  function closeNav() {
    if (!nav || !toggle) return;
    nav.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
  }
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = toggle.getAttribute('aria-expanded') !== 'true';
      toggle.setAttribute('aria-expanded', String(open));
      nav.classList.toggle('is-open', open);
    });
    document.addEventListener('click', function (event) {
      if (!event.target.closest('.site-header') || event.target.closest('#site-nav a')) closeNav();
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && nav.classList.contains('is-open')) { closeNav(); toggle.focus(); }
    });
    window.addEventListener('resize', function () { if (window.innerWidth > 960) closeNav(); });
  }
  document.querySelectorAll('[data-copy-target]').forEach(function (button) {
    button.addEventListener('click', async function () {
      var target = document.getElementById(button.dataset.copyTarget);
      var status = document.getElementById(button.dataset.copyStatus);
      if (!target || !status) return;
      try {
        if (!navigator.clipboard || !window.isSecureContext) throw new Error('Clipboard unavailable');
        await navigator.clipboard.writeText(('value' in target ? target.value : target.textContent).trim());
        status.textContent = '已复制完整内容，可以直接粘贴到微信发送。';
      } catch (_) {
        if (typeof target.select === 'function') { target.focus(); target.select(); }
        var selection = typeof target.select === 'function' ? null : window.getSelection();
        if (selection) { var range = document.createRange(); range.selectNodeContents(target); selection.removeAllRanges(); selection.addRange(range); }
        status.textContent = '自动复制不可用，请手动复制已选中的文字。';
      }
    });
  });
})();
