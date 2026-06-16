const fs=require('fs');const path=require('path');
const root=path.resolve(__dirname,'..');
const mode=process.argv[2]||'backup';
const stamp=new Date().toISOString().replace(/[:.]/g,'-');
const backupDir=path.join(root,'backups','AT_MEC_HM_4_22_'+stamp);
const include=['database','config','recipes','data','assets/audio'];
function copy(src,dst){if(!fs.existsSync(src))return;const st=fs.statSync(src);if(st.isDirectory()){fs.mkdirSync(dst,{recursive:true});for(const f of fs.readdirSync(src))copy(path.join(src,f),path.join(dst,f));}else{fs.mkdirSync(path.dirname(dst),{recursive:true});fs.copyFileSync(src,dst);}}
if(mode==='backup'){
  fs.mkdirSync(backupDir,{recursive:true});
  for(const rel of include) copy(path.join(root,rel),path.join(backupDir,rel));
  const manifest={release:'AT-MEC_HM_4.22_ENTERPRISE_STABLE',createdAt:new Date().toISOString(),included:include};
  fs.writeFileSync(path.join(backupDir,'manifest.json'),JSON.stringify(manifest,null,2));
  console.log('Backup creato:',backupDir);
}else{
  console.log('Uso: node scripts/enterprise_backup_restore_422.js backup');
  console.log('Restore manuale: copiare config/database/recipes/data/assets/audio dal backup selezionato nella root progetto.');
}
