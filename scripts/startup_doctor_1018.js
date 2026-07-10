const fs=require('fs'); const path=require('path'); const root=process.cwd();
const required=['package.json','dist/main/main.js','src/renderer/index.html','src/renderer/js/modules/ui/action-live-measurement-1012.js','src/renderer/css/modules/45-action-live-measurement-1012.css','assets/icon.ico','assets/MIRZA.png','assets/MEC.PNG','config/users.json','drivers'];
let ok=true; console.log('VEXON 10.1.8 startup doctor');
for(const p of required){const e=fs.existsSync(path.join(root,p)); console.log((e?'OK  ':'FAIL')+p); if(!e)ok=false;}
try{const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8')); console.log('VERSION '+pkg.version+' '+pkg.name); if(pkg.version!=='10.1.8')ok=false;}catch(e){ok=false;}
if(!fs.existsSync(path.join(root,'node_modules','electron'))) console.log('WARN electron/node_modules non presente: eseguire npm install prima dell\'avvio.');
process.exit(ok?0:1);
