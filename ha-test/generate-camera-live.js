// Generate the distinct moving-camera fixture from a synthetic canvas, offline.
const fs=require('node:fs');const path=require('node:path');const {chromium}=require('playwright');
(async()=>{const browser=await chromium.launch();try{const page=await browser.newPage();const bytes=await page.evaluate(async()=>{
 const canvas=document.createElement('canvas');canvas.width=320;canvas.height=180;const ctx=canvas.getContext('2d');
 const mimeType=['video/mp4;codecs=avc1.42001E','video/mp4'].find(type=>MediaRecorder.isTypeSupported(type));if(!mimeType)throw Error('MP4 recording is unavailable');
 const recorder=new MediaRecorder(canvas.captureStream(20),{mimeType,videoBitsPerSecond:150000});const chunks=[];
 const finished=new Promise(resolve=>{recorder.ondataavailable=event=>chunks.push(event.data);recorder.onstop=resolve;});
 recorder.start();let frame=0;const timer=setInterval(()=>{ctx.fillStyle='#142e50';ctx.fillRect(0,0,320,180);ctx.fillStyle='#80bfff';ctx.fillRect((frame++*3)%320,50,60,60);},50);
 await new Promise(resolve=>setTimeout(resolve,6000));clearInterval(timer);recorder.stop();await finished;return Array.from(new Uint8Array(await new Blob(chunks).arrayBuffer()));
 });fs.writeFileSync(path.join(__dirname,'custom_components/marao_test_camera/live.mp4'),Buffer.from(bytes));}finally{await browser.close();}})().catch(error=>{console.error(error);process.exitCode=1;});
