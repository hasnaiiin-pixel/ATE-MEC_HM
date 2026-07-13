const fs=require('fs');
const path=require('path');
const root=path.join(__dirname,'..');
let ok=true;
console.log('VEXON 10.1.13 startup doctor');
function check(label,cond,detail='') { console.log((cond?'OK   ':'WARN ')+label+(detail?' - '+detail:'')); if(!cond && !/node_modules/.test(label)) ok=false; }
try{const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8')); check('package version',pkg.version==='10.1.13',pkg.version+' '+pkg.name);}catch(e){check('package version',false,e.message)}
check('main compiled',fs.existsSync(path.join(root,'dist/main/main.js')),'dist/main/main.js');
check('preload compiled',fs.existsSync(path.join(root,'dist/main/preload.js')),'dist/main/preload.js');
check('renderer index',fs.existsSync(path.join(root,'src/renderer/index.html')),'src/renderer/index.html');
check('recipe GPIO hold runtime',/applyStepMeasurementGpioBefore/.test(fs.readFileSync(path.join(root,'dist/main/runtime/RecipeEngine.js'),'utf8')),'GPIO held during measurement step');
check('recipe GPIO hold editor',/renderMeasurementGpioHoldEditor10113/.test(fs.readFileSync(path.join(root,'src/renderer/js/modules/recipes/app-legacy-04-recipes-runtime.js'),'utf8')),'Recipe Editor fields');
check('runtime validation script',fs.existsSync(path.join(root,'scripts/runtime_validate_10113.js')),'runtime_validate_10113.js');
check('current README',fs.existsSync(path.join(root,'README_AT-MEC_HM_10.1.13_RECIPE_GPIO_HOLD_MEASURE_LIVE_FIX.md')),'release README');
check('node_modules/electron',fs.existsSync(path.join(root,'node_modules/electron')),'se assente eseguire npm install');
console.log(ok?'STARTUP DOCTOR OK':'STARTUP DOCTOR WARN/FAIL');
if(!ok) process.exit(1);
