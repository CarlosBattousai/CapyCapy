#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
TOOLS_ROOT="${CAPY_ANDROID_TOOLS:-/workspace/android-tools}"
export ANDROID_HOME="$TOOLS_ROOT/sdk"
export ANDROID_USER_HOME="$TOOLS_ROOT/android-user"
export GRADLE_USER_HOME="$TOOLS_ROOT/gradle-home"
if [[ -d "$TOOLS_ROOT/jdk" && -z "${JAVA_HOME:-}" ]]; then export JAVA_HOME="$TOOLS_ROOT/jdk"; fi
export CAPY_SIGNING_KEY="${CAPY_SIGNING_KEY:-$TOOLS_ROOT/capy-test.keystore}"
mkdir -p "$ANDROID_USER_HOME" /workspace/artifacts
if [[ ! -f "$CAPY_SIGNING_KEY" ]]; then
  keytool -genkeypair -keystore "$CAPY_SIGNING_KEY" -storepass android -keypass android -alias capytest -keyalg RSA -keysize 2048 -validity 10000 -dname 'CN=CapyCapy Local Test' -noprompt
fi
python3 android/stage-assets.py
PROXY_ARGS=()
read -r CAPY_PROXY_HOST CAPY_PROXY_PORT < <(python3 - <<'PY'
import os,urllib.parse
p=urllib.parse.urlparse(os.environ.get('HTTPS_PROXY',os.environ.get('https_proxy','')))
print(p.hostname or '-',p.port or 8080)
PY
)
if [[ "$CAPY_PROXY_HOST" != '-' ]]; then
  PROXY_ARGS=("-Dhttps.proxyHost=$CAPY_PROXY_HOST" "-Dhttps.proxyPort=$CAPY_PROXY_PORT" "-Dhttp.proxyHost=$CAPY_PROXY_HOST" "-Dhttp.proxyPort=$CAPY_PROXY_PORT")
fi
bash "$TOOLS_ROOT/gradle-8.11.1/bin/gradle" -p android "${PROXY_ARGS[@]}" assembleRelease
cp android/build/outputs/apk/release/CapyCapy-release.apk /workspace/artifacts/CapyCapy-android-test.apk
java -jar "$TOOLS_ROOT/sdk/android-15/lib/apksigner.jar" verify --verbose /workspace/artifacts/CapyCapy-android-test.apk
sha256sum /workspace/artifacts/CapyCapy-android-test.apk
