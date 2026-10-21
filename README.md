# CapyCapy

A UPC-A barcode generator with on-device photo reading. Take or upload a photo of a UPC list and swipe vertically through one barcode per card, with its digits underneath. Comma-separated numbers are extracted separately; repeated UPC entries are kept. The final card provides Scan more (append another photo) and Exit (clear the photo stack and return to the start).

After choosing a photo, adjust the green box to include only the UPC column (including both numbers on comma-separated rows), leaving SKU and brand columns outside. Tap **Read UPC column**. The reader crops and resizes the column and removes uneven paper shadows before recognition. A smaller integer OCR model is warmed while you select the column and reused for subsequent photos. Only detected number candidates appear in the review box; SKU and brand text is discarded.

Review detected numbers against the source photo and edit missing or misread digits. Invalid check digits and incomplete 11-digit photo results are retained as correction cards; missing photo digits are never guessed. Manual single-number entry still supports calculating a check digit for an explicitly entered 11-digit base. Text recognition is imperfect, particularly with blurry photos, cropped numbers, and unusual spacing. The example list is manually transcribed from the provided photo, excluding its cropped top row; it is not an OCR accuracy claim.

On-screen barcodes use a canvas with whole device-pixel modules and a plain-text UPC immediately underneath. Downloads retain the SVG format.

Single-number entry, SVG downloads, and printing remain available. Images and recognized text stay in browser memory, and OCR scripts, WebAssembly, and English language data are served locally. No external API keys are required. Barcode generation does not assign GS1 identifiers.

Requires Node.js 22 or newer.

```sh
npm ci --cache /tmp/capy-npm-cache
npm start
npm test
```

The server uses port 3000 by default; set `PORT` to override it. For print, choose actual size and disable browser headers and footers. Verify printed labels with your intended scanner before production use.

On a phone, Take a photo opens the system camera when supported; Choose a photo opens the image picker. The camera capture hint depends on browser support. Exit returns within the app; it does not close the browser tab.
