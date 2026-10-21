import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { readdirSync } from 'node:fs';
const files = {'/':'index.html','/style.css':'style.css','/app.js':'app.js','/barcode.js':'barcode.js','/photo.js':'photo.js','/preview.js':'preview.js','/ocr.js':'ocr.js','/scan.js':'scan.js','/ocr/tesseract.min.js':'node_modules/tesseract.js/dist/tesseract.min.js','/ocr/worker.min.js':'node_modules/tesseract.js/dist/worker.min.js','/ocr-lang/eng.traineddata.gz':'node_modules/@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz'};
for (const name of readdirSync(new URL('node_modules/tesseract.js-core/',import.meta.url))) {
  if (/^tesseract-core[\w.-]+\.(js|wasm)$/.test(name)) files['/ocr-core/'+name]='node_modules/tesseract.js-core/'+name;
}
const types = {html:'text/html; charset=utf-8',css:'text/css',js:'text/javascript',wasm:'application/wasm',gz:'application/gzip'};
http.createServer(async (req,res) => {
  const pathname = new URL(req.url,'http://localhost').pathname;
  const path = Object.hasOwn(files,pathname) ? files[pathname] : null;
  if (!path) { res.writeHead(404); res.end('Not found'); return; }
  try {
    const body = await readFile(new URL(path,import.meta.url));
    res.writeHead(200, {'Content-Type':types[path.split('.').pop()]}); res.end(body);
  } catch { res.writeHead(500); res.end('Unable to load page'); }
}).listen(Number(process.env.PORT || 3000),'0.0.0.0', () => console.log('CapyCapy listening on port '+(process.env.PORT || 3000)));
