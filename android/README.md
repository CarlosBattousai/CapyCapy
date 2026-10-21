# Android test APK

CapyCapy is packaged as an offline Android WebView app with a native camera/image chooser, SVG save dialog, print dialog, and Android back navigation. All application files, OCR workers, WebAssembly, and English language data are bundled. A local HTTPS origin serves these assets inside the app; no web server is needed. Android 8.0 (API 26) or newer and an up-to-date Android System WebView are required.

The test APK is written to `/workspace/artifacts/CapyCapy-android-test.apk`.

## Rebuild on Linux

Requires Node.js 22+, a Java 21 runtime with `keytool`, Python 3, and curl. The build uses Google's pinned Android 35 SDK/build tools and the pinned Eclipse compiler, verifies their publisher checksums, and does not need Gradle or a JDK installation.

```sh
cd /workspace/CapyCapy
npm ci --cache /tmp/capy-npm-cache
python3 android/prepare-tools.py
npm test
bash android/build-apk.sh
```

`CAPY_ANDROID_TOOLS` overrides the default tool directory `/workspace/android-tools`. The testing keystore is created there and reused for updates. It is separate from source files and is intended for local testing, not a production release. Preserve this keystore to update an installed test build without uninstalling it.

## Install and test

Transfer/download the APK to your Android phone, open it, and allow installation from the app used to open the download if Android asks. Install CapyCapy, then:

1. Take a photo or choose an existing image containing several UPCs. Adjust the green box to include the UPC column and exclude the SKU column, then tap **Read UPC column**. Include both numbers on comma-separated rows.
2. Compare the detected numbers with the photo. A comma-separated pair should generate two cards. Invalid check digits stay available for correction.
3. Swipe up through the stack and confirm that every barcode has its UPC immediately underneath.
4. Save a barcode using Download barcode and choose a destination in Android's file picker.
5. At the final card, Scan more should open the camera and append new numbers. Exit should clear the stack and return to the start.

The APK was compiled, aligned, and signature-verified; its bundled assets were checked and its shared web application passed automated tests and Android-size browser checks. Actual APK installation, native camera/picker, and native save/print require device testing and have not been verified on physical hardware in this environment.

Version 1.0.1 uses the smaller `4.0.0_best_int` OCR model with a separate cache key, reuses the OCR worker across photos, crops/resizes the selected UPC column, and uses local thresholding for paper shadows. Incomplete photo numbers require all 12 digits instead of receiving a guessed check digit. Barcode display uses an integer-pixel canvas with the UPC underneath; vector SVG downloads remain available. A synthetic shaded, tilted two-column image produced all 11 expected numeric candidates, with its incomplete entry held for review, in 2.2 seconds cold and 1.1 seconds warm on the development machine. These are browser timings, not phone benchmarks or verification of the original supplied photo.

Images are processed on device. Camera captures use an app-private temporary cache file that is removed on the next capture or Activity destruction. OCR data may be cached by WebView. OCR can miss or misread digits; verify against the source image. This build does not register UPC identifiers with GS1.
