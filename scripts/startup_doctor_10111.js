const fs=require('fs');
const path=require('path');
const root=path.join(__dirname,'..');
let ok=true;
console.log('VEXON 10.1.11 startup doctor');
function check(label,cond,detail='') { console.log((cond?'OK   ':'WARN ')+label+(detail?' - '+detail:'')); if(!cond && !/node_modules/.test(label)) ok=false; }
try{const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8')); check('package version',pkg.version==='10.1.11',pkg.version+' '+pkg.name);}catch(e){check('package version',false,e.message)}
check('main compiled',fs.existsSync(path.join(root,'dist/main/main.js')),'dist/main/main.js');
check('preload compiled',fs.existsSync(path.join(root,'dist/main/preload.js')),'dist/main/preload.js');
check('renderer index',fs.existsSync(path.join(root,'src/renderer/index.html')),'src/renderer/index.html');
check('manual fallback direct confirm js',fs.existsSync(path.join(root,'src/renderer/js/modules/ui/action-live-measurement-1012.js')),'action-live-measurement-1012.js');
check('manual race guard engine',/pendingManualResponses/.test(fs.readFileSync(path.join(root,'dist/main/runtime/RecipeEngine.js'),'utf8')),'RecipeEngine.js');
check('node_modules/electron',fs.existsSync(path.join(root,'node_modules/electron')),'se assente eseguire npm install');
check('runtime validation script',fs.existsSync(path.join(root,'scripts/runtime_validate_10111.js')),'runtime_validate_10111.js');
console.log(ok?'STARTUP DOCTOR OK':'STARTUP DOCTOR WARN/FAIL');
if(!ok) process.exit(1);
