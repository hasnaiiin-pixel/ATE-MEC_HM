/* AT-MEC_HM_4.16B - estratto da app.js: report, permessi UI legacy, topbar e branding sync. */
// AT-MEC_HM_4.11 - Loghi PDF + layout Storico/Scheda isolato dal KPI dashboard.
function atmecReportLogoUrl410J(fileName){
  try { return new URL('assets/' + fileName, window.location.href).href; }
  catch(_e){ return 'assets/' + fileName; }
}
function atmecReportHeader410J(title, subtitle=''){
  const mec = atmecReportLogoUrl410J('MEC.PNG');
  const mirza = atmecReportLogoUrl410J('MIRZA_LOGO.png');
  return `<div class="atmec-print-header"><div class="atmec-print-logo-box"><img src="${mec}" alt="MEC"></div><div class="atmec-print-title"><h1>${escapeHtml(title)}</h1>${subtitle?`<div>${subtitle}</div>`:''}</div><div class="atmec-print-logo-box"><img src="${mirza}" alt="MIRZA"></div></div>`;
}
function atmecReportStyle410J(){
  return `<style>
    body{font-family:Arial,Helvetica,sans-serif;padding:26px;color:#111827;background:#fff} h1{font-size:20px;margin:0 0 4px 0} h2{font-size:15px;margin:20px 0 8px 0;color:#111827;border-bottom:1px solid #e5e7eb;padding-bottom:4px} table{width:100%;border-collapse:collapse;margin-top:10px;page-break-inside:auto}tr{page-break-inside:avoid;page-break-after:auto}td,th{border:1px solid #d0d5dd;padding:7px;font-size:12px;vertical-align:top}th{background:#f3f4f6;text-align:left;color:#374151}.pass{color:#087443;font-weight:bold}.fail{color:#b42318;font-weight:bold}.done{color:#175cd3;font-weight:bold}.muted{color:#667085;font-size:11px}.atmec-print-header{display:grid;grid-template-columns:120px 1fr 120px;gap:18px;align-items:center;border-bottom:2px solid #202538;padding-bottom:12px;margin-bottom:18px}.atmec-print-logo-box{height:68px;display:flex;align-items:center;justify-content:center;background:#fff;border:1px solid #e4e7ee;border-radius:10px;padding:6px}.atmec-print-logo-box img{max-width:100%;max-height:56px;object-fit:contain}.atmec-print-title{text-align:center}.atmec-print-title div{font-size:12px;color:#555}.atmec-print-summary{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:14px 0}.atmec-print-card{border:1px solid #d0d5dd;border-radius:10px;padding:9px;background:#f9fafb}.atmec-print-card b{display:block;font-size:16px}.atmec-print-footer{margin-top:22px;border-top:1px solid #ddd;padding-top:8px;font-size:11px;color:#666;display:flex;justify-content:space-between;gap:12px}.signature-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:24px}.signature-box{border:1px solid #d0d5dd;border-radius:10px;padding:12px;height:62px}.signature-line{border-bottom:1px solid #98a2b3;margin-top:28px}@media print{body{padding:14mm}.atmec-print-header,.atmec-print-summary,.signature-grid{break-inside:avoid}}
  </style>`;
}


function atmecPrintMeasureCell412D(step){
  const unit=step?.unit||'';
  const measured=(step?.measured!==undefined&&step?.measured!==null)?String(step.measured)+(unit?' '+unit:''):'N/D';
  const target=(step?.target!==undefined&&step?.target!==null)?String(step.target)+(unit?' '+unit:''):'';
  const min=(step?.min!==undefined&&step?.min!==null)?String(step.min)+(unit?' '+unit:''):'';
  const max=(step?.max!==undefined&&step?.max!==null)?String(step.max)+(unit?' '+unit:''):'';
  const tol=(step?.tolerance!==undefined&&step?.tolerance!==null)?'±'+String(step.tolerance)+(unit?' '+unit:''):'';
  return [
    '<b>Misurato:</b> '+escapeHtml(measured),
    target?'<b>Atteso:</b> '+escapeHtml(target):'',
    (min||max)?'<b>Range:</b> '+escapeHtml(min||'N/D')+' → '+escapeHtml(max||'N/D'):'',
    tol?'<b>Tol:</b> '+escapeHtml(tol):'',
    step?.measurement_source?'<b>Origine:</b> '+escapeHtml(step.measurement_source):'',
    step?.measurement_device?'<b>Device:</b> '+escapeHtml(step.measurement_device):''
  ].filter(Boolean).join('<br>');
}
function atmecReportFooter412D(){
  // 4.13A: footer statico. Non richiamare questa funzione dentro se stessa.
  // La vecchia versione causava ricorsione infinita e Maximum call stack size exceeded.
  return `<div class="signature-grid"><div class="signature-box"><b>Firma operatore</b><div class="signature-line"></div></div><div class="signature-box"><b>Approvazione qualità</b><div class="signature-line"></div></div></div><div class="atmec-print-footer"><span>AT-MEC HM 4.13O</span><span>Report generato automaticamente</span></div>`;
}
// Sovrascrittura conservativa export storico da pagina Test Report/Audit: stessa logica, solo header loghi.
function exportSerialHistoryPdf() {
  const serial = document.getElementById('audit-serial')?.value?.trim() || document.getElementById('serial-history-input')?.value?.trim() || getSerialDutRaw();
  if (!serial) { alert('Inserisci o seleziona un Serial Number per esportare lo storico scheda.'); return; }
  const lot = document.getElementById('audit-lot')?.value?.trim() || document.getElementById('serial-history-lot')?.value?.trim() || getLotNumber();
  const sourceRows = Array.isArray(auditCache) && auditCache.length ? auditCache : [];
  const rows = sourceRows.filter(r => String(r.serial_dut || '') === serial && (!lot || String(r.lot_number || r.work_order || '') === lot)).sort((a,b)=>new Date(a.timestamp)-new Date(b.timestamp));
  let html = `<html><head><title>Storico ${escapeHtml(serial)}</title>${atmecReportStyle410J()}</head><body>`;
  html += atmecReportHeader410J('AT-MEC HM - Storico scheda e riparazioni', `<b>Seriale:</b> ${escapeHtml(serial)} &nbsp; <b>Commessa/Lotto:</b> ${escapeHtml(lot || 'Tutte')}`);
  html += `<table><thead><tr><th>Data</th><th>Esito</th><th>Ricetta</th><th>Rev</th><th>Operatore</th><th>Riparazione / Intervento</th></tr></thead><tbody>`;
  html += rows.map(r => `<tr><td>${new Date(r.timestamp).toLocaleString('it-IT')}</td><td class="${String(r.final_result).toLowerCase()}">${escapeHtml(r.final_result || '')}</td><td>${escapeHtml(r.recipe_name || '')}</td><td>${escapeHtml(String(r.recipe_version || ''))}</td><td>${escapeHtml(r.operator || '')}</td><td>${escapeHtml(r.repair_note || '')}</td></tr>`).join('') || '<tr><td colspan="6">Nessun record trovato.</td></tr>';
  html += `</tbody></table>${atmecReportFooter412D()}</body></html>`;
  const w = window.open('', '_blank');
  if (!w) { downloadTextFile(`storico_${serial}.html`, html, 'text/html'); return; }
  w.document.write(html); w.document.close(); setTimeout(() => { try { w.print(); } catch {} }, 350);
}

// Versione 4.10D con loghi: Storico Seriali/Riparazioni.
function printTraceabilitySerialHistory(){
  const c=traceabilitySerialCache410D;
  const serial=(document.getElementById('trace-serial-input')?.value || c?.serial || '').trim();
  if(!serial){ alert('Cerca prima un seriale.'); return; }
  const tests=c?.history?.tests || []; const repairs=c?.history?.repairs || []; const lot=c?.lot || document.getElementById('trace-lot-input')?.value || '';
  let html='<html><head><title>Storico seriale '+escapeHtml(serial)+'</title>'+atmecReportStyle410J()+'</head><body>';
  html += atmecReportHeader410J('AT-MEC HM - Storico seriale', `<b>Seriale:</b> ${escapeHtml(serial)} &nbsp; <b>Lotto:</b> ${escapeHtml(lot || 'Tutti')} &nbsp; <b>Test:</b> ${tests.length} &nbsp; <b>Riparazioni:</b> ${repairs.length}`);
  html += '<h2>Test eseguiti</h2><table><thead><tr><th>Data</th><th>Seriale</th><th>Esito</th><th>Ricetta</th><th>Operatore</th><th>Riparazione</th></tr></thead><tbody>';
  html += tests.map(r=>`<tr><td>${new Date(r.timestamp).toLocaleString('it-IT')}</td><td>${escapeHtml(r.serial_dut||serial)}</td><td class="${String(r.final_result||'').toLowerCase()}">${escapeHtml(r.final_result||'')}</td><td>${escapeHtml(r.recipe_name||'')}</td><td>${escapeHtml(r.operator||'')}</td><td>${escapeHtml(r.repair_note||'')}</td></tr>`).join('') || '<tr><td colspan="6">Nessun test.</td></tr>';
  html += '</tbody></table><h2>Riparazioni</h2><table><thead><tr><th>Data</th><th>Lotto</th><th>Operatore</th><th>Intervento</th></tr></thead><tbody>';
  html += repairs.map(r=>`<tr><td>${new Date(r.timestamp).toLocaleString('it-IT')}</td><td>${escapeHtml(r.lot_number||r.work_order||'')}</td><td>${escapeHtml(r.operator||'')}</td><td>${escapeHtml(r.repair_note||'')}</td></tr>`).join('') || '<tr><td colspan="4">Nessuna riparazione.</td></tr>';
  html += `</tbody></table>${atmecReportFooter412D()}</body></html>`;
  const w=window.open('', '_blank');
  if(!w){ downloadTextFile(`storico_seriale_${serial}.html`, html, 'text/html'); return; }
  w.document.write(html); w.document.close(); setTimeout(()=>{ try{ w.print(); }catch{} }, 350);
}

// Versione 4.10E con loghi: Scheda unità/Genealogia prodotto.
function printUnitGenealogy410E(){
  const c=unitGenealogyCache410E;
  const serial=(document.getElementById('unit-serial-input')?.value || c?.serial || '').trim();
  if(!serial){ alert('Carica prima una scheda unità.'); return; }
  const tests=c?.tests || []; const repairs=c?.repairs || [];
  let html='<html><head><title>Scheda unità '+escapeHtml(serial)+'</title>'+atmecReportStyle410J()+'</head><body>';
  html+=atmecReportHeader410J('AT-MEC HM - Scheda Unità / Genealogia prodotto', `<b>Seriale:</b> ${escapeHtml(serial)} &nbsp; <b>Lotto:</b> ${escapeHtml(c?.lot || '-')} &nbsp; <b>Ultimo esito:</b> ${escapeHtml(c?.lastResult || 'N/D')}`);
  html+=`<p><b>Revisione scheda:</b> ${escapeHtml(c?.boardRev || '-')}<br><b>Firmware:</b> ${escapeHtml(c?.firmware || '-')}<br><b>Note qualità:</b> ${escapeHtml(c?.qualityNote || '-')}</p>`;
  html+='<h2>Timeline test</h2><table><thead><tr><th>#</th><th>Data</th><th>Esito</th><th>Ricetta</th><th>Rev</th><th>Operatore</th><th>Nota</th></tr></thead><tbody>';
  html+=tests.map((r,i)=>`<tr><td>${i+1}</td><td>${escapeHtml(unitDate410E(r.timestamp))}</td><td class="${String(r.final_result||'').toLowerCase()}">${escapeHtml(r.final_result||'')}</td><td>${escapeHtml(r.recipe_name||'')}</td><td>${escapeHtml(r.recipe_version||'')}</td><td>${escapeHtml(r.operator||'')}</td><td>${escapeHtml(r.repair_note||'')}</td></tr>`).join('') || '<tr><td colspan="7">Nessun test.</td></tr>';
  html+='</tbody></table><h2>Riparazioni</h2><table><thead><tr><th>#</th><th>Data</th><th>Lotto</th><th>Operatore</th><th>Intervento</th></tr></thead><tbody>';
  html+=repairs.map((r,i)=>`<tr><td>${i+1}</td><td>${escapeHtml(unitDate410E(r.timestamp))}</td><td>${escapeHtml(r.lot_number||r.work_order||'')}</td><td>${escapeHtml(r.operator||'')}</td><td>${escapeHtml(r.repair_note||'')}</td></tr>`).join('') || '<tr><td colspan="5">Nessuna riparazione.</td></tr>';
  html+=`</tbody></table>${atmecReportFooter412D()}</body></html>`;
  const w=window.open('', '_blank');
  if(!w){ downloadTextFile(`scheda_unita_${serial}.html`, html, 'text/html'); return; }
  w.document.write(html); w.document.close(); setTimeout(()=>{ try{ w.print(); }catch{} },350);
}

// AT-MEC_HM_4.13A - Analisi Produzione separata.
// Modulo additivo: usa solo getLocalDbStats e non modifica Test Mode, Dashboard, Storico, Scheda Unità o Layout Editor.
function productionAnalysisFilters412A(){
  return {
    lot: (document.getElementById('pa412a-lot')?.value || '').trim(),
    serial: (document.getElementById('pa412a-serial')?.value || '').trim(),
    operator: (document.getElementById('pa412a-operator')?.value || '').trim(),
    recipe: (document.getElementById('pa412a-recipe')?.value || '').trim(),
    result: (document.getElementById('pa412a-result')?.value || 'ALL').trim(),
    dateFrom: (document.getElementById('pa412a-date-from')?.value || '').trim(),
    dateTo: (document.getElementById('pa412a-date-to')?.value || '').trim()
  };
}
function pa412aSetText(id, value){ const el=document.getElementById(id); if(el) el.textContent=String(value ?? ''); }
function pa412aHtmlRows(items, emptyText){
  if(!Array.isArray(items) || !items.length) return `<div class="hint">${escapeHtml(emptyText || 'Nessun dato disponibile.')}</div>`;
  return items.map((it)=>`<div class="pa412a-row"><b>${escapeHtml(it.title ?? it.name ?? it.day ?? '-')}</b><span>${escapeHtml(it.value ?? it.count ?? it.summary ?? '')}</span></div>`).join('');
}
async function loadProductionAnalysisDashboard412A(){
  const status=document.getElementById('pa412a-status');
  if(status) status.textContent='Calcolo KPI in corso...';
  if(!api?.getLocalDbStats){ if(status) status.textContent='API KPI non disponibile.'; return; }
  try{
    const filters=productionAnalysisFilters412A();
    const st=await api.getLocalDbStats(filters);
    pa412aSetText('pa412a-fpy', (st.fpyRate || 0) + '%');
    pa412aSetText('pa412a-yield', (st.yieldRate || 0) + '%');
    pa412aSetText('pa412a-retest', (st.retestRate || 0) + '%');
    pa412aSetText('pa412a-avg-time', (st.avgTestTimeSec || 0) + 's');
    pa412aSetText('pa412a-serials', st.uniqueSerials || 0);
    pa412aSetText('pa412a-total', st.total || 0);
    const today=new Date().toISOString().slice(0,10);
    const todayTrend=(Array.isArray(st.dailyTrend) ? st.dailyTrend : []).find(x=>String(x.day)===today) || {pass:0, fail:0};
    pa412aSetText('pa412a-pass-today', todayTrend.pass || 0);
    pa412aSetText('pa412a-fail-today', todayTrend.fail || 0);
    const trend=(Array.isArray(st.dailyTrend) ? st.dailyTrend : []).slice(-14).map(d=>({title:d.day, value:`${d.pass || 0} PASS / ${d.fail || 0} FAIL · Yield ${d.yieldRate || 0}%`}));
    const failures=(Array.isArray(st.topFailures) ? st.topFailures : []).slice(0,10).map(f=>({title:f.name || 'FAIL', value:`${f.count || 0} occorrenze`}));
    const latest=st.latestReport || null;
    const latestRows=latest ? [
      {title:'Data', value: latest.timestamp ? new Date(latest.timestamp).toLocaleString('it-IT') : '-'},
      {title:'Esito', value: latest.final_result || '-'},
      {title:'Seriale', value: latest.serial_dut || '-'},
      {title:'Ricetta', value: `${latest.recipe_name || '-'} ${latest.recipe_version ? 'v'+latest.recipe_version : ''}`},
      {title:'Operatore', value: latest.operator || '-'}
    ] : [];
    const trendBox=document.getElementById('pa412a-trend'); if(trendBox) trendBox.innerHTML=pa412aHtmlRows(trend, 'Nessun trend disponibile con questi filtri.');
    const failBox=document.getElementById('pa412a-top-failures'); if(failBox) failBox.innerHTML=pa412aHtmlRows(failures, 'Nessun guasto trovato con questi filtri.');
    const latestBox=document.getElementById('pa412a-latest'); if(latestBox) latestBox.innerHTML=pa412aHtmlRows(latestRows, 'Nessun report disponibile con questi filtri.');
    if(status) status.textContent=`KPI aggiornati · ${st.total || 0} test filtrati · DB: ${st.dbPath || 'N/D'}`;
  }catch(e){
    if(status) status.textContent='Errore calcolo KPI: '+normalizeError(e);
    console.error('[AT-MEC 4.13O] Analisi Produzione', e);
  }
}
function clearProductionAnalysisFilters412A(){
  ['pa412a-lot','pa412a-serial','pa412a-operator','pa412a-recipe','pa412a-date-from','pa412a-date-to'].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; });
  const res=document.getElementById('pa412a-result'); if(res) res.value='ALL';
  loadProductionAnalysisDashboard412A();
}


// AT-MEC_HM_4.13A - Archivio Dati & Backup separato.
// Modulo additivo: usa API gia esistenti e non modifica Test Mode, Ricette, Hardware, Layout Editor, Storico o Scheda Unità.
function archiveFilters412B(){
  return {
    serial: (document.getElementById('da412b-serial')?.value || '').trim(),
    lot: (document.getElementById('da412b-lot')?.value || '').trim(),
    operator: (document.getElementById('da412b-operator')?.value || '').trim(),
    recipe: (document.getElementById('da412b-recipe')?.value || '').trim(),
    result: (document.getElementById('da412b-result')?.value || 'ALL').trim(),
    dateFrom: (document.getElementById('da412b-date-from')?.value || '').trim(),
    dateTo: (document.getElementById('da412b-date-to')?.value || '').trim()
  };
}
function da412bSetText(id, value){ const el=document.getElementById(id); if(el) el.textContent=String(value ?? ''); }
function da412bStatus(id, text){ const el=document.getElementById(id); if(el) el.textContent=String(text || ''); }
function archiveRows412B(rows){
  if(!Array.isArray(rows) || !rows.length) return '<div class="hint">Nessun record trovato con questi filtri.</div>';
  return rows.slice(0,25).map(r=>{
    const res=String(r.final_result || r.result || '').toUpperCase();
    const cls=res==='PASS'?'pass':(res==='FAIL'?'fail':'');
    const ts=r.timestamp ? new Date(r.timestamp).toLocaleString('it-IT') : '-';
    return `<div class="da412b-row ${cls}"><b>${escapeHtml(ts)} · ${escapeHtml(res || 'N/D')}</b><span>${escapeHtml(r.serial_dut || r.serial || '-')} · ${escapeHtml(r.recipe_name || '-')} · ${escapeHtml(r.operator || '-')}</span></div>`;
  }).join('');
}
async function loadDataArchiveDashboard412B(){
  da412bStatus('da412b-maint-status','Aggiornamento archivio in corso...');
  try{
    if(!api?.getLocalDbStats){ da412bStatus('da412b-maint-status','API statistiche archivio non disponibile.'); return; }
    const st=await api.getLocalDbStats(archiveFilters412B());
    da412bSetText('da412b-total', st.total || 0);
    da412bSetText('da412b-serials', st.uniqueSerials || 0);
    da412bSetText('da412b-yield', (st.yieldRate || 0) + '%');
    da412bSetText('da412b-retest', (st.retestRate || 0) + '%');
    da412bStatus('da412b-maint-status', `Archivio OK · ${st.total || 0} test · DB: ${st.dbPath || 'N/D'}`);
    if(typeof loadDataProviderStatus412E==='function') await loadDataProviderStatus412E();
  }catch(e){
    da412bStatus('da412b-maint-status','Errore archivio: '+normalizeError(e));
    console.error('[AT-MEC 4.13O] Archivio dati', e);
  }
}
async function previewDataArchive412B(){
  const box=document.getElementById('da412b-preview');
  if(box) box.innerHTML='<div class="hint">Caricamento anteprima...</div>';
  try{
    let rows=[];
    if(api?.getAuditHistory){ rows=await api.getAuditHistory(archiveFilters412B()); }
    if(box) box.innerHTML=archiveRows412B(Array.isArray(rows)?rows:[]);
    da412bStatus('da412b-export-status', `${Array.isArray(rows)?rows.length:0} record trovati.`);
    await loadDataArchiveDashboard412B();
  }catch(e){
    if(box) box.innerHTML='<div class="hint">Errore anteprima: '+escapeHtml(normalizeError(e))+'</div>';
  }
}
async function createArchiveBackup412B(){
  const label=(document.getElementById('da412b-backup-label')?.value || 'manuale').trim() || 'manuale';
  da412bStatus('da412b-backup-status','Creazione backup in corso...');
  try{
    if(!api?.backupLocalDatabase){ da412bStatus('da412b-backup-status','API backup non disponibile.'); return; }
    const res=await api.backupLocalDatabase(label);
    if(res?.ok) da412bStatus('da412b-backup-status', `Backup creato: ${res.filePath} · record: ${res.count ?? '-'}`);
    else da412bStatus('da412b-backup-status', 'Backup annullato o non creato.');
  }catch(e){ da412bStatus('da412b-backup-status','Errore backup: '+normalizeError(e)); }
}
async function verifyDataArchive412B(){
  await loadDataArchiveDashboard412B();
  da412bStatus('da412b-maint-status','Verifica completata. Se i conteggi sono visibili, archivio e API sono raggiungibili.');
}
async function exportArchiveCsv412B(){
  da412bStatus('da412b-export-status','Esportazione CSV in corso...');
  try{
    if(api?.exportLocalReportsCsv){
      const res=await api.exportLocalReportsCsv(archiveFilters412B());
      da412bStatus('da412b-export-status', res?.ok ? `CSV esportato: ${res.filePath}` : 'Esportazione CSV annullata.');
    } else {
      let rows=[]; if(api?.getAuditHistory) rows=await api.getAuditHistory(archiveFilters412B());
      const head=['timestamp','serial_dut','lot_number','work_order','operator','recipe_name','recipe_version','final_result','execution_time_ms','repair_note'];
      const esc=(v)=>`"${String(v??'').replace(/"/g,'""')}"`;
      const body=[head.join(';')].concat((rows||[]).map(r=>head.map(k=>esc(r[k])).join(';'))).join('\n');
      downloadTextFile(`AT-MEC_archivio_${new Date().toISOString().slice(0,10)}.csv`, body, 'text/csv');
      da412bStatus('da412b-export-status','CSV scaricato dal browser.');
    }
  }catch(e){ da412bStatus('da412b-export-status','Errore CSV: '+normalizeError(e)); }
}
async function exportArchiveJson412B(){
  da412bStatus('da412b-export-status','Esportazione JSON in corso...');
  try{
    if(api?.exportLocalDatabase){
      const res=await api.exportLocalDatabase();
      da412bStatus('da412b-export-status', res?.ok ? `JSON esportato: ${res.filePath}` : 'Esportazione JSON annullata.');
    } else {
      const rows=api?.getAuditHistory ? await api.getAuditHistory(archiveFilters412B()) : [];
      downloadTextFile(`AT-MEC_archivio_${new Date().toISOString().slice(0,10)}.json`, JSON.stringify({exported_at:new Date().toISOString(), filters:archiveFilters412B(), rows}, null, 2), 'application/json');
      da412bStatus('da412b-export-status','JSON scaricato dal browser.');
    }
  }catch(e){ da412bStatus('da412b-export-status','Errore JSON: '+normalizeError(e)); }
}
function clearArchiveFilters412B(){
  ['da412b-serial','da412b-lot','da412b-operator','da412b-recipe','da412b-date-from','da412b-date-to','da412b-backup-label'].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; });
  const r=document.getElementById('da412b-result'); if(r) r.value='ALL';
  const box=document.getElementById('da412b-preview'); if(box) box.innerHTML='<div class="hint">Filtri puliti. Premi Anteprima per visualizzare i dati.</div>';
  loadDataArchiveDashboard412B();
}



// AT-MEC_HM_4.13A - Report multiplo / dossier PDF via stampa browser.
function multiReportOpt412I(id){ return !!document.getElementById(id)?.checked; }
function reportStationLine412I(r){ return [r.station_id, r.station_name, r.station_department, r.station_site].filter(Boolean).join(' · ') || 'N/D'; }
async function generateMultiReportPdf412I(){
  try{
    if(!Array.isArray(auditCache) || !auditCache.length) await loadAudit();
    const rows = Array.isArray(auditCache) ? auditCache.slice().reverse() : [];
    if(!rows.length){ alert('Nessun report filtrato da stampare. Applica i filtri e riprova.'); return; }
    const includeCover=multiReportOpt412I('multi-cover-412i');
    const includeKpi=multiReportOpt412I('multi-kpi-412i');
    const includeSteps=multiReportOpt412I('multi-steps-412i');
    const includeMeasures=multiReportOpt412I('multi-measures-412i');
    const includeRepairs=multiReportOpt412I('multi-repairs-412i');
    const includeSign=multiReportOpt412I('multi-sign-412i');
    const pass=rows.filter(r=>r.final_result==='PASS').length;
    const fail=rows.filter(r=>r.final_result==='FAIL').length;
    const lot=(document.getElementById('audit-lot')?.value||'TUTTI_LOTTI').trim() || 'TUTTI_LOTTI';
    let html='<!doctype html><html><head><meta charset="utf-8"><title>Report multiplo '+escapeHtml(lot)+'</title>'+atmecReportStyle410J()+'</head><body>';
    if(includeCover){
      html+=atmecReportHeader410J('Dossier Report Multiplo','Lotto/Commessa: '+escapeHtml(lot)+' · Report inclusi: '+rows.length);
      html+=`<div class="atmec-print-summary"><div class="atmec-print-card"><b>${rows.length}</b><span>Report</span></div><div class="atmec-print-card"><b>${pass}</b><span>PASS</span></div><div class="atmec-print-card"><b>${fail}</b><span>FAIL</span></div><div class="atmec-print-card"><b>${new Date().toLocaleDateString('it-IT')}</b><span>Generato</span></div></div>`;
      html+='<div style="page-break-after:always"></div>';
    }
    if(includeKpi){
      html+='<h2>Riepilogo KPI</h2><table><thead><tr><th>Totale</th><th>PASS</th><th>FAIL</th><th>Yield</th></tr></thead><tbody><tr><td>'+rows.length+'</td><td class="pass">'+pass+'</td><td class="fail">'+fail+'</td><td>'+ (rows.length?((pass/rows.length)*100).toFixed(1):'0.0') +'%</td></tr></tbody></table>';
    }
    rows.forEach((r,idx)=>{
      html+=`<section style="page-break-before:${idx===0&&!includeCover?'auto':'always'}"><h2>${escapeHtml(r.serial_dut||'N/D')} — ${escapeHtml(r.final_result||'')}</h2>`;
      html+='<table><tbody>'+
        `<tr><th>Data</th><td>${escapeHtml(new Date(r.timestamp).toLocaleString('it-IT'))}</td><th>Ricetta</th><td>${escapeHtml(r.recipe_name||'')} v${escapeHtml(String(r.recipe_version||''))}</td></tr>`+
        `<tr><th>Lotto</th><td>${escapeHtml(r.lot_number||r.work_order||'')}</td><th>Operatore</th><td>${escapeHtml(r.operator||'')}</td></tr>`+
        `<tr><th>Postazione</th><td>${escapeHtml(reportStationLine412I(r))}</td><th>Cliente</th><td>${escapeHtml(r.customer_name||r.customer||'')}</td></tr>`+
        '</tbody></table>';
      if(includeRepairs && r.repair_note) html+=`<h2>Riparazione / Note</h2><p>${escapeHtml(r.repair_note)}</p>`;
      if(includeSteps){
        const steps=Array.isArray(r.steps_log)?r.steps_log:[];
        html+='<h2>Step'+(includeMeasures?' e misure':'')+'</h2><table><thead><tr><th>#</th><th>Tipo</th><th>Valore</th><th>Range</th><th>Origine</th><th>Esito</th></tr></thead><tbody>'+
          steps.map(st=>`<tr><td>${escapeHtml(st.step_id||'')}</td><td>${escapeHtml(st.type||'')}</td><td>${escapeHtml(st.measured ?? '')} ${escapeHtml(st.unit||'')}</td><td>${escapeHtml(st.min ?? '')} → ${escapeHtml(st.max ?? '')}</td><td>${escapeHtml(st.measurement_source||'')} ${escapeHtml(st.measurement_device||'')}</td><td class="${String(st.result||'').toLowerCase()}">${escapeHtml(st.result||'')}</td></tr>`).join('')+
          '</tbody></table>';
      }
      if(includeSign) html+=atmecReportFooter412D();
      html+='</section>';
    });
    html+='</body></html>';
    const previewToolbar=`<div class="atmec-report-preview-toolbar"><b>Anteprima report multiplo</b><span>Controlla il documento, poi usa Stampa/Salva PDF.</span><button onclick="window.print()">🖨️ Stampa / Salva PDF</button></div>`;
    const previewHtml=html.replace('<body>', '<body>'+previewToolbar);
    const w=window.open('', '_blank');
    if(!w){ downloadTextFile('report_multiplo_'+lot+'.html', previewHtml, 'text/html'); return; }
    w.document.write(previewHtml); w.document.close();
  }catch(e){ alert('Errore report multiplo: '+normalizeError(e)); console.error('[AT-MEC 4.13O] report multiplo', e); }
}

// AT-MEC_HM_4.13A - Data Provider Layer / Sync Queue.
// Modulo additivo: default LOCAL FIRST. Non blocca Test Mode se server/SQLite non sono disponibili.
function da412eSetText(id, value){ const el=document.getElementById(id); if(el) el.textContent=String(value ?? ''); }
function da412eSetValue(id, value){ const el=document.getElementById(id); if(el) el.value=String(value ?? ''); }
function da412eSetChecked(id, value){ const el=document.getElementById(id); if(el) el.checked=!!value; }
function da412eStatus(text){ const el=document.getElementById('da412e-sync-status'); if(el) el.textContent=String(text || ''); }
async function loadDataProviderStatus412E(){
  try{
    if(!api?.getDataProviderStatus){ da412eStatus('API Data Provider non disponibile.'); return; }
    const st=await api.getDataProviderStatus();
    da412eSetText('da412e-mode', String(st.mode || 'local_first').toUpperCase());
    da412eSetText('da412e-backend', String(st.localBackend || 'json').toUpperCase());
    da412eSetText('da412e-pending', st.pending || 0);
    da412eSetText('da412e-server', st.serverConfigured ? 'Configurato' : 'Non configurato');
    da412eSetValue('da412f-mode', st.mode || 'local_first');
    da412eSetValue('da412f-server-url', st.serverUrl || '');
    da412eSetValue('da412f-timeout', st.timeoutMs || 5000);
    da412eSetChecked('da412f-server-enabled', !!st.serverEnabled);
    da412eSetValue('da412h-station-id', st.stationId || '');
    da412eSetValue('da412h-station-name', st.stationName || '');
    da412eSetValue('da412i-station-department', st.stationDepartment || '');
    da412eSetValue('da412i-station-site', st.stationSite || '');
    da412eSetValue('da412h-auto-sync-interval', st.autoSyncIntervalSec || 60);
    da412eSetChecked('da412h-auto-sync-enabled', !!st.autoSyncEnabled);
    da412eSetText('da412h-station-status', st.stationId || 'N/D');
    da412eSetText('da412h-auto-sync-status', st.autoSyncEnabled ? `ON / ${st.autoSyncIntervalSec || 60}s` : 'OFF');
    da412eStatus(`${st.message || 'Data Provider pronto.'} · Station: ${st.stationId || 'N/D'} / ${st.stationName || 'N/D'} · ${st.stationDepartment || 'N/D'} · ${st.stationSite || 'N/D'} · Queue: ${st.queuePath || 'N/D'} · DB: ${st.localDbPath || 'N/D'} · Last sync: ${st.lastSyncAt || 'mai'}`);
  }catch(e){
    da412eStatus('Errore stato Data Provider: '+normalizeError(e));
    console.error('[AT-MEC 4.13O] Data Provider status', e);
  }
}
function da412fReadConfig(){
  const serverUrl=(document.getElementById('da412f-server-url')?.value || '').trim();
  const enabled=!!document.getElementById('da412f-server-enabled')?.checked && !!serverUrl;
  return {
    mode: document.getElementById('da412f-mode')?.value || 'local_first',
    server: {
      enabled,
      url: serverUrl,
      timeoutMs: Number(document.getElementById('da412f-timeout')?.value || 5000)
    },
    sync: { enabled: true, localFirst: true },
    station: {
      id: (document.getElementById('da412h-station-id')?.value || '').trim() || 'STATION_01',
      name: (document.getElementById('da412h-station-name')?.value || '').trim() || 'Postazione locale',
      department: (document.getElementById('da412i-station-department')?.value || '').trim() || 'COLLAUDO',
      site: (document.getElementById('da412i-station-site')?.value || '').trim() || 'OSPITALETTO',
      autoSyncEnabled: !!document.getElementById('da412h-auto-sync-enabled')?.checked,
      autoSyncIntervalSec: Number(document.getElementById('da412h-auto-sync-interval')?.value || 60)
    }
  };
}
async function saveDataProviderConfig412F(){
  da412eStatus('Salvataggio configurazione sync...');
  try{
    if(!api?.saveDataProviderConfig){ da412eStatus('API salvataggio configurazione non disponibile.'); return; }
    const st=await api.saveDataProviderConfig(da412fReadConfig());
    da412eStatus('Configurazione salvata. '+(st?.message || ''));
    await loadDataProviderStatus412E();
  }catch(e){
    da412eStatus('Errore salvataggio configurazione: '+normalizeError(e));
    console.error('[AT-MEC 4.13O] Save Data Provider config', e);
  }
}
async function testDataProviderServer412F(){
  const url=(document.getElementById('da412f-server-url')?.value || '').trim();
  if(!url){ da412eStatus('Inserisci URL server, esempio http://localhost:8099'); return; }
  da412eStatus('Verifica server in corso...');
  try{
    if(!api?.testDataProviderServer){ da412eStatus('API verifica server non disponibile.'); return; }
    const res=await api.testDataProviderServer(url);
    da412eStatus(res?.ok ? `Server ONLINE (${res?.message || 'OK'})` : `Server NON raggiungibile: ${res?.message || 'errore'}`);
  }catch(e){
    da412eStatus('Errore verifica server: '+normalizeError(e));
    console.error('[AT-MEC 4.13O] Test server', e);
  }
}
async function syncDataProviderNow412E(){
  da412eStatus('Sincronizzazione in corso...');
  try{
    if(!api?.syncDataProviderNow){ da412eStatus('API sincronizzazione non disponibile.'); return; }
    const res=await api.syncDataProviderNow();
    da412eStatus(`${res?.message || 'Sync completata.'} · synced: ${res?.synced ?? 0} · failed: ${res?.failed ?? 0} · pending: ${res?.pending ?? 0}`);
    await loadDataProviderStatus412E();
  }catch(e){
    da412eStatus('Errore sync: '+normalizeError(e));
    console.error('[AT-MEC 4.13O] Data Provider sync', e);
  }
}

async function refreshSyncQueue412G(){
  const box=document.getElementById('da412g-queue-preview');
  if(box) box.innerHTML='<div class="hint">Caricamento coda sync...</div>';
  try{
    if(!api?.getSyncQueuePreview){ if(box) box.innerHTML='<div class="hint">API coda sync non disponibile.</div>'; return; }
    const res=await api.getSyncQueuePreview(30);
    if(!box) return;
    const items=Array.isArray(res?.items) ? res.items : [];
    if(!items.length){ box.innerHTML='<div class="hint">Coda sync vuota. Nessun record da inviare.</div>'; return; }
    box.innerHTML=items.map(i=>{
      const cls=String(i.status||'').toLowerCase();
      return `<div class="da412g-queue-row ${cls}"><div><b>${escapeHtml(i.type||'record')}</b><span>${escapeHtml(i.payloadSummary||'')}</span>${i.stationId?`<small>Station: ${escapeHtml(i.stationId)}</small>`:''}</div><div><strong>${escapeHtml(i.status||'')}</strong><small>tentativi ${Number(i.attempts||0)}</small></div><div><small>${escapeHtml((i.updatedAt||i.createdAt||'').slice(0,19))}</small>${i.lastError?`<em>${escapeHtml(i.lastError)}</em>`:''}</div></div>`;
    }).join('');
  }catch(e){
    if(box) box.innerHTML='<div class="hint">Errore lettura coda sync: '+escapeHtml(normalizeError(e))+'</div>';
    console.error('[AT-MEC 4.13O] Queue preview', e);
  }
}
async function retryFailedSyncQueue412G(){
  da412eStatus('Retry record FAILED in corso...');
  try{
    if(!api?.retryFailedSyncQueue){ da412eStatus('API retry sync non disponibile.'); return; }
    const res=await api.retryFailedSyncQueue();
    da412eStatus(`${res?.message || 'Retry completato.'} · synced: ${res?.synced ?? 0} · failed: ${res?.failed ?? 0} · pending: ${res?.pending ?? 0}`);
    await loadDataProviderStatus412E();
    await refreshSyncQueue412G();
  }catch(e){ da412eStatus('Errore retry sync: '+normalizeError(e)); console.error('[AT-MEC 4.13O] Retry queue', e); }
}
async function clearSyncedSyncQueue412G(){
  if(!confirm('Rimuovere dalla coda i record già sincronizzati? I dati locali non vengono cancellati.')) return;
  da412eStatus('Pulizia record SYNCED...');
  try{
    if(!api?.clearSyncedSyncQueue){ da412eStatus('API pulizia coda non disponibile.'); return; }
    const res=await api.clearSyncedSyncQueue();
    da412eStatus(`Pulizia completata. Rimossi: ${res?.removed ?? 0}`);
    await loadDataProviderStatus412E();
    await refreshSyncQueue412G();
  }catch(e){ da412eStatus('Errore pulizia coda: '+normalizeError(e)); console.error('[AT-MEC 4.13O] Clear synced', e); }
}


/* AT-MEC_HM_4.13A - sicurezza UI layout e accesso operatore Test Report */
(function(){
  function install412K(){
    if(document.getElementById('atmec-style-412k')) return;
    const st=document.createElement('style'); st.id='atmec-style-412k';
    st.textContent=`
      #topbar .logo, #app-title-logo{font-family:'Segoe UI Black','Arial Black','Orbitron','Segoe UI',sans-serif!important;font-size:25px!important;font-weight:1000!important;letter-spacing:3px!important;text-transform:uppercase!important;color:#7ee7ff!important;text-shadow:0 0 14px rgba(126,231,255,.45),0 2px 0 rgba(0,0,0,.35)!important;}
      #atmec-inspector-358-bar,#atmec-layout-manager-362-panel,#atmec-layout-373-panel,#atmec-inspector-358-pop,#atmec-move-handle-358,#atmec-resize-handle-358,#ui-dev-toggle-336{display:none;}
      body.atmec-can-layout-412k #atmec-inspector-358-bar{display:flex;}
      body.atmec-can-uiids-412k #ui-dev-toggle-336{display:flex;}
      .audit-header-412k{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;}
      .operator-testmode-return-412k{white-space:nowrap;}
      body.atmec-operator-session-412k #sidebar details:not(.main-menu-card details){ }
    `;
    document.head.appendChild(st);
  }
  document.addEventListener('DOMContentLoaded',()=>{install412K(); setTimeout(()=>{ try{ refreshSecurityUi412K(); }catch(_e){} },300);});
})();


/* AT-MEC_HM_4.13A - permessi menu/layout corretti e non distruttivi.
   Scopo: vedere solo i menu autorizzati; Layout Editor visibile ad Admin/Sviluppatore o permessi espliciti.
   Non modifica Test Mode, ricette, hardware, report PDF o sync. */
(function(){
  const VERSION_LABEL_412K_FIX1 = '4.16A';
  function normRole(){ return String(window.atmecCurrentUser412K?.role || currentUser?.role || '').toLowerCase(); }
  function level(){ return Number(window.atmecCurrentUser412K?.level ?? currentUser?.level ?? 0); }
  function perms(){
    const p = window.atmecCurrentUser412K?.permissions || currentUser?.permissions || [];
    return Array.isArray(p) ? p : [];
  }
  function isRoot(){
    const r = normRole();
    return !!(currentUser || window.atmecCurrentUser412K) && (r.includes('admin') || level() >= 100);
  }
  function isDeveloperLike(){
    const r = normRole();
    return !!(currentUser || window.atmecCurrentUser412K) && (r.includes('developer') || r.includes('svilupp') || level() >= 80);
  }
  window.userHasPermission412K = function(permission){
    try { const wanted = permission === 'manage_archive' ? 'manage_data' : permission; return perms().map(p => p === 'manage_archive' ? 'manage_data' : p).includes(wanted); } catch(_e){ return false; }
  };
  window.isAdminOrDeveloper412K = function(){ return isRoot() || isDeveloperLike(); };
  window.canUseLayoutTools412K = function(){
    return userHasPermission412K('edit_layout') || userHasPermission412K('test_elements');
  };
  window.canShowUiIds412K = function(){
    return userHasPermission412K('show_ui_ids');
  };
  function featureAllowed(feature){
    switch(feature){
      case 'run': return userHasPermission412K('run_test');
      case 'report': return userHasPermission412K('view_reports');
      case 'recipe': return userHasPermission412K('edit_recipe');
      case 'hardware': return userHasPermission412K('config_hardware');
      case 'branding': return userHasPermission412K('manage_branding');
      case 'users': return userHasPermission412K('manage_users');
      case 'traceability': return userHasPermission412K('view_traceability');
      case 'kpi': return userHasPermission412K('view_kpi');
      case 'archive': return userHasPermission412K('manage_data');
      case 'layout': return canUseLayoutTools412K();
      case 'uiids': return canShowUiIds412K();
      default: return false;
    }
  }
  window.atmecFeatureAllowed412K_FIX1 = featureAllowed;
  const tabFeatureMap = {
    'run-tab':'run',
    'audit-tab':'report',
    'recipe-tab':'recipe',
    'meter-tab':'hardware','pl303-tab':'hardware','esp32-tab':'hardware','commhub-tab':'hardware','qr-tab':'hardware','flash-tab':'hardware','device-tab':'hardware','settings-tab':'hardware',
    'branding-tab':'branding','users-tab':'users',
    'traceability-tab':'traceability','unit-card-tab':'traceability',
    'database-tab':'kpi','production-analysis-tab':'kpi',
    'data-archive-tab':'archive'
  };
  function canOpenTab(id){ return featureAllowed(tabFeatureMap[id] || 'run'); }
  const oldShowTab = window.showTab || showTab;
  window.showTab = showTab = function(id, btn){
    if(!requireLogin()) return;
    if(!canOpenTab(id)){
      alert('Permesso negato: questo menu non è abilitato per il tuo utente.');
      try { refreshNavigationPermissions412K_FIX1(); } catch(_e){}
      return;
    }
    return oldShowTab(id, btn);
  };
  const oldEnterProductionTestMode = window.enterProductionTestMode || enterProductionTestMode;
  window.enterProductionTestMode = enterProductionTestMode = function(){
    if(!requireLogin()) return;
    if(!featureAllowed('run')){ alert('Permesso negato: modalità test non abilitata.'); return; }
    return oldEnterProductionTestMode();
  };
  function featureFromButton(btn){
    const oc = String(btn.getAttribute('onclick') || '');
    const txt = String(btn.textContent || '').toLowerCase();
    if(oc.includes("run-tab") || oc.includes('enterProductionTestMode') || oc.includes('startTest')) return 'run';
    if(oc.includes("audit-tab") || txt.includes('test report')) return 'report';
    if(oc.includes("recipe-tab")) return 'recipe';
    if(oc.includes("traceability-tab") || oc.includes("unit-card-tab")) return 'traceability';
    if(oc.includes("database-tab") || oc.includes("production-analysis-tab")) return 'kpi';
    if(oc.includes("data-archive-tab")) return 'archive';
    if(oc.includes("pl303-tab") || oc.includes("esp32-tab") || oc.includes("commhub-tab") || oc.includes("qr-tab") || oc.includes("meter-tab") || oc.includes("flash-tab") || oc.includes("device-tab") || oc.includes("settings-tab")) return 'hardware';
    if(oc.includes("branding-tab")) return 'branding';
    if(oc.includes("users-tab")) return 'users';
    return null;
  }
  function setDisplay(el, visible, mode){
    if(!el) return;
    el.hidden = !visible;
    el.style.display = visible ? (mode || '') : 'none';
  }
  function installAuditReturnButton(){
    const audit = document.getElementById('audit-tab');
    if(!audit || document.getElementById('audit-return-testmode-412k-fix1')) return;
    const row = audit.querySelector('.row');
    if(!row) return;
    const b = document.createElement('button');
    b.id = 'audit-return-testmode-412k-fix1';
    b.className = 'btn btn-primary btn-sm operator-testmode-return-412k';
    b.type = 'button';
    b.textContent = '🖥 Torna a Test Mode';
    b.onclick = function(){ enterProductionTestMode(); };
    row.insertBefore(b, row.firstChild);
  }
  function refreshLayoutTools(){
    const canLayout = canUseLayoutTools412K();
    const canIds = canShowUiIds412K();
    document.body.classList.toggle('atmec-can-layout-412k', canLayout);
    document.body.classList.toggle('atmec-can-uiids-412k', canIds);
    document.body.classList.toggle('atmec-operator-session-412k', !!currentUser && !canLayout);
    const bar = document.getElementById('atmec-inspector-358-bar');
    if(bar){
      if(canLayout){ bar.hidden=false; bar.style.display='flex'; }
      else { bar.hidden=true; bar.style.display='none'; }
    }
    ['atmec-layout-manager-362-panel','atmec-layout-373-panel','atmec-inspector-358-pop','atmec-move-handle-358','atmec-resize-handle-358'].forEach(id=>{
      const el=document.getElementById(id); if(el && !canLayout){ el.hidden=true; el.style.display='none'; }
    });
    const dev=document.getElementById('ui-dev-toggle-336');
    if(dev){ dev.hidden=!canIds; dev.style.display=canIds?'flex':'none'; }
    if(!canIds){ try{ clearUiDevLabels336(); document.body.classList.remove('ui-dev-labels-on'); }catch(_e){} }
    if(!canLayout){ try{ document.body.classList.remove('atmec-layout-edit-on','atmec-layout-grid-on'); }catch(_e){} }
  }
  window.refreshNavigationPermissions412K_FIX1 = function(){
    try{
      installAuditReturnButton();
      refreshLayoutTools();
      document.querySelectorAll('#sidebar button.side-nav-btn, #center .tab-bar button.tab-btn').forEach(btn=>{
        const f = featureFromButton(btn);
        if(!f) return;
        setDisplay(btn, featureAllowed(f), btn.classList.contains('tab-btn') ? '' : '');
      });
      document.querySelectorAll('#sidebar details').forEach(det=>{
        const visibleButtons = Array.from(det.querySelectorAll('button')).some(b=>!b.hidden && b.style.display !== 'none');
        setDisplay(det, visibleButtons, '');
      });
      const ret=document.getElementById('audit-return-testmode-412k-fix1');
      if(ret) setDisplay(ret, featureAllowed('run'), '');
      const title=document.querySelector('#sidebar .side-card div[style*="font-size:17px"]');
      if(title){ title.textContent='ATE-MEC HM '+VERSION_LABEL_412K_FIX1; title.style.fontSize='22px'; title.style.fontFamily="'Segoe UI Black','Arial Black','Segoe UI',sans-serif"; title.style.letterSpacing='2px'; }
    }catch(e){ console.warn('[AT-MEC 4.13O] refresh permessi menu', e); }
  };
  window.refreshSecurityUi412K = function(){ refreshNavigationPermissions412K_FIX1(); };
  const oldRefreshRolesUsers = window.refreshRolesUsers || refreshRolesUsers;
  window.refreshRolesUsers = refreshRolesUsers = async function(){
    const r = await oldRefreshRolesUsers.apply(this, arguments);
    try{ refreshNavigationPermissions412K_FIX1(); }catch(_e){}
    return r;
  };
  const oldApplyRoleLevelPreset = window.applyRoleLevelPreset || applyRoleLevelPreset;
  window.applyRoleLevelPreset = applyRoleLevelPreset = function(){
    try { oldApplyRoleLevelPreset.apply(this, arguments); } catch(_e){}
    const level = parseInt(document.getElementById('new-role-level')?.value || '10', 10);
    const extra = {
      view_reports: level >= 10,
      view_traceability: level >= 30,
      view_kpi: level >= 60,
      manage_data: level >= 60
    };
    Object.keys(extra).forEach(k=>{ const ch=document.querySelector('.perm-check[value="'+k+'"]'); if(ch) ch.checked=!!extra[k]; });
  };
  document.addEventListener('DOMContentLoaded', function(){
    setTimeout(refreshNavigationPermissions412K_FIX1, 250);
    setTimeout(refreshNavigationPermissions412K_FIX1, 900);
    setInterval(refreshLayoutTools, 1500);
  });
})();


/* AT-MEC_HM_4.13A - Storico Seriali & Scheda Unità Enterprise
   Patch additiva: non modifica Test Mode, motore ricette, hardware, Layout Editor o Sync. */
(function(){
  'use strict';
  const VERSION_413A = '4.13A';
  function v413(v){ return String(v ?? '').trim(); }
  function norm413(v){ return v413(v).toLowerCase(); }
  function uniq413(arr){ return Array.from(new Set((arr||[]).map(v=>v413(v)).filter(Boolean))); }
  function stationId413(r){ return v413(r?.station_id || r?.stationId || r?.station || r?.test_station_id || r?.station_code); }
  function stationName413(r){ return v413(r?.station_name || r?.stationName || r?.test_station_name || r?.station_label); }
  function stationLine413(r){ return [stationId413(r), stationName413(r), v413(r?.station_department || r?.department), v413(r?.station_site || r?.site)].filter(Boolean).join(' · ') || '-'; }
  function customerLine413(r){ return v413(r?.customer_name || r?.customer || r?.client || r?.cliente || r?.recipe_customer); }
  function firmwareLine413(r){ return v413(r?.firmware || r?.firmware_version || r?.fw_version || r?.dut_firmware); }
  function reportPath413(r){ return v413(r?.report_path || r?.pdf_path || r?.certificate_path || r?.reportFile || r?.filePath); }
  function firstLast413(rows){ const a=(rows||[]).slice().sort((x,y)=>new Date(x.timestamp||0)-new Date(y.timestamp||0)); return { first:a[0]||null, last:a[a.length-1]||null, sorted:a }; }
  function entItem413(label, value){ return `<div class="trace-enterprise-item"><span>${escapeHtml(label)}</span><b>${escapeHtml(value || '-')}</b></div>`; }
  function reportsHtml413(rows){
    const reps=uniq413((rows||[]).map(reportPath413)).slice(0,12);
    if(!reps.length) return 'N/D';
    return reps.map((p,i)=>`<span class="trace-report-chip">PDF ${i+1}: ${escapeHtml(p.split(/[\\/]/).pop() || p)}</span>`).join(' ');
  }
  function updateTraceEnterprise413A(tests, repairs, filters){
    const box=document.getElementById('trace-enterprise-summary');
    if(!box) return;
    const fl=firstLast413(tests);
    const stationInput=v413(document.getElementById('trace-station-input')?.value);
    const customers=uniq413((tests||[]).map(customerLine413));
    const recipes=uniq413((tests||[]).map(r=>[r.recipe_name, r.recipe_version ? 'v'+r.recipe_version : ''].filter(Boolean).join(' ')));
    const operators=uniq413((tests||[]).map(r=>r.operator));
    const stations=uniq413((tests||[]).map(stationLine413));
    const firmwares=uniq413((tests||[]).map(firmwareLine413));
    box.innerHTML=[
      entItem413('Cliente', customers.slice(0,3).join(' / ') || 'N/D'),
      entItem413('Ricette', recipes.slice(0,3).join(' / ') || 'N/D'),
      entItem413('Operatori', operators.slice(0,4).join(' / ') || 'N/D'),
      entItem413('Postazioni', stations.slice(0,4).join(' / ') || (stationInput || 'N/D')),
      entItem413('Firmware', firmwares.slice(0,4).join(' / ') || 'N/D'),
      entItem413('Primo test', fl.first ? traceabilityDate411(fl.first.timestamp) : 'N/D'),
      entItem413('Ultimo test', fl.last ? traceabilityDate411(fl.last.timestamp) : 'N/D'),
      entItem413('Report associati', reportsHtml413(tests))
    ].join('');
  }
  function updateUnitEnterprise413A(cache){
    const box=document.getElementById('unit-enterprise-box');
    if(!box) return;
    const tests=cache?.tests || [];
    const repairs=cache?.repairs || [];
    const fl=firstLast413(tests);
    const customers=uniq413(tests.map(customerLine413));
    const stations=uniq413(tests.map(stationLine413));
    const operators=uniq413(tests.map(r=>r.operator));
    const firmwares=uniq413(tests.map(firmwareLine413));
    box.innerHTML=[
      entItem413('Cliente', customers.slice(0,3).join(' / ') || 'N/D'),
      entItem413('Ultima postazione', fl.last ? stationLine413(fl.last) : (stations[0] || 'N/D')),
      entItem413('Station ID', fl.last ? (stationId413(fl.last)||'N/D') : 'N/D'),
      entItem413('Operatori', operators.slice(0,4).join(' / ') || 'N/D'),
      entItem413('Firmware storico', firmwares.slice(0,4).join(' / ') || cache?.firmware || 'N/D'),
      entItem413('Test / Retest', `${tests.length} / ${Math.max(0, tests.length-1)}`),
      entItem413('Riparazioni', String(repairs.length || 0)),
      entItem413('Report associati', reportsHtml413(tests))
    ].join('');
  }
  const oldFilters = window.traceabilityFilters411 || traceabilityFilters411;
  window.traceabilityFilters411 = traceabilityFilters411 = function(){
    const f = oldFilters();
    f.station = v413(document.getElementById('trace-station-input')?.value);
    return f;
  };
  const oldApply = window.traceabilityApplyLocalFilters411 || traceabilityApplyLocalFilters411;
  window.traceabilityApplyLocalFilters411 = traceabilityApplyLocalFilters411 = function(rows, filters){
    let out = oldApply(rows, filters);
    const station = norm413(filters?.station);
    if(station){ out = (out||[]).filter(r=>norm413(stationLine413(r)).includes(station) || norm413(stationId413(r)).includes(station) || norm413(stationName413(r)).includes(station)); }
    return out;
  };
  const oldClear = window.clearTraceabilitySerialPage || clearTraceabilitySerialPage;
  window.clearTraceabilitySerialPage = clearTraceabilitySerialPage = function(){
    const r = oldClear.apply(this, arguments);
    const st=document.getElementById('trace-station-input'); if(st) st.value='';
    const box=document.getElementById('trace-enterprise-summary'); if(box) box.innerHTML='<div class="hint">Esegui una ricerca per vedere cliente, ricette, operatori, postazioni e report associati.</div>';
    return r;
  };
  const oldLoadTrace = window.loadTraceabilitySerialHistory || loadTraceabilitySerialHistory;
  window.loadTraceabilitySerialHistory = loadTraceabilitySerialHistory = async function(){
    const r = await oldLoadTrace.apply(this, arguments);
    try{ const c=traceabilitySerialCache410D; updateTraceEnterprise413A(c?.history?.tests||[], c?.history?.repairs||[], c?.filters||{}); }catch(e){ console.warn('[AT-MEC 4.13O] update trace enterprise', e); }
    return r;
  };
  const oldLoadUnit = window.loadUnitGenealogy410E || loadUnitGenealogy410E;
  window.loadUnitGenealogy410E = loadUnitGenealogy410E = async function(){
    const r = await oldLoadUnit.apply(this, arguments);
    try{ updateUnitEnterprise413A(unitGenealogyCache410E); }catch(e){ console.warn('[AT-MEC 4.13O] update unit enterprise', e); }
    return r;
  };
  const oldClearUnit = window.clearUnitCard410E || clearUnitCard410E;
  window.clearUnitCard410E = clearUnitCard410E = function(){
    const r = oldClearUnit.apply(this, arguments);
    const box=document.getElementById('unit-enterprise-box'); if(box) box.innerHTML='<div class="hint">Carica una scheda unità per vedere cliente, postazione, firmware, operatori e report associati.</div>';
    return r;
  };
  window.generateUnitDossier413A = function(){
    try{
      const serial=v413(document.getElementById('unit-serial-input')?.value || document.getElementById('trace-serial-input')?.value || unitGenealogyCache410E?.serial || traceabilitySerialCache410D?.serial);
      if(!serial){ alert('Inserisci o cerca prima un seriale.'); return; }
      if(!unitGenealogyCache410E || unitGenealogyCache410E.serial !== serial){
        if(document.getElementById('unit-serial-input')) document.getElementById('unit-serial-input').value=serial;
        loadUnitGenealogy410E().then(()=>setTimeout(()=>window.generateUnitDossier413A(),120));
        return;
      }
      const c=unitGenealogyCache410E;
      const tests=c?.tests || [];
      const repairs=c?.repairs || [];
      const fl=firstLast413(tests);
      let html='<!doctype html><html><head><meta charset="utf-8"><title>Dossier unità '+escapeHtml(serial)+'</title>'+atmecReportStyle410J()+'</head><body>';
      html+=atmecReportHeader410J('Dossier completo unità', `<b>Seriale:</b> ${escapeHtml(serial)} &nbsp; <b>Lotto:</b> ${escapeHtml(c?.lot||'-')} &nbsp; <b>Ultimo esito:</b> ${escapeHtml(c?.lastResult||'N/D')}`);
      html+='<h2>Identità e tracciabilità</h2><table><tbody>'+
        `<tr><th>Cliente</th><td>${escapeHtml(uniq413(tests.map(customerLine413)).join(' / ')||'N/D')}</td><th>Postazioni</th><td>${escapeHtml(uniq413(tests.map(stationLine413)).join(' / ')||'N/D')}</td></tr>`+
        `<tr><th>Firmware</th><td>${escapeHtml(uniq413(tests.map(firmwareLine413)).join(' / ')||c?.firmware||'-')}</td><th>Operatori</th><td>${escapeHtml(uniq413(tests.map(r=>r.operator)).join(' / ')||'N/D')}</td></tr>`+
        `<tr><th>Primo test</th><td>${escapeHtml(fl.first?unitDate410E(fl.first.timestamp):'-')}</td><th>Ultimo test</th><td>${escapeHtml(fl.last?unitDate410E(fl.last.timestamp):'-')}</td></tr>`+
        `<tr><th>Report associati</th><td colspan="3">${reportsHtml413(tests)}</td></tr>`+
        '</tbody></table>';
      html+='<h2>Timeline test</h2><table><thead><tr><th>#</th><th>Data</th><th>Esito</th><th>Ricetta</th><th>Lotto</th><th>Operatore</th><th>Postazione</th><th>Nota</th></tr></thead><tbody>';
      html+=tests.map((r,i)=>`<tr><td>${i+1}</td><td>${escapeHtml(unitDate410E(r.timestamp))}</td><td class="${String(r.final_result||'').toLowerCase()}">${escapeHtml(r.final_result||'')}</td><td>${escapeHtml(r.recipe_name||'')} ${r.recipe_version?'v'+escapeHtml(r.recipe_version):''}</td><td>${escapeHtml(r.lot_number||r.work_order||'')}</td><td>${escapeHtml(r.operator||'')}</td><td>${escapeHtml(stationLine413(r))}</td><td>${escapeHtml(r.repair_note||'')}</td></tr>`).join('') || '<tr><td colspan="8">Nessun test.</td></tr>';
      html+='</tbody></table><h2>Riparazioni</h2><table><thead><tr><th>#</th><th>Data</th><th>Lotto</th><th>Operatore</th><th>Intervento</th></tr></thead><tbody>';
      html+=repairs.map((r,i)=>`<tr><td>${i+1}</td><td>${escapeHtml(unitDate410E(r.timestamp))}</td><td>${escapeHtml(r.lot_number||r.work_order||'')}</td><td>${escapeHtml(r.operator||'')}</td><td>${escapeHtml(r.repair_note||'')}</td></tr>`).join('') || '<tr><td colspan="5">Nessuna riparazione.</td></tr>';
      html+=`</tbody></table>${atmecReportFooter412D()}</body></html>`;
      const w=window.open('', '_blank');
      if(!w){ downloadTextFile(`dossier_unita_${serial}.html`, html, 'text/html'); return; }
      w.document.write(html); w.document.close(); setTimeout(()=>{ try{ w.print(); }catch{} },450);
    }catch(e){ alert('Errore dossier unità: '+normalizeError(e)); console.error('[AT-MEC 4.13O] dossier', e); }
  };
  const oldPrintTrace = window.printTraceabilitySerialHistory || printTraceabilitySerialHistory;
  window.printTraceabilitySerialHistory = printTraceabilitySerialHistory = function(){
    // Mantiene il report esistente; il dossier completo è disponibile dal nuovo pulsante.
    return oldPrintTrace.apply(this, arguments);
  };
})();


// AT-MEC_HM_4.13O_LAYOUTFIX1 - UI postazione, filtri cliente/ricetta, loghi cliente, firme e Sync in Impostazioni.
(function(){
  'use strict';
  const VERSION_413B='4.16A';
  const LS_CUSTOMERS='atmec_customer_logos_413b';
  const LS_SIGNATURES='atmec_doc_signatures_413b';
  function qs(id){ return document.getElementById(id); }
  function esc(v){ try{return escapeHtml(String(v ?? ''));}catch{return String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));} }
  function readJson(key, fallback){ try{return JSON.parse(localStorage.getItem(key)||'') || fallback;}catch{return fallback;} }
  function writeJson(key, value){ try{localStorage.setItem(key, JSON.stringify(value));}catch{} }
  function currentUserLabel(){ const u=window.atmecCurrentUser412K || (typeof currentUser!=='undefined'?currentUser:null) || {}; return u.operator || u.username || u.name || 'N/D'; }
  function currentRoleLabel(){ const u=window.atmecCurrentUser412K || (typeof currentUser!=='undefined'?currentUser:null) || {}; return u.role || 'N/D'; }
  function stationValues(){
    const factory = readJson('atmec_factory_config_418b', {}) || {};
    const factoryId = (factory.stationId || factory.id || '').trim();
    const factoryName = (factory.stationName || factory.name || '').trim();
    const factoryDep = (factory.line || factory.department || '').trim();
    const factorySite = (factory.plant || factory.site || '').trim();
    const statusText = (qs('da412h-station-status')?.textContent || '').trim();
    const id=(factoryId || qs('da412h-station-id')?.value || localStorage.getItem('atmec_station_id_413b') || (statusText && statusText !== 'N/D' ? statusText : '') || 'N/D').trim();
    const name=(factoryName || qs('da412h-station-name')?.value || localStorage.getItem('atmec_station_name_413b') || 'Postazione locale').trim();
    const dep=(factoryDep || qs('da412i-station-department')?.value || localStorage.getItem('atmec_station_department_413b') || '').trim();
    const site=(factorySite || qs('da412i-station-site')?.value || localStorage.getItem('atmec_station_site_413b') || '').trim();
    if(id && id!=='N/D') localStorage.setItem('atmec_station_id_413b', id);
    if(name) localStorage.setItem('atmec_station_name_413b', name);
    if(dep) localStorage.setItem('atmec_station_department_413b', dep);
    if(site) localStorage.setItem('atmec_station_site_413b', site);
    return {id,name,dep,site};
  }
  function ensureTopBar413B(){
    if(qs('atmec-top-station-bar-413b')) return;
    const center=qs('center'); if(!center) return;
    const bar=document.createElement('div');
    bar.id='atmec-top-station-bar-413b';
    bar.className='atmec-top-station-bar-413b';
    bar.innerHTML='<div class="atmec-app-title-413b">ATE-MEC HM</div><div class="atmec-top-meta-413b"><span class="atmec-top-pill-413b">Versione <b id="top-version-413b">4.13O</b></span><span class="atmec-top-pill-413b">Station <b id="top-station-id-413b">N/D</b></span><span class="atmec-top-pill-413b">Postazione <b id="top-station-name-413b">N/D</b></span><span class="atmec-top-pill-413b">Utente <b id="top-user-413b">N/D</b></span></div>';
    center.insertBefore(bar, center.firstChild);
  }
  function updateTopBar413B(){
    if (typeof window.updateTopBar413C === 'function') return window.updateTopBar413C();
    ensureTopBar413B();
    const st=stationValues();
    const set=(id,v)=>{const e=qs(id); if(e) e.textContent=v||'N/D';};
    set('top-version-413b', VERSION_413B);
    set('top-station-id-413b', st.id || 'N/D');
    set('top-station-name-413b', st.name || 'N/D');
    set('top-user-413b', `${currentUserLabel()} / ${currentRoleLabel()}`);
  }
  function ensureMenuButton413B(groupSummaryText, buttonHtml, marker){
    if(document.body.innerHTML.includes(marker)) return;
    const details=[...document.querySelectorAll('#sidebar details')].find(d=>(d.querySelector('summary')?.textContent||'').includes(groupSummaryText));
    if(details) details.insertAdjacentHTML('beforeend', buttonHtml);
  }
  function ensureMenus413B(){
    ensureMenuButton413B('Ricette', '<button class="btn btn-ghost btn-sm side-nav-btn submenu-btn" data-marker="customers-logos-413b" onclick="showTab(\'customers-logos-tab\', null); renderCustomersLogos413B()">🏢 Clienti & Loghi</button>', 'customers-logos-413b');
    ensureMenuButton413B('Impostazioni', '<button class="btn btn-ghost btn-sm side-nav-btn submenu-btn" data-marker="signature-settings-413b" onclick="showTab(\'signature-settings-tab\', null); loadSignatureSettings413B()">✍️ Firme documenti</button>', 'signature-settings-413b');
    ensureMenuButton413B('Impostazioni', '<button class="btn btn-ghost btn-sm side-nav-btn submenu-btn" data-marker="sync-settings-413b" onclick="showTab(\'sync-settings-tab\', null); initSyncSettings413B()">🔄 Data Provider & Sync</button>', 'sync-settings-413b');
  }
  function ensureTab413B(id, html){
    if(qs(id)) return;
    const center=qs('center'); if(!center) return;
    center.insertAdjacentHTML('beforeend', html);
  }
  function ensureTabs413B(){
    ensureTab413B('customers-logos-tab', '<div id="customers-logos-tab" class="tab-content"><div class="recipe-big-card"><h3>🏢 Clienti & Loghi</h3><div class="hint">Associa logo e cliente alle ricette. Cartella consigliata: <b>assets/customers/CLIENTE.png</b>.</div><div class="recipe-page-toolbar"><div class="col"><label>Cliente</label><input id="cl413b-client" placeholder="es. SADEL"></div><div class="col"><label>Logo cliente</label><input id="cl413b-logo" placeholder="assets/customers/SADEL.png"></div><div class="col"><label>Ricetta</label><select id="cl413b-recipe"><option value="">Tutte / nessuna</option></select></div></div><div class="row" style="margin:8px 0;"><button class="btn btn-success btn-sm" onclick="saveCustomerLogo413B()">💾 Salva</button><button class="btn btn-ghost btn-sm" onclick="applyCustomerLogoToRecipe413B()">🔗 Applica alla ricetta aperta</button><button class="btn btn-ghost btn-sm" onclick="renderCustomersLogos413B()">🔄 Aggiorna</button></div><div id="cl413b-list" class="log-list" style="min-height:160px;"><div class="hint">Nessun cliente configurato.</div></div></div></div>');
    ensureTab413B('sync-settings-tab', '<div id="sync-settings-tab" class="tab-content"><div class="recipe-big-card"><h3>🔄 Data Provider & Sync</h3><div class="hint">Configurazione spostata sotto Impostazioni. Il pannello resta lo stesso, viene solo visualizzato qui.</div><div id="sync-settings-host-413b"><div class="hint">Caricamento pannello sync...</div></div></div></div>');
    ensureTab413B('signature-settings-tab', '<div id="signature-settings-tab" class="tab-content"><div class="recipe-big-card"><h3>✍️ Firme documenti</h3><div class="hint">Firma operatore automatica da login e firma qualità tramite credenziali autorizzate.</div><div class="recipe-page-toolbar"><div class="col"><label>Codice operatore corrente</label><input id="sig413b-operator-code" placeholder="automatico da login"></div><div class="col"><label>Firma operatore</label><input id="sig413b-operator-sign" placeholder="nome/codice firma"></div><div class="col"><label>Utente qualità</label><input id="sig413b-quality-user" placeholder="utente qualità/admin"></div><div class="col"><label>Password qualità</label><input id="sig413b-quality-pass" type="password" placeholder="password"></div></div><div class="row" style="margin:8px 0;"><button class="btn btn-success btn-sm" onclick="saveOperatorSignature413B()">💾 Salva firma operatore</button><button class="btn btn-primary btn-sm" onclick="verifyQualitySignature413B()">🔐 Firma qualità</button><button class="btn btn-ghost btn-sm" onclick="loadSignatureSettings413B()">🔄 Aggiorna</button></div><div id="sig413b-status" class="hint">Firma documenti pronta.</div></div></div>');
  }
  function moveSyncPanel413B(){
    const host=qs('sync-settings-host-413b'); if(!host) return;
    const card=document.querySelector('.da412e-sync-card');
    if(card && !host.contains(card)) { host.innerHTML=''; host.appendChild(card); }
  }
  async function recipeNames413B(){ try{return api?.listRecipes ? (await api.listRecipes()) : [];}catch{return [];} }
  async function populateRecipeSelects413B(){
    const names=await recipeNames413B();
    const opts='<option value="">Tutte</option>'+names.map(n=>`<option value="${esc(n)}">${esc(n)}</option>`).join('');
    ['trace-recipe-input','cl413b-recipe'].forEach(id=>{ const el=qs(id); if(el && el.tagName==='SELECT') { const cur=el.value; el.innerHTML=opts; if(cur) el.value=cur; }});
  }
  function customerFromRow413B(r){ return String(r?.customer_name||r?.customer||r?.client||r?.cliente||r?.recipe_customer||'').trim(); }
  async function populateCustomerFilter413B(){
    const sel=qs('trace-client-input'); if(!sel) return;
    let customers=[];
    try{ const rows=api?.getAuditHistory ? await api.getAuditHistory({}) : []; customers=[...new Set((rows||[]).map(customerFromRow413B).filter(Boolean))]; }catch{}
    const cfg=readJson(LS_CUSTOMERS, []); customers=[...new Set([...customers, ...cfg.map(x=>x.client).filter(Boolean)])].sort();
    const cur=sel.value; sel.innerHTML='<option value="">Tutti</option>'+customers.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join(''); if(cur) sel.value=cur;
  }
  window.renderCustomersLogos413B = async function(){
    ensureTabs413B(); await populateRecipeSelects413B();
    const list=qs('cl413b-list'); if(!list) return;
    const cfg=readJson(LS_CUSTOMERS, []);
    list.innerHTML = cfg.length ? cfg.map((x,i)=>`<div class="customer-logo-row-413b"><b>${esc(x.client)}</b><span>${esc(x.logo)}</span><span>${esc(x.recipe||'Tutte')}</span><button class="btn btn-danger btn-sm" onclick="deleteCustomerLogo413B(${i})">Elimina</button></div>`).join('') : '<div class="hint">Nessun cliente configurato.</div>';
  };
  window.saveCustomerLogo413B=function(){
    const client=(qs('cl413b-client')?.value||'').trim(); const logo=(qs('cl413b-logo')?.value||'').trim(); const recipeName=(qs('cl413b-recipe')?.value||'').trim();
    if(!client || !logo){ alert('Inserisci Cliente e Logo cliente.'); return; }
    const cfg=readJson(LS_CUSTOMERS, []).filter(x=>!(String(x.client).toLowerCase()===client.toLowerCase() && String(x.recipe||'')===recipeName));
    cfg.push({client, logo, recipe: recipeName, updatedAt:new Date().toISOString()}); writeJson(LS_CUSTOMERS, cfg); localStorage.setItem('atmec_last_recipe_customer_logo', logo); localStorage.setItem('atmec_last_recipe_client', client); renderCustomersLogos413B(); populateCustomerFilter413B();
  };
  window.deleteCustomerLogo413B=function(i){ const cfg=readJson(LS_CUSTOMERS, []); cfg.splice(i,1); writeJson(LS_CUSTOMERS,cfg); renderCustomersLogos413B(); populateCustomerFilter413B(); };
  window.applyCustomerLogoToRecipe413B=function(){
    const client=(qs('cl413b-client')?.value||'').trim(); const logo=(qs('cl413b-logo')?.value||'').trim();
    if(!client || !logo){ alert('Seleziona cliente e logo.'); return; }
    if(qs('recipe-client-page')) qs('recipe-client-page').value=client;
    if(qs('recipe-customer-logo-page')) qs('recipe-customer-logo-page').value=logo;
    try{ syncRecipeClient(client); syncRecipeCustomerLogo(logo); }catch{}
    alert('Cliente/logo applicati alla ricetta aperta. Salva la ricetta per renderli permanenti.');
  };
  function getSig413B(){ return readJson(LS_SIGNATURES, {}); }
  function setSig413B(v){ writeJson(LS_SIGNATURES, v); }
  window.loadSignatureSettings413B=function(){
    const s=getSig413B();
    if(qs('sig413b-operator-code')) qs('sig413b-operator-code').value=s.operatorCode || currentUserLabel();
    if(qs('sig413b-operator-sign')) qs('sig413b-operator-sign').value=s.operatorSignature || currentUserLabel();
    const st=qs('sig413b-status'); if(st) st.innerHTML=`Firma operatore: <span class="signature-chip-413b">${esc(s.operatorSignature||currentUserLabel())}</span> Firma qualità: <span class="signature-chip-413b">${esc(s.qualityUser||'non firmato')}</span>`;
  };
  window.saveOperatorSignature413B=function(){ const s=getSig413B(); s.operatorCode=(qs('sig413b-operator-code')?.value||currentUserLabel()).trim(); s.operatorSignature=(qs('sig413b-operator-sign')?.value||currentUserLabel()).trim(); s.updatedAt=new Date().toISOString(); setSig413B(s); loadSignatureSettings413B(); };
  window.verifyQualitySignature413B=async function(){
    const user=(qs('sig413b-quality-user')?.value||'').trim(); const pass=qs('sig413b-quality-pass')?.value||'';
    if(!user||!pass){ alert('Inserisci credenziali qualità.'); return; }
    try{
      const res=api?.verifyUserCredentials ? await api.verifyUserCredentials(user, pass) : (api?.userLogin ? await api.userLogin(user, pass) : {ok:false,error:'API login non disponibile'});
      if(!res?.ok){ qs('sig413b-status').textContent='❌ Credenziali non valide'; return; }
      const role=String(res.role||'').toLowerCase(); const level=Number(res.level||0); const perms=res.permissions||[];
      const ok=role.includes('admin')||role.includes('quality')||role.includes('qual')||role.includes('responsabile')||level>=60||perms.includes('sign_quality')||perms.includes('firma_qualita');
      if(!ok){ qs('sig413b-status').textContent='❌ Utente valido ma non autorizzato alla firma qualità'; return; }
      const s=getSig413B(); s.qualityUser=res.operator||user; s.qualityRole=res.role||''; s.qualitySignedAt=new Date().toISOString(); setSig413B(s); loadSignatureSettings413B();
    }catch(e){ qs('sig413b-status').textContent='❌ Errore firma qualità: '+(e.message||e); }
  };
  window.initSyncSettings413B=function(){ ensureTabs413B(); moveSyncPanel413B(); try{ loadDataProviderStatus412E(); }catch{} updateTopBar413B(); };
  // Estende filtri storico con cliente.
  const oldFilters=window.traceabilityFilters411 || (typeof traceabilityFilters411==='function'?traceabilityFilters411:null);
  if(oldFilters){ window.traceabilityFilters411 = traceabilityFilters411 = function(){ const f=oldFilters(); f.customer=(qs('trace-client-input')?.value||'').trim(); return f; }; }
  const oldApply=window.traceabilityApplyLocalFilters411 || (typeof traceabilityApplyLocalFilters411==='function'?traceabilityApplyLocalFilters411:null);
  if(oldApply){ window.traceabilityApplyLocalFilters411 = traceabilityApplyLocalFilters411 = function(rows, filters){ let out=oldApply(rows, filters); const c=String(filters?.customer||'').toLowerCase(); if(c){ out=(out||[]).filter(r=>customerFromRow413B(r).toLowerCase().includes(c)); } return out; }; }
  // arricchisce report footer/firme senza sostituire il report funzionante
  const oldFooter=window.atmecReportFooter412D || (typeof atmecReportFooter412D==='function'?atmecReportFooter412D:null);
  if(oldFooter){ window.atmecReportFooter412D = atmecReportFooter412D = function(){ const s=getSig413B(); return oldFooter()+`<div class="report-signature-413b"><b>Firma operatore:</b> ${esc(s.operatorSignature||currentUserLabel())} &nbsp; <b>Codice:</b> ${esc(s.operatorCode||currentUserLabel())}<br><b>Firma qualità:</b> ${esc(s.qualityUser||'________________')} ${s.qualitySignedAt?'· '+esc(new Date(s.qualitySignedAt).toLocaleString('it-IT')):''}</div>`; }; }
  // Agganci leggeri su salvataggio data provider per aggiornare la barra.
  const oldSaveDp=window.saveDataProviderConfig412E || (typeof saveDataProviderConfig412E==='function'?saveDataProviderConfig412E:null);
  if(oldSaveDp){ window.saveDataProviderConfig412E = saveDataProviderConfig412E = async function(){ const r=await oldSaveDp.apply(this, arguments); updateTopBar413B(); return r; }; }
  // Init
  function init413B(){ ensureTopBar413B(); ensureMenus413B(); ensureTabs413B(); updateTopBar413B(); populateRecipeSelects413B(); populateCustomerFilter413B(); loadSignatureSettings413B(); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', init413B); else init413B();
  setInterval(()=>{ try{ updateTopBar413B(); }catch{} }, 2000);
  setTimeout(()=>{ try{ init413B(); }catch{} }, 700);
})();

// AT-MEC_HM_4.13O - Clienti/Branding, Firme qualità, Sync UI ordinato su base 4.13O_LAYOUTFIX1.
(function(){
  'use strict';
  const VERSION_413C = '4.16A';
  const LS_CUSTOMERS = 'atmec_customer_logos_413b';
  function cleanupMissingCoboCustomerLogo413F(){
    try{
      const arr=readJson(LS_CUSTOMERS, []);
      if(Array.isArray(arr)){
        const clean=arr.filter(x=>!String(x?.logo||'').toLowerCase().includes('assets/customers/cobo.png') && !String(x?.logo||'').toLowerCase().endsWith('/cobo.png'));
        if(clean.length!==arr.length) writeJson(LS_CUSTOMERS, clean);
      }
      if(String(localStorage.getItem('atmec_last_recipe_customer_logo')||'').toLowerCase().includes('cobo.png')) localStorage.removeItem('atmec_last_recipe_customer_logo');
    }catch(_e){}
  }
  cleanupMissingCoboCustomerLogo413F();
  const LS_SIGNATURES = 'atmec_doc_signatures_413b';
  const LS_REPORT = 'atmec_report_options_413c';
  const LS_USER_SIG = 'atmec_user_signatures_413c';
  function qs(id){ return document.getElementById(id); }
  function esc(v){ return String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function readJson(key, fallback){ try{return JSON.parse(localStorage.getItem(key)||'') || fallback;}catch{return fallback;} }
  function writeJson(key, value){ try{localStorage.setItem(key, JSON.stringify(value));}catch{} }
  function currentUserObj(){ try{return window.atmecCurrentUser412K || (typeof currentUser !== 'undefined' ? currentUser : null) || {};}catch{return {};} }
  function currentUserLabel(){ const u=currentUserObj(); return u.operator || u.displayName || u.username || u.name || 'N/D'; }
  function currentRoleLabel(){ const u=currentUserObj(); return u.role || 'N/D'; }
  function getReportOptions(){ return Object.assign({operatorSignature:true, qualitySignature:true, customerLogo:true, mecLogo:true, mirzaLogo:true, station:true}, readJson(LS_REPORT, {})); }
  function saveReportOptionsFromUi(){
    const opt={
      operatorSignature: !!qs('rs413c-operator')?.checked,
      qualitySignature: !!qs('rs413c-quality')?.checked,
      customerLogo: !!qs('rs413c-customer-logo')?.checked,
      mecLogo: !!qs('rs413c-mec-logo')?.checked,
      mirzaLogo: !!qs('rs413c-mirza-logo')?.checked,
      station: !!qs('rs413c-station')?.checked
    };
    writeJson(LS_REPORT, opt);
    const st=qs('sig413b-status')||qs('sig413c-status'); if(st) st.textContent='✅ Opzioni report salvate.';
  }
  function stationValues(){
    const factory = readJson('atmec_factory_config_418b', {}) || {};
    const factoryId = (factory.stationId || factory.id || '').trim();
    const factoryName = (factory.stationName || factory.name || '').trim();
    const factoryDep = (factory.line || factory.department || '').trim();
    const factorySite = (factory.plant || factory.site || '').trim();
    const statusText = (qs('da412h-station-status')?.textContent || '').trim();
    const id=(factoryId || qs('da412h-station-id')?.value || localStorage.getItem('atmec_station_id_413b') || (statusText && statusText !== 'N/D' ? statusText : '') || 'N/D').trim();
    const name=(factoryName || qs('da412h-station-name')?.value || localStorage.getItem('atmec_station_name_413b') || 'Postazione locale').trim();
    const dep=(factoryDep || qs('da412i-station-department')?.value || localStorage.getItem('atmec_station_department_413b') || '').trim();
    const site=(factorySite || qs('da412i-station-site')?.value || localStorage.getItem('atmec_station_site_413b') || '').trim();
    if(id && id!=='N/D') localStorage.setItem('atmec_station_id_413b', id);
    if(name) localStorage.setItem('atmec_station_name_413b', name);
    if(dep) localStorage.setItem('atmec_station_department_413b', dep);
    if(site) localStorage.setItem('atmec_station_site_413b', site);
    return {id,name,dep,site};
  }
  function cleanupTopBars413D(){
    const bars=[...document.querySelectorAll('#atmec-top-station-bar-413b,#atmec-top-station-bar-413c,.atmec-top-station-bar-413b,.atmec-top-station-bar-413c,[data-atmec-auto-id*="atmec-top-station-bar-413"]')];
    if(bars.length<=1) return bars[0]||null;
    let keep=bars.find(b=>b.id==='atmec-top-station-bar-413b') || bars[0];
    bars.forEach(b=>{ if(b!==keep) b.remove(); });
    return keep;
  }
  function ensureTopBar413C(){
    const center=qs('center'); if(!center) return;
    let bar=cleanupTopBars413D() || qs('atmec-top-station-bar-413b') || qs('atmec-top-station-bar-413c');
    if(!bar){ bar=document.createElement('div'); center.insertBefore(bar, center.firstChild); }
    // Manteniamo l'ID 413B: l'intervallo legacy updateTopBar413B lo cerca e così non ricrea barre duplicate.
    bar.id='atmec-top-station-bar-413b';
    bar.className='atmec-top-station-bar-413b atmec-top-station-bar-413c';
    if(bar.parentElement!==center) center.insertBefore(bar, center.firstChild);
    bar.innerHTML=`<div class="atmec-brand-title-413c"><div class="atmec-brand-main-413c">ATE-MEC HM</div><div class="atmec-brand-sub-413c">Production Test & Traceability Suite</div></div><div class="atmec-top-meta-413c"><span>Versione <b id="top-version-413b">${VERSION_413C}</b></span><span>Station <b id="top-station-id-413b">N/D</b></span><span>Postazione <b id="top-station-name-413b">N/D</b></span><span>Utente <b id="top-user-413b">N/D</b></span></div>`;
    cleanupTopBars413D();
  }
  function updateTopBar413C(){
    cleanupTopBars413D();
    if(!qs('atmec-top-station-bar-413b')) ensureTopBar413C();
    const st=stationValues();
    const set=(id,v)=>{const e=qs(id); if(e) e.textContent=v||'N/D';};
    set('top-version-413b', VERSION_413C);
    set('top-station-id-413b', st.id || 'N/D');
    set('top-station-name-413b', st.name || 'N/D');
    set('top-user-413b', `${currentUserLabel()} / ${currentRoleLabel()}`);
    const side=document.querySelector('#sidebar .side-card div[style*="ATE-MEC"]');
    if(side){ side.textContent='ATE-MEC HM'; side.classList.add('atmec-sidebar-title-413c'); }
  }
  function ensureSingleMenu413C(){
    const seen={};
    [...document.querySelectorAll('#sidebar button')].forEach(btn=>{
      const txt=(btn.textContent||'').trim();
      if(txt.includes('Data Provider & Sync')){ if(seen.sync) btn.remove(); else { seen.sync=true; btn.setAttribute('data-marker','sync-settings-413c'); btn.setAttribute('onclick', "showTab('sync-settings-tab', null); initSyncSettings413C()"); } }
      if(txt.includes('Clienti & Loghi') || txt.includes('Clienti & Branding')){ if(seen.clienti) btn.remove(); else { seen.clienti=true; btn.innerHTML='🏢 Clienti & Branding'; btn.setAttribute('onclick', "showTab('customers-logos-tab', null); renderCustomersLogos413C()"); } }
      if(txt.includes('Firme documenti')){ if(seen.firme) btn.remove(); else { seen.firme=true; btn.setAttribute('onclick', "showTab('signature-settings-tab', null); loadSignatureSettings413C()"); } }
    });
  }
  function safeAssetPath413F(path){
    const v=String(path||'').trim();
    if(!v) return '';
    // Non visualizzare/salvare blob/base64 lunghi dentro la UI: solo percorsi relativi o file locali.
    if(v.startsWith('data:')) return '';
    const normalized=v.replace(/\\/g,'/');
    // 4.13R-F: COBO era un placeholder futuro non presente nel pacchetto.
    // Lo filtriamo prima di generare tag <img>, così sparisce ERR_FILE_NOT_FOUND in DevTools.
    if(/(^|\/)assets\/customers\/cobo\.png$/i.test(normalized) || /(^|\/)cobo\.png$/i.test(normalized)) return '';
    return normalized;
  }
  function shortPath413F(path){
    const v=safeAssetPath413F(path);
    if(!v) return '';
    return v.split('/').pop() || v;
  }
  function customerPreviewHtml(path){
    const safe=safeAssetPath413F(path);
    return safe ? `<div class="cl413c-logo-preview"><img src="${esc(safe)}" onerror="this.style.display='none'"><span>${esc(shortPath413F(safe))}</span></div>` : '<div class="hint">Nessun logo selezionato.</div>';
  }
  async function recipeNames413C(){ try{return api?.listRecipes ? (await api.listRecipes()) : [];}catch{return [];} }
  async function populateRecipeSelects413C(){
    const names=await recipeNames413C();
    const opts='<option value="">Tutte / nessuna</option>'+names.map(n=>`<option value="${esc(n)}">${esc(n)}</option>`).join('');
    ['cl413b-recipe','trace-recipe-input'].forEach(id=>{ const el=qs(id); if(el && el.tagName==='SELECT'){ const cur=el.value; el.innerHTML=opts; if(cur) el.value=cur; }});
  }
  window.renderCustomersLogos413C = async function(){
    const tab=qs('customers-logos-tab'); if(!tab) return;
    await populateRecipeSelects413C();
    tab.innerHTML=`<div class="recipe-big-card page-clean-413c"><h3>🏢 Clienti & Branding</h3><div class="hint">Scegli un logo da qualsiasi percorso: AT-MEC lo copia automaticamente in <b>assets/customers/</b> e usa quel file nei report.</div><div class="settings-grid-413c"><div class="col"><label>Cliente</label><input id="cl413b-client" placeholder="es. SADEL / ABB / Cliente X"></div><div class="col"><label>Ricetta collegata</label><select id="cl413b-recipe"><option value="">Tutte / nessuna</option></select></div><div class="col span2"><label>Logo cliente copiato nel progetto</label><div class="inline-field-413c"><input id="cl413b-logo" placeholder="assets/customers/CLIENTE.png"><button class="btn btn-ghost btn-sm" onclick="selectCustomerLogo413C()">📁 Scegli logo...</button></div></div><div class="col span2" id="cl413c-preview">${customerPreviewHtml('')}</div></div><div class="action-row-413c"><button class="btn btn-success btn-sm" onclick="saveCustomerLogo413C()">💾 Salva cliente/logo</button><button class="btn btn-ghost btn-sm" onclick="applyCustomerLogoToRecipe413B?.()">🔗 Applica alla ricetta aperta</button><button class="btn btn-ghost btn-sm" onclick="renderCustomersLogos413C()">🔄 Aggiorna</button></div><div id="cl413b-list" class="clean-list-413c"><div class="hint">Nessun cliente configurato.</div></div></div>`;
    await populateRecipeSelects413C();
    renderCustomersList413C();
  };
  async function selectCustomerLogo413C(){
    const client=(qs('cl413b-client')?.value||'CLIENTE').trim() || 'CLIENTE';
    if(!api?.selectCustomerLogoFile413C){ alert('API selezione logo cliente non disponibile.'); return; }
    const res=await api.selectCustomerLogoFile413C(client);
    if(!res?.ok){ if(res?.error) alert(res.error); return; }
    const logoPath=safeAssetPath413F(res.relativePath || res.path || '');
    if(qs('cl413b-logo')) qs('cl413b-logo').value=logoPath;
    const prev=qs('cl413c-preview'); if(prev) prev.innerHTML=customerPreviewHtml(logoPath);
  }
  window.selectCustomerLogo413C=selectCustomerLogo413C;
  function renderCustomersList413C(){
    const list=qs('cl413b-list'); if(!list) return;
    const cfg=readJson(LS_CUSTOMERS, []);
    list.innerHTML = cfg.length ? cfg.map((x,i)=>`<div class="customer-row-413c"><div><b>${esc(x.client)}</b><small>Ricetta: ${esc(x.recipe||'Tutte')}</small></div><div>${customerPreviewHtml(x.logo)}</div><button class="btn btn-danger btn-sm" onclick="deleteCustomerLogo413B?.(${i}); setTimeout(renderCustomersLogos413C,80)">Elimina</button></div>`).join('') : '<div class="hint">Nessun cliente configurato.</div>';
  }
  window.saveCustomerLogo413C=function(){
    const client=(qs('cl413b-client')?.value||'').trim(); const logo=safeAssetPath413F(qs('cl413b-logo')?.value||''); const recipeName=(qs('cl413b-recipe')?.value||'').trim();
    if(!client || !logo){ alert('Inserisci Cliente e seleziona un logo valido.'); return; }
    const cfg=readJson(LS_CUSTOMERS, []).filter(x=>!(String(x.client).toLowerCase()===client.toLowerCase() && String(x.recipe||'')===recipeName));
    cfg.push({client, logo, recipe:recipeName, updatedAt:new Date().toISOString()}); writeJson(LS_CUSTOMERS, cfg); localStorage.setItem('atmec_last_recipe_customer_logo', logo); localStorage.setItem('atmec_last_recipe_client', client); renderCustomersList413C();
  };
  function signatureImgHtml(path,width){ const safe=safeAssetPath413F(path); return safe ? `<img class="sig-img-413c" style="max-width:${Number(width||160)}px" src="${esc(safe)}">` : ''; }
  function signaturePreview(s){
    const type=s.type || 'text'; const w=s.width || 160;
    if(type==='image') return signatureImgHtml(s.path||s.dataUrl,w) || '<span class="hint">Seleziona immagine firma.</span>';
    if(type==='none') return '<span class="hint">Firma disabilitata.</span>';
    return `<div class="sig-text-413c" style="font-size:${Math.max(12, Math.min(28, Number(w||160)/8))}px">${esc(s.text||currentUserLabel())}</div>`;
  }
  function getSig(){ return readJson(LS_SIGNATURES, {}); }
  function setSig(v){ writeJson(LS_SIGNATURES, v); }
  function loadReportOptionsUi(){ const opt=getReportOptions(); const map={operator:'operatorSignature', quality:'qualitySignature', 'customer-logo':'customerLogo', 'mec-logo':'mecLogo', 'mirza-logo':'mirzaLogo', station:'station'}; Object.keys(map).forEach(k=>{ const el=qs('rs413c-'+k); if(el) el.checked=!!opt[map[k]]; }); }
  window.loadSignatureSettings413C=function(){
    const tab=qs('signature-settings-tab'); if(!tab) return;
    const s=getSig();
    tab.innerHTML=`<div class="recipe-big-card page-clean-413c"><h3>✍️ Firme documenti</h3><div class="hint">Configura firme operatore e qualità. Puoi usare testo semplice oppure immagine. Le firme possono essere incluse/escluse dai report.</div><div class="settings-grid-413c"><div class="col"><label>Firma operatore - tipo</label><select id="sig413c-op-type"><option value="text">Testo</option><option value="image">Immagine</option><option value="none">Disabilitata</option></select></div><div class="col"><label>Testo firma operatore</label><input id="sig413c-op-text" placeholder="Nome / Codice operatore"></div><div class="col"><label>Larghezza firma operatore (px)</label><input id="sig413c-op-width" type="number" min="80" max="420" value="160"></div><div class="col"><label>Immagine firma operatore</label><button class="btn btn-ghost btn-sm" onclick="selectSignatureImage413C('operator')">📁 Scegli immagine...</button></div><div class="col preview-card-413c" id="sig413c-op-preview"></div><div class="col"><label>Utente qualità</label><input id="sig413b-quality-user" placeholder="utente qualità/admin"></div><div class="col"><label>Password qualità</label><input id="sig413b-quality-pass" type="password" placeholder="password"></div><div class="col"><label>Firma qualità - tipo</label><select id="sig413c-q-type"><option value="text">Testo</option><option value="image">Immagine</option><option value="none">Disabilitata</option></select></div><div class="col"><label>Testo firma qualità</label><input id="sig413c-q-text" placeholder="Responsabile Qualità"></div><div class="col"><label>Larghezza firma qualità (px)</label><input id="sig413c-q-width" type="number" min="80" max="420" value="160"></div><div class="col"><label>Immagine firma qualità</label><button class="btn btn-ghost btn-sm" onclick="selectSignatureImage413C('quality')">📁 Scegli immagine...</button></div><div class="col preview-card-413c" id="sig413c-q-preview"></div></div><h4>Opzioni report</h4><div class="compact-check-grid-413c"><label><input id="rs413c-operator" type="checkbox"> Firma operatore</label><label><input id="rs413c-quality" type="checkbox"> Firma qualità</label><label><input id="rs413c-customer-logo" type="checkbox"> Logo cliente</label><label><input id="rs413c-mec-logo" type="checkbox"> Logo MEC</label><label><input id="rs413c-mirza-logo" type="checkbox"> Logo MIRZA</label><label><input id="rs413c-station" type="checkbox"> Postazione/Station ID</label></div><div class="action-row-413c"><button class="btn btn-success btn-sm" onclick="saveSignatureSettings413C()">💾 Salva firme/opzioni</button><button class="btn btn-primary btn-sm" onclick="verifyQualitySignature413B?.()">🔐 Verifica firma qualità</button><button class="btn btn-ghost btn-sm" onclick="loadSignatureSettings413C()">🔄 Aggiorna</button></div><div id="sig413b-status" class="hint">Firma documenti pronta.</div></div>`;
    qs('sig413c-op-type').value=s.operatorType||'text'; qs('sig413c-op-text').value=s.operatorSignature||currentUserLabel(); qs('sig413c-op-width').value=s.operatorWidth||160;
    qs('sig413c-q-type').value=s.qualityType||'text'; qs('sig413c-q-text').value=s.qualitySignatureText||s.qualityUser||''; qs('sig413c-q-width').value=s.qualityWidth||160;
    loadReportOptionsUi(); updateSignaturePreviews413C();
    ['sig413c-op-type','sig413c-op-text','sig413c-op-width','sig413c-q-type','sig413c-q-text','sig413c-q-width'].forEach(id=>qs(id)?.addEventListener('input',updateSignaturePreviews413C));
  };
  function updateSignaturePreviews413C(){ const s=getSig(); const op={type:qs('sig413c-op-type')?.value||s.operatorType||'text', text:qs('sig413c-op-text')?.value||s.operatorSignature||currentUserLabel(), width:qs('sig413c-op-width')?.value||s.operatorWidth||160, path:s.operatorSignaturePath||s.operatorSignatureDataUrl}; const q={type:qs('sig413c-q-type')?.value||s.qualityType||'text', text:qs('sig413c-q-text')?.value||s.qualitySignatureText||s.qualityUser||'', width:qs('sig413c-q-width')?.value||s.qualityWidth||160, path:s.qualitySignaturePath||s.qualitySignatureDataUrl}; if(qs('sig413c-op-preview')) qs('sig413c-op-preview').innerHTML='<b>Preview operatore</b>'+signaturePreview(op); if(qs('sig413c-q-preview')) qs('sig413c-q-preview').innerHTML='<b>Preview qualità</b>'+signaturePreview(q); }
  window.saveSignatureSettings413C=function(){ const s=getSig(); s.operatorType=qs('sig413c-op-type')?.value||'text'; s.operatorSignature=qs('sig413c-op-text')?.value||currentUserLabel(); s.operatorWidth=Number(qs('sig413c-op-width')?.value||160); s.qualityType=qs('sig413c-q-type')?.value||'text'; s.qualitySignatureText=qs('sig413c-q-text')?.value||''; s.qualityWidth=Number(qs('sig413c-q-width')?.value||160); s.updatedAt=new Date().toISOString(); setSig(s); saveReportOptionsFromUi(); updateSignaturePreviews413C(); };
  window.selectSignatureImage413C=async function(kind){ const s=getSig(); const username=kind==='quality' ? (qs('sig413b-quality-user')?.value||'qualita') : currentUserLabel(); if(!api?.selectSignatureFile413C){ alert('API selezione firma non disponibile.'); return; } const res=await api.selectSignatureFile413C(username); if(!res?.ok){ if(res?.error) alert(res.error); return; } const rel=safeAssetPath413F(res.relativePath || res.path || ''); if(kind==='quality'){ s.qualitySignaturePath=rel; delete s.qualitySignatureDataUrl; s.qualityType='image'; } else { s.operatorSignaturePath=rel; delete s.operatorSignatureDataUrl; s.operatorType='image'; } setSig(s); loadSignatureSettings413C(); };
  function ensureUsersQuality413C(){
    const users=qs('users-tab'); if(!users || qs('quality-role-panel-413c')) return;
    const permGrid=[...users.querySelectorAll('.perm-check')].pop()?.closest('div');
    if(permGrid && !users.querySelector('input[value="sign_quality"]')) permGrid.insertAdjacentHTML('beforeend','<label><input type="checkbox" class="perm-check" value="sign_quality"> Firma qualità documenti</label><label><input type="checkbox" class="perm-check" value="approve_reports"> Approva report</label>');
    const card=document.createElement('div'); card.id='quality-role-panel-413c'; card.className='wizard-card quality-panel-413c'; card.innerHTML='<h4>3) Firme qualità</h4><div class="hint">Crea rapidamente un ruolo Qualità che può solo visualizzare e firmare documenti.</div><button class="btn btn-primary btn-sm" onclick="createQualityRolePreset413C()">👨‍🔬 Crea ruolo Qualità</button><button class="btn btn-ghost btn-sm" onclick="loadSignatureSettings413C(); showTab(\'signature-settings-tab\', null)">✍️ Gestisci firme documenti</button>';
    users.querySelector('.recipe-big-card')?.appendChild(card);
  }
  window.createQualityRolePreset413C=function(){ if(qs('new-role-name')) qs('new-role-name').value='Qualità'; if(qs('new-role-level')) qs('new-role-level').value='60'; document.querySelectorAll('.perm-check').forEach(c=>{ c.checked=['view_reports','sign_quality','approve_reports'].includes(c.value); }); alert('Preset ruolo Qualità applicato. Premi “Salva ruolo”.'); };
  function cleanSyncUi413C(){
    const host=qs('sync-settings-host-413b');
    if(host){ const card=document.querySelector('.da412e-sync-card'); if(card && !host.contains(card)){ host.innerHTML=''; host.appendChild(card); } }
    const archive=qs('data-archive-tab'); if(archive){ const dup=archive.querySelector('.da412e-sync-card'); if(dup && !qs('sync-settings-tab')?.contains(dup)) dup.style.display='none'; }
    const card=qs('sync-settings-host-413b')?.querySelector('.da412e-sync-card') || document.querySelector('#sync-settings-tab .da412e-sync-card');
    if(card){ card.classList.add('sync-redesign-413c'); const h=card.querySelector('h3'); if(h) h.textContent='🔄 Data Provider & Sync'; }
  }
  window.initSyncSettings413C=function(){ if(window.ensureTabs413B) try{ window.ensureTabs413B(); }catch{} cleanSyncUi413C(); try{ loadDataProviderStatus412E(); }catch{} updateTopBar413C(); };
  // Non sostituisce il report: aggiunge solo firme in modo condizionato e senza ricorsione.
  const baseFooter = window.atmecReportFooter412D || (typeof atmecReportFooter412D === 'function' ? atmecReportFooter412D : null);
  if(baseFooter && !window.__atmecFooter413CInstalled){ window.__atmecFooter413CInstalled=true; window.atmecReportFooter412D = atmecReportFooter412D = function(){ const opt=getReportOptions(); const s=getSig(); let extra=''; if(opt.operatorSignature){ const op={type:s.operatorType||'text', text:s.operatorSignature||currentUserLabel(), width:s.operatorWidth||160, path:s.operatorSignaturePath||s.operatorSignatureDataUrl}; extra+=`<div><b>Firma operatore</b><br>${signaturePreview(op)}</div>`; } if(opt.qualitySignature){ const q={type:s.qualityType||'text', text:s.qualitySignatureText||s.qualityUser||'________________', width:s.qualityWidth||160, path:s.qualitySignaturePath||s.qualitySignatureDataUrl}; extra+=`<div><b>Firma qualità</b><br>${signaturePreview(q)}</div>`; } return baseFooter()+`<div class="report-signature-413c">${extra}</div>`; }; }
  window.updateTopBar413C = updateTopBar413C;
  function init413C(){ cleanupTopBars413D(); ensureTopBar413C(); updateTopBar413C(); ensureSingleMenu413C(); cleanSyncUi413C(); ensureUsersQuality413C(); if(qs('customers-logos-tab')) renderCustomersLogos413C(); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', init413C); else init413C();
  setTimeout(init413C, 700); setInterval(()=>{ try{ cleanupTopBars413D(); updateTopBar413C(); }catch{} }, 2500);
})();


// AT-MEC_HM_4.13O - branding ufficiale MEC/MIRZA e protezione anti-base64 per loghi/firme.
(function(){
  function setBranding413F(){
    try{
      const set=(id,src)=>{ const el=document.getElementById(id); if(el){ el.src=src; el.style.objectFit='contain'; } };
      set('app-large-logo','assets/MEC.PNG');
      set('hmi-main-large-logo','assets/MEC.PNG');
      set('prod-company-logo','assets/MEC.PNG');
      set('login-large-logo','assets/MIRZA.png');
      set('login-small-logo','assets/MEC.PNG');
      set('developer-small-logo','assets/MIRZA.png');
      set('login-developer-logo','assets/MEC.PNG');
      set('prod-dev-logo','assets/MIRZA.png');
    }catch(e){ console.warn('[AT-MEC 4.13O] branding', e); }
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', setBranding413F); else setBranding413F();
  setTimeout(setBranding413F, 800);

  document.addEventListener('atmec:station-config-updated', function(){ try { updateTopBar413B(); } catch(_e){} });
})();

/* AT-MEC_HM_4.16A_APP_JS_SPLIT
 * Moduli estratti: Device Manager, Collaboratori/Ruoli, Recipe Pro, Traceability Pro.
 * app.js mantiene core legacy e API globali per compatibilità.
 */
