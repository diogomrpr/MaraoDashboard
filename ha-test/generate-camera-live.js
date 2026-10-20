// Generate the distinct moving-camera fixture from a synthetic canvas, offline.
const fs=require('node:fs');const path=require('node:path');const {chromium}=require('playwright');
const high=process.argv.includes('--high');
(async()=>{const browser=await chromium.launch();try{const page=await browser.newPage();const bytes=await page.evaluate(async high=>{
 const canvas=document.createElement('canvas');canvas.width=high?640:320;canvas.height=high?360:180;const ctx=canvas.getContext('2d');
 const mimeType=['video/mp4;codecs=avc1.42001E','video/mp4'].find(type=>MediaRecorder.isTypeSupported(type));if(!mimeType)throw Error('MP4 recording is unavailable');
 const recorder=new MediaRecorder(canvas.captureStream(20),{mimeType,videoBitsPerSecond:high?900000:150000});const chunks=[];
 const finished=new Promise(resolve=>{recorder.ondataavailable=event=>chunks.push(event.data);recorder.onstop=resolve;});
 recorder.start();let frame=0;const timer=setInterval(()=>{if(high){for(let y=0;y<360;y+=12)for(let x=0;x<640;x+=12){ctx.fillStyle=`hsl(${(x*3+y*7+frame*31)%360} 70% 50%)`;ctx.fillRect(x,y,12,12);}frame++;return;}ctx.fillStyle='#142e50';ctx.fillRect(0,0,320,180);ctx.fillStyle='#80bfff';ctx.fillRect((frame++*3)%320,50,60,60);},50);
 await new Promise(resolve=>setTimeout(resolve,6000));clearInterval(timer);recorder.stop();await finished;return Array.from(new Uint8Array(await new Blob(chunks).arrayBuffer()));
 },high);fs.writeFileSync(path.join(__dirname,'custom_components/marao_test_camera',high?'high.mp4':'live.mp4'),Buffer.from(bytes));}finally{await browser.close();}})().catch(error=>{console.error(error);process.exitCode=1;});
