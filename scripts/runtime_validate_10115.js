const fs=require('fs');
const path=require('path');
const cp=require('child_process');
const root=path.join(__dirname,'..');
const RELEASE='AT-MEC_HM_10.1.15_DMM_PERSISTENT_SESSION_MEASUREMENT_SPEED_FIX';
function exists(p){return fs.existsSync(path.join(root,p));}
function read(p){return fs.readFileSync(path.join(root,p),'utf8');}
const checks=[];
function add(label,ok,detail=''){checks.push({label,ok:!!ok,detail});}
const pkg=JSON.parse(read('package.json'));
const lock=JSON.parse(read('package-lock.json'));
const settings=JSON.parse(read('config/app_settings.json'));
const versionJs=read('src/renderer/js/version.js');
const deviceTs=read('src/main/hal/DeviceManager.ts');
const deviceJs=read('dist/main/hal/DeviceManager.js');
const engineTs=read('src/main/runtime/RecipeEngine.ts');
const engineJs=read('dist/main/runtime/RecipeEngine.js');
const bridge=read('scripts/keysight_visa_bridge.py');
add('package 10.1.15',pkg.version==='10.1.15'&&pkg.name==='vexon-industrial-test-platform-10-1-15',`${pkg.name} ${pkg.version}`);
add('package-lock 10.1.15',lock.version==='10.1.15'&&lock.packages?.['']?.version==='10.1.15','package-lock root');
add('renderer version 10.1.15',/AT_MEC_VERSION='10\.1\.15'/.test(versionJs)&&/PERSISTENT_SESSION/.test(versionJs),'version.js');
add('settings 10.1.15',settings.version==='10.1.15'&&/MEASUREMENT_SPEED_FIX/.test(settings.lastRelease||''),'app_settings');
add('Python VISA server persistent',/cmd == "server"/.test(bridge)&&/for raw_line in sys\.stdin/.test(bridge)&&/action == "batch"/.test(bridge),'single long-lived PyVISA session');
add('DeviceManager persistent TS',/startVisaPersistentSession/.test(deviceTs)&&/executeVisaPersistent/.test(deviceTs)&&/configureSCPI/.test(deviceTs),'TS HAL');
add('DeviceManager persistent dist',/startVisaPersistentSession/.test(deviceJs)&&/executeVisaPersistent/.test(deviceJs)&&/configureSCPI/.test(deviceJs),'compiled HAL');
add('DMM configuration cache TS',/dmmConfigurationCache/.test(engineTs)&&/dmmConfigurationKey/.test(engineTs)&&/10 \* 60 \* 1000/.test(engineTs),'cache by measurement mode');
add('DMM configuration cache dist',/dmmConfigurationCache/.test(engineJs)&&/dmmConfigurationKey/.test(engineJs),'compiled runtime');
add('No fixed 45ms prepare delay',!/setTimeout\(res => setTimeout\(res, 45\)/.test(engineTs)&&!/setTimeout\(res, 45\)/.test(engineTs),'removed repeated waits');
add('All DMM measures fast path',/executeFastDmmMeasurement/.test(engineTs)&&['VoltageMeasurement','CurrentMeasurement','ResistanceTest','FrequencyTest','AnalogInputMeasurement'].every(t=>engineTs.includes(`case '${t}'`)),'generic optimized path');
add('StableMeasurement uses SCPI batch',/hal\.configureSCPI/.test(engineTs)&&/readCommand: 'READ\?'/.test(engineTs),'prepare once then READ?');
add('GPIO duplicate write skip',/digitalOutputStates\[channel\] === state/.test(deviceTs)&&/scrittura saltata/.test(deviceTs),'GPIO state cache');
add('Step performance log',/step_performance/.test(engineTs)&&/dmm_prepare_ms/.test(engineTs)&&/\[RECIPE PERF\]/.test(engineTs),'timing telemetry');
let smoke={status:null,stdout:'',stderr:''};
try{
  smoke=cp.spawnSync(process.execPath,[path.join(root,'scripts/performance_smoke_10115.js'),path.join(root,'scripts/fixtures/2180321_performance.json')],{cwd:root,encoding:'utf8',timeout:15000});
}catch(e){smoke={status:99,stdout:'',stderr:String(e)}}
add('2180321 performance smoke',smoke.status===0,(smoke.stdout||smoke.stderr||'').trim().slice(-500));
add('README root current',exists('README.md')&&exists('README_AT-MEC_HM_10.1.15_DMM_PERSISTENT_SESSION_MEASUREMENT_SPEED_FIX.md')&&!exists('README_AT-MEC_HM_10.1.14_RECIPE_GPIO_PRESET_AUTO_CYCLE_FAST_FIX.md'),'current only');
add('BAT current 10.1.15',exists('AVVIA_VEXON_10.1.15.bat')&&exists('INSTALLA_VEXON_10.1.15.bat')&&exists('CREA_INSTALLER_WINDOWS_VEXON_10.1.15.bat'),'root launchers');
add('Excel history integrated',exists('docs/project_history/AT_MEC_HM_MAPPA_VERSIONI_RFQ_TEMPI_GRAFICI_10_1_15.xlsx')&&exists('docs/project_history/AT_MEC_HM_MAPPA_VERSIONI_RFQ_TEMPI_GRAFICI.xlsx'),'versioned + master');
add('Release notes',exists('docs/releases/README_AT-MEC_HM_10.1.15_DMM_PERSISTENT_SESSION_MEASUREMENT_SPEED_FIX.md'),'docs/releases');
const score=Math.round(checks.filter(c=>c.ok).length/checks.length*100);
const report={version:RELEASE,createdAt:new Date().toISOString(),score,checks};
fs.mkdirSync(path.join(root,'docs/quality'),{recursive:true});
fs.writeFileSync(path.join(root,'docs/quality/AT_MEC_HM_10_1_15_RUNTIME_VALIDATION.json'),JSON.stringify(report,null,2));
console.log('AT-MEC_HM_10.1.15 runtime validation');
checks.forEach(c=>console.log(`${c.ok?'OK  ':'FAIL'} ${c.label}${c.detail?' - '+c.detail:''}`));
console.log(`SCORE ${score}%`);
if(checks.some(c=>!c.ok)) process.exit(1);
