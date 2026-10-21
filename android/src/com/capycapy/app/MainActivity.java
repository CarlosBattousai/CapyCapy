package com.capycapy.app;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.ClipData;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.print.PrintManager;
import android.provider.MediaStore;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;
import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Collections;

public final class MainActivity extends Activity {
    private static final String HOST = "appassets.androidplatform.net";
    private static final int PICK_PHOTO = 10, SAVE_SVG = 11;
    private WebView web;
    private ValueCallback<Uri[]> photoCallback;
    private final Uri photoUri = Uri.parse("content://com.capycapy.app.photos/photo.jpg");
    private String pendingSvg;
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        web = new WebView(this);
        web.setBackgroundColor(0xfff8f9f5);
        web.setOnApplyWindowInsetsListener((view,insets) -> {
            view.setPadding(insets.getSystemWindowInsetLeft(),insets.getSystemWindowInsetTop(),insets.getSystemWindowInsetRight(),insets.getSystemWindowInsetBottom());
            return insets.consumeSystemWindowInsets();
        });
        setContentView(web);
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setSupportMultipleWindows(false);
        web.addJavascriptInterface(new AndroidActions(), "CapyAndroid");
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return !HOST.equals(request.getUrl().getHost()) || !"https".equals(request.getUrl().getScheme());
            }
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (!HOST.equals(uri.getHost()) || !"https".equals(uri.getScheme())) return missing();
                String path = uri.getPath();
                if (path == null || path.contains("..") || path.contains("\\")) return missing();
                if (path.equals("/")) path = "/index.html";
                try {
                    InputStream input = getAssets().open("web" + path);
                    String type = path.endsWith(".html") ? "text/html" : path.endsWith(".js") ? "text/javascript" : path.endsWith(".css") ? "text/css" : path.endsWith(".wasm") ? "application/wasm" : "application/octet-stream";
                    return new WebResourceResponse(type, (type.startsWith("text/") ? "UTF-8" : null),200,"OK",Collections.singletonMap("Cache-Control","no-cache"),input);
                } catch (Exception e) { return missing(); }
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (photoCallback != null) photoCallback.onReceiveValue(null);
                photoCallback = callback;
                Intent gallery = new Intent(Intent.ACTION_GET_CONTENT).setType("image/*").addCategory(Intent.CATEGORY_OPENABLE);
                Intent camera = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
                camera.putExtra(MediaStore.EXTRA_OUTPUT,photoUri);
                camera.setClipData(ClipData.newRawUri("Photo",photoUri));
                camera.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION | Intent.FLAG_GRANT_READ_URI_PERMISSION);
                boolean available = camera.resolveActivity(getPackageManager()) != null;
                try {
                    new File(getCacheDir(),"photo.jpg").delete();
                    if (params.isCaptureEnabled() && available) startActivityForResult(camera,PICK_PHOTO);
                    else {
                        Intent chooser = Intent.createChooser(gallery,"Choose a UPC photo");
                        if (available) chooser.putExtra(Intent.EXTRA_INITIAL_INTENTS,new Intent[]{camera});
                        startActivityForResult(chooser,PICK_PHOTO);
                    }
                } catch (ActivityNotFoundException e) {
                    photoCallback.onReceiveValue(null); photoCallback=null;
                    Toast.makeText(MainActivity.this,"No camera or image picker available",Toast.LENGTH_LONG).show();
                }
                return true;
            }
        });
        web.loadUrl("https://" + HOST + "/");
    }
    private static WebResourceResponse missing() {
        return new WebResourceResponse("text/plain","UTF-8",404,"Not Found",Collections.emptyMap(),new ByteArrayInputStream(new byte[0]));
    }
    private final class AndroidActions {
        @JavascriptInterface public void saveSVG(String svg, String upc) {
            if (svg == null || svg.length() > 100000 || !svg.startsWith("<svg ") || upc == null || !upc.matches("[0-9]{12}")) return;
            runOnUiThread(() -> {
                pendingSvg=svg;
                Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("image/svg+xml").putExtra(Intent.EXTRA_TITLE,"upc-"+upc+".svg");
                try { startActivityForResult(intent,SAVE_SVG); }
                catch (ActivityNotFoundException e) { pendingSvg=null; Toast.makeText(MainActivity.this,"No file manager available",Toast.LENGTH_LONG).show(); }
            });
        }
        @JavascriptInterface public void printBarcode() {
            runOnUiThread(() -> ((PrintManager)getSystemService(PRINT_SERVICE)).print("CapyCapy barcode",web.createPrintDocumentAdapter("CapyCapy"),null));
        }
    }
    @Override protected void onActivityResult(int requestCode,int resultCode,Intent data) {
        super.onActivityResult(requestCode,resultCode,data);
        if (requestCode == PICK_PHOTO && photoCallback != null) {
            Uri selected = resultCode != RESULT_OK ? null : data != null && data.getData() != null ? data.getData() : new File(getCacheDir(),"photo.jpg").length() > 0 ? photoUri : null;
            photoCallback.onReceiveValue(selected == null ? null : new Uri[]{selected}); photoCallback=null;
            revokeUriPermission(photoUri,Intent.FLAG_GRANT_WRITE_URI_PERMISSION | Intent.FLAG_GRANT_READ_URI_PERMISSION);
        }
        if (requestCode == SAVE_SVG) {
            String svg=pendingSvg; pendingSvg=null;
            if (resultCode == RESULT_OK && data != null && data.getData() != null && svg != null) {
                try (OutputStream out = getContentResolver().openOutputStream(data.getData())) {
                    out.write(svg.getBytes(StandardCharsets.UTF_8)); Toast.makeText(this,"Barcode saved",Toast.LENGTH_SHORT).show();
                } catch (Exception e) { Toast.makeText(this,"Could not save barcode",Toast.LENGTH_LONG).show(); }
            }
        }
    }
    @Override public void onBackPressed() {
        web.evaluateJavascript("document.getElementById('stack-section').hidden",value -> {
            if ("false".equals(value)) web.evaluateJavascript("document.querySelector('.exit-button').click()",null);
            else finish();
        });
    }
    @Override public void onDestroy() {
        if(photoCallback != null) photoCallback.onReceiveValue(null);
        web.removeJavascriptInterface("CapyAndroid"); web.destroy();
        new File(getCacheDir(),"photo.jpg").delete();
        super.onDestroy();
    }
}
