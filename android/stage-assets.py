"""Bundle exactly the local web app and OCR dependencies into the APK."""
from pathlib import Path
import shutil

root = Path(__file__).resolve().parent.parent
web = root / 'android/build/assets/web'
if web.exists():
    shutil.rmtree(web)
web.mkdir(parents=True)
for name in ['index.html', 'style.css', 'app.js', 'barcode.js', 'photo.js', 'scan.js']:
    shutil.copy2(root / name, web / name)
for directory in ['ocr', 'ocr-core', 'ocr-lang']:
    (web / directory).mkdir()
for name in ['tesseract.min.js', 'worker.min.js']:
    shutil.copy2(root / 'node_modules/tesseract.js/dist' / name, web / 'ocr' / name)
for source in (root / 'node_modules/tesseract.js-core').glob('tesseract-core*'):
    if source.suffix in ['.js', '.wasm']:
        shutil.copy2(source, web / 'ocr-core' / source.name)
shutil.copy2(root / 'node_modules/@tesseract.js-data/eng/4.0.0/eng.traineddata.gz', web / 'ocr-lang/eng.traineddata.gz')
(web / 'licenses').mkdir()
for package in ['tesseract.js', 'tesseract.js-core']:
    license_file = root / 'node_modules' / package / ('LICENSE.md' if package == 'tesseract.js' else 'LICENSE')
    shutil.copy2(license_file, web / 'licenses' / (package + '.txt'))
print('Staged app and local OCR assets')
