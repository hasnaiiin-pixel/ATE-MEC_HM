const fs=require('fs'); const path=require('path'); const root=process.cwd();
const RELEASE='AT-MEC_HM_10.0_ENTERPRISE_STABLE_CLEAN_PRODUCTION_WITH_DRIVERS';
function exists(p){return fs.existsSync(path.join(root,p));}
function read(p,def={}){try{return JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));}catch{return def;}}
function text(p){try{return fs.readFileSync(path.join(root,p),'utf8');}catch{return '';}}
const checks=[]; function add(label,ok,detail=''){checks.push({label,ok:!!ok,detail});}
const pkg=read('package.json'), lock=read('package-lock.json'), users=read('config/users.json'), local=read('database/ate_mec_local_db.json'), ent=read('database/ate_mec_enterprise_db.json');
add('package 10.0',pkg.version==='10.0' && /10-0-enterprise-stable-clean-production-with-drivers/.test(pkg.name||''),`${pkg.name} ${pkg.version}`);
add('package-lock 10.0',lock.version==='10.0' && lock.packages && lock.packages[''] && lock.packages[''].version==='10.0','package-lock root');
add('runtime script 10.0',pkg.scripts && pkg.scripts['runtime:validate']==='node scripts/runtime_validate_100.js','package script');
add('startup doctor 10.0',pkg.scripts && pkg.scripts['startup:doctor']==='node scripts/startup_doctor_100.js','package script');
add('utenti produzione presenti',Array.isArray(users.users)&&users.users.length===2&&users.users.some(u=>u.username==='Admin')&&users.users.some(u=>u.username==='Tecnico'),'Admin/Tecnico');
add('Admin livello 100',users.roles&&users.roles.Admin&&users.roles.Admin.level===100&&(users.roles.Admin.permissions||[]).includes('manage_users'),'Admin full');
add('Tecnico limitato',users.roles&&users.roles.Tecnico&&users.roles.Tecnico.level===30&&!(users.roles.Tecnico.permissions||[]).includes('manage_users'),'Tecnico no manage_users');
add('database locale pulito',Array.isArray(local.recipes)&&local.recipes.length===0&&Array.isArray(local.testReports)&&local.testReports.length===0&&Array.isArray(local.repairs)&&local.repairs.length===0,'recipes/testReports/repairs zero');
const t=ent.tables||{}; add('database enterprise pulito',Array.isArray(t.recipes)&&t.recipes.length===0&&Array.isArray(t.test_results)&&t.test_results.length===0&&Array.isArray(t.repairs)&&t.repairs.length===0&&Array.isArray(t.users)&&t.users.length===2,'enterprise zero dati produzione');
add('recipes pulite',exists('recipes/README_PRODUCTION_CLEAN.txt') && !fs.readdirSync(path.join(root,'recipes')).some(f=>/\.json$/i.test(f)),'nessuna ricetta json');
add('certificati puliti',exists('certificates/README_PRODUCTION_CLEAN.txt') && !fs.readdirSync(path.join(root,'certificates')).some(f=>/\.pdf$/i.test(f)),'nessun pdf storico');
add('drivers manager presente',exists('drivers/INSTALLA_DRIVER_HARDWARE_10.0.bat')&&exists('drivers/CHECK_DRIVER_HARDWARE_10.0.bat')&&exists('drivers/README_DRIVER_HARDWARE_10.0.md'),'driver scripts');
add('BAT 10.0 presenti',exists('INSTALLA_AT_MEC_HM_10.0_ENTERPRISE_STABLE_CLEAN_PRODUCTION_WITH_DRIVERS.bat')&&exists('AVVIA_AT_MEC_HM_10.0_ENTERPRISE_STABLE_CLEAN_PRODUCTION_WITH_DRIVERS.bat')&&exists('CREA_INSTALLER_WINDOWS_10.0_ENTERPRISE_STABLE_CLEAN_PRODUCTION_WITH_DRIVERS.bat'),'install/avvia/installer');
add('index 10.0',/10\.0 ENTERPRISE STABLE CLEAN PRODUCTION WITH DRIVERS/.test(text('src/renderer/index.html')),'title');
add('version.js 10.0',/AT-MEC_HM_10\.0_ENTERPRISE_STABLE_CLEAN_PRODUCTION_WITH_DRIVERS/.test(text('src/renderer/js/version.js')),'version label');
add('legacy 6.0/6.1 fuori runtime',!/work-order-product-60\.js|revision-firmware-61\.js/.test(text('src/renderer/index.html')),'no legacy runtime');
const score=Math.round(checks.filter(c=>c.ok).length/checks.length*100); const report={version:RELEASE,createdAt:new Date().toISOString(),score,checks}; fs.mkdirSync(path.join(root,'docs/quality'),{recursive:true}); fs.writeFileSync(path.join(root,'docs/quality/AT_MEC_HM_10_0_RUNTIME_VALIDATION.json'),JSON.stringify(report,null,2));
console.log('AT-MEC_HM_10.0 runtime validation'); checks.forEach(c=>console.log(`${c.ok?'OK  ':'FAIL'} ${c.label}${c.detail?' - '+c.detail:''}`)); console.log(`SCORE ${score}%`); if(checks.some(c=>!c.ok))process.exit(1);
