const left = ['0001101','0011001','0010011','0111101','0100011','0110001','0101111','0111011','0110111','0001011'];

export function normalizeUPC(value) {
  const digits = value.trim();
  if (!/^\d{11,12}$/.test(digits)) throw new Error('Enter 11 or 12 digits, using numbers only.');
  const base = digits.slice(0,11);
  const sum = [...base].reduce((total, digit, i) => total + Number(digit) * (i % 2 === 0 ? 3 : 1), 0);
  const check = String((10 - sum % 10) % 10);
  if (digits.length === 12 && digits[11] !== check) throw new Error(`Check digit should be ${check}. Check your UPC and try again.`);
  return base + check;
}

export function encodeUPC(value) {
  const upc = normalizeUPC(value);
  return '101' + [...upc.slice(0,6)].map(n => left[Number(n)]).join('') + '01010' + [...upc.slice(6)].map(n => [...left[Number(n)]].map(b => b === '0' ? '1' : '0').join('')).join('') + '101';
}

export function barcodeSVG(value) {
  const upc = normalizeUPC(value);
  const bars = [...encodeUPC(upc)].map((bit, i) => bit === '1' ? `<rect x="${(i+12)*3}" y="16" width="3" height="${i < 3 || i >= 92 || (i >= 45 && i < 50) ? 174 : 156}"/>` : '').join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="357" height="226" viewBox="0 0 357 226" role="img" aria-label="UPC-A barcode ${upc}"><rect width="357" height="226" fill="white"/><g fill="black">${bars}</g><text x="178.5" y="212" text-anchor="middle" font-family="monospace" font-size="20" letter-spacing="4">${upc}</text></svg>`;
}
