const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {JSDOM}=require('jsdom'),{createCanvas}=require('@napi-rs/canvas');
function setup(saved){
 const dom=new JSDOM(fs.readFileSync('index.html','utf8'),{url:'https://example.test/',runScripts:'outside-only'}),w=dom.window,doc=w.document,native=createCanvas(280,280);
 w.HTMLCanvasElement.prototype.getContext=()=>native.getContext('2d');
 if(saved)w.localStorage.setItem('fitTogether_accent',saved);
 w.eval(fs.readFileSync('theme.js','utf8'));
 const wheel=doc.querySelector('#themeWheel');wheel.getBoundingClientRect=()=>({left:0,top:0,width:280,height:280});
 const point=(name,x,y)=>wheel.dispatchEvent(new w.MouseEvent(name,{clientX:x,clientY:y,button:0}));
 return{w,doc,native,wheel,point,close:()=>w.close()};
}
test('color wheel draws a hue spectrum and supports pointer dragging, brightness and reset',()=>{
 const x=setup();try{
  const initialBrightness=x.doc.querySelector('#themeBrightness');initialBrightness.value='100';initialBrightness.dispatchEvent(new x.w.Event('input'));
  const ctx=x.native.getContext('2d');
  const right=ctx.getImageData(265,140,1,1).data;assert(right[0]>240&&right[1]<25&&right[2]<25);
  const left=ctx.getImageData(15,140,1,1).data;assert(left[0]<25&&left[1]>240&&left[2]>240);
  x.point('pointerdown',272,140);assert.equal(x.w.localStorage.getItem('fitTogether_accent'),'#ff0000');
  x.point('pointermove',8,140);assert.equal(x.w.localStorage.getItem('fitTogether_accent'),'#00ffff');
  x.point('pointerup',8,140);x.point('pointermove',272,140);assert.equal(x.w.localStorage.getItem('fitTogether_accent'),'#00ffff');
  const brightness=x.doc.querySelector('#themeBrightness');brightness.value='0';brightness.dispatchEvent(new x.w.Event('input'));assert.equal(x.w.localStorage.getItem('fitTogether_accent'),'#000000');
  brightness.value='100';brightness.dispatchEvent(new x.w.Event('input'));assert.equal(x.w.localStorage.getItem('fitTogether_accent'),'#00ffff');
  assert.equal(x.doc.documentElement.style.getPropertyValue('--accent-start'),'#00ffff');
  assert.equal(x.doc.documentElement.style.getPropertyValue('--accent-text'),'#000000');
  x.point('pointerdown',145,144);assert.equal(x.w.localStorage.getItem('fitTogether_accent'),'#ffffff');
  assert.equal(x.doc.documentElement.style.getPropertyValue('--accent-start'),'#ffffff');
  assert.equal(x.doc.querySelector('#themeBrightness').value,'100');
  x.point('pointerup',145,144);
  x.doc.querySelector('#themeResetBtn').click();assert.equal(x.w.localStorage.getItem('fitTogether_accent'),'default');assert.equal(x.doc.documentElement.style.getPropertyValue('--accent-end'),'#7c3aed');
 }finally{x.close();}
});
test('old preferences, keyboard controls, hex input and localized folders remain usable',()=>{
 const x=setup('forest');try{
  assert.equal(x.doc.documentElement.style.getPropertyValue('--accent-start'),'#15803d');
  const folders=[...x.doc.querySelectorAll('#settings > details')];assert.equal(folders.length,6);assert(folders.every(el=>!el.open&&el.querySelector('summary h2')));
  assert.equal(x.doc.querySelector('#languageSelect').closest('details'),folders[0]);
  folders[1].open=true;x.wheel.dispatchEvent(new x.w.KeyboardEvent('keydown',{key:'ArrowRight',cancelable:true}));assert.match(x.w.localStorage.getItem('fitTogether_accent'),/^#[0-9a-f]{6}$/);
  const input=x.doc.querySelector('#themeColorInput');input.value='#123abc';input.dispatchEvent(new x.w.Event('input'));assert.equal(x.w.localStorage.getItem('fitTogether_accent'),'#123abc');
  input.value='oops';input.dispatchEvent(new x.w.Event('input'));assert.equal(x.w.localStorage.getItem('fitTogether_accent'),'#123abc');input.dispatchEvent(new x.w.Event('blur'));assert.equal(input.value,'#123abc');
  x.doc.documentElement.lang='en';x.w.dispatchEvent(new x.w.Event('fittogether:languagechange'));assert.equal(x.doc.querySelector('#themeTitle').textContent,'Colors');assert.equal(folders[1].open,true);
 }finally{x.close();}
});
