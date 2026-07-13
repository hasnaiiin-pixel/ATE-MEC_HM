const fs=require('fs');
const path=require('path');
const root=path.join(__dirname,'..');
let ok=true;
console.log('VEXON 10.1.14 startup doctor');
function check(label,cond,detail=''){console.log((cond?'OK   ':'WARN ')+label+(detail?' - '+detail:''));if(!cond&&!/node_modules/.test(label))ok=false;}
try{const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));check('package version',pkg.version==='10.1.14',pkg.version+' '+pkg.name);}catch(e){check('package version',false,e.message)}
check('main compiled',fs.existsSync(path.join(root,'dist/main/main.js')),'dist/main/main.js');
check('preload compiled',fs.existsSync(path.join(root,'dist/main/preload.js')),'dist/main/preload.js');
check('renderer index',fs.existsSync(path.join(root,'src/renderer/index.html')),'src/renderer/index.html');
check('GPIO cycle controller',fs.existsSync(path.join(root,'src/renderer/js/modules/ui/recipe-gpio-cycle-10114.js')),'recipe-gpio-cycle-10114.js');
check('Recipe Editor profiles',/renderRecipeGpioCyclePanel10114/.test(fs.readFileSync(path.join(root,'src/renderer/js/modules/recipes/app-legacy-04-recipes-runtime.js'),'utf8')),'3 GPIO profiles + auto cycle');
check('DeviceManager compiled profiles',/hasRecipeGpioProfile10114/.test(fs.readFileSync(path.join(root,'dist/main/hal/DeviceManager.js'),'utf8')),'hardware requirement');
check('runtime validation script',fs.existsSync(path.join(root,'scripts/runtime_validate_10114.js')),'runtime_validate_10114.js');
check('current README',fs.existsSync(path.join(root,'README_AT-MEC_HM_10.1.14_RECIPE_GPIO_PRESET_AUTO_CYCLE_FAST_FIX.md')),'release README');
check('node_modules/electron',fs.existsSync(path.join(root,'node_modules/electron')),'se assente eseguire npm install');
console.log(ok?'STARTUP DOCTOR OK':'STARTUP DOCTOR WARN/FAIL');
if(!ok)process.exit(1);
