/* AT-MEC_HM_4.16A_APP_JS_SPLIT - extracted from legacy app.js.
 * Compatibility mode: classic script, shares window/global scope with app.js.
 */

/* AT-MEC_HM_4.15B - Traceability & Repair Pro
 * Layer UI-only su Storico Seriali e Scheda Unità.
 * Non modifica motore Test Mode, login, ruoli, permessi, Device Manager o backend.
 */
(function(){
  if (window.__ATMEC_TRACEABILITY_REPAIR_PRO_415B__) return;
  window.__ATMEC_TRACEABILITY_REPAIR_PRO_415B__ = true;
  const STORE_REPAIR = 'atmec_traceability_repair_pro_415b';
  const STORE_FILTER = 'atmec_traceability_filters_415b';
  function esc(v){ try { return (typeof escapeHtml === 'function') ? escapeHtml(v ?? '') : String(v ?? '').replace(/[&<>"]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m])); } catch(_){ return String(v ?? ''); } }
  function num(v){ const n = Number(v); return Number.isFinite(n) ? n : 0; }
  function asArr(v){ return Array.isArray(v) ? v : []; }
  function readJson(key, fallback){ try { const v = JSON.parse(localStorage.getItem(key) || 'null'); return v ?? fallback; } catch(_){ return fallback; } }
  function writeJson(key, value){ try { localStorage.setItem(key, JSON.stringify(value)); } catch(_){} }
  function now(){ return new Date().toLocaleString('it-IT'); }
  function getSerial(){ return (document.getElementById('trace-serial-input')?.value || document.getElementById('unit-serial-input')?.value || (typeof getSerialDutRaw==='function'?getSerialDutRaw():'') || '').trim(); }
  function getLot(){ return (document.getElementById('trace-lot-input')?.value || document.getElementById('unit-lot-input')?.value || (typeof getLotNumber==='function'?getLotNumber():'') || '').trim(); }
  function normalizeResult(r){ return String(r?.final_result || r?.result || r?.status || '').toUpperCase(); }
  function eventTime(r){ const t = r?.timestamp || r?.date || r?.created_at || r?.time; const d = t ? new Date(t) : null; return d && !isNaN(d.getTime()) ? d : null; }
  function localRepairs(){ return readJson(STORE_REPAIR, []); }
  function upsertLocalRepair(payload){ const rows = localRepairs(); rows.unshift({ id:'local-'+Date.now(), ts:Date.now(), date:now(), ...payload }); writeJson(STORE_REPAIR, rows.slice(0,1000)); }
  function filterRows(rows, filters){
    return asArr(rows).filter(r => {
      const serial = String(r.serial_dut || r.serial || '').trim();
      const lot = String(r.lot_number || r.work_order || r.lot || '').trim();
      const op = String(r.operator || r.collaboratore || '').toLowerCase();
      const rec = String(r.recipe_name || r.recipe || '').toLowerCase();
      const res = normalizeResult(r);
      if(filters.serial && serial !== filters.serial) return false;
      if(filters.lot && lot !== filters.lot) return false;
      if(filters.operator && !op.includes(filters.operator.toLowerCase())) return false;
      if(filters.recipe && !rec.includes(filters.recipe.toLowerCase())) return false;
      if(filters.result && filters.result !== 'ALL' && res !== filters.result) return false;
      const d = eventTime(r);
      if(filters.dateFrom && d && d < new Date(filters.dateFrom+'T00:00:00')) return false;
      if(filters.dateTo && d && d > new Date(filters.dateTo+'T23:59:59')) return false;
      return true;
    });
  }
  function currentFilters(){
    const f={
      serial:(document.getElementById('trace-serial-input')?.value||'').trim(),
      lot:(document.getElementById('trace-lot-input')?.value||'').trim(),
      operator:(document.getElementById('trace-operator-input')?.value||'').trim(),
      recipe:(document.getElementById('trace-recipe-input')?.value||'').trim(),
      result:(document.getElementById('trace-result-input')?.value||'ALL').trim(),
      dateFrom:(document.getElementById('trace-date-from-input')?.value||'').trim(),
      dateTo:(document.getElementById('trace-date-to-input')?.value||'').trim()
    };
    writeJson(STORE_FILTER, f);
    return f;
  }
  function kpi(rows, repairs){
    rows=asArr(rows); repairs=asArr(repairs);
    const pass = rows.filter(r=>normalizeResult(r)==='PASS').length;
    const fail = rows.filter(r=>normalizeResult(r)==='FAIL').length;
    const total = rows.length;
    const serials = new Set(rows.map(r=>String(r.serial_dut||r.serial||'').trim()).filter(Boolean));
    const fpy = total ? Math.round((pass/total)*1000)/10 : 0;
    const avgSec = total ? Math.round(rows.reduce((a,r)=>a+num(r.execution_time_ms||r.duration_ms||0),0)/total/1000*10)/10 : 0;
    return {total,pass,fail,serials:serials.size,repairs:repairs.length,fpy,avgSec};
  }
  function topBy(rows, getter, n=5){ const m={}; asArr(rows).forEach(r=>{const k=String(getter(r)||'').trim()||'N/D'; m[k]=(m[k]||0)+1;}); return Object.entries(m).sort((a,b)=>b[1]-a[1]).slice(0,n); }
  function statusBadge(v){ const s=String(v||'').toUpperCase(); if(s==='PASS') return '<span class="trace-pro-badge ok">PASS</span>'; if(s==='FAIL') return '<span class="trace-pro-badge fail">FAIL</span>'; return `<span class="trace-pro-badge neutral">${esc(s||'N/D')}</span>`; }
  function timeline(rows, repairs){
    const events=[];
    asArr(rows).forEach(r=>events.push({kind:'test', date:eventTime(r), title:`Test ${normalizeResult(r)||'N/D'}`, sub:`${r.recipe_name||r.recipe||'-'} · ${r.operator||'-'} · ${r.lot_number||r.work_order||'-'}`, badge:normalizeResult(r)}));
    asArr(repairs).forEach(r=>events.push({kind:'repair', date:eventTime(r)||new Date(r.ts||Date.now()), title:'Riparazione / intervento', sub:`${r.cause||r.repair_cause||'-'} · ${r.note||r.repair_note||r.action||'-'} · ${r.operator||'-'}`, badge:'REPAIR'}));
    events.sort((a,b)=>(b.date?.getTime()||0)-(a.date?.getTime()||0));
    if(!events.length) return '<div class="trace-pro-empty">Nessun evento disponibile.</div>';
    return events.slice(0,30).map(e=>`<div class="trace-pro-timeline-row ${e.kind}"><div class="trace-pro-dot"></div><div><b>${esc(e.title)}</b><small>${e.date?e.date.toLocaleString('it-IT'):'N/D'} · ${esc(e.sub)}</small></div><div>${e.badge==='REPAIR'?'<span class="trace-pro-badge warn">REPAIR</span>':statusBadge(e.badge)}</div></div>`).join('');
  }
  function repairRows(repairs){
    repairs=asArr(repairs); if(!repairs.length) return '<div class="trace-pro-empty">Nessuna riparazione registrata.</div>';
    return repairs.slice(0,20).map(r=>`<div class="trace-pro-repair-row"><div><b>${esc(r.cause||r.repair_cause||'Intervento')}</b><small>${esc(r.note||r.repair_note||r.action||'-')}</small></div><div><small>${esc(r.operator||'-')}</small><b>${esc(r.date||now())}</b></div></div>`).join('');
  }
  function firmwareRows(rows){ const top = topBy(rows, r=>r.firmware || r.fw || r.recipe_version || r.version || 'N/D', 8); if(!top.length) return '<div class="trace-pro-empty">Nessun firmware/versione rilevata.</div>'; return top.map(([k,v])=>`<div class="trace-pro-mini-row"><span>${esc(k)}</span><b>${v}</b></div>`).join(''); }
  function defectRows(rows, repairs){
    const failRows = asArr(rows).filter(r=>normalizeResult(r)==='FAIL');
    const all = [...failRows.map(r=>r.repair_note||r.failure_reason||r.error||'FAIL senza causa'), ...asArr(repairs).map(r=>r.cause||r.repair_cause||r.note||'Riparazione')];
    const top = topBy(all.map(x=>({x})), r=>r.x, 8);
    if(!top.length) return '<div class="trace-pro-empty">Nessun difetto classificato.</div>';
    return top.map(([k,v])=>`<div class="trace-pro-mini-row"><span>${esc(k)}</span><b>${v}</b></div>`).join('');
  }
  function ensureCss(){ if(document.getElementById('trace-pro-css-415b')) return; const st=document.createElement('style'); st.id='trace-pro-css-415b'; st.textContent=`
    .trace-pro-panel{border:1px solid rgba(116,224,255,.24);background:linear-gradient(135deg,rgba(15,23,42,.96),rgba(20,30,50,.82));border-radius:20px;padding:16px;margin-top:12px;box-shadow:0 18px 40px rgba(0,0,0,.22)}
    .trace-pro-head{display:flex;justify-content:space-between;gap:14px;align-items:flex-start;margin-bottom:12px}.trace-pro-head h3{margin:0;font-size:18px}.trace-pro-head p{margin:4px 0 0;color:var(--text2);font-size:12px}.trace-pro-chip{border:1px solid rgba(116,224,255,.35);border-radius:999px;padding:6px 10px;font-size:11px;font-weight:900;color:var(--accent);white-space:nowrap}
    .trace-pro-kpis{display:grid;grid-template-columns:repeat(6,minmax(110px,1fr));gap:10px;margin:10px 0}.trace-pro-kpi{border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.045);border-radius:16px;padding:11px}.trace-pro-kpi b{display:block;font-size:20px}.trace-pro-kpi span{font-size:10px;color:var(--text2);letter-spacing:.08em;text-transform:uppercase}
    .trace-pro-grid{display:grid;grid-template-columns:1.25fr .85fr;gap:12px}.trace-pro-card{border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.035);border-radius:16px;padding:12px;min-height:110px}.trace-pro-card h4{margin:0 0 10px;font-size:14px;color:var(--accent)}
    .trace-pro-timeline-row,.trace-pro-repair-row,.trace-pro-mini-row{display:grid;grid-template-columns:18px 1fr auto;gap:9px;align-items:center;border-bottom:1px solid rgba(255,255,255,.07);padding:8px 0}.trace-pro-repair-row{grid-template-columns:1fr auto}.trace-pro-mini-row{grid-template-columns:1fr auto}.trace-pro-timeline-row small,.trace-pro-repair-row small{display:block;color:var(--text2);font-size:11px;margin-top:2px}.trace-pro-dot{width:10px;height:10px;border-radius:50%;background:var(--accent);box-shadow:0 0 12px var(--accent)}.trace-pro-timeline-row.repair .trace-pro-dot{background:#f59e0b;box-shadow:0 0 12px #f59e0b}
    .trace-pro-badge{display:inline-flex;align-items:center;border-radius:999px;padding:4px 8px;font-size:10px;font-weight:900;border:1px solid rgba(255,255,255,.14)}.trace-pro-badge.ok{color:#22c55e;background:rgba(34,197,94,.12)}.trace-pro-badge.fail{color:#ef4444;background:rgba(239,68,68,.12)}.trace-pro-badge.warn{color:#f59e0b;background:rgba(245,158,11,.12)}.trace-pro-badge.neutral{color:var(--text2);background:rgba(255,255,255,.05)}
    .trace-pro-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.trace-pro-empty{color:var(--text2);font-size:12px;padding:10px;border:1px dashed rgba(255,255,255,.16);border-radius:12px}.trace-pro-form{display:grid;grid-template-columns:1fr 1fr;gap:8px}.trace-pro-form input,.trace-pro-form textarea{width:100%;min-height:36px;border-radius:10px;border:1px solid rgba(255,255,255,.12);background:rgba(0,0,0,.18);color:var(--text);padding:8px}.trace-pro-form textarea{grid-column:1/-1;min-height:62px;resize:vertical}
    @media(max-width:1100px){.trace-pro-kpis{grid-template-columns:repeat(2,1fr)}.trace-pro-grid{grid-template-columns:1fr}.trace-pro-form{grid-template-columns:1fr}}
  `; document.head.appendChild(st); }
  function proRows(){ return filterRows(asArr(window.auditCache || auditCache), currentFilters()); }
  function repairDataFor(serial){ return localRepairs().filter(r=>!serial || String(r.serial||r.serial_dut||'').trim()===serial); }
  async function refreshTracePro(){
    ensureCss();
    const host=document.getElementById('trace-pro-415b'); if(!host) return;
    let rows=proRows();
    if((!rows.length) && api?.getAuditHistory){ try { const rr = await api.getAuditHistory(currentFilters()); if(Array.isArray(rr)){ auditCache = rr; window.auditCache = rr; rows = proRows(); } } catch(_){} }
    const f=currentFilters(); const serial=f.serial||getSerial(); const reps=repairDataFor(serial); const k=kpi(rows,reps);
    const operators=topBy(rows,r=>r.operator||'N/D',5); const recipes=topBy(rows,r=>r.recipe_name||r.recipe||'N/D',5);
    host.innerHTML=`<div class="trace-pro-head"><div><h3>🏭 Traceability & Repair Pro</h3><p>Genealogia prodotto, riparazioni, firmware, difetti e KPI qualità aggregati dalla cronologia test locale.</p></div><div class="trace-pro-chip">4.15B · PRO</div></div>
      <div class="trace-pro-kpis"><div class="trace-pro-kpi"><b>${k.total}</b><span>Test</span></div><div class="trace-pro-kpi"><b>${k.pass}</b><span>PASS</span></div><div class="trace-pro-kpi"><b>${k.fail}</b><span>FAIL</span></div><div class="trace-pro-kpi"><b>${k.fpy}%</b><span>FPY</span></div><div class="trace-pro-kpi"><b>${k.repairs}</b><span>Riparazioni</span></div><div class="trace-pro-kpi"><b>${k.avgSec}s</b><span>Tempo medio</span></div></div>
      <div class="trace-pro-grid"><div class="trace-pro-card"><h4>Timeline seriale / genealogia</h4>${timeline(rows,reps)}</div><div class="trace-pro-card"><h4>Repair Center rapido</h4><div class="trace-pro-form"><input id="trace-pro-cause-415b" placeholder="Difetto / causa"><input id="trace-pro-tech-415b" placeholder="Tecnico / collaboratore"><textarea id="trace-pro-note-415b" placeholder="Intervento eseguito"></textarea></div><div class="trace-pro-actions"><button class="btn btn-success btn-sm" onclick="saveTraceRepairPro415B()">Salva intervento</button><button class="btn btn-ghost btn-sm" onclick="refreshTraceabilityPro415B()">Aggiorna</button></div></div>
      <div class="trace-pro-card"><h4>Top difetti / cause</h4>${defectRows(rows,reps)}</div><div class="trace-pro-card"><h4>Storico firmware / versione</h4>${firmwareRows(rows)}</div><div class="trace-pro-card"><h4>Operatori coinvolti</h4>${operators.map(([a,b])=>`<div class="trace-pro-mini-row"><span>${esc(a)}</span><b>${b}</b></div>`).join('')||'<div class="trace-pro-empty">Nessun dato.</div>'}</div><div class="trace-pro-card"><h4>Ricette coinvolte</h4>${recipes.map(([a,b])=>`<div class="trace-pro-mini-row"><span>${esc(a)}</span><b>${b}</b></div>`).join('')||'<div class="trace-pro-empty">Nessun dato.</div>'}</div></div>`;
  }
  function injectTracePro(){ ensureCss(); const tab=document.getElementById('traceability-tab'); if(tab && !document.getElementById('trace-pro-415b')){ const box=document.createElement('section'); box.id='trace-pro-415b'; box.className='trace-pro-panel'; const stats=tab.querySelector('.traceability-stats-grid'); if(stats) stats.insertAdjacentElement('afterend',box); else tab.appendChild(box); } refreshTracePro(); }
  function injectUnitPro(){ ensureCss(); const tab=document.getElementById('unit-card-tab'); if(!tab || document.getElementById('unit-pro-415b')) return; const box=document.createElement('section'); box.id='unit-pro-415b'; box.className='trace-pro-panel'; box.innerHTML=`<div class="trace-pro-head"><div><h3>🧬 Genealogia & Repair Pro</h3><p>Scheda unità estesa: test, firmware, riparazioni e qualità collegati al seriale selezionato.</p></div><div class="trace-pro-chip">UNIT PRO</div></div><div id="unit-pro-body-415b" class="trace-pro-empty">Carica una scheda unità per aggiornare la genealogia estesa.</div>`; const stats=tab.querySelector('.unit-card-stats-grid'); if(stats) stats.insertAdjacentElement('afterend', box); else tab.appendChild(box); }
  async function refreshUnitPro(){ injectUnitPro(); const body=document.getElementById('unit-pro-body-415b'); if(!body) return; const serial=(document.getElementById('unit-serial-input')?.value||getSerial()).trim(); const lot=(document.getElementById('unit-lot-input')?.value||getLot()).trim(); let rows=filterRows(asArr(window.auditCache || auditCache), {serial,lot,result:'ALL'}); if(api?.getAuditHistory){ try { const rr=await api.getAuditHistory({serial,lot,result:'ALL'}); if(Array.isArray(rr)) rows=rr; } catch(_){} } const reps=repairDataFor(serial); const k=kpi(rows,reps); body.className=''; body.innerHTML=`<div class="trace-pro-kpis"><div class="trace-pro-kpi"><b>${k.total}</b><span>Test unità</span></div><div class="trace-pro-kpi"><b>${k.pass}</b><span>PASS</span></div><div class="trace-pro-kpi"><b>${k.fail}</b><span>FAIL</span></div><div class="trace-pro-kpi"><b>${k.repairs}</b><span>Riparazioni</span></div><div class="trace-pro-kpi"><b>${k.fpy}%</b><span>FPY</span></div><div class="trace-pro-kpi"><b>${serial||'N/D'}</b><span>Seriale</span></div></div><div class="trace-pro-grid"><div class="trace-pro-card"><h4>Timeline completa unità</h4>${timeline(rows,reps)}</div><div class="trace-pro-card"><h4>Firmware / revisioni</h4>${firmwareRows(rows)}</div><div class="trace-pro-card"><h4>Riparazioni collegate</h4>${repairRows(reps)}</div><div class="trace-pro-card"><h4>Difetti ricorrenti</h4>${defectRows(rows,reps)}</div></div>`; }
  window.refreshTraceabilityPro415B = refreshTracePro;
  window.refreshUnitPro415B = refreshUnitPro;
  window.saveTraceRepairPro415B = async function(){
    const serial = getSerial(); if(!serial){ alert('Inserisci un seriale prima di salvare un intervento.'); return; }
    const payload={ serial, serial_dut:serial, lot:getLot(), cause:document.getElementById('trace-pro-cause-415b')?.value||'', operator:document.getElementById('trace-pro-tech-415b')?.value || (currentUser?.username||''), note:document.getElementById('trace-pro-note-415b')?.value||'' };
    if(!payload.note && !payload.cause){ alert('Inserisci almeno difetto o intervento.'); return; }
    try { if(api?.addRepairRecord) await api.addRepairRecord(payload); } catch(e){ console.warn('addRepairRecord fallback locale', e); }
    upsertLocalRepair(payload);
    try{ document.getElementById('trace-pro-cause-415b').value=''; document.getElementById('trace-pro-note-415b').value=''; }catch(_){}
    refreshTracePro(); refreshUnitPro();
  };
  const oldLoadTrace = window.loadTraceabilitySerialHistory || (typeof loadTraceabilitySerialHistory==='function' ? loadTraceabilitySerialHistory : null);
  if(oldLoadTrace){ window.loadTraceabilitySerialHistory = async function(){ const r = await oldLoadTrace.apply(this, arguments); setTimeout(refreshTracePro,120); return r; }; }
  const oldUnit = window.loadUnitGenealogy410E || (typeof loadUnitGenealogy410E==='function' ? loadUnitGenealogy410E : null);
  if(oldUnit){ window.loadUnitGenealogy410E = async function(){ const r = await oldUnit.apply(this, arguments); setTimeout(refreshUnitPro,120); return r; }; }
  const oldShowTab = window.showTab || (typeof showTab==='function' ? showTab : null);
  if(oldShowTab){ window.showTab = function(tabId, btn){ const r = oldShowTab.apply(this, arguments); setTimeout(()=>{ if(tabId==='traceability-tab') injectTracePro(); if(tabId==='unit-card-tab') refreshUnitPro(); },80); return r; }; }
  document.addEventListener('DOMContentLoaded', ()=>{ setTimeout(()=>{ injectTracePro(); injectUnitPro(); },500); });
})();
