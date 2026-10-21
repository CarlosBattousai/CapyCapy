#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
TOOLS_ROOT="${CAPY_ANDROID_TOOLS:-/workspace/android-tools}"
BT="$TOOLS_ROOT/sdk/android-15"
ANDROID_JAR="$TOOLS_ROOT/sdk/android-35/android.jar"
BUILD="$PWD/android/build"
mkdir -p "$BUILD/classes" "$BUILD/dex" "$BUILD/assets/web" /workspace/artifacts
python3 android/stage-assets.py
chmod u+x "$BT/aapt2" "$BT/zipalign"
java -jar "$TOOLS_ROOT/ecj.jar" -1.8 -proc:none -bootclasspath "$ANDROID_JAR:$BT/core-lambda-stubs.jar" -d "$BUILD/classes" android/src/com/capycapy/app/*.java
"$BT/aapt2" compile --dir android/res -o "$BUILD/resources.zip"
"$BT/aapt2" link -I "$ANDROID_JAR" --manifest android/AndroidManifest.xml -A "$BUILD/assets" -o "$BUILD/unsigned.apk" "$BUILD/resources.zip"
java -cp "$BT/lib/d8.jar" com.android.tools.r8.D8 --min-api 26 --lib "$ANDROID_JAR" --output "$BUILD/dex" "$BUILD"/classes/com/capycapy/app/*.class
python3 - <<'PY'
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
b=Path('android/build')
with ZipFile(b/'unsigned.apk','a',compression=ZIP_DEFLATED) as z:
    for p in (b/'dex').glob('*.dex'): z.write(p,p.name)
PY
"$BT/zipalign" -f 4 "$BUILD/unsigned.apk" "$BUILD/aligned.apk"
if [[ ! -f "$TOOLS_ROOT/capy-test.keystore" ]]; then
  keytool -genkeypair -keystore "$TOOLS_ROOT/capy-test.keystore" -storepass android -keypass android -alias capytest -keyalg RSA -keysize 2048 -validity 10000 -dname 'CN=CapyCapy Local Test' -noprompt
fi
java -jar "$BT/lib/apksigner.jar" sign --ks "$TOOLS_ROOT/capy-test.keystore" --ks-key-alias capytest --ks-pass pass:android --key-pass pass:android --out /workspace/artifacts/CapyCapy-android-test.apk "$BUILD/aligned.apk"
java -jar "$BT/lib/apksigner.jar" verify --verbose /workspace/artifacts/CapyCapy-android-test.apk
"$BT/aapt2" dump badging /workspace/artifacts/CapyCapy-android-test.apk
sha256sum /workspace/artifacts/CapyCapy-android-test.apk
