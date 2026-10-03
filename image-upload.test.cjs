const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
function setup(){
 const ctx={File,Blob,URL,Image:class{set src(_){queueMicrotask(()=>this.onerror());}},document:{createElement(){
  const canvas=createCanvas(1,1);
  canvas.toBlob=(callback,type,quality)=>canvas.encode('jpeg',Math.round(quality*100)).then(buffer=>callback(new Blob([buffer],{type})),()=>callback(null));
  return canvas;
 }},createImageBitmap:async(file)=>loadImage(Buffer.from(await file.arrayBuffer()))};
 ctx.window=ctx;vm.runInNewContext(fs.readFileSync('image-upload.js','utf8'),ctx);return ctx;
}
async function sample(w,h){
 const canvas=createCanvas(w,h),ctx=canvas.getContext('2d');
 ctx.fillStyle='#e11d48';ctx.fillRect(0,0,w,h);ctx.fillStyle='#2563eb';ctx.fillRect(w/2,0,w/2,h);
 return new File([await canvas.encode('png')],'photo.png',{type:'image/png'});
}
test('real photo encoding keeps portrait/landscape proportions, caps dimensions and writes JPEG',async()=>{
 const x=setup();
 for(const [w,h,kind,edge,bytes] of [[3200,1600,'progress',1600,512*1024],[1600,3200,'proof',1200,256*1024],[320,240,'progress',320,512*1024]]){
  const result=await x.FitTogetherImages.prepare(await sample(w,h),kind);
  const image=await loadImage(Buffer.from(await result.arrayBuffer()));
  assert.equal(Math.max(image.width,image.height),edge);assert.equal(image.width/image.height,w/h);
  assert.equal(result.type,'image/jpeg');assert.equal(result.name,'photo.jpg');assert.ok(result.size<=bytes);
  // Decode the exported JPEG and verify left/right content survives resizing.
  const canvas=createCanvas(image.width,image.height),ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);
  const left=ctx.getImageData(10,10,1,1).data,right=ctx.getImageData(image.width-10,10,1,1).data;
  assert.ok(left[0]>left[2]);assert.ok(right[2]>right[0]);
 }
});
test('busy noisy photos meet the storage cap through real encoding',async()=>{
 const x=setup(),canvas=createCanvas(2200,1600),ctx=canvas.getContext('2d'),pixels=ctx.createImageData(2200,1600);
 let state=7;for(let i=0;i<pixels.data.length;i+=4){state=(state*1664525+1013904223)>>>0;pixels.data[i]=state&255;pixels.data[i+1]=(state>>>8)&255;pixels.data[i+2]=(state>>>16)&255;pixels.data[i+3]=255;}
 ctx.putImageData(pixels,0,0);
 const original=new File([await canvas.encode('png')],'noise.png',{type:'image/png'});
 const result=await x.FitTogetherImages.prepare(original,'proof');
 assert.ok(result.size<=256*1024);assert.ok(result.size<original.size/3);
});
test('unsupported, corrupt and oversized sources are rejected instead of uploaded raw',async()=>{
 const x=setup();
 await assert.rejects(x.FitTogetherImages.prepare(new File(['<svg/>'],'photo.svg',{type:'image/svg+xml'})),error=>error.code==='format');
 await assert.rejects(x.FitTogetherImages.prepare(new File(['broken'],'photo.jpg',{type:'image/jpeg'})),error=>error.code==='decode');
 await assert.rejects(x.FitTogetherImages.prepare({name:'big.jpg',type:'image/jpeg',size:33*1024*1024}),error=>error.code==='input-size');
 assert.match(x.FitTogetherImages.errorMessage({code:'decode'},'en'),/JPEG/);
});
