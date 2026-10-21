package com.capycapy.app;

import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.LinearGradient;
import android.graphics.Paint;
import android.graphics.Shader;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import com.google.android.gms.tasks.Tasks;
import com.google.mlkit.vision.common.InputImage;
import com.google.mlkit.vision.text.TextRecognition;
import com.google.mlkit.vision.text.TextRecognizer;
import com.google.mlkit.vision.text.latin.TextRecognizerOptions;
import java.util.concurrent.TimeUnit;
import org.junit.Test;
import org.junit.runner.RunWith;
import static org.junit.Assert.*;

@RunWith(AndroidJUnit4.class)
public class NativeOcrTest {
    @Test public void readsUpcsFromShadedMultiColumnList() throws Exception {
        Bitmap bitmap=Bitmap.createBitmap(1400,1700,Bitmap.Config.ARGB_8888);
        Canvas canvas=new Canvas(bitmap);Paint paint=new Paint(Paint.ANTI_ALIAS_FLAG);
        paint.setShader(new LinearGradient(0,0,1400,1700,0xffc8c6ba,0xfff0eee6,Shader.TileMode.CLAMP));
        canvas.drawRect(0,0,1400,1700,paint);paint.setShader(null);paint.setColor(Color.DKGRAY);paint.setTextSize(28);
        String[] rows={"199766111676","840494208205","196723489588","439128045868","840359637690","199593343462,199593416586","199100334051","199857020566","889945449354"};
        canvas.rotate(.7f);
        for(int i=0;i<rows.length;i++) {
            int y=150+i*150;
            canvas.drawText("A"+(7096853+i),100,y,paint);
            canvas.drawText(rows[i],400,y,paint);
            canvas.drawText("BRAND",1100,y,paint);
        }
        TextRecognizer reader=TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS);
        try {
            String text=Tasks.await(reader.process(InputImage.fromBitmap(bitmap,0)),90,TimeUnit.SECONDS).getText().replaceAll("\\s+","");
            for(String row:rows) for(String upc:row.split(",")) assertTrue("Missing UPC "+upc+" in "+text,text.contains(upc));
        } finally {reader.close();bitmap.recycle();}
    }
}
