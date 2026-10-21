import {encodeUPC, normalizeUPC} from './barcode.js';

function paint(figure) {
  if (!figure.isConnected) return;
  const canvas = figure.querySelector('canvas');
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  const unit = Math.max(1, Math.floor(figure.clientWidth * dpr / 119));
  canvas.width = 119 * unit; canvas.height = 66 * unit;
  canvas.style.width = `${canvas.width / dpr}px`;
  canvas.style.height = `${canvas.height / dpr}px`;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff'; ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle = '#000';
  for (const [i, bit] of [...encodeUPC(figure.dataset.upc)].entries()) {
    if (bit === '1') ctx.fillRect((12+i)*unit,4*unit,unit,(i<3 || i>=92 || (i>=45 && i<50) ? 58 : 52)*unit);
  }
}
const observer = new ResizeObserver(records => {
  for (const {target} of records) { if(target.isConnected) paint(target); else observer.unobserve(target); }
});
export function barcodePreview(value) {
  const upc=normalizeUPC(value);
  const figure=document.createElement('figure'); figure.className='crisp-barcode'; figure.dataset.upc=upc;
  const canvas=document.createElement('canvas'); canvas.setAttribute('role','img');canvas.setAttribute('aria-label',`UPC-A barcode ${upc}`);
  const number=document.createElement('figcaption');number.className='upc-digits';number.textContent=upc;
  figure.append(canvas,number); observer.observe(figure);
  return figure;
}
