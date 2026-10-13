/* Progressive enhancement. Main content and navigation work without JavaScript. */
(function () {
  'use strict';
  document.documentElement.classList.add('has-js');
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
        await navigator.clipboard.writeText(target.textContent.trim());
        status.textContent = '已复制，可以粘贴到微信中填写。';
      } catch (_) {
        var selection = window.getSelection();
        if (selection) { var range = document.createRange(); range.selectNodeContents(target); selection.removeAllRanges(); selection.addRange(range); }
        status.textContent = '自动复制不可用，请手动复制已选中的文字。';
      }
    });
  });
})();
