const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const files = [
  'src/renderer/index.html',
  'src/renderer/css/app.css',
  'src/renderer/css/layout-editor.css',
  'src/renderer/js/app.js',
  'src/renderer/js/layout-editor.js',
  'src/renderer/js/version.js',
  'package.json'
];

function lineCount(file) {
  const txt = fs.readFileSync(path.join(root, file), 'utf8');
  return txt.split(/\r?\n/).length;
}

function countPattern(file, pattern) {
  const txt = fs.readFileSync(path.join(root, file), 'utf8');
  return (txt.match(pattern) || []).length;
}

console.log('AT-MEC HM Project Audit');
for (const f of files) {
  if (fs.existsSync(path.join(root, f))) console.log(`${f}: ${lineCount(f)} lines`);
}
console.log('CSS !important:', countPattern('src/renderer/css/app.css', /!important/g) + countPattern('src/renderer/css/layout-editor.css', /!important/g));
console.log('Inline onclick:', countPattern('src/renderer/index.html', /onclick=/g));
console.log('Inline oninput:', countPattern('src/renderer/index.html', /oninput=/g));
