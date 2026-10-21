// One fast OCR worker per app session. Loading language data is not repeated per photo.
let workerPromise;
let report = () => {};
let nativeRequestId = 0;
export function hasNativeReader() {
  return !!window.CapyAndroid && typeof window.CapyAndroid.recognizePhoto === 'function';
}
export function readNativePhoto(left,right) {
  return new Promise((resolve,reject)=>{
    const id=++nativeRequestId;
    const finish=event=>{
      if(event.detail.id!==id) return;
      clearTimeout(timer);window.removeEventListener('capy-ocr',finish);
      if(event.detail.error) reject(new Error(event.detail.error));else resolve({data:{text:event.detail.text}});
    };
    const timer=setTimeout(()=>{window.removeEventListener('capy-ocr',finish);reject(new Error('Photo reading timed out. Try again.'));},45000);
    window.addEventListener('capy-ocr',finish);
    window.CapyAndroid.recognizePhoto(id,left,right);
  });
}
export function getReader(onProgress) {
  report = onProgress || (()=>{});
  if (!workerPromise) {
    workerPromise = Tesseract.createWorker('eng',1,{
      workerPath:'/ocr/worker.min.js',corePath:'/ocr-core',langPath:'/ocr-lang',cachePath:'capy-fast-v2',
      logger:message=>report(message)
    }).then(async worker=>{
      // Preserve letters so a SKU never becomes a UPC through a digit-only whitelist.
      await worker.setParameters({tessedit_pageseg_mode:'6',preserve_interword_spaces:'1'});
      return worker;
    }).catch(error=>{workerPromise=null;throw error;});
  }
  return workerPromise;
}
export async function prepareColumn(image,left,right) {
  const cropX=Math.round(image.naturalWidth*left/100);
  const cropWidth=Math.max(1,Math.round(image.naturalWidth*(right-left)/100));
  const scale=Math.min(2,2200/image.naturalHeight,1200/cropWidth);
  const canvas=document.createElement('canvas');
  canvas.width=Math.max(1,Math.round(cropWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.drawImage(image,cropX,0,cropWidth,image.naturalHeight,0,0,canvas.width,canvas.height);
  // Local threshold removes uneven paper shadows while retaining thin dark strokes.
  const frame=ctx.getImageData(0,0,canvas.width,canvas.height), pixels=frame.data;
  const width=canvas.width,height=canvas.height,stride=width+1;
  const gray=new Uint8Array(width*height),integral=new Float64Array(stride*(height+1));
  for(let y=0;y<height;y++) {
    let sum=0;
    for(let x=0;x<width;x++) {
      const i=y*width+x,k=i*4;
      gray[i]=Math.round(pixels[k]*.299+pixels[k+1]*.587+pixels[k+2]*.114);
      sum+=gray[i]; integral[(y+1)*stride+x+1]=integral[y*stride+x+1]+sum;
    }
  }
  const radius=24;
  for(let y=0;y<height;y++)for(let x=0;x<width;x++) {
    const x1=Math.max(0,x-radius),y1=Math.max(0,y-radius),x2=Math.min(width,x+radius+1),y2=Math.min(height,y+radius+1);
    const mean=(integral[y2*stride+x2]-integral[y1*stride+x2]-integral[y2*stride+x1]+integral[y1*stride+x1])/((x2-x1)*(y2-y1));
    const i=y*width+x,k=i*4,v=gray[i]<mean*.91?0:255;
    pixels[k]=pixels[k+1]=pixels[k+2]=v;pixels[k+3]=255;
  }
  ctx.putImageData(frame,0,0);
  return canvas;
}
