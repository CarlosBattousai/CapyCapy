import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeUPC,encodeUPC,barcodeSVG} from '../barcode.js';
test('validates known UPCs and calculates missing check digits', () => {
  assert.equal(normalizeUPC('03600029145'),'036000291452');
  assert.equal(normalizeUPC(' 042100005264 '),'042100005264');
  assert.equal(normalizeUPC('00000000000'),'000000000000');
});
test('rejects incorrect check digits and malformed input', () => {
  for (const value of ['036000291453','','123','03600029145x','036000 291452','1234567890123','<script>']) assert.throws(()=>normalizeUPC(value));
});
test('encodes the UPC-A 95-module structure with guards and known digit patterns', () => {
  const bits=encodeUPC('036000291452');
  assert.equal(bits.length,95);
  assert.equal(bits.slice(0,3),'101');
  assert.equal(bits.slice(3,10),'0001101');
  assert.equal(bits.slice(45,50),'01010');
  assert.equal(bits.slice(50,57),'1101100');
  assert.equal(bits.slice(-3),'101');
});
test('SVG preserves quiet zones and includes the validated human-readable UPC', () => {
  const svg=barcodeSVG('03600029145');
  assert.match(svg,/x="36"/);
  assert.match(svg,/036000291452/);
  assert.match(svg,/viewBox="0 0 357 226"/);
});
