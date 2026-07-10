const fs=require('fs'); const path=require('path'); const root=process.cwd();
const RELEASE='AT-MEC_HM_10.1.8_STABLE_MEASUREMENT_CLEAN_OPERATOR_POPUP_FAST_UI_FIX';
function exists(p){return fs.existsSync(path.join(root,p));}
function read(p,def={}){try{return JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));}catch{return def;}}
function text(p){try{return fs.readFileSync(path.join(root,p),'utf8');}catch{return '';}}
const checks=[]; const add=(label,ok,detail='')=>checks.push({label,ok:!!ok,detail});
const pkg=read('package.json'), lock=read('package-lock.json'), users=read('config/users.json');
const engine=text('src/main/runtime/RecipeEngine.ts'), engineJs=text('dist/main/runtime/RecipeEngine.js');
const actionJs=text('src/renderer/js/modules/ui/action-live-measurement-1012.js');
const actionCss=text('src/renderer/css/modules/45-action-live-measurement-1012.css');
const index=text('src/renderer/index.html');
const ux66d=text('src/renderer/js/modules/ui/test-mode-ux-66d.js');
const start67f=text('src/renderer/js/modules/ui/test-mode-start-workflow-66e-fix1e.js');
const label=text('src/renderer/js/modules/labels/label-manager-420a1.js');
add('package VEXON 10.1.8',pkg.version==='10.1.8' && pkg.name==='vexon-industrial-test-platform-10-1-8',`${pkg.name} ${pkg.version}`);
add('package-lock 10.1.8',lock.version==='10.1.8' && lock.packages && lock.packages[''] && lock.packages[''].version==='10.1.8','package-lock root');
add('runtime script 10.1.8',pkg.scripts && pkg.scripts['runtime:validate']==='node scripts/runtime_validate_1018.js','package script');
add('startup doctor 10.1.8',pkg.scripts && pkg.scripts['startup:doctor']==='node scripts/startup_doctor_1018.js','package script');
add('MIRZA icon unchanged',exists('assets/icon.ico') && exists('assets/MIRZA.png'),'app icon remains MIRZA');
add('MEC/MIRZA assets kept',exists('assets/MEC.PNG')&&exists('assets/MIRZA.png')&&exists('assets/MIRZA_LOGO.png'),'logos kept');
add('VEXON name/logo only',exists('src/renderer/assets/VEXON_MARK.png')&&/vexon-global-top-brand/.test(index),'name brand present');
add('StableMeasurement engine present',/executeStableMeasurement/.test(engine)&&/StableMeasurement/.test(engineJs),'engine/dist');
add('Step label emitted to action popup',/step_label: step\.label/.test(engine)&&/step_label: step\.label/.test(engineJs),'label in live payload');
add('Polling 100ms live',/Math\.max\(100, requestedSampleMs\)/.test(engine)&&/sample_interval_ms/.test(engineJs),'polling min 100');
add('Fast auto advance immediate',/pass automatico immediato/.test(engine)&&/auto_advance/.test(engineJs),'immediate pass');
add('Clean popup 10.1.8',/vx1018-live-popup/.test(actionJs)&&/Misura attesa/.test(actionJs)&&/Misura multimetro live/.test(actionJs),'clean popup');
add('Retry multimetro',/retryStableMeasurement1018/.test(actionJs)&&/RIPROVA MULTIMETRO/.test(actionJs),'retry button');
add('Manual fallback in same popup',/submitManualFallback1018/.test(actionJs)&&/Inserimento manuale solo in caso di FAIL/.test(actionJs),'manual same popup');
add('Hide popup on run complete',/run-completed/.test(actionJs)&&/hideStableNow/.test(actionJs),'cleanup');
add('Legacy manual UI guarded',/stableLiveActive66d/.test(ux66d)&&/vexon-stable-live-active/.test(start67f),'guards');
add('Label skip empty serial WO',/seriale\/WO non valorizzati/.test(label),'label noise guard');
add('BAT VEXON 10.1.8 presenti',exists('AVVIA_VEXON_10.1.8.bat')&&exists('INSTALLA_VEXON_10.1.8.bat')&&exists('CREA_INSTALLER_WINDOWS_VEXON_10.1.8.bat'),'bat');
add('Admin/Tecnico presenti',Array.isArray(users.users)&&users.users.some(u=>u.username==='Admin')&&users.users.some(u=>u.username==='Tecnico'),'login users');
const score=Math.round(checks.filter(c=>c.ok).length/checks.length*100);
const report={version:RELEASE,createdAt:new Date().toISOString(),score,checks}; fs.mkdirSync(path.join(root,'docs/quality'),{recursive:true}); fs.writeFileSync(path.join(root,'docs/quality/AT_MEC_HM_10_1_8_RUNTIME_VALIDATION.json'),JSON.stringify(report,null,2));
console.log('AT-MEC_HM_10.1.8 runtime validation'); checks.forEach(c=>console.log(`${c.ok?'OK  ':'FAIL'} ${c.label}${c.detail?' - '+c.detail:''}`)); console.log(`SCORE ${score}%`); if(checks.some(c=>!c.ok))process.exit(1);
