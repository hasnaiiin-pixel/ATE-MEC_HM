#!/usr/bin/env node
const fs=require('fs');
const path=require('path');
const crypto=require('crypto');
const root=path.resolve(__dirname,'..');
const outDir=path.join(root,'docs','database');
const backupDir=path.join(root,'backups','pre_migration');
fs.mkdirSync(outDir,{recursive:true});fs.mkdirSync(backupDir,{recursive:true});
function exists(p){try{return fs.existsSync(path.join(root,p));}catch{return false;}}
function stat(p){try{const s=fs.statSync(path.join(root,p));return {exists:true,size:s.size,mtime:s.mtime.toISOString()};}catch{return {exists:false};}}
function countFiles(dir,ext){try{return fs.readdirSync(path.join(root,dir)).filter(f=>!ext||f.toLowerCase().endsWith(ext)).length;}catch{return 0;}}
function readJson(p){try{return JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));}catch{return null;}}
function checksum(file){try{return crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex');}catch{return null;}}
function audit(){
 const local=readJson('database/ate_mec_local_db.json')||{};
 const enterprise=readJson('database/ate_mec_enterprise_db.json')||{};
 const users=readJson('config/users.json')||{};
 const settings=readJson('config/app_settings.json')||{};
 const report={
  release:'AT-MEC_HM_6.6A_SQLITE_FOUNDATION',
  generatedAt:new Date().toISOString(),
  files:{
   localDb:stat('database/ate_mec_local_db.json'),
   enterpriseDb:stat('database/ate_mec_enterprise_db.json'),
   users:stat('config/users.json'),
   appSettings:stat('config/app_settings.json'),
   dataProvider:stat('config/data_provider.json'),
   sqliteSchema:stat('database/sqlite/enterprise_schema_66a.sql')
  },
  counts:{
   recipesJson:countFiles('recipes','.json'),
   firmwareFiles:countFiles('firmware'),
   audioFiles:countFiles('assets/audio'),
   localReports:Array.isArray(local.reports)?local.reports.length:(Array.isArray(local.test_reports)?local.test_reports.length:0),
   localRepairs:Array.isArray(local.repairs)?local.repairs.length:0,
   enterpriseKeys:Object.keys(enterprise||{}).length,
   configUsers:Array.isArray(users.users)?users.users.length:(Array.isArray(users)?users.length:0),
   appSettingsKeys:Object.keys(settings||{}).length
  },
  checksums:{
   localDb:checksum('database/ate_mec_local_db.json'),
   enterpriseDb:checksum('database/ate_mec_enterprise_db.json'),
   users:checksum('config/users.json'),
   schema:checksum('database/sqlite/enterprise_schema_66a.sql')
  },
  nextMigration:{
   '6.6B':'migrare utenti, ruoli, ricette, test_results, repair_tickets, work_orders, repository_items',
   '6.6C':'rendere SQLite sorgente primaria, JSON solo export/backup, integrity check e restore DB'
  }
 };
 const file=path.join(outDir,'AT_MEC_HM_6_6A_DATABASE_AUDIT.json');
 fs.writeFileSync(file,JSON.stringify(report,null,2));
 return {report,file};
}
function backup(){
 const stamp=new Date().toISOString().replace(/[-:T.]/g,'').slice(0,14);
 const dir=path.join(backupDir,'ATMEC_PRE_MIGRATION_66A_'+stamp);
 fs.mkdirSync(dir,{recursive:true});
 ['database','config','recipes','assets/audio','firmware'].forEach(d=>{const src=path.join(root,d);const dst=path.join(dir,d); if(fs.existsSync(src)) fs.cpSync(src,dst,{recursive:true});});
 const {report}=audit();
 fs.writeFileSync(path.join(dir,'manifest_66a.json'),JSON.stringify({createdAt:new Date().toISOString(),release:'6.6A',audit:report},null,2));
 return dir;
}
const cmd=process.argv[2]||'audit';
if(cmd==='backup'){console.log('Backup pre-migrazione creato:',backup());}
else {const {file,report}=audit(); console.log('Audit database 6.6A creato:',file); console.log(JSON.stringify(report.counts,null,2));}
