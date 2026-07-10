const fs=require('fs'); const path=require('path'); const root=process.cwd();
const RELEASE='AT-MEC_HM_10.1.7_STABLE_MEASUREMENT_LIVE_POPUP_FAST_UI_ENGINE_FIX';
function exists(p){return fs.existsSync(path.join(root,p));}
function read(p,def={}){try{return JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));}catch{return def;}}
function text(p){try{return fs.readFileSync(path.join(root,p),'utf8');}catch{return '';}}
const checks=[]; const add=(label,ok,detail='')=>checks.push({label,ok:!!ok,detail});
const pkg=read('package.json'), lock=read('package-lock.json'), users=read('config/users.json');
const engine=text('src/main/runtime/RecipeEngine.ts'), engineJs=text('dist/main/runtime/RecipeEngine.js');
const actionJs=text('src/renderer/js/modules/ui/action-live-measurement-1012.js');
const actionCss=text('src/renderer/css/modules/45-action-live-measurement-1012.css');
const index=text('src/renderer/index.html');
add('package VEXON 10.1.7',pkg.version==='10.1.7' && pkg.name==='vexon-industrial-test-platform-10-1-7',`${pkg.name} ${pkg.version}`);
add('package-lock 10.1.7',lock.version==='10.1.7' && lock.packages && lock.packages[''] && lock.packages[''].version==='10.1.7','package-lock root');
add('runtime script 10.1.7',pkg.scripts && pkg.scripts['runtime:validate']==='node scripts/runtime_validate_1017.js','package script');
add('startup doctor 10.1.7',pkg.scripts && pkg.scripts['startup:doctor']==='node scripts/startup_doctor_1017.js','package script');
add('MIRZA icon unchanged',exists('assets/icon.ico') && exists('assets/MIRZA.png'),'app icon remains MIRZA');
add('MEC/MIRZA assets kept',exists('assets/MEC.PNG')&&exists('assets/MIRZA.png')&&exists('assets/MIRZA_LOGO.png'),'logos kept');
add('VEXON name/logo only',exists('src/renderer/assets/VEXON_MARK.png')&&/vexon-global-top-brand/.test(index),'name brand present');
add('StableMeasurement engine present',/executeStableMeasurement/.test(engine)&&/StableMeasurement/.test(engineJs),'engine/dist');
add('Keysight safe prepare once',/prepareStableMeasurementDevice/.test(engine)&&/CONF:RES/.test(engine)&&/READ\?/.test(engine),'safe prepare');
add('Polling 100ms live',/Math\.max\(100, requestedSampleMs\)/.test(engine)&&/sample_interval_ms/.test(engineJs),'polling min 100');
add('Manual mode bypass for Keysight live',/instrumentLiveMode/.test(engine)&&/measurement_mode === 'manual' && !instrumentLiveMode/.test(engine),'manual old recipes stay auto with Keysight');
add('Fast auto advance immediate',/pass automatico immediato/.test(engine)&&/auto_advance/.test(engineJs),'immediate pass');
add('Popup live 10.1.7',/vx1017-live-popup/.test(actionJs)&&/requestAnimationFrame/.test(actionJs)&&/MISURA LIVE/.test(actionJs),'popup live');
add('Retry reset available',/retryStableMeasurement1017/.test(actionJs)&&/retryCurrentMeasurement/.test(actionJs),'retry button');
add('No full action redraw every sample',/setText\(/.test(actionJs)&&/lastText/.test(actionJs),'field update only');
add('CSS hides old right docks',/#production-test-mode #atmec1016-action-dock/.test(actionCss)&&/vx1017-live-popup/.test(actionCss),'scoped css');
add('Admin/Tecnico presenti',Array.isArray(users.users)&&users.users.some(u=>u.username==='Admin')&&users.users.some(u=>u.username==='Tecnico'),'login users');
add('BAT VEXON 10.1.7 presenti',exists('AVVIA_VEXON_10.1.7.bat')&&exists('INSTALLA_VEXON_10.1.7.bat')&&exists('CREA_INSTALLER_WINDOWS_VEXON_10.1.7.bat'),'bat');
const score=Math.round(checks.filter(c=>c.ok).length/checks.length*100);
const report={version:RELEASE,createdAt:new Date().toISOString(),score,checks}; fs.mkdirSync(path.join(root,'docs/quality'),{recursive:true}); fs.writeFileSync(path.join(root,'docs/quality/AT_MEC_HM_10_1_7_RUNTIME_VALIDATION.json'),JSON.stringify(report,null,2));
console.log('AT-MEC_HM_10.1.7 runtime validation'); checks.forEach(c=>console.log(`${c.ok?'OK  ':'FAIL'} ${c.label}${c.detail?' - '+c.detail:''}`)); console.log(`SCORE ${score}%`); if(checks.some(c=>!c.ok))process.exit(1);
