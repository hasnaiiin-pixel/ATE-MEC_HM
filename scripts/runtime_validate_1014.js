const fs=require('fs'); const path=require('path'); const root=process.cwd();
const RELEASE='AT-MEC_HM_10.1.4_KEYSIGHT_SAFE_STABLE_MEASUREMENT_AND_USED_INSTRUMENTS_FIX';
function exists(p){return fs.existsSync(path.join(root,p));}
function read(p,def={}){try{return JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));}catch{return def;}}
function text(p){try{return fs.readFileSync(path.join(root,p),'utf8');}catch{return '';}}
const checks=[]; const add=(label,ok,detail='')=>checks.push({label,ok:!!ok,detail});
const pkg=read('package.json'), lock=read('package-lock.json'), users=read('config/users.json');
const engine=text('src/main/runtime/RecipeEngine.ts'), engineJs=text('dist/main/runtime/RecipeEngine.js');
const deviceTs=text('src/main/hal/DeviceManager.ts'), deviceJs=text('dist/main/hal/DeviceManager.js');
const uiReq=text('src/renderer/js/modules/ui/app-legacy-02-dashboard-reports-ui.js');
const recipeUi=text('src/renderer/js/modules/recipes/app-legacy-04-recipes-runtime.js');
const actionJs=text('src/renderer/js/modules/ui/action-live-measurement-1012.js');
const index=text('src/renderer/index.html');
add('package VEXON 10.1.4',pkg.version==='10.1.4' && pkg.name==='vexon-industrial-test-platform-10-1-4',`${pkg.name} ${pkg.version}`);
add('package-lock 10.1.4',lock.version==='10.1.4' && lock.packages && lock.packages[''] && lock.packages[''].version==='10.1.4','package-lock root');
add('runtime script 10.1.4',pkg.scripts && pkg.scripts['runtime:validate']==='node scripts/runtime_validate_1014.js','package script');
add('startup doctor 10.1.4',pkg.scripts && pkg.scripts['startup:doctor']==='node scripts/startup_doctor_1014.js','package script');
add('MIRZA icon unchanged',exists('assets/icon.ico') && exists('assets/MIRZA.png'),'app icon remains MIRZA');
add('MEC/MIRZA assets kept',exists('assets/MEC.PNG')&&exists('assets/MIRZA.png')&&exists('assets/MIRZA_LOGO.png'),'logos kept');
add('VEXON name/logo only',exists('src/renderer/assets/VEXON_MARK.png')&&/vexon-global-top-brand/.test(index),'name brand present');
add('StableMeasurement engine present',/executeStableMeasurement/.test(engine)&&/StableMeasurement/.test(engineJs),'engine/dist');
add('Keysight safe prepare once',/prepareStableMeasurementDevice/.test(engine)&&/CONF:RES/.test(engine)&&/READ\?/.test(engine),'safe prepare');
add('Keysight protected polling',/requestedSampleMs/.test(engine)&&/Math\.max\(650/.test(engine)&&/requested_sample_interval_ms/.test(engineJs),'polling min');
add('Keysight overload handled',/OVERLOAD/.test(engine)&&/1e30/.test(engine)&&/OVERLOAD/.test(actionJs),'overload invalid value');
add('Retry clears and prepares Keysight',/preparedRead = await this\.prepareStableMeasurementDevice\(step, measurementDevice\)/.test(engine),'retry prepare');
add('Test Mode Action not layout invasive',/atmec1012-action-live/.test(actionJs)&&!/prod-test-body/.test(actionJs),'additive action panel');
add('Backend PL303 not required by stale power_metadata',/hasRealPl303Step/.test(deviceTs)&&/power_metadata vecchio/.test(deviceTs)&&/PL303_PROGRAMMABLE' && hasRealPl303Step/.test(deviceTs),'backend required instruments');
add('Engine PL303 not powered by stale metadata',/resolvePowerSource/.test(engine)&&/hasPowerSupplyStep \? 'PL303_PROGRAMMABLE' : 'MANUAL_POWER'/.test(engine),'engine power source');
add('Frontend required instruments hides unused PL303',/hasRealPl303Step/.test(uiReq)&&/non mostrare\/validare PL303/.test(uiReq),'test mode used instruments');
add('Recipe mini instruments hides unused PL303',/Nessuno strumento automatico richiesto/.test(recipeUi)&&/hasPl303Step/.test(recipeUi),'recipe mini');
add('Keysight aliases still present',/Keysight_34461A/.test(deviceTs)&&/multimetro/.test(deviceTs)&&/34461/.test(deviceTs),'aliases');
add('Admin/Tecnico presenti',Array.isArray(users.users)&&users.users.some(u=>u.username==='Admin')&&users.users.some(u=>u.username==='Tecnico'),'login users');
add('BAT VEXON 10.1.4 presenti',exists('AVVIA_VEXON_10.1.4.bat')&&exists('INSTALLA_VEXON_10.1.4.bat')&&exists('CREA_INSTALLER_WINDOWS_VEXON_10.1.4.bat'),'bat');
const score=Math.round(checks.filter(c=>c.ok).length/checks.length*100);
const report={version:RELEASE,createdAt:new Date().toISOString(),score,checks}; fs.mkdirSync(path.join(root,'docs/quality'),{recursive:true}); fs.writeFileSync(path.join(root,'docs/quality/AT_MEC_HM_10_1_4_RUNTIME_VALIDATION.json'),JSON.stringify(report,null,2));
console.log('AT-MEC_HM_10.1.4 runtime validation'); checks.forEach(c=>console.log(`${c.ok?'OK  ':'FAIL'} ${c.label}${c.detail?' - '+c.detail:''}`)); console.log(`SCORE ${score}%`); if(checks.some(c=>!c.ok))process.exit(1);
