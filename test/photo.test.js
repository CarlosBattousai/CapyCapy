import test from 'node:test';
import assert from 'node:assert/strict';
import {extractUPCs} from '../photo.js';
test('extracts both comma-separated UPCs while excluding SKU and brand columns',()=>{
  const result=extractUPCs('AA981176 199593343462,199593416586 MARC FISHER\nA7026020 199100334051 Steve Madden');
  assert.deepEqual(result.map(e=>e.source),['199593343462','199593416586','199100334051']);
  assert.ok(result.every(e=>e.upc));
});
test('preserves order, leading zeros, and repeated UPC entries',()=>{
  assert.deepEqual(extractUPCs('036000291452\n042100005264\n036000291452').map(e=>e.upc),['036000291452','042100005264','036000291452']);
});
test('keeps invalid check digits for review instead of silently changing or dropping them',()=>{
  const [entry]=extractUPCs('036000291453');
  assert.equal(entry.source,'036000291453');assert.equal(entry.upc,null);assert.match(entry.error,/Check digit/);
});
test('calculates missing check digit and flags it for confirmation',()=>{
  assert.deepEqual(extractUPCs('15344212989'),[{source:'15344212989',upc:'153442129898',calculated:true}]);
});
test('does not split longer numbers or mistake alphanumeric SKUs for UPCs',()=>{
  assert.deepEqual(extractUPCs('1234567890123 AA123456789012 123456789012X'),[]);
});
test('joins OCR-split UPC digits while ignoring numeric and alphanumeric SKU columns',()=>{
  assert.deepEqual(extractUPCs('B0957766 199 766 111 676 Free People\n12345678 840494208205 DOEN').map(e=>e.upc),['199766111676','840494208205']);
});
test('photo OCR never invents a digit for an incomplete 11-digit number',()=>{
  const [entry]=extractUPCs('A151934 15344212989 BOSS HUGO BOSS',{photo:true});
  assert.equal(entry.upc,null);assert.equal(entry.source,'15344212989');assert.match(entry.error,/no digits were guessed/);
});
test('noise and SKU letters do not get substituted into barcode numbers',()=>{
  assert.deepEqual(extractUPCs('AA981176 B2872695 S4O4942O82O5 O36OOO29I452 !@#$'),[]);
});
