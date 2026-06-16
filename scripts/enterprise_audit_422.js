const fs=require('fs');const path=require('path');
const root=path.resolve(__dirname,'..');
const required=['package.json','src/renderer/index.html','src/renderer/js/version.js','src/renderer/js/modules/printers/print-engine-420a5.js','src/renderer/js/modules/audio/audio-voice-421ab.js','src/renderer/js/modules/factory/work-order-product-60.js','src/renderer/js/modules/factory/revision-firmware-61.js','src/renderer/js/modules/core/enterprise-stable-422.js','src/renderer/partials/enterprise-stable-422.html'];
function exists(p){return fs.existsSync(path.join(root,p));}
function lines(p){return exists(p)?fs.readFileSync(path.join(root,p),'utf8').split(/\r?\n/).length:0;}
const checks=required.map(p=>({file:p,exists:exists(p),lines:lines(p)}));
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
const index=fs.readFileSync(path.join(root,'src/renderer/index.html'),'utf8');
const versionOk=pkg.version==='4.22.0'&&/4\.22/.test(index)&&/ENTERPRISE STABLE/.test(index);
const report={release:'AT-MEC_HM_4.22_ENTERPRISE_STABLE',createdAt:new Date().toISOString(),versionOk,package:{name:pkg.name,version:pkg.version,description:pkg.description,productName:pkg.productName},checks};
const out=path.join(root,'docs','AT_MEC_HM_4_22_ENTERPRISE_AUDIT.json');fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2)); if(!versionOk||checks.some(c=>!c.exists)) process.exitCode=1;
