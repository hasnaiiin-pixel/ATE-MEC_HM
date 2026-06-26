#!/usr/bin/env node
const fs=require('fs');
const path=require('path');
const cp=require('child_process');
const crypto=require('crypto');
const root=path.resolve(__dirname,'..');
const release='AT-MEC_HM_4.23C_CLONE_STATION_RECOVERY';
const mode=process.argv[2]||'help';
const targetArg=process.argv[3];
const include=['database','config','recipes','data','assets/audio','src/renderer/partials','src/renderer/js/modules','src/renderer/css/modules','docs/releases','hardware_calibration.json','remote_dashboard.html','package.json'];
const scheduleFile=path.join(root,'config','backup_schedule_423c.json');
function stamp(){return new Date().toISOString().replace(/[:.]/g,'-');}
function copy(src,dst){if(!fs.existsSync(src))return;const st=fs.statSync(src);if(st.isDirectory()){fs.mkdirSync(dst,{recursive:true});for(const f of fs.readdirSync(src))copy(path.join(src,f),path.join(dst,f));}else{fs.mkdirSync(path.dirname(dst),{recursive:true});fs.copyFileSync(src,dst);}}
function rm(p){if(fs.existsSync(p))fs.rmSync(p,{recursive:true,force:true});}
function ps(cmd){return cp.execSync(`powershell -NoProfile -ExecutionPolicy Bypass -Command "${cmd.replace(/"/g,'\\"')}"`,{stdio:'pipe'}).toString();}
function sha(file){const h=crypto.createHash('sha256');h.update(fs.readFileSync(file));return h.digest('hex');}
function walk(dir,base=dir,out=[]){if(!fs.existsSync(dir))return out;for(const f of fs.readdirSync(dir)){const p=path.join(dir,f);const st=fs.statSync(p);if(st.isDirectory())walk(p,base,out);else out.push({file:path.relative(base,p).replace(/\\/g,'/'),size:st.size,sha256:sha(p)});}return out;}
function loadSchedule(){try{return JSON.parse(fs.readFileSync(scheduleFile,'utf8'));}catch(e){return {enabled:true,frequency:'daily',time:'02:00',retention:20,lastRun:null};}}
function saveSchedule(cfg){fs.mkdirSync(path.dirname(scheduleFile),{recursive:true});fs.writeFileSync(scheduleFile,JSON.stringify(cfg,null,2));}
function manifestFor(staging){return {release,createdAt:new Date().toISOString(),root,include,mode:'full-filesystem-backup-with-integrity',files:walk(staging)};}
function applyRetention(base,retention){const keep=Math.max(1,Number(retention||20));const zips=fs.readdirSync(base).filter(x=>x.startsWith('AT_MEC_HM_4_23C_BACKUP_')&&x.endsWith('.zip')).map(x=>({name:x,path:path.join(base,x),mtime:fs.statSync(path.join(base,x)).mtimeMs})).sort((a,b)=>b.mtime-a.mtime);for(const z of zips.slice(keep)){fs.rmSync(z.path,{force:true});console.log('Retention: eliminato',z.name);}}
function backup(){const cfg=loadSchedule();const base=path.join(root,'backups');fs.mkdirSync(base,{recursive:true});const name=`AT_MEC_HM_4_23C_BACKUP_${stamp()}`;const staging=path.join(base,name);fs.mkdirSync(staging,{recursive:true});for(const rel of include)copy(path.join(root,rel),path.join(staging,rel));fs.writeFileSync(path.join(staging,'manifest.json'),JSON.stringify(manifestFor(staging),null,2));const zip=staging+'.zip';try{ps(`Compress-Archive -Path '${staging.replace(/'/g,"''")}\\*' -DestinationPath '${zip.replace(/'/g,"''")}' -Force`);console.log('Backup ZIP creato:',zip);rm(staging);}catch(e){console.log('PowerShell Compress-Archive non disponibile. Backup cartella creato:',staging);}cfg.lastRun=new Date().toISOString();saveSchedule(cfg);applyRetention(base,cfg.retention);}
function list(){const dir=path.join(root,'backups');if(!fs.existsSync(dir)){console.log('Nessun backup.');return;}fs.readdirSync(dir).filter(x=>x.includes('4_23C')).forEach(x=>console.log(x));}
function check(){const missing=include.filter(rel=>!fs.existsSync(path.join(root,rel)));const cfg=loadSchedule();const res={release,checkedAt:new Date().toISOString(),schedule:cfg,missing,ok:missing.length===0};console.log(JSON.stringify(res,null,2));if(missing.length)process.exitCode=1;}
function integrity(){const dir=path.join(root,'backups');const zips=fs.existsSync(dir)?fs.readdirSync(dir).filter(x=>x.includes('4_23C')&&x.endsWith('.zip')):[];const missing=include.filter(rel=>!fs.existsSync(path.join(root,rel)));console.log(JSON.stringify({release,checkedAt:new Date().toISOString(),backupCount:zips.length,lastBackup:zips.sort().slice(-1)[0]||null,missing,ok:missing.length===0},null,2));if(missing.length)process.exitCode=1;}
function restore(file){if(!file){console.log('Uso: node scripts/backup_restore_423c.js restore backups\\NOME_BACKUP.zip');process.exit(1);}const backupFile=path.resolve(root,file);if(!fs.existsSync(backupFile)){console.error('Backup non trovato:',backupFile);process.exit(1);}const pre=path.join(root,'backups','PRE_RESTORE_4_23C_'+stamp());fs.mkdirSync(pre,{recursive:true});for(const rel of include)copy(path.join(root,rel),path.join(pre,rel));const tmp=path.join(root,'backups','_restore_tmp_'+Date.now());rm(tmp);fs.mkdirSync(tmp,{recursive:true});if(backupFile.toLowerCase().endsWith('.zip')){ps(`Expand-Archive -Path '${backupFile.replace(/'/g,"''")}' -DestinationPath '${tmp.replace(/'/g,"''")}' -Force`);}else{copy(backupFile,tmp);}for(const rel of include){const src=path.join(tmp,rel);if(fs.existsSync(src)){rm(path.join(root,rel));copy(src,path.join(root,rel));}}rm(tmp);console.log('Restore completato. Backup pre-restore creato:',pre);}
function schedule(){const cfg=loadSchedule();if(process.argv[3]) cfg.enabled=process.argv[3]!=='off';if(process.argv[4]) cfg.frequency=process.argv[4];if(process.argv[5]) cfg.time=process.argv[5];if(process.argv[6]) cfg.retention=Number(process.argv[6]);saveSchedule(cfg);console.log(JSON.stringify(cfg,null,2));}
function runScheduled(){const cfg=loadSchedule();if(!cfg.enabled){console.log('Scheduler OFF. Nessun backup eseguito.');return;}console.log('Scheduler ON. Eseguo backup controllato.');backup();}

function cloneExport(){const base=path.join(root,'backups');fs.mkdirSync(base,{recursive:true});const name=`AT_MEC_HM_4_23C_CLONE_STATION_${stamp()}`;const staging=path.join(base,name);fs.mkdirSync(staging,{recursive:true});for(const rel of include)copy(path.join(root,rel),path.join(staging,rel));const stationMeta={release,createdAt:new Date().toISOString(),type:'clone-station-package',sourceRoot:root,note:'Pacchetto clone postazione. Dopo import su nuovo PC verificare nome postazione, porte COM, percorsi e strumenti fisici.'};fs.writeFileSync(path.join(staging,'CLONE_STATION_MANIFEST.json'),JSON.stringify(stationMeta,null,2));fs.writeFileSync(path.join(staging,'CLONE_STATION_POST_RESTORE_CHECKLIST.txt'),['1. Avviare npm install se necessario.','2. Verificare nome postazione.','3. Verificare porte COM/USB strumenti.','4. Verificare stampante predefinita.','5. Eseguire Test Mode con ricetta campione.'].join('\n'));const zip=staging+'.zip';try{ps(`Compress-Archive -Path '${staging.replace(/'/g,"''")}\*' -DestinationPath '${zip.replace(/'/g,"''")}' -Force`);console.log('Clone Station ZIP creato:',zip);rm(staging);}catch(e){console.log('PowerShell Compress-Archive non disponibile. Clone cartella creato:',staging);}}
function cloneImport(file){if(!file){console.log('Uso: node scripts/backup_restore_423c.js clone-import backups\NOME_CLONE.zip');process.exit(1);}console.log('Import Clone Station avviato. Verrà eseguito restore protetto.');restore(file);console.log('Import Clone Station completato. Verificare nome postazione, COM, stampante, strumenti.');}

if(mode==='backup')backup();
else if(mode==='list')list();
else if(mode==='check')check();
else if(mode==='integrity')integrity();
else if(mode==='restore')restore(targetArg);
else if(mode==='schedule')schedule();
else if(mode==='run-scheduled')runScheduled();
else if(mode==='clone-export')cloneExport();
else if(mode==='clone-import')cloneImport(targetArg);
else{console.log('AT-MEC HM 4.23C Backup Scheduler Integrity');console.log('Comandi:');console.log('  node scripts/backup_restore_423c.js backup');console.log('  node scripts/backup_restore_423c.js list');console.log('  node scripts/backup_restore_423c.js check');console.log('  node scripts/backup_restore_423c.js integrity');console.log('  node scripts/backup_restore_423c.js schedule on daily 02:00 20');console.log('  node scripts/backup_restore_423c.js run-scheduled');console.log('  node scripts/backup_restore_423c.js restore backups\\NOME_BACKUP.zip');console.log('  node scripts/backup_restore_423c.js clone-export');console.log('  node scripts/backup_restore_423c.js clone-import backups\\NOME_CLONE.zip');}
