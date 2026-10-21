# Android test APK

Version 1.0.2 replaces the APK's browser OCR with bundled Google ML Kit Text Recognition. The recognizer runs on the original color photo on the device, handles EXIF orientation, and reads the whole image by default. Optional column selection remains available. No OCR API key, model download, web server, or cloud photo upload is required. An updated Android System WebView is required for the interface.

Native text lines are ordered by position; the shared UPC extractor discards SKU/brand strings and preserves separate UPCs on the same row. Incomplete or invalid numbers are held for review without guessing digits. A scan with no valid UPC stays in photo review. Barcodes use crisp canvas modules and a plain-text UPC underneath. Photo capture, SVG saving, and printing use Android system dialogs. System-bar insets are applied to a container around WebView to prevent content overlapping the status bar.

## Build on Linux

Requires Node.js 22+, Python 3, curl, and a Java 21 JDK. The Gradle Android application bundles ML Kit, including its text model and native libraries, for ARM64, ARMv7, and x86_64.

```sh
cd /workspace/CapyCapy
python3 android/prepare-tools.py
npm test
bash android/build-apk.sh
```

The tool preparation script verifies the pinned Android 35 platform/build tools and Gradle 8.11.1 checksums. Maven dependencies come from Google's official repository and Maven Central with TLS verification. `CAPY_ANDROID_TOOLS` overrides `/workspace/android-tools`; a standard JDK can be selected using `JAVA_HOME`. This environment's JDK executables wrap its installed JDK modules in a writable copy of the runtime.

The script outputs `/workspace/artifacts/CapyCapy-android-test.apk`. `CAPY_SIGNING_KEY` selects the testing keystore; its default is `/workspace/android-tools/capy-test.keystore`. Keep the same testing key to install updates over previous builds. The testing key is not committed and is not intended for production releases.

## Device checks

1. Install/update CapyCapy on Android 8.0 or newer.
2. Take or choose a photo of the entire SKU/UPC list. Tap **Read UPCs**; leave the selection full-width first.
3. Compare the resulting UPCs against the photo. Comma-separated pairs should give two cards. SKU identifiers should not appear in the barcode stack.
4. Swipe through the barcodes and test an SVG download.
5. At the end, Scan more should append another photo's results; Exit should return to the start. An unreadable photo should remain in review instead of showing an empty stack.
6. Check that content clears both Android system bars.

A native instrumentation test at `src/androidTest/java/com/capycapy/app/NativeOcrTest.java` exercises the bundled recognizer on a generated shaded, slightly rotated multi-column list. With an emulator/device connected, run `gradle -p android connectedDebugAndroidTest` using the prepared Gradle/JDK/SDK environment. Browser bridge checks isolate native result handling from engine recognition, and `npm test` covers UPC extraction and encoding. Synthetic-image checks do not establish accuracy on the original user photo or a physical phone.

Camera photos use a private temporary cache file. ML Kit processes photos locally; its SDK may send operational diagnostics according to its terms. This app does not register UPC identifiers with GS1. Recognition can still miss or misread digits; verify numbers against the source photo.

Current validation: release/debug APK builds and the native test APK build passed, as did all 12 shared unit tests, native-bridge browser checks, packaged-asset checks, and release signature verification. Native OCR execution remains **unrun**: the software-only cloud emulator connected to ADB but did not reach Android's package manager/boot completion within the bounded startup window. No native recognition accuracy or physical-phone performance pass is claimed. The original supplied photo still needs a device check.
