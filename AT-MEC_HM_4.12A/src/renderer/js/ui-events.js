/* AT-MEC HM 3.98 - Registro eventi UI sicuro.
   Obiettivo: evitare doppi bind quando pannelli/script vengono reinizializzati,
   senza cambiare la logica esistente. Usare AT_MEC_UI_EVENTS.on(...) per i nuovi eventi. */
(function(){
  'use strict';
  if(window.AT_MEC_UI_EVENTS && window.AT_MEC_UI_EVENTS.version) return;
  var registry = new Map();
  var stats = {added:0, skipped:0, removed:0};
  function keyFor(target, type, key){
    var tid = 'window';
    try{
      if(target === document) tid = 'document';
      else if(target && target.id) tid = '#'+target.id;
      else if(target && target.dataset && target.dataset.atmecAutoId) tid = target.dataset.atmecAutoId;
      else if(target && target.tagName) tid = target.tagName.toLowerCase()+'.'+String(target.className||'').slice(0,60);
    }catch(_e){}
    return tid+'::'+type+'::'+(key || 'default');
  }
  function on(target, type, handler, options, key){
    if(!target || !type || typeof handler !== 'function') return false;
    var k = keyFor(target,type,key || handler.name || 'anonymous');
    if(registry.has(k)){
      try{ target.removeEventListener(type, registry.get(k).handler, registry.get(k).options); stats.removed++; }catch(_e){}
    }
    target.addEventListener(type, handler, options || false);
    registry.set(k,{target:target,type:type,handler:handler,options:options||false,created:new Date().toISOString()});
    stats.added++;
    return true;
  }
  function off(target,type,key){
    var k = keyFor(target,type,key);
    var rec = registry.get(k);
    if(!rec) return false;
    try{ rec.target.removeEventListener(rec.type,rec.handler,rec.options); }catch(_e){}
    registry.delete(k); stats.removed++; return true;
  }
  function report(){ return {version:'3.98',count:registry.size,stats:Object.assign({},stats),keys:Array.from(registry.keys()).sort()}; }
  window.AT_MEC_UI_EVENTS = {version:'3.98',on:on,off:off,report:report};
})();
