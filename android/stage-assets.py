"""Bundle the UI; the Android APK uses bundled ML Kit, not browser OCR."""
from pathlib import Path
import shutil

root = Path(__file__).resolve().parent.parent
web = root / 'android/build/assets/web'
if web.exists():
    shutil.rmtree(web)
web.mkdir(parents=True)
for name in ['index.html', 'style.css', 'app.js', 'barcode.js', 'photo.js', 'scan.js', 'preview.js', 'ocr.js']:
    shutil.copy2(root / name, web / name)
index = web / 'index.html'
index.write_text(index.read_text().replace('<script src="/ocr/tesseract.min.js"></script>', ''))
print('Staged UI with native Android OCR; browser OCR assets excluded')
