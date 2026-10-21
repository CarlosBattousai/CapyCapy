import {normalizeUPC} from './barcode.js';

// Keep separate numbers on the same line (including comma-separated UPCs).
// Alphanumeric SKU identifiers and parts of longer numbers are not UPCs.
export function extractUPCs(text, {photo = false} = {}) {
  const sources = [];
  for (const line of text.split(/[\r\n]+/)) {
    // Join OCR-split digit groups only within a numeric run. Never convert SKU letters.
    for (const run of line.matchAll(/(?<![A-Za-z0-9])[0-9]+(?:[ \t]+[0-9]+)*(?![A-Za-z0-9])/g)) {
      let pending = '';
      for (const group of run[0].split(/[ \t]+/)) {
        if (pending.length + group.length > 12) { if (pending.length >= 11) sources.push(pending); pending = ''; }
        pending += group;
        if (pending.length >= 12) { if (pending.length === 12) sources.push(pending); pending = ''; }
      }
      if (pending.length >= 11) sources.push(pending);
    }
  }
  return sources.map(source => {
    if (photo && source.length === 11) return {source, upc:null, error:'Only 11 digits were read. Check the photo and enter all 12 UPC digits; no digits were guessed.'};
    try { return {source, upc: normalizeUPC(source), calculated: source.length === 11}; }
    catch (error) { return {source, upc:null, error:error.message}; }
  });
}
