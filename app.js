import { normalizeUPC, barcodeSVG } from './barcode.js';
import {barcodePreview} from './preview.js';
const $ = id => document.getElementById(id);
let current = null;
function generate() {
  try {
    const upc = normalizeUPC($('upc').value);
    current = {upc, svg:barcodeSVG(upc)};
    $('error').textContent = ''; $('upc').removeAttribute('aria-invalid');
    $('result').replaceChildren(barcodePreview(upc));
    $('badge').textContent = 'VERIFIED UPC-A';
    $('download').disabled = false; $('print').disabled = false;
  } catch (error) {
    current = null;
    $('error').textContent = error.message; $('upc').setAttribute('aria-invalid','true');
    $('badge').textContent = 'PREVIEW';
    $('result').innerHTML = '<div class="empty"><h3>Let’s check that number.</h3><p>Fix your UPC to generate a barcode.</p></div>';
    $('download').disabled = true; $('print').disabled = true;
  }
}
$('form').addEventListener('submit', event => {event.preventDefault(); generate();});
$('example').addEventListener('click', () => {$('upc').value='036000291452'; generate();});
$('upc').addEventListener('input', () => {
  current = null; $('download').disabled = true; $('print').disabled = true;
  $('badge').textContent = 'PREVIEW'; $('error').textContent=''; $('upc').removeAttribute('aria-invalid');
  $('result').innerHTML='<div class="empty"><div class="lines">▌▏▎▌▏▌▎▏▌▎▏</div><h3>Ready when you are.</h3><p>Generate a barcode for your updated number.</p></div>';
});
$('download').addEventListener('click', () => {
  if (!current) return;
  if (window.CapyAndroid) { window.CapyAndroid.saveSVG(current.svg,current.upc); return; }
  const url=URL.createObjectURL(new Blob([current.svg],{type:'image/svg+xml'}));
  const a=document.createElement('a'); a.href=url; a.download=`upc-${current.upc}.svg`; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
});
$('print').addEventListener('click', () => {if(current) {if(window.CapyAndroid) window.CapyAndroid.printBarcode(); else window.print();}});
