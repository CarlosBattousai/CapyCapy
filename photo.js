import {normalizeUPC} from './barcode.js';

// Keep separate numbers on the same line (including comma-separated UPCs).
// Alphanumeric SKU identifiers and parts of longer numbers are not UPCs.
export function extractUPCs(text) {
  return [...text.matchAll(/(?<![A-Za-z0-9])\d{11,12}(?![A-Za-z0-9])/g)].map(match => {
    const source = match[0];
    try { return {source, upc: normalizeUPC(source), calculated: source.length === 11}; }
    catch (error) { return {source, upc:null, error:error.message}; }
  });
}
