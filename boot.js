// Show an actionable message instead of leaving the startup screen indefinitely.
(() => {
  'use strict';
  globalThis.PhysicsArena ||= {};
  function report(message) {
    if (globalThis.PhysicsArena.bootReady) return;
    const screen = document.querySelector('#screen');
    if (!screen) return;
    screen.replaceChildren();
    const panel = document.createElement('section');
    panel.className = 'startup-error';
    const title = document.createElement('h2');
    title.textContent = '遊戲未能完成載入';
    const explanation = document.createElement('p');
    explanation.textContent = '請先完整解壓縮，再開啟 index.html。上傳網站時，請保留 game 與 assets 資料夾。';
    const detail = document.createElement('p');
    detail.className = 'notice';
    detail.textContent = message;
    const retry = document.createElement('button');
    retry.className = 'start-button';
    retry.textContent = '重新載入';
    retry.addEventListener('click', () => location.reload());
    panel.append(title, explanation, detail, retry);
    screen.append(panel);
  }
  window.addEventListener('error', event => {
    if (event.target instanceof HTMLScriptElement) {
      report('無法讀取檔案：' + event.target.getAttribute('src'));
    } else if (event.message) {
      report('啟動錯誤：' + event.message);
    }
  }, true);
  window.addEventListener('unhandledrejection', event => {
    report('啟動錯誤：' + (event.reason?.message || '載入作業未完成'));
  });
  window.setTimeout(() => {
    if (!globalThis.PhysicsArena.bootReady) report('啟動超過預期時間，可能有檔案尚未載入。');
  }, 8000);
})();
