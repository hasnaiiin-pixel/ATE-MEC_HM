/* AT-MEC_HM_4.18B_DATABASE_ENTERPRISE_STABILE
 * Renderer bootstrap only.
 * The previous monolithic renderer logic was moved to:
 *   js/modules/core/app-legacy-core.js
 * Existing global functions remain loaded before this bootstrap through index.html.
 */
(function(){
  'use strict';
  window.AT_MEC_APP_JS_SPLIT = {
    version: '4.18B',
    mode: 'bootstrap',
    legacyCore: 'js/modules/core/app-legacy-core.js',
    timestamp: new Date().toISOString()
  };
  function markReady(){
    try {
      document.body?.setAttribute('data-atmec-js-split', '4.18B');
      console.info('[AT-MEC] 4.18B cleanup bootstrap loaded; modular core delegated.');
    } catch(_e) {}
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', markReady);
  else markReady();
})();
