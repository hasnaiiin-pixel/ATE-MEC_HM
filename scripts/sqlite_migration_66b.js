#!/usr/bin/env node
/* AT-MEC_HM 6.6B - Core Data Migration
 * Non-destructive migration bridge: reads current JSON/file sources and produces a
 * normalized SQLite-ready migration package plus SQL import script/report.
 * JSON/localStorage remain active; no existing runtime data is deleted.
 */
const fs=require('fs');
const path=require('path');
const crypto=require('crypto');
const root=path.resolve(__dirname,'..');
const dbDir=path.join(root,'database');
const docsDir=path.join(root,'docs','database');
const backupDir=path.join(root,'backups','pre_migration');
fs.mkdirSync(dbDir,{recursive:true});fs.mkdirSync(docsDir,{recursive:true});fs.mkdirSync(backupDir,{recursive:true});
function readJson(rel,fb){try{return JSON.parse(fs.readFileSync(path.join(root,rel),'utf8'));}catch{return fb;}}
function writeJson(rel,obj){const p=path.join(root,rel);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,JSON.stringify(obj,null,2));return p;}
function listFiles(rel,ext){try{return fs.readdirSync(path.join(root,rel)).filter(f=>!ext||f.toLowerCase().endsWith(ext));}catch{return [];}}
function sha(x){return crypto.createHash('sha256').update(String(x||'')).digest('hex');}
function escSql(v){return String(v??'').replace(/'/g,"''");}
function now(){return new Date().toISOString();}
function id(prefix,seed){return prefix+'_'+sha(seed).slice(0,12).toUpperCase();}
function arr(x){return Array.isArray(x)?x:[];}
function backup(){const stamp=now().replace(/[-:T.]/g,'').slice(0,14);const dir=path.join(backupDir,'ATMEC_PRE_MIGRATION_66B_'+stamp);fs.mkdirSync(dir,{recursive:true});['database','config','recipes','firmware','assets/audio','data','src/renderer/config'].forEach(d=>{const s=path.join(root,d);if(fs.existsSync(s))fs.cpSync(s,path.join(dir,d),{recursive:true});});writeJson(path.relative(root,path.join(dir,'manifest_66b.json')),{release:'6.6B',createdAt:now(),note:'Backup automatico pre-migrazione core data'});return dir;}
function loadRecipes(){const out=[];for(const f of listFiles('recipes','.json')){const rel='recipes/'+f;const raw=readJson(rel,{});const name=raw.name||raw.recipeName||raw.title||path.basename(f,'.json');out.push({id:id('REC',name+'|'+f),name,version:raw.version||raw.revision||'1',status:raw.status||'ACTIVE',source:rel,steps:arr(raw.steps||raw.sequence||raw.testSteps),raw});}return out;}
function loadUsersRoles(){const u=readJson('config/users.json',{});const users=arr(u.users||u);const roles=arr(u.roles||[]);return {users:users.map(x=>({id:id('USR',x.username||x.name||JSON.stringify(x)),username:x.username||x.name||'user',role:x.role||x.profile||'Operatore',enabled:x.enabled!==false,raw:x})),roles:roles.map(r=>({id:id('ROLE',r.name||r.role||JSON.stringify(r)),name:r.name||r.role||String(r),raw:r}))};}
function pickReports(local){return arr(local.reports||local.test_reports||local.testReports||local.history||[]).map((r,i)=>({id:r.id||id('TR',JSON.stringify(r)+'|'+i),timestamp:r.timestamp||r.date||r.created_at||now(),serial:r.serial_dut||r.serial||r.seriale||r.sn||'',work_order:r.work_order||r.commessa||'',lot:r.lot_number||r.lotto||'',recipe:r.recipe_name||r.recipe||'',operator:r.operator||r.operatore||'',station:r.station_id||r.station||r.postazione||'',result:r.final_result||r.result||r.esito||'',duration_ms:r.execution_time_ms||r.duration_ms||0,raw:r}));}
function pickRepairs(local){let tickets=[];tickets=arr(local.repair_tickets||local.repairs||local.repairTickets);return tickets.map((t,i)=>({id:t.id||t.ticket_id||id('RPR',JSON.stringify(t)+'|'+i),serial:t.serial||t.seriale||t.serial_dut||'',status:t.status||'OPEN',created_at:t.created_at||t.opened_at||t.timestamp||now(),closed_at:t.closed_at||'',defect:t.defect||t.difetto||'',cause:t.cause||t.causa||'',corrective_action:t.corrective_action||t.action||t.azione||'',technician:t.technician||t.tecnico||'',actions:arr(t.actions||t.interventions||t.interventi),attachments:arr(t.attachments||t.allegati),raw:t}));}
function pickWorkOrders(){const cfg=readJson('data/work_orders.json',null)||readJson('database/work_orders.json',null)||{};const a=arr(cfg.work_orders||cfg.workOrders||cfg);return a.map((w,i)=>({id:w.id||w.wo_number||w.work_order||id('WO',JSON.stringify(w)+'|'+i),wo_number:w.wo_number||w.work_order||w.commessa||'',product:w.product||w.product_code||w.prodotto||'',customer:w.customer||w.cliente||'',lot:w.lot||w.lotto||'',qty_target:Number(w.qty_target||w.qty_requested||w.target||0),qty_done:Number(w.qty_done||w.qty_completed||0),status:w.status||'PLANNED',raw:w}));}
function pickRepository(){const m=readJson('src/renderer/config/repository_manifest_424b.json',{})||readJson('config/repository_manifest_424b.json',{})||{};const items=[];for(const [kind,list] of Object.entries(m)){if(Array.isArray(list)){list.forEach((x,i)=>items.push({id:id('REPO',kind+'|'+JSON.stringify(x)+'|'+i),kind,name:x.name||x.file||x.path||String(x),version:x.version||x.revision||'1',status:x.status||'DISCOVERED',raw:x}));}}
return items;}
function buildMigration(){const local=readJson('database/ate_mec_local_db.json',{});const enterprise=readJson('database/ate_mec_enterprise_db.json',{});const {users,roles}=loadUsersRoles();const recipes=loadRecipes();const reports=pickReports(local);const repairs=pickRepairs(local);const workOrders=pickWorkOrders();const repository=pickRepository();const settings=[{key:'app_settings',value:readJson('config/app_settings.json',{})},{key:'data_provider',value:readJson('config/data_provider.json',{})}];
const migration={release:'AT-MEC_HM_6.6B_CORE_DATA_MIGRATION',createdAt:now(),mode:'NON_DESTRUCTIVE_SQLITE_READY',counts:{users:users.length,roles:roles.length,recipes:recipes.length,test_runs:reports.length,repair_tickets:repairs.length,work_orders:workOrders.length,repository_items:repository.length,settings:settings.length},data:{users,roles,recipes,test_runs:reports,repair_tickets:repairs,work_orders:workOrders,repository_items:repository,settings},compatibility:{jsonPrimaryStillAvailable:true,sqlitePrimary:false,next:'6.6C will switch SQLite as primary after validation'}};
return migration;}
function sqlFor(m){const lines=[];lines.push('-- AT-MEC_HM 6.6B Core Data Migration - generated '+m.createdAt);lines.push('PRAGMA foreign_keys=ON;');lines.push('CREATE TABLE IF NOT EXISTS atmec_migration_info (key TEXT PRIMARY KEY, value TEXT);');lines.push("INSERT OR REPLACE INTO atmec_migration_info(key,value) VALUES('release','6.6B'),('created_at','"+escSql(m.createdAt)+"');");
lines.push('CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT, role TEXT, enabled INTEGER, raw_json TEXT);');
for(const u of m.data.users)lines.push(`INSERT OR REPLACE INTO users(id,username,role,enabled,raw_json) VALUES('${escSql(u.id)}','${escSql(u.username)}','${escSql(u.role)}',${u.enabled?1:0},'${escSql(JSON.stringify(u.raw||{}))}');`);
lines.push('CREATE TABLE IF NOT EXISTS recipes (id TEXT PRIMARY KEY, name TEXT, version TEXT, status TEXT, source TEXT, raw_json TEXT);');
for(const r of m.data.recipes)lines.push(`INSERT OR REPLACE INTO recipes(id,name,version,status,source,raw_json) VALUES('${escSql(r.id)}','${escSql(r.name)}','${escSql(r.version)}','${escSql(r.status)}','${escSql(r.source)}','${escSql(JSON.stringify(r.raw||{}))}');`);
lines.push('CREATE TABLE IF NOT EXISTS test_runs (id TEXT PRIMARY KEY, timestamp TEXT, serial TEXT, work_order TEXT, lot TEXT, recipe TEXT, operator TEXT, station TEXT, result TEXT, duration_ms INTEGER, raw_json TEXT);');
for(const t of m.data.test_runs)lines.push(`INSERT OR REPLACE INTO test_runs(id,timestamp,serial,work_order,lot,recipe,operator,station,result,duration_ms,raw_json) VALUES('${escSql(t.id)}','${escSql(t.timestamp)}','${escSql(t.serial)}','${escSql(t.work_order)}','${escSql(t.lot)}','${escSql(t.recipe)}','${escSql(t.operator)}','${escSql(t.station)}','${escSql(t.result)}',${Number(t.duration_ms)||0},'${escSql(JSON.stringify(t.raw||{}))}');`);
lines.push('CREATE TABLE IF NOT EXISTS repair_tickets (id TEXT PRIMARY KEY, serial TEXT, status TEXT, created_at TEXT, closed_at TEXT, defect TEXT, cause TEXT, corrective_action TEXT, technician TEXT, raw_json TEXT);');
for(const r of m.data.repair_tickets)lines.push(`INSERT OR REPLACE INTO repair_tickets(id,serial,status,created_at,closed_at,defect,cause,corrective_action,technician,raw_json) VALUES('${escSql(r.id)}','${escSql(r.serial)}','${escSql(r.status)}','${escSql(r.created_at)}','${escSql(r.closed_at)}','${escSql(r.defect)}','${escSql(r.cause)}','${escSql(r.corrective_action)}','${escSql(r.technician)}','${escSql(JSON.stringify(r.raw||{}))}');`);
lines.push('CREATE TABLE IF NOT EXISTS work_orders (id TEXT PRIMARY KEY, wo_number TEXT, product TEXT, customer TEXT, lot TEXT, qty_target INTEGER, qty_done INTEGER, status TEXT, raw_json TEXT);');
for(const w of m.data.work_orders)lines.push(`INSERT OR REPLACE INTO work_orders(id,wo_number,product,customer,lot,qty_target,qty_done,status,raw_json) VALUES('${escSql(w.id)}','${escSql(w.wo_number)}','${escSql(w.product)}','${escSql(w.customer)}','${escSql(w.lot)}',${w.qty_target||0},${w.qty_done||0},'${escSql(w.status)}','${escSql(JSON.stringify(w.raw||{}))}');`);
lines.push('CREATE TABLE IF NOT EXISTS repository_items (id TEXT PRIMARY KEY, kind TEXT, name TEXT, version TEXT, status TEXT, raw_json TEXT);');
for(const x of m.data.repository_items)lines.push(`INSERT OR REPLACE INTO repository_items(id,kind,name,version,status,raw_json) VALUES('${escSql(x.id)}','${escSql(x.kind)}','${escSql(x.name)}','${escSql(x.version)}','${escSql(x.status)}','${escSql(JSON.stringify(x.raw||{}))}');`);
lines.push('CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value_json TEXT);');
for(const s of m.data.settings)lines.push(`INSERT OR REPLACE INTO settings(key,value_json) VALUES('${escSql(s.key)}','${escSql(JSON.stringify(s.value||{}))}');`);
return lines.join('\n');}
function migrate(){const backupPath=backup();const m=buildMigration();writeJson('database/sqlite_enterprise_66b_migration.json',m);writeJson('docs/database/AT_MEC_HM_6_6B_MIGRATION_REPORT.json',m);fs.writeFileSync(path.join(dbDir,'sqlite_migration_66b.sql'),sqlFor(m));return {backupPath,report:path.join(root,'docs/database/AT_MEC_HM_6_6B_MIGRATION_REPORT.json'),json:path.join(root,'database/sqlite_enterprise_66b_migration.json'),sql:path.join(root,'database/sqlite_migration_66b.sql'),counts:m.counts};}
const cmd=process.argv[2]||'report';
if(cmd==='backup')console.log('Backup pre-migrazione:',backup());
else if(cmd==='migrate'){const r=migrate();console.log('Migrazione 6.6B preparata:');console.log(JSON.stringify(r,null,2));}
else {const m=buildMigration();writeJson('docs/database/AT_MEC_HM_6_6B_MIGRATION_REPORT.json',m);console.log(JSON.stringify({release:m.release,counts:m.counts},null,2));}
