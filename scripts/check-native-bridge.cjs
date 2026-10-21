const {chromium,devices}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 const page=await browser.newPage({...devices['Pixel 7'],deviceScaleFactor:2});
 let browserOcrLoads=0;const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.url().endsWith('worker.min.js'))browserOcrLoads++;});
 await page.addInitScript(()=>{
  window.nativeText='B0957766 199766111676 Free People\nB2226653 840494208205 DOEN\nAA981176 199593343462,199593416586 MARC FISHER';
  window.nativeCalls=[];
  window.CapyAndroid={recognizePhoto(id,left,right){window.nativeCalls.push({left,right});setTimeout(()=>window.dispatchEvent(new CustomEvent('capy-ocr',{detail:{id,text:window.nativeText,error:null}})),20);}};
 });
 await page.goto(process.env.CAPY_URL || 'http://127.0.0.1:3000');
 const png=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=800;c.height=1200;const x=c.getContext('2d');x.fillStyle='white';x.fillRect(0,0,800,1200);x.fillStyle='black';x.font='28px Arial';x.fillText('036000291452',100,100);return c.toDataURL('image/png').split(',')[1];});
 const file={name:'list.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')};
 await page.locator('#photo').setInputFiles(file);await page.waitForSelector('#crop-editor:not([hidden])');await page.click('#read-column');
 await page.waitForFunction(()=>!document.getElementById('read-column').disabled);
 assert.equal(await page.locator('.stack-barcode canvas').count(),4);
 assert.deepEqual(await page.locator('.upc-digits').allTextContents(),['199766111676','840494208205','199593343462','199593416586']);
 assert.deepEqual(await page.evaluate(()=>window.nativeCalls),[{left:0,right:100}]);assert.equal(browserOcrLoads,0);
 await page.evaluate(()=>{window.nativeText='93910804868';});
 await page.locator('#photo').setInputFiles(file);await page.waitForSelector('#crop-editor:not([hidden])');await page.click('#read-column');await page.waitForFunction(()=>!document.getElementById('read-column').disabled);
 assert.equal(await page.locator('#stack-section').isVisible(),false);
 assert.match(await page.locator('#scan-status').innerText(),/No complete, valid UPCs/);
 assert.equal(await page.locator('#detected').inputValue(),'93910804868');
 await page.click('#make-stack');assert.equal(await page.locator('#stack-section').isVisible(),false);assert.match(await page.locator('#scan-status').innerText(),/incomplete or have invalid check digits/);assert.deepEqual(errors,[]);
 console.log('PASS native bridge wiring, full-photo defaults, SKU filtering, comma pairs, zero browser OCR loads, and screenshot failure stays in review. Native engine accuracy is tested separately on Android.');
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
