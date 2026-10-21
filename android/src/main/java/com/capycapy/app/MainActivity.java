package com.capycapy.app;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.ClipData;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Matrix;
import android.graphics.Rect;
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
import android.widget.FrameLayout;
import androidx.exifinterface.media.ExifInterface;
import com.google.mlkit.vision.common.InputImage;
import com.google.mlkit.vision.text.Text;
import com.google.mlkit.vision.text.TextRecognition;
import com.google.mlkit.vision.text.TextRecognizer;
import com.google.mlkit.vision.text.latin.TextRecognizerOptions;
import org.json.JSONObject;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
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
    private volatile Uri selectedPhoto;
    private final ExecutorService photoExecutor = Executors.newSingleThreadExecutor();
    private TextRecognizer recognizer;
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        web = new WebView(this);
        web.setBackgroundColor(0xfff8f9f5);
        // WebView ignores padding on some Android releases; apply insets to a real container.
        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(0xfff8f9f5);
        root.addView(web,new FrameLayout.LayoutParams(-1,-1));
        root.setOnApplyWindowInsetsListener((view,insets) -> {
            view.setPadding(insets.getSystemWindowInsetLeft(),insets.getSystemWindowInsetTop(),insets.getSystemWindowInsetRight(),insets.getSystemWindowInsetBottom());
            return insets.consumeSystemWindowInsets();
        });
        setContentView(root);
        root.requestApplyInsets();
        recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS);
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
        @JavascriptInterface public void recognizePhoto(int id, double left, double right) {
            if (selectedPhoto == null || left < 0 || right > 100 || right-left < 10) { sendRecognition(id,null,"Choose a photo first."); return; }
            final Uri uri = selectedPhoto;
            photoExecutor.execute(() -> {
                try {
                    BitmapFactory.Options options = new BitmapFactory.Options(); options.inJustDecodeBounds=true;
                    try(InputStream in=getContentResolver().openInputStream(uri)) { BitmapFactory.decodeStream(in,null,options); }
                    int sample=1;
                    while(Math.max(options.outWidth,options.outHeight)/(sample*2) >= 2400) sample*=2;
                    options.inJustDecodeBounds=false; options.inSampleSize=sample; options.inPreferredConfig=Bitmap.Config.ARGB_8888;
                    Bitmap decoded;
                    try(InputStream in=getContentResolver().openInputStream(uri)) { decoded=BitmapFactory.decodeStream(in,null,options); }
                    if(decoded == null) throw new IllegalArgumentException("Could not decode image");
                    int orientation;
                    try(InputStream in=getContentResolver().openInputStream(uri)) { orientation=new ExifInterface(in).getAttributeInt(ExifInterface.TAG_ORIENTATION,ExifInterface.ORIENTATION_NORMAL); }
                    Matrix rotation=new Matrix();
                    switch(orientation) {
                        case ExifInterface.ORIENTATION_ROTATE_90: rotation.postRotate(90); break;
                        case ExifInterface.ORIENTATION_ROTATE_180: rotation.postRotate(180); break;
                        case ExifInterface.ORIENTATION_ROTATE_270: rotation.postRotate(270); break;
                        case ExifInterface.ORIENTATION_FLIP_HORIZONTAL: rotation.postScale(-1,1); break;
                        case ExifInterface.ORIENTATION_FLIP_VERTICAL: rotation.postScale(1,-1); break;
                        case ExifInterface.ORIENTATION_TRANSPOSE: rotation.postRotate(90); rotation.postScale(-1,1); break;
                        case ExifInterface.ORIENTATION_TRANSVERSE: rotation.postRotate(270); rotation.postScale(-1,1); break;
                    }
                    Bitmap upright=Bitmap.createBitmap(decoded,0,0,decoded.getWidth(),decoded.getHeight(),rotation,true);
                    int x=(int)Math.round(upright.getWidth()*left/100);
                    int width=Math.min(upright.getWidth()-x,(int)Math.round(upright.getWidth()*(right-left)/100));
                    Bitmap crop=Bitmap.createBitmap(upright,x,0,width,upright.getHeight());
                    float scale=Math.min(2f,1800f/crop.getHeight());
                    final Bitmap image=scale>1 ? Bitmap.createScaledBitmap(crop,Math.round(crop.getWidth()*scale),Math.round(crop.getHeight()*scale),true) : crop;
                    if(decoded != upright && decoded != crop && decoded != image) decoded.recycle();
                    if(upright != crop && upright != image) upright.recycle();
                    if(crop != image) crop.recycle();
                    recognizer.process(InputImage.fromBitmap(image,0))
                        .addOnSuccessListener(result -> {
                            List<Text.Line> lines=new ArrayList<>();
                            for(Text.TextBlock block:result.getTextBlocks()) lines.addAll(block.getLines());
                            lines.sort(Comparator.comparingInt(line -> line.getBoundingBox()==null ? 0 : line.getBoundingBox().centerY()));
                            // Group nearby line centers into rows, then restore left-to-right order.
                            StringBuilder text=new StringBuilder();
                            List<Text.Line> row=new ArrayList<>(); int center=-100000, tolerance=0;
                            for(Text.Line line:lines) {
                                Rect box=line.getBoundingBox();int y=box==null?center:box.centerY();
                                if(!row.isEmpty() && Math.abs(y-center)>tolerance) { appendRow(text,row);row.clear(); }
                                if(row.isEmpty()) {center=y;tolerance=box==null?10:Math.max(10,box.height()/2);}
                                row.add(line);
                            }
                            appendRow(text,row);
                            sendRecognition(id,text.toString(),null);
                        })
                        .addOnFailureListener(error -> sendRecognition(id,null,"Could not read this photo. Try a clearer photo or narrow the selection to the UPC column."))
                        .addOnCompleteListener(task -> image.recycle());
                } catch(Exception error) { sendRecognition(id,null,"Could not open this photo. Please try a JPG or PNG."); }
            });
        }
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
    private static void appendRow(StringBuilder text,List<Text.Line> row) {
        row.sort(Comparator.comparingInt(line -> line.getBoundingBox()==null?0:line.getBoundingBox().left));
        for(Text.Line line:row) text.append(line.getText()).append("   ");
        if(!row.isEmpty()) text.append('\n');
    }
    private void sendRecognition(int id,String text,String error) {
        try {
            JSONObject payload=new JSONObject();payload.put("id",id);payload.put("text",text==null?"":text);payload.put("error",error==null?JSONObject.NULL:error);
            final String js="window.dispatchEvent(new CustomEvent('capy-ocr',{detail:"+payload.toString()+"}))";
            runOnUiThread(() -> { if(!isDestroyed()) web.evaluateJavascript(js,null); });
        } catch(Exception ignored) { }
    }
    @Override protected void onActivityResult(int requestCode,int resultCode,Intent data) {
        super.onActivityResult(requestCode,resultCode,data);
        if (requestCode == PICK_PHOTO && photoCallback != null) {
            Uri selected = resultCode != RESULT_OK ? null : data != null && data.getData() != null ? data.getData() : new File(getCacheDir(),"photo.jpg").length() > 0 ? photoUri : null;
            if(selected != null) selectedPhoto=selected;
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
        photoExecutor.shutdownNow(); if(recognizer != null) recognizer.close();
        new File(getCacheDir(),"photo.jpg").delete();
        super.onDestroy();
    }
}
