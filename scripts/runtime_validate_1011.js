const fs=require('fs'); const path=require('path'); const root=process.cwd();
const RELEASE='AT-MEC_HM_10.1.1_VEXON_TESTMODE_BRANDING_FIX_STABLE_MEASUREMENT';
function exists(p){return fs.existsSync(path.join(root,p));}
function read(p,def={}){try{return JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));}catch{return def;}}
function text(p){try{return fs.readFileSync(path.join(root,p),'utf8');}catch{return '';}}
const checks=[]; function add(label,ok,detail=''){checks.push({label,ok:!!ok,detail});}
const pkg=read('package.json'), lock=read('package-lock.json'), users=read('config/users.json');
const index=text('src/renderer/index.html'), brandJs=text('src/renderer/js/modules/ui/vexon-branding-101.js'), brandCss=text('src/renderer/css/modules/44-vexon-name-101.css');
const engine=text('src/main/runtime/RecipeEngine.ts'), engineJs=text('dist/main/runtime/RecipeEngine.js');
add('package VEXON 10.1.1',pkg.version==='10.1.1' && pkg.name==='vexon-industrial-test-platform-10-1-1',`${pkg.name} ${pkg.version}`);
add('package-lock 10.1.1',lock.version==='10.1.1' && lock.packages && lock.packages[''] && lock.packages[''].version==='10.1.1','package-lock root');
add('runtime script 10.1.1',pkg.scripts && pkg.scripts['runtime:validate']==='node scripts/runtime_validate_1011.js','package script');
add('startup doctor 10.1.1',pkg.scripts && pkg.scripts['startup:doctor']==='node scripts/startup_doctor_1011.js','package script');
add('MIRZA icon present',exists('assets/icon.ico') && exists('assets/MIRZA.png'),'app icon remains MIRZA');
add('MEC/MIRZA original assets kept',exists('assets/MEC.PNG')&&exists('assets/MIRZA.png')&&exists('assets/MIRZA_LOGO.png'),'logos kept');
add('VEXON small logo assets',exists('src/renderer/assets/VEXON_MARK.png')&&exists('src/renderer/assets/VEXON_LOGO.png'),'mini logo near name');
add('topbar center brand present',/vexon-global-top-brand/.test(index)&&/vexon-prod-top-brand/.test(index),'center name in main/test top bars');
add('no invasive page brand injection',!/vexon-page-brand/.test(index+brandJs+brandCss)&&!/querySelectorAll\('\.tab-content'\)/.test(brandJs)&&!/prod-test-body/.test(brandJs),'Test Mode grid not touched');
add('Test Mode title not expanded by branding JS',!/prod-test-title h1/.test(brandJs)&&/<h1>TEST MODE<\/h1>/.test(index),'safe h1');
add('VEXON logo has white background styling',/vexon-mark-box/.test(index)&&/background:#fff/.test(brandCss),'white logo box');
add('StableMeasurement in wizard',/StableMeasurement/.test(index)&&/stable_measurement/.test(index),'wizard option');
add('StableMeasurement engine TS',/executeStableMeasurement/.test(engine)&&/'StableMeasurement'/.test(engine),'TS engine');
add('StableMeasurement engine dist',/executeStableMeasurement/.test(engineJs)&&/case 'StableMeasurement'/.test(engineJs),'dist engine');
add('fail policy UI',/w-on-fail/.test(index)&&/stop_on_fail/.test(text('src/renderer/js/modules/core/app-legacy-01-state-navigation.js')),'stop/continue');
add('Admin/Tecnico presenti',Array.isArray(users.users)&&users.users.some(u=>u.username==='Admin')&&users.users.some(u=>u.username==='Tecnico'),'login users');
add('BAT VEXON 10.1.1 presenti',exists('AVVIA_VEXON_10.1.1.bat')&&exists('INSTALLA_VEXON_10.1.1.bat')&&exists('CREA_INSTALLER_WINDOWS_VEXON_10.1.1.bat'),'bat');
const score=Math.round(checks.filter(c=>c.ok).length/checks.length*100); const report={version:RELEASE,createdAt:new Date().toISOString(),score,checks}; fs.mkdirSync(path.join(root,'docs/quality'),{recursive:true}); fs.writeFileSync(path.join(root,'docs/quality/AT_MEC_HM_10_1_1_RUNTIME_VALIDATION.json'),JSON.stringify(report,null,2));
console.log('AT-MEC_HM_10.1.1 runtime validation'); checks.forEach(c=>console.log(`${c.ok?'OK  ':'FAIL'} ${c.label}${c.detail?' - '+c.detail:''}`)); console.log(`SCORE ${score}%`); if(checks.some(c=>!c.ok))process.exit(1);
