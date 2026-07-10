const fs=require('fs');
const path=require('path');
const root=path.join(__dirname,'..');
const RELEASE='AT-MEC_HM_10.1.11_MANUAL_FALLBACK_DIRECT_CONFIRM_CLEAR_FIX';
function exists(p){return fs.existsSync(path.join(root,p));}
function read(p){return fs.readFileSync(path.join(root,p),'utf8');}
const checks=[];
function add(label,ok,detail=''){checks.push({label,ok:!!ok,detail});}
const pkg=JSON.parse(read('package.json'));
const lock=JSON.parse(read('package-lock.json'));
const actionJs=read('src/renderer/js/modules/ui/action-live-measurement-1012.js');
const engineJs=read('dist/main/runtime/RecipeEngine.js');
const css=read('src/renderer/css/modules/45-action-live-measurement-1012.css');
const versionJs=read('src/renderer/js/version.js');
const settings=JSON.parse(read('config/app_settings.json'));
add('package VEXON 10.1.11',pkg.version==='10.1.11' && pkg.name==='vexon-industrial-test-platform-10-1-11',`${pkg.name} ${pkg.version}`);
add('package-lock 10.1.11',lock.version==='10.1.11' && lock.packages && lock.packages[''] && lock.packages[''].version==='10.1.11','package-lock root');
add('runtime script 10.1.11',pkg.scripts && pkg.scripts['runtime:validate']==='node scripts/runtime_validate_10111.js','package script');
add('startup doctor 10.1.11',pkg.scripts && pkg.scripts['startup:doctor']==='node scripts/startup_doctor_10111.js','package script');
add('Version renderer 10.1.11',/AT_MEC_VERSION='10\.1\.11'/.test(versionJs)&&/DIRECT_CONFIRM_CLEAR_FIX/.test(versionJs),'version.js');
add('Settings 10.1.11',settings.version==='10.1.11' && /DIRECT_CONFIRM_CLEAR_FIX/.test(settings.lastRelease||''),'app_settings');
add('Direct manual response',/directManualStepResponse10111/.test(actionJs)&&/manualStepResponse/.test(actionJs),'direct api response');
add('Clear manual input after confirm',/clearManualFallbackInputs10111/.test(actionJs)&&/manual-step-value/.test(actionJs)&&/value='';/.test(actionJs),'clear input');
add('Manual value commit all fields',/writeManualValueEverywhere10111/.test(actionJs)&&/operator-measure-value/.test(actionJs),'commit all compatible fields');
add('Manual race guard engine',/pendingManualResponses/.test(engineJs)&&/manual_step_request/.test(engineJs),'engine race guard');
add('Manual double submit guard',/manualSubmitting/.test(actionJs)&&/CONFERMO/.test(actionJs),'double submit guard');
add('Manual CSS focus',/vx1018-manual-row input:focus/.test(css)&&/touch-action:manipulation/.test(css),'css focus');
add('BAT VEXON 10.1.11 presenti',exists('AVVIA_VEXON_10.1.11.bat')&&exists('INSTALLA_VEXON_10.1.11.bat')&&exists('CREA_INSTALLER_WINDOWS_VEXON_10.1.11.bat'),'bat');
add('Release notes 10.1.11',exists('docs/releases/README_'+RELEASE+'.md'),'release notes');
const score=Math.round(checks.filter(c=>c.ok).length/checks.length*100);
const report={version:RELEASE,createdAt:new Date().toISOString(),score,checks};
fs.mkdirSync(path.join(root,'docs/quality'),{recursive:true});
fs.writeFileSync(path.join(root,'docs/quality/AT_MEC_HM_10_1_11_RUNTIME_VALIDATION.json'),JSON.stringify(report,null,2));
console.log('AT-MEC_HM_10.1.11 runtime validation');
checks.forEach(c=>console.log(`${c.ok?'OK  ':'FAIL'} ${c.label}${c.detail?' - '+c.detail:''}`));
console.log(`SCORE ${score}%`);
if(checks.some(c=>!c.ok)) process.exit(1);
