// Personal colors and a touch/mouse color wheel. Previous choices are preserved.
(()=>{
 const $=id=>document.getElementById(id),root=document.documentElement;
 const presets={default:['#2563eb','#7c3aed'],ocean:['#0369a1','#0e7490'],forest:['#15803d','#047857'],sunset:['#c2410c','#b91c1c'],rose:['#be185d','#9d174d']};
 const key='fitTogether_accent',valid=/^#[0-9a-f]{6}$/i;
 let choice='default';try{const value=localStorage.getItem(key);if(Object.hasOwn(presets,value)||valid.test(value||''))choice=value;}catch{}
 const canvas=$('themeWheel'),ctx=canvas?.getContext('2d'),size=280,center=140,radius=132;
 let hsv={h:0,s:1,v:1},dragging=false,base=null,wheelImage=null,wheelBrightness=-1;
 function rgb(h,s,v){const c=v*s,x=c*(1-Math.abs((h/60)%2-1)),m=v-c;const p=h<60?[c,x,0]:h<120?[x,c,0]:h<180?[0,c,x]:h<240?[0,x,c]:h<300?[x,0,c]:[c,0,x];return p.map(n=>Math.round((n+m)*255));}
 const hex=arr=>'#'+arr.map(n=>n.toString(16).padStart(2,'0')).join('');
 function fromHex(color){
  const [r,g,b]=[1,3,5].map(i=>parseInt(color.slice(i,i+2),16)/255),max=Math.max(r,g,b),min=Math.min(r,g,b),delta=max-min;
  let h=delta===0?0:max===r?60*(((g-b)/delta)%6):max===g?60*((b-r)/delta+2):60*((r-g)/delta+4);
  return{h:(h+360)%360,s:max===0?0:delta/max,v:max};
 }
 function readable(color){
  let p=[1,3,5].map(i=>parseInt(color.slice(i,i+2),16));
  const lum=()=>p.map(c=>{const v=c/255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
  while(1.05/(lum()+.05)<4.5)p=p.map(c=>Math.floor(c*.92));return hex(p);
 }
 const source=()=>Object.hasOwn(presets,choice)?presets[choice][0]:choice;
 function draw(){
  if(!ctx||!base)return;
  if(!wheelImage||wheelBrightness!==hsv.v){
   wheelImage=ctx.createImageData(size,size);wheelBrightness=hsv.v;
   for(let i=0;i<base.data.length;i+=4){for(let j=0;j<3;j++)wheelImage.data[i+j]=Math.round(base.data[i+j]*hsv.v);wheelImage.data[i+3]=base.data[i+3];}
  }
  ctx.putImageData(wheelImage,0,0);
  const angle=hsv.h*Math.PI/180,x=center+Math.cos(angle)*hsv.s*radius,y=center+Math.sin(angle)*hsv.s*radius;
  ctx.beginPath();ctx.arc(x,y,7,0,Math.PI*2);ctx.lineWidth=4;ctx.strokeStyle='#0b1020';ctx.stroke();ctx.lineWidth=2;ctx.strokeStyle='#ffffff';ctx.stroke();
 }
 function labels(){
  const en=root.lang==='en';
  $('themeTitle').textContent=en?'Colors':'Farben';
  $('themeDescription').textContent=en?'Choose your accent on the color wheel. It is saved on this device.':'Wähle deine Akzentfarbe im Farbkreis. Sie wird auf diesem Gerät gespeichert.';
  $('themeWheelHelp').textContent=en?'Tap or drag in the circle. Keyboard: left/right changes hue, up/down changes saturation.':'Tippe oder ziehe im Kreis. Tastatur: links/rechts ändert den Farbton, oben/unten die Sättigung.';
  $('themeBrightnessLabel').textContent=en?'Brightness':'Helligkeit';$('themeCustomLabel').textContent=en?'Color code':'Farbcode';
  $('themeColorHint').textContent=en?'Light accents are darkened to keep white button text readable. The preview shows the applied accent.':'Helle Akzente werden für lesbare weiße Buttonschrift abgedunkelt. Die Vorschau zeigt die verwendete Akzentfarbe.';
  $('themeResetBtn').textContent=en?'Default colors':'Standardfarben';canvas.setAttribute('aria-label',en?'Accent color wheel':'Farbkreis für die Akzentfarbe');
  canvas.setAttribute('aria-valuenow',String(Math.round(hsv.h)%360));canvas.setAttribute('aria-valuetext',`${source()}, ${en?'saturation':'Sättigung'} ${Math.round(hsv.s*100)}%`);
 }
 function apply(){
  const pair=Object.hasOwn(presets,choice)?presets[choice]:[readable(choice),readable(choice)];
  root.style.setProperty('--accent-start',pair[0]);root.style.setProperty('--accent-end',pair[1]);
  $('themeColorInput').value=source();$('themeBrightness').value=Math.round(hsv.v*100);$('themePreview').style.background=`linear-gradient(135deg,${pair[0]},${pair[1]})`;
  labels();draw();
 }
 function save(value,parse=true){if(!Object.hasOwn(presets,value)&&!valid.test(value))return;choice=value;if(parse)hsv=fromHex(source());try{localStorage.setItem(key,value);}catch{}apply();}
 function pick(event){
  const r=canvas.getBoundingClientRect();if(!r.width||!r.height)return;
  const dx=(event.clientX-r.left)*size/r.width-center,dy=(event.clientY-r.top)*size/r.height-center;
  hsv.h=(Math.atan2(dy,dx)*180/Math.PI+360)%360;hsv.s=Math.min(1,Math.hypot(dx,dy)/radius);
  save(hex(rgb(hsv.h,hsv.s,hsv.v)),false);
 }
 canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;dragging=true;canvas.setPointerCapture?.(e.pointerId);pick(e);});
 canvas.addEventListener('pointermove',e=>{if(dragging)pick(e);});
 for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,()=>{dragging=false;});
 canvas.addEventListener('keydown',e=>{
  if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();
  if(e.key==='ArrowLeft')hsv.h=(hsv.h+355)%360;if(e.key==='ArrowRight')hsv.h=(hsv.h+5)%360;
  if(e.key==='ArrowUp')hsv.s=Math.min(1,hsv.s+.05);if(e.key==='ArrowDown')hsv.s=Math.max(0,hsv.s-.05);
  save(hex(rgb(hsv.h,hsv.s,hsv.v)),false);
 });
 $('themeBrightness').addEventListener('input',e=>{hsv.v=Number(e.target.value)/100;save(hex(rgb(hsv.h,hsv.s,hsv.v)),false);});
 $('themeColorInput').addEventListener('input',e=>{if(valid.test(e.target.value))save(e.target.value.toLowerCase());});
 $('themeColorInput').addEventListener('blur',()=>{$('themeColorInput').value=source();});
 $('themeResetBtn').addEventListener('click',()=>save('default'));
 window.addEventListener('fittogether:languagechange',labels);
 if(ctx){
  base=ctx.createImageData(size,size);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
   const dx=x-center,dy=y-center,s=Math.hypot(dx,dy)/radius,i=(y*size+x)*4;if(s>1)continue;
   const p=rgb((Math.atan2(dy,dx)*180/Math.PI+360)%360,s,1);base.data.set([...p,255],i);
  }
 }
 hsv=fromHex(source());apply();
})();
