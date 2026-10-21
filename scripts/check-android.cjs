const {chromium,devices}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 const page=await browser.newPage({...devices['Pixel 7'],deviceScaleFactor:2,reducedMotion:'reduce'});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 let workerLoads=0;page.on('request',r=>{if(r.url().endsWith('/ocr/worker.min.js'))workerLoads++;});
 await page.goto(process.env.CAPY_URL || 'http://127.0.0.1:3000');
 const png=await page.evaluate(()=>{
  const c=document.createElement('canvas');c.width=1400;c.height=2100;const x=c.getContext('2d');
  const g=x.createLinearGradient(0,0,c.width,c.height);g.addColorStop(0,'#c8c6ba');g.addColorStop(.6,'#f0eee6');g.addColorStop(1,'#bdbbb0');x.fillStyle=g;x.fillRect(0,0,c.width,c.height);
  const rows=['199766111676','840494208205','196723489588','15344212989','439128045868','840359637690','199593343462,199593416586','199100334051','199857020566','889945449354'];
  x.translate(20,0);x.rotate(.012);x.fillStyle='#32342e';x.font='28px Arial';
  rows.forEach((upc,i)=>{const y=190+i*165;x.fillText('A'+(7096853+i),140,y);x.fillText(upc,470,y);x.fillText('BRAND',1130,y);});
  return c.toDataURL('image/png').split(',')[1];
 });
 require('fs').writeFileSync('/tmp/capy-column-test.png',Buffer.from(png,'base64'));
 const file={name:'list.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')};
 await page.locator('#photo').setInputFiles(file);await page.waitForSelector('#crop-editor:not([hidden])');
 await page.click('#read-column');
 await page.waitForFunction(()=>!document.getElementById('read-column').disabled,{timeout:120000});
 console.log('FIRST:',await page.locator('#scan-status').innerText());
 console.log('TEXT:',await page.locator('#detected').inputValue());
 assert.equal(await page.locator('.barcode-card').count(),12);
 assert.equal(await page.locator('.stack-barcode canvas').count(),10);
 assert.equal(await page.locator('.correction').count(),1);
 assert.equal(await page.locator('.invalid-number').innerText(),'15344212989');
 const digits=await page.locator('.upc-digits').allTextContents();
 assert.deepEqual(digits,['199766111676','840494208205','196723489588','439128045868','840359637690','199593343462','199593416586','199100334051','199857020566','889945449354']);
 const check=await page.evaluate(async()=>{
   const {encodeUPC}=await import('/barcode.js');
   const c=document.querySelector('.stack-barcode canvas');const unit=c.width/119;const ctx=c.getContext('2d');
   let bits='';for(let i=0;i<95;i++){const p=ctx.getImageData(Math.floor((12+i+.5)*unit),10*unit,1,1).data;bits+=p[0]<128?'1':'0';}
   return {integer:Number.isInteger(unit),actual:bits,expected:encodeUPC('199766111676')};
 });assert.ok(check.integer);assert.equal(check.actual,check.expected);
 await page.evaluate(()=>document.querySelector('#stack-section').scrollIntoView({block:'start',behavior:'instant'}));await page.waitForTimeout(300);
 await page.screenshot({path:'/workspace/artifacts/capy-android-fixed.png'});
 await page.click('#next');await page.waitForTimeout(500);assert.equal(await page.locator('#position').innerText(),'2 / 11');
 await page.evaluate(()=>{const s=document.querySelector('#stack');s.scrollTop=s.scrollHeight;});await page.waitForTimeout(500);
 await page.getByRole('button',{name:'Scan more',exact:true}).click({noWaitAfter:true});
 await page.locator('#camera').setInputFiles(file);await page.waitForSelector('#crop-editor:not([hidden])');
 await page.click('#read-column');await page.waitForFunction(()=>!document.getElementById('read-column').disabled,{timeout:120000});
 console.log('WARM:',await page.locator('#scan-status').innerText());
 assert.equal(await page.locator('.stack-barcode canvas').count(),20);
 assert.equal(workerLoads,1,'must reuse OCR worker for Scan more');assert.deepEqual(errors,[]);
 console.log('PASS skewed shaded multi-column OCR, ignoring SKUs, comma pairs, incomplete digit review, exact canvas barcode pixels, Android navigation, and worker reuse.');
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
