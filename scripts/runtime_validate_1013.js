const fs=require('fs'); const path=require('path'); const root=process.cwd();
const RELEASE='AT-MEC_HM_10.1.3_KEYSIGHT_STABLE_MEASUREMENT_BINDING_FIX';
function exists(p){return fs.existsSync(path.join(root,p));}
function read(p,def={}){try{return JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));}catch{return def;}}
function text(p){try{return fs.readFileSync(path.join(root,p),'utf8');}catch{return '';}}
const checks=[]; function add(label,ok,detail=''){checks.push({label,ok:!!ok,detail});}
const pkg=read('package.json'), lock=read('package-lock.json'), users=read('config/users.json');
const index=text('src/renderer/index.html'), brandJs=text('src/renderer/js/modules/ui/vexon-branding-101.js'), brandCss=text('src/renderer/css/modules/44-vexon-name-101.css');
const engine=text('src/main/runtime/RecipeEngine.ts'), engineJs=text('dist/main/runtime/RecipeEngine.js');
const actionJs=text('src/renderer/js/modules/ui/action-live-measurement-1012.js'), actionCss=text('src/renderer/css/modules/45-action-live-measurement-1012.css'), preload=text('src/main/preload.ts'), preloadJs=text('dist/main/preload.js'), mainTs=text('src/main/main.ts'), mainJs=text('dist/main/main.js'), deviceTs=text('src/main/hal/DeviceManager.ts'), deviceJs=text('dist/main/hal/DeviceManager.js'), uiReq=text('src/renderer/js/modules/ui/app-legacy-02-dashboard-reports-ui.js');
add('package VEXON 10.1.3',pkg.version==='10.1.3' && pkg.name==='vexon-industrial-test-platform-10-1-3',`${pkg.name} ${pkg.version}`);
add('package-lock 10.1.3',lock.version==='10.1.3' && lock.packages && lock.packages[''] && lock.packages[''].version==='10.1.3','package-lock root');
add('runtime script 10.1.3',pkg.scripts && pkg.scripts['runtime:validate']==='node scripts/runtime_validate_1013.js','package script');
add('startup doctor 10.1.3',pkg.scripts && pkg.scripts['startup:doctor']==='node scripts/startup_doctor_1013.js','package script');
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
add('Action live measurement files',exists('src/renderer/js/modules/ui/action-live-measurement-1012.js')&&exists('src/renderer/css/modules/45-action-live-measurement-1012.css'),'action panel additivo');
add('Action live measurement included',/action-live-measurement-1012\.js/.test(index)&&/45-action-live-measurement-1012\.css/.test(index),'index includes');
add('Retry misura IPC',/retryCurrentMeasurement/.test(preload)&&/retryCurrentMeasurement/.test(preloadJs)&&/retry-current-measurement/.test(mainTs)&&/retry-current-measurement/.test(mainJs),'preload/main IPC');
add('Stable retry engine',/requestCurrentMeasurementRetry/.test(engine)&&/requestCurrentMeasurementRetry/.test(engineJs)&&/measurementRetrySeq/.test(engineJs),'engine retry');
add('Live stability timeout fields',/stable_elapsed_ms/.test(engineJs)&&/timeout_elapsed_ms/.test(engineJs)&&/timeout_ms/.test(engineJs),'live detail fields');
add('Action UI retry button',/retryStableMeasurement1012/.test(actionJs)&&/RIPROVA MISURA/.test(actionJs)&&/atmec1012-action-live/.test(actionCss),'UI retry');

add('Keysight aliases backend',/normalizeDeviceName/.test(deviceTs)&&/Keysight_34461A/.test(deviceJs)&&/multimetro/.test(deviceTs),'alias Keysight/Multimetro/DMM');
add('StableMeasurement requires Keysight',/StableMeasurement/.test(deviceTs)&&/StableMeasurement/.test(uiReq)&&/step\.type\)\) required\.add\(step\.device_mapping \|\| 'Keysight_34461A'\)/.test(uiReq),'recipe hardware gate');
add('StableMeasurement uses normalized device',/normalizeMeasurementDeviceName/.test(engine)&&/querySCPI\(this\.normalizeMeasurementDeviceName/.test(engine),'engine reads selected Keysight');
add('Action shows instrument name',/atmec1012-device/.test(actionJs)&&/Strumento utilizzato/.test(actionJs),'action live device label');
add('PL303 not default if unused',/resolvePowerSource/.test(engine)&&/MANUAL_POWER/.test(engine)&&!/const source = recipe\.power_metadata \|\| 'PL303_PROGRAMMABLE'/.test(engine),'power source explicit only');

add('fail policy UI',/w-on-fail/.test(index)&&/stop_on_fail/.test(text('src/renderer/js/modules/core/app-legacy-01-state-navigation.js')),'stop/continue');
add('Admin/Tecnico presenti',Array.isArray(users.users)&&users.users.some(u=>u.username==='Admin')&&users.users.some(u=>u.username==='Tecnico'),'login users');
add('BAT VEXON 10.1.3 presenti',exists('AVVIA_VEXON_10.1.3.bat')&&exists('INSTALLA_VEXON_10.1.3.bat')&&exists('CREA_INSTALLER_WINDOWS_VEXON_10.1.3.bat'),'bat');
const score=Math.round(checks.filter(c=>c.ok).length/checks.length*100); const report={version:RELEASE,createdAt:new Date().toISOString(),score,checks}; fs.mkdirSync(path.join(root,'docs/quality'),{recursive:true}); fs.writeFileSync(path.join(root,'docs/quality/AT_MEC_HM_10_1_3_RUNTIME_VALIDATION.json'),JSON.stringify(report,null,2));
console.log('AT-MEC_HM_10.1.3 runtime validation'); checks.forEach(c=>console.log(`${c.ok?'OK  ':'FAIL'} ${c.label}${c.detail?' - '+c.detail:''}`)); console.log(`SCORE ${score}%`); if(checks.some(c=>!c.ok))process.exit(1);
