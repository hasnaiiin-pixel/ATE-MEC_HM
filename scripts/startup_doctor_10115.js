const fs=require('fs');
const path=require('path');
const cp=require('child_process');
const root=path.join(__dirname,'..');
let ok=true;
console.log('VEXON 10.1.15 startup doctor');
function check(label,cond,detail=''){console.log((cond?'OK   ':'WARN ')+label+(detail?' - '+detail:''));if(!cond&&!/node_modules/.test(label))ok=false;}
try{const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));check('package version',pkg.version==='10.1.15',pkg.version+' '+pkg.name);}catch(e){check('package version',false,e.message)}
check('main compiled',fs.existsSync(path.join(root,'dist/main/main.js')),'dist/main/main.js');
check('RecipeEngine fast compiled',/executeFastDmmMeasurement/.test(fs.readFileSync(path.join(root,'dist/main/runtime/RecipeEngine.js'),'utf8')),'DMM cache + timing');
check('DeviceManager VISA persistent compiled',/startVisaPersistentSession/.test(fs.readFileSync(path.join(root,'dist/main/hal/DeviceManager.js'),'utf8')),'persistent PyVISA');
check('Python bridge server',/for raw_line in sys\.stdin/.test(fs.readFileSync(path.join(root,'scripts/keysight_visa_bridge.py'),'utf8')),'server mode');
const py=cp.spawnSync(process.platform==='win32'?'py':'python3',process.platform==='win32'?['-3','-m','py_compile',path.join(root,'scripts/keysight_visa_bridge.py')]:['-m','py_compile',path.join(root,'scripts/keysight_visa_bridge.py')],{encoding:'utf8'});
check('Python bridge syntax',py.status===0,(py.stderr||'').trim());
check('runtime validation script',fs.existsSync(path.join(root,'scripts/runtime_validate_10115.js')),'runtime_validate_10115.js');
check('performance fixture',fs.existsSync(path.join(root,'scripts/fixtures/2180321_performance.json')),'2180321');
check('current README',fs.existsSync(path.join(root,'README_AT-MEC_HM_10.1.15_DMM_PERSISTENT_SESSION_MEASUREMENT_SPEED_FIX.md')),'release README');
check('Excel history',fs.existsSync(path.join(root,'docs/project_history/AT_MEC_HM_MAPPA_VERSIONI_RFQ_TEMPI_GRAFICI_10_1_15.xlsx')),'project history');
check('node_modules/electron',fs.existsSync(path.join(root,'node_modules/electron')),'se assente eseguire INSTALLA_VEXON_10.1.15.bat');
console.log(ok?'STARTUP DOCTOR OK':'STARTUP DOCTOR WARN/FAIL');
if(!ok)process.exit(1);
