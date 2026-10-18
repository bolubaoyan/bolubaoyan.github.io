/* 咨询内容只在当前页面整理，不保存、不发送。 */
(function () {
  'use strict';
  var panel = document.getElementById('consult-fields');
  var output = document.getElementById('consult-template');
  if (!panel || !output) return;
  function update() {
    output.value = Array.from(panel.querySelectorAll('[data-consult-label]')).map(function (field) {
      return field.dataset.consultLabel + '：' + field.value.trim();
    }).join('\n');
  }
  panel.addEventListener('input', update);
  panel.addEventListener('change', update);
  document.getElementById('consult-clear').addEventListener('click', function () {
    panel.querySelectorAll('input, textarea').forEach(function (field) { field.value = ''; });
    document.getElementById('consult-year').selectedIndex = 0;
    output.scrollTop = 0;
    update();
    document.getElementById('consult-status').textContent = '已清空填写内容，申请年份已恢复为28保研。';
    document.getElementById('consult-year').focus();
  });
  update();
})();
