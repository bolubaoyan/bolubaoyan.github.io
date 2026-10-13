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
  document.getElementById('consult-clear').addEventListener('click', function () {
    panel.querySelectorAll('input, textarea').forEach(function (field) { field.value = ''; });
    update();
    document.getElementById('consult-status').textContent = '已清空本页填写内容。';
    panel.querySelector('input').focus();
  });
  update();
})();
