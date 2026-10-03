// Personal accent colors, stored on this device. Event/status colors stay separate.
(()=>{
 const presets={default:['#2563eb','#7c3aed'],ocean:['#0369a1','#0e7490'],forest:['#15803d','#047857'],sunset:['#c2410c','#b91c1c'],rose:['#be185d','#9d174d']};
 const names={de:{default:'Blau / Lila',ocean:'Ozean',forest:'Wald',sunset:'Sonnenuntergang',rose:'Rose'},en:{default:'Blue / purple',ocean:'Ocean',forest:'Forest',sunset:'Sunset',rose:'Rose'}};
 const key='fitTogether_accent';
 const hexRE=/^#[0-9a-f]{6}$/i;
 let choice='default';try{const saved=localStorage.getItem(key);if(Object.hasOwn(presets,saved)||hexRE.test(saved||''))choice=saved;}catch{}
 function readable(hex){
  let rgb=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
  const luminance=()=>rgb.map(c=>{const v=c/255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
  while(1.05/(luminance()+.05)<4.5)rgb=rgb.map(c=>Math.floor(c*.92));
  return '#'+rgb.map(c=>c.toString(16).padStart(2,'0')).join('');
 }
 function colors(){if(Object.hasOwn(presets,choice))return presets[choice];const c=readable(choice);return[c,c];}
 function apply(){
  const pair=colors();document.documentElement.style.setProperty('--accent-start',pair[0]);document.documentElement.style.setProperty('--accent-end',pair[1]);
  render();
 }
 function render(){
  const en=document.documentElement.lang==='en',language=en?'en':'de';
  const title=document.getElementById('themeTitle');if(!title)return;
  title.textContent=en?'Make it yours':'Deine Farben';
  document.getElementById('themeDescription').textContent=en?'Choose an accent for buttons, the menu and progress bars. Your choice is saved on this device.':'Wähle eine Akzentfarbe für Buttons, Menü und Fortschrittsbalken. Deine Auswahl wird auf diesem Gerät gespeichert.';
  document.getElementById('themeCustomLabel').textContent=en?'Your own color':'Eigene Farbe';
  document.getElementById('themeColorHint').textContent=en?'Light colors are darkened so button text stays readable.':'Helle Farben werden abgedunkelt, damit die Schrift auf Buttons gut lesbar bleibt.';
  for(const btn of document.querySelectorAll('[data-accent]')){
   btn.querySelector('.theme-name').textContent=names[language][btn.dataset.accent];btn.setAttribute('aria-pressed',String(btn.dataset.accent===choice));
  }
  const custom=!(Object.hasOwn(presets,choice));document.getElementById('themeCustomWrap').classList.toggle('selected',custom);
  document.getElementById('themeColorInput').value=custom?choice:presets[choice][0];
 }
 function choose(value){if(!(Object.hasOwn(presets,value))&&!hexRE.test(value))return;choice=value;try{localStorage.setItem(key,value);}catch{}apply();}
 for(const btn of document.querySelectorAll('[data-accent]')){
  const pair=presets[btn.dataset.accent];btn.querySelector('.theme-swatch').style.background=`linear-gradient(135deg,${pair[0]},${pair[1]})`;
  btn.addEventListener('click',()=>choose(btn.dataset.accent));
 }
 document.getElementById('themeColorInput')?.addEventListener('input',event=>choose(event.target.value));
 window.addEventListener('fittogether:languagechange',render);
 apply();
})();
