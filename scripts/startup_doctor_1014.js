const fs=require('fs'); const path=require('path'); const root=process.cwd();
function exists(p){return fs.existsSync(path.join(root,p));}
function electronBinaryExists(){return exists('node_modules/electron/dist/electron.exe')||exists('node_modules/.bin/electron')||exists('node_modules/.bin/electron.cmd');}
const checks=[]; const add=(label,ok,detail='')=>checks.push({label,ok:!!ok,detail});
add('package.json',exists('package.json'),'root');
add('dist/main/main.js',exists('dist/main/main.js'),'electron main');
add('dist/main/runtime/RecipeEngine.js',exists('dist/main/runtime/RecipeEngine.js'),'recipe engine');
add('dist/main/hal/DeviceManager.js',exists('dist/main/hal/DeviceManager.js'),'device manager');
add('renderer index',exists('src/renderer/index.html'),'ui');
add('MIRZA icon',exists('assets/icon.ico'),'app icon');
add('VEXON mark',exists('src/renderer/assets/VEXON_MARK.png'),'name logo');
add('action live measurement JS',exists('src/renderer/js/modules/ui/action-live-measurement-1012.js'),'retry misura');
add('config users',exists('config/users.json'),'Admin/Tecnico');
add('drivers folder',exists('drivers/CHECK_DRIVER_HARDWARE_10.0.bat'),'drivers optional');
add('electron',electronBinaryExists(),'node_modules');
const critical=!exists('package.json')||!exists('dist/main/main.js')||!exists('dist/main/runtime/RecipeEngine.js')||!exists('src/renderer/index.html')||!exists('config/users.json')||!exists('assets/icon.ico');
const electronMissing=!electronBinaryExists();
const report={version:'AT-MEC_HM_10.1.4_KEYSIGHT_SAFE_STABLE_MEASUREMENT_AND_USED_INSTRUMENTS_FIX',createdAt:new Date().toISOString(),checks,criticalMissing:critical,electronMissing};
fs.mkdirSync(path.join(root,'docs/quality'),{recursive:true}); fs.writeFileSync(path.join(root,'docs/quality/AT_MEC_HM_10_1_4_STARTUP_DOCTOR.json'),JSON.stringify(report,null,2));
console.log('AT-MEC_HM_10.1.4 startup doctor'); checks.forEach(c=>console.log(`${c.ok?'OK  ':'WARN'} ${c.label}${c.detail?' - '+c.detail:''}`)); if(critical)process.exit(2); if(electronMissing)process.exit(3); process.exit(0);
