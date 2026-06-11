
/* AT-MEC HM 3.98 - Layout Editor Managers
   Modulo di consolidamento non invasivo: espone manager logici per documentare e
   centralizzare lo stato senza cambiare il comportamento stabile della 3.94/3.95.
*/
(function(){
  'use strict';
  const ns = window.AT_MEC_LAYOUT_397 = window.AT_MEC_LAYOUT_397 || {};
  ns.version = '3.98';
  ns.createdAt = new Date().toISOString();
  ns.SelectionManager = ns.SelectionManager || {
    getSelected(){ return Array.from(document.querySelectorAll('.atmec-layout-selected-366,.atmec-3932-will-modify,.atmec-3933-will-modify')); },
    clear(){
      document.querySelectorAll('.atmec-layout-selected-366,.atmec-layout-multi-366,.atmec-3932-will-modify,.atmec-3933-will-modify').forEach(el=>{
        el.classList.remove('atmec-layout-selected-366','atmec-layout-multi-366','atmec-3932-will-modify','atmec-3933-will-modify');
      });
    }
  };
  ns.EventRegistry = ns.EventRegistry || {
    handlers: [],
    register(name, target, type){ this.handlers.push({name, target: target && (target.id || target.tagName || 'document'), type}); },
    list(){ return this.handlers.slice(); }
  };
  ns.Diagnostics = ns.Diagnostics || {
    summary(){
      return {
        version: ns.version,
        selected: ns.SelectionManager.getSelected().map(el=>el.id || el.getAttribute('data-ui-id') || el.getAttribute('data-atmec-auto-id') || el.tagName),
        resizeHandles: document.querySelectorAll('.atmec-resize-handle,.atmec-layout-resize-handle').length,
        panels: document.querySelectorAll('#atmec-inspector-358-bar,#atmec-element-tools,#atmec-layout-tools').length
      };
    }
  };
})();
