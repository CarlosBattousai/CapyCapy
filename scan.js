import {extractUPCs} from './photo.js';
import {normalizeUPC,barcodeSVG} from './barcode.js';
import {barcodePreview} from './preview.js';
import {getReader,prepareColumn} from './ocr.js';
const $ = id => document.getElementById(id);
let entries = [], observer, imageURL, active = 0, busy = false;
let append = false;
let photoMode = false;
const samples = '199766111676\n840494208205\n196723489588\n15344212989\n439128045868\n840359637690\n199593343462,199593416586\n199100334051\n199857020566\n889945449354';

function download(upc) {
  if (window.CapyAndroid) { window.CapyAndroid.saveSVG(barcodeSVG(upc),upc); return; }
  const url = URL.createObjectURL(new Blob([barcodeSVG(upc)],{type:'image/svg+xml'}));
  const link = document.createElement('a'); link.href=url; link.download=`upc-${upc}.svg`; link.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}

function updatePosition(index) {
  active=index;
  $('position').textContent=index === entries.length ? 'All done' : `${index+1} / ${entries.length}`;
  $('previous').disabled=index === 0;
  $('next').disabled=index === entries.length;
}
function go(index) {
  const card=$('stack').children[Math.max(0,Math.min(entries.length,index))];
  if (card) $('stack').scrollTo({top:card.offsetTop,behavior:'smooth'});
}
function render() {
  observer?.disconnect(); $('stack').replaceChildren();
  entries.forEach((entry,index) => {
    const card=document.createElement('article'); card.className='barcode-card'; card.dataset.index=index;
    const label=document.createElement('span'); label.className='step'; label.textContent=`UPC ${index+1} OF ${entries.length}`; card.append(label);
    if(entry.upc) {
      const barcode=document.createElement('div'); barcode.className='stack-barcode'; barcode.append(barcodePreview(entry.upc)); card.append(barcode);
      const note=document.createElement('p'); note.className='card-note'; note.textContent=entry.calculated ? `Photo read: ${entry.source} · Final check digit calculated. Confirm against the original.` : 'UPC-A · Check digit valid. Confirm digits against your photo.'; card.append(note);
      const save=document.createElement('button'); save.className='card-download'; save.textContent='↓ Download barcode'; save.addEventListener('click',()=>download(entry.upc)); card.append(save);
    } else {
      const title=document.createElement('h3'); title.textContent='This number needs a check';
      const source=document.createElement('strong'); source.className='invalid-number'; source.textContent=entry.source;
      const error=document.createElement('p'); error.className='card-error'; error.textContent=entry.error;
      const form=document.createElement('form'); form.className='correction';
      const label=document.createElement('label'); label.htmlFor=`correct-${index}`; label.textContent='Correct UPC from your photo';
      const input=document.createElement('input'); input.id=`correct-${index}`; input.inputMode='numeric'; input.value=entry.source;
      const button=document.createElement('button'); button.type='submit'; button.className='primary'; button.textContent='Validate & make barcode';
      form.append(label,input,button); form.addEventListener('submit',event=>{event.preventDefault(); try {
        if (photoMode && !/^\d{12}$/.test(input.value.trim())) throw new Error('Enter all 12 UPC digits from the photo. No missing digits will be guessed.');
        const upc=normalizeUPC(input.value); entries[index]={source:input.value.trim(),upc,calculated:input.value.trim().length===11}; render(); go(index);
      } catch(e) {error.textContent=e.message;input.setAttribute('aria-invalid','true');}});
      card.append(title,source,error,form);
    }
    const swipe=document.createElement('p'); swipe.className='swipe-hint'; swipe.textContent='Swipe up for the next one ↑'; card.append(swipe);
    $('stack').append(card);
  });
  const end=document.createElement('article'); end.className='barcode-card end-card'; end.dataset.index=entries.length;
  const title=document.createElement('h3'); title.textContent='You’ve reached the end.';
  const note=document.createElement('p'); note.textContent=`${entries.length} numbers in your stack. Ready for another photo?`;
  const more=document.createElement('button'); more.className='primary'; more.textContent='Scan more'; more.addEventListener('click',()=>{append=true; $('camera').click();});
  const choose=document.createElement('button'); choose.className='card-download'; choose.textContent='Choose another photo'; choose.addEventListener('click',()=>{append=true;$('photo').click();});
  const exit=document.createElement('button'); exit.className='exit-button'; exit.textContent='Exit'; exit.addEventListener('click',reset);
  end.append(title,note,more,choose,exit); $('stack').append(end);
  const ready=entries.filter(e=>e.upc).length;
  $('stack-summary').textContent=`${ready} barcodes · ${entries.length-ready} to review`;
  $('stack-section').hidden=false;
  observer=new IntersectionObserver(records=>{for(const record of records) if(record.isIntersecting) updatePosition(Number(record.target.dataset.index));},{root:$('stack'),threshold:0.6});
  for(const card of $('stack').children) observer.observe(card);
  updatePosition(0);
}
function reset() {
  observer?.disconnect(); entries=[]; append=false;
  $('stack').replaceChildren(); $('stack-section').hidden=true; $('photo-review').hidden=true; $('crop-editor').hidden=true;
  $('detected').value=''; $('camera').value=''; $('photo').value='';
  $('photo-preview').removeAttribute('src'); if(imageURL) URL.revokeObjectURL(imageURL); imageURL=null;
  $('scan-status').textContent='Photo processing stays on your device.';
  document.querySelector('.photo-panel').scrollIntoView({behavior:'smooth'});
}
function updateCrop(changed) {
  let left=Number($('crop-left').value),right=Number($('crop-right').value);
  if(right-left<10) {
    if(changed==='crop-left') left=right-10; else right=left+10;
  }
  $('crop-left').value=left; $('crop-right').value=right;
  $('crop-selection').style.left=left+'%'; $('crop-selection').style.right=(100-right)+'%';
}
for(const id of ['crop-left','crop-right']) $(id).addEventListener('input',()=>updateCrop(id));
function setBusy(value) {
  busy=value;
  for(const id of ['camera','photo','sample-list','make-stack','read-column','crop-left','crop-right']) $(id).disabled=value;
}
async function loadPhoto(file) {
  if(!file || busy) return;
  setBusy(true);photoMode=true;
  $('photo-review').hidden=true;$('crop-editor').hidden=true;
  if(!append) {entries=[];$('stack-section').hidden=true;}
  $('scan-status').textContent='Opening photo…';
  if(imageURL) URL.revokeObjectURL(imageURL);imageURL=URL.createObjectURL(file);
  try {
    $('photo-preview').src=imageURL;
    await $('photo-preview').decode();
    $('crop-editor').hidden=false;updateCrop();
    $('scan-status').textContent='Keep the UPC column in the green box, then tap Read UPC column. Leave the SKU column outside.';
    $('crop-editor').scrollIntoView({behavior:'smooth',block:'start'});
    // Warm the small language model while the user checks the column selection.
    getReader().catch(()=>{});
  } catch { $('scan-status').textContent='Could not open this photo. Please choose a JPG or PNG.'; }
  finally {setBusy(false);$('camera').value='';$('photo').value='';}
}
async function scanColumn() {
  if(busy || !$('photo-preview').naturalWidth) return;
  setBusy(true);const started=performance.now();
  $('scan-progress').hidden=false;$('scan-progress').value=0;
  $('scan-status').textContent='Reading UPC column…';
  try {
    const worker=await getReader(message=>{
      if(message.status==='recognizing text') { $('scan-progress').value=message.progress; $('scan-status').textContent=`Reading UPC column… ${Math.round(message.progress*100)}%`; }
    });
    const image=await prepareColumn($('photo-preview'),Number($('crop-left').value),Number($('crop-right').value));
    const {data}=await worker.recognize(image);
    const found=extractUPCs(data.text,{photo:true});
    // Do not present SKU names or OCR garbage as editable UPC data.
    $('detected').value=found.map(entry=>entry.source).join('\n');$('photo-review').hidden=false;
    if(found.length) {
      const firstNew=append?entries.length:0;
      entries=append?[...entries,...found]:found;append=false;
      render();go(firstNew);$('stack-section').scrollIntoView({behavior:'smooth',block:'start'});
      const seconds=((performance.now()-started)/1000).toFixed(1);
      $('scan-status').textContent=`Read ${found.length} UPC numbers in ${seconds}s. Check each number against your photo. Incomplete or invalid numbers need correction.`;
    } else $('scan-status').textContent='No UPCs could be read in this column. Adjust the green box to include the full UPC numbers and try again, or enter the UPCs below.';
  } catch { $('scan-status').textContent='Could not read the selected column. Adjust the box or use a clearer JPG or PNG and try again.'; }
  finally {setBusy(false);$('scan-progress').hidden=true;}
}
for(const id of ['camera','photo']) $(id).addEventListener('change',event=>loadPhoto(event.target.files[0]));
$('read-column').addEventListener('click',scanColumn);
$('sample-list').addEventListener('click',()=>{
  photoMode=true; $('photo-review').hidden=false; $('crop-editor').hidden=true; $('photo-preview').removeAttribute('src');
  $('detected').value=samples; entries=extractUPCs(samples,{photo:true}); append=false;render();
  $('scan-status').textContent='Example numbers transcribed from your photo. The cropped top row is excluded; verify numbers against your original.';
  $('stack-section').scrollIntoView({behavior:'smooth'});
});
$('make-stack').addEventListener('click',()=>{
  const found=extractUPCs($('detected').value,{photo:photoMode});
  if(!found.length) { $('scan-status').textContent='Add at least one 11- or 12-digit number to the review box.';return; }
  const firstNew=append?entries.length:0; entries=append?[...entries,...found]:found; append=false;render();go(firstNew);
  $('stack-section').scrollIntoView({behavior:'smooth'});
});
$('previous').addEventListener('click',()=>go(active-1)); $('next').addEventListener('click',()=>go(active+1));
$('stack').addEventListener('keydown',event=>{if(event.target!==$('stack'))return;if(['ArrowDown','PageDown','ArrowUp','PageUp'].includes(event.key)){event.preventDefault();go(active+(['ArrowDown','PageDown'].includes(event.key)?1:-1));}});
