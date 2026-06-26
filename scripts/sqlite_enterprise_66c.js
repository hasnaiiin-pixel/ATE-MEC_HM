/* AT-MEC_HM 6.6C - SQLite Enterprise Stable
 * Non destructive database health, integrity, backup/restore and audit reporting.
 * JSON/local-first compatibility is preserved; this script produces enterprise diagnostics
 * and cleanup reports without deleting production data automatically.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const root = path.resolve(__dirname, '..');
const dbDir = path.join(root, 'database');
const docsDbDir = path.join(root, 'docs', 'database');
const backupDir = path.join(root, 'backups', 'sqlite_enterprise');
function ensureDir(p){ fs.mkdirSync(p,{recursive:true}); }
function now(){ return new Date().toISOString(); }
function readJson(rel, fallback){ try{ const p=path.join(root, rel); if(fs.existsSync(p)) return JSON.parse(fs.readFileSync(p,'utf8')); }catch(e){} return fallback; }
function writeJson(rel, data){ const p=path.join(root, rel); ensureDir(path.dirname(p)); fs.writeFileSync(p, JSON.stringify(data,null,2), 'utf8'); return p; }
function walk(dir){ const out=[]; if(!fs.existsSync(dir)) return out; for(const f of fs.readdirSync(dir)){ const p=path.join(dir,f); const st=fs.statSync(p); if(st.isDirectory()) out.push(...walk(p)); else out.push(p); } return out; }
function sha256(file){ const h=crypto.createHash('sha256'); h.update(fs.readFileSync(file)); return h.digest('hex'); }
function sizeOf(rel){ const p=path.join(root, rel); if(!fs.existsSync(p)) return 0; const st=fs.statSync(p); if(st.isFile()) return st.size; return walk(p).reduce((s,f)=>s+fs.statSync(f).size,0); }
function localDb(){ return readJson('database/ate_mec_local_db.json',{}); }
function enterpriseDb(){ return readJson('database/ate_mec_enterprise_db.json',{}); }
function migration(){ return readJson('database/sqlite_enterprise_66b_migration.json',{}); }
function arr(x){ return Array.isArray(x)?x:[]; }
function allTestRuns(){
  const l=localDb(); const e=enterpriseDb(); const m=migration();
  return [
    ...arr(l.reports), ...arr(l.test_reports), ...arr(l.testResults), ...arr(l.test_runs),
    ...arr(e.reports), ...arr(e.test_reports), ...arr(e.testResults), ...arr(e.test_runs),
    ...arr(m.data&&m.data.test_runs)
  ];
}
function allRepairs(){
  const l=localDb(); const e=enterpriseDb(); const m=migration();
  return [
    ...arr(l.repair_tickets), ...arr(l.repairTickets), ...arr(l.repairs),
    ...arr(e.repair_tickets), ...arr(e.repairTickets), ...arr(e.repairs),
    ...arr(m.data&&m.data.repair_tickets)
  ];
}
function allRecipes(){
  const m=migration(); const fromFiles=[];
  const recipeDir=path.join(root,'recipes');
  if(fs.existsSync(recipeDir)) fs.readdirSync(recipeDir).filter(f=>f.toLowerCase().endsWith('.json')).forEach(f=>fromFiles.push({name:path.basename(f,'.json'), file:f}));
  return [...arr(m.data&&m.data.recipes), ...fromFiles];
}
function allUsers(){ const m=migration(); const u=readJson('config/users.json',{}); return [...arr(m.data&&m.data.users), ...arr(u.users), ...arr(u)]; }
function allWorkOrders(){ const m=migration(); const l=localDb(); const e=enterpriseDb(); return [...arr(m.data&&m.data.work_orders), ...arr(l.work_orders), ...arr(e.work_orders)]; }
function allRepository(){ const m=migration(); const manifest=readJson('src/renderer/config/repository_manifest_424b.json',{}); return [...arr(m.data&&m.data.repository_items), ...arr(manifest.items)]; }
function keyOfTest(r){
  const serial=r.serial||r.serial_dut||r.serialNumber||r.sn||'';
  const ts=r.timestamp||r.created_at||r.date||r.started_at||'';
  const res=r.final_result||r.result||r.esito||'';
  const recipe=r.recipe_name||r.recipe||r.recipeName||'';
  return [serial,ts,res,recipe].join('|');
}
function findDuplicates(items, keyFn){ const seen=new Map(); const d=[]; items.forEach((x,i)=>{const k=keyFn(x); if(seen.has(k)) d.push({key:k, first:seen.get(k), duplicate:i}); else seen.set(k,i);}); return d; }
function integrity(){
  const tests=allTestRuns(); const repairs=allRepairs(); const recipes=allRecipes(); const users=allUsers(); const workOrders=allWorkOrders(); const repository=allRepository();
  const testDup=findDuplicates(tests,keyOfTest);
  const repairDup=findDuplicates(repairs,r=>String(r.id||r.ticket_id||r.ticket||'')+'|'+String(r.serial||r.serial_dut||''));
  const serialSet=new Set(tests.map(t=>String(t.serial||t.serial_dut||t.serialNumber||t.sn||'')).filter(Boolean));
  const orphanRepairs=repairs.filter(r=>{ const s=String(r.serial||r.serial_dut||r.serialNumber||r.sn||''); return s && serialSet.size && !serialSet.has(s); });
  const requiredFiles=['database/ate_mec_local_db.json','database/ate_mec_enterprise_db.json','database/sqlite_enterprise_66b_migration.json','src/renderer/partials/database-status-66a.html'];
  const missingFiles=requiredFiles.filter(f=>!fs.existsSync(path.join(root,f)));
  const status = missingFiles.length || testDup.length || repairDup.length ? 'WARN' : 'OK';
  return {
    release:'AT-MEC_HM_6.6C_SQLITE_ENTERPRISE_STABLE',
    timestamp:now(),
    status,
    counts:{tests:tests.length, repairs:repairs.length, recipes:recipes.length, users:users.length, workOrders:workOrders.length, repositoryItems:repository.length},
    checks:{missingFiles, duplicateTests:testDup, duplicateRepairs:repairDup, orphanRepairs},
    sizes:{database:sizeOf('database'), config:sizeOf('config'), recipes:sizeOf('recipes'), data:sizeOf('data')}
  };
}
function auditTrail(){
  const tests=allTestRuns().map(t=>({type:'TEST', timestamp:t.timestamp||t.created_at||'', serial:t.serial||t.serial_dut||t.sn||'', user:t.operator||t.user||'', result:t.final_result||t.result||'', raw:t}));
  const repairs=allRepairs().map(r=>({type:'REPAIR', timestamp:r.updated_at||r.created_at||r.timestamp||'', serial:r.serial||r.serial_dut||'', user:r.technician||r.user||'', result:r.status||'', raw:r}));
  return [...tests,...repairs].sort((a,b)=>String(a.timestamp).localeCompare(String(b.timestamp)));
}
function performance(){
  const started=Date.now();
  const report=integrity();
  const ms=Date.now()-started;
  return {release:'AT-MEC_HM_6.6C_SQLITE_ENTERPRISE_STABLE', timestamp:now(), integrityMs:ms, score:ms<250?'OK':ms<1000?'WARN':'SLOW', counts:report.counts, sizes:report.sizes};
}
function backup(){
  const stamp=now().replace(/[-:T.]/g,'').slice(0,14);
  const dir=path.join(backupDir,'ATMEC_SQLITE_ENTERPRISE_66C_'+stamp);
  ensureDir(dir);
  ['database','config','recipes','data','src/renderer/config'].forEach(d=>{ const s=path.join(root,d); if(fs.existsSync(s)) fs.cpSync(s,path.join(dir,d),{recursive:true}); });
  const files=walk(dir).map(f=>({file:path.relative(dir,f), size:fs.statSync(f).size, sha256:sha256(f)}));
  fs.writeFileSync(path.join(dir,'manifest_66c.json'), JSON.stringify({release:'6.6C',createdAt:now(),files},null,2));
  return dir;
}
function cleanupReport(){
  const integ=integrity();
  const report={release:'AT-MEC_HM_6.6C_SQLITE_ENTERPRISE_STABLE', timestamp:now(), mode:'REPORT_ONLY_NO_DELETE', recommendedActions:[]};
  if(integ.checks.duplicateTests.length) report.recommendedActions.push({area:'test_runs', action:'Deduplicare record test duplicati in vista/PDF, non cancellare sorgenti senza conferma', duplicates:integ.checks.duplicateTests.length});
  if(integ.checks.duplicateRepairs.length) report.recommendedActions.push({area:'repair_tickets', action:'Unificare ticket duplicati con stesso ID/seriale', duplicates:integ.checks.duplicateRepairs.length});
  if(integ.checks.orphanRepairs.length) report.recommendedActions.push({area:'repair_tickets', action:'Verificare ticket senza seriale presente nello storico test', orphans:integ.checks.orphanRepairs.length});
  return report;
}
function writeAllReports(){
  const i=integrity(); const a=auditTrail(); const p=performance(); const c=cleanupReport();
  writeJson('database/sqlite_enterprise_66c_status.json', i);
  writeJson('docs/database/AT_MEC_HM_6_6C_INTEGRITY_REPORT.json', i);
  writeJson('docs/database/AT_MEC_HM_6_6C_AUDIT_TRAIL.json', a);
  writeJson('docs/database/AT_MEC_HM_6_6C_PERFORMANCE_REPORT.json', p);
  writeJson('docs/database/AT_MEC_HM_6_6C_CLEANUP_REPORT.json', c);
  return {integrity:i, auditTrailRecords:a.length, performance:p, cleanup:c};
}
const cmd=process.argv[2]||'status';
try{
 if(cmd==='backup') console.log('Backup SQLite Enterprise creato:', backup());
 else if(cmd==='integrity') console.log(JSON.stringify(integrity(),null,2));
 else if(cmd==='audit') console.log(JSON.stringify(auditTrail(),null,2));
 else if(cmd==='performance') console.log(JSON.stringify(performance(),null,2));
 else if(cmd==='cleanup') console.log(JSON.stringify(cleanupReport(),null,2));
 else { const r=writeAllReports(); console.log(JSON.stringify({release:'6.6C',status:r.integrity.status,counts:r.integrity.counts,auditTrailRecords:r.auditTrailRecords,performance:r.performance.score},null,2)); }
}catch(e){ console.error('[6.6C] errore:', e); process.exit(1); }
