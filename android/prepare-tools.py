"""Download pinned Android build tools and verify the publisher checksums."""
import hashlib
import os
from pathlib import Path
import subprocess
import zipfile

root = Path(os.environ.get('CAPY_ANDROID_TOOLS', '/workspace/android-tools'))
root.mkdir(parents=True, exist_ok=True)
# SDK SHA-1 values come from Google's repository metadata; Gradle uses its published SHA-256.
artifacts = [
    ('https://dl.google.com/android/repository/build-tools_r35_linux.zip', 'build-tools_r35_linux.zip', '2cfaa0bbb2336e9ec18ed3ecea84fa2e2af607bc'),
    ('https://dl.google.com/android/repository/platform-35_r02.zip', 'platform-35_r02.zip', '0bb560a90a7a2cbd0dd8348224d518b638fe7949'),
    ('https://downloads.gradle.org/distributions/gradle-8.11.1-bin.zip', 'gradle-8.11.1-bin.zip', 'f397b287023acdba1e9f6fc5ea72d22dd63669d59ed4a289a29b1a76eee151c6'),
]
for url, name, checksum in artifacts:
    path = root / name
    if not path.exists():
        subprocess.run(['curl', '-fLsS', url, '-o', str(path)], check=True)
    algorithm = hashlib.sha256 if len(checksum) == 64 else hashlib.sha1
    if algorithm(path.read_bytes()).hexdigest() != checksum:
        raise RuntimeError(f'Checksum mismatch for {name}; do not use this artifact')
    if name.endswith('.zip'):
        with zipfile.ZipFile(path) as archive:
            archive.extractall(root if name.startswith('gradle-') else root / 'sdk')
    print(f'Verified {name}')

# Standard SDK layout required by the Android Gradle plugin.
for folder, target in [('platforms/android-35', '../android-35'), ('build-tools/35.0.0', '../android-15')]:
    link = root / 'sdk' / folder
    link.parent.mkdir(parents=True, exist_ok=True)
    if not link.exists():
        link.symlink_to(target, target_is_directory=True)
