"""Download pinned Android build tools and verify the publisher checksums."""
import hashlib
import os
from pathlib import Path
import subprocess
import zipfile

root = Path(os.environ.get('CAPY_ANDROID_TOOLS', '/workspace/android-tools'))
root.mkdir(parents=True, exist_ok=True)
# SHA-1 values supplied by Google's SDK repository metadata and Maven Central.
artifacts = [
    ('https://dl.google.com/android/repository/build-tools_r35_linux.zip', 'build-tools_r35_linux.zip', '2cfaa0bbb2336e9ec18ed3ecea84fa2e2af607bc'),
    ('https://dl.google.com/android/repository/platform-35_r02.zip', 'platform-35_r02.zip', '0bb560a90a7a2cbd0dd8348224d518b638fe7949'),
    ('https://repo.maven.apache.org/maven2/org/eclipse/jdt/ecj/3.39.0/ecj-3.39.0.jar', 'ecj.jar', 'da787c5669578ffd5324bf29c18b361904a5a1bb'),
]
for url, name, checksum in artifacts:
    path = root / name
    if not path.exists():
        subprocess.run(['curl', '-fLsS', url, '-o', str(path)], check=True)
    if hashlib.sha1(path.read_bytes()).hexdigest() != checksum:
        raise RuntimeError(f'Checksum mismatch for {name}; do not use this artifact')
    if name.endswith('.zip'):
        with zipfile.ZipFile(path) as archive:
            archive.extractall(root / 'sdk')
    print(f'Verified {name}')
