const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {JSDOM}=require('jsdom');
function setup({installed=false,ios=false}={}){
 const dom=new JSDOM(fs.readFileSync('index.html','utf8'),{url:'https://example.test/fit-together/',runScripts:'outside-only'});
 const w=dom.window,calls=[];
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
 w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'));};
 w.matchMedia=()=>({matches:installed,addEventListener(){}});
 Object.defineProperty(w,'isSecureContext',{value:true});
 if(ios)Object.defineProperty(w.navigator,'userAgent',{value:'iPhone'});
 Object.defineProperty(w.navigator,'serviceWorker',{value:{register:async(...args)=>{calls.push(args);return{};}}});
 vm.runInContext(fs.readFileSync('pwa.js','utf8'),dom.getInternalVMContext());
 return{dom,w,doc:w.document,calls,close:()=>dom.window.close()};
}
test('prompt is only triggered by a click, consumed once, and acceptance waits for installation',async()=>{
 const x=setup();try{
  const btn=x.doc.querySelector('#installAppBtn');assert.ok(btn.classList.contains('hidden'));
  let prompts=0;const event=new x.w.Event('beforeinstallprompt',{cancelable:true});
  event.prompt=async()=>{prompts++;};event.userChoice=Promise.resolve({outcome:'accepted'});
  x.w.dispatchEvent(event);assert.ok(event.defaultPrevented);assert.equal(prompts,0);
  assert.ok(!btn.classList.contains('hidden'));btn.click();btn.click();
  await new Promise(r=>setImmediate(r));assert.equal(prompts,1);
  assert.ok(btn.classList.contains('hidden'));assert.doesNotMatch(x.doc.querySelector('#installHelp').textContent,/^Installed/);
  x.w.dispatchEvent(new x.w.Event('appinstalled'));
  assert.match(x.doc.querySelector('#installLandingHelp').textContent,/Installation complete/);
  assert.equal(x.doc.querySelector('#installLandingDialog').open,true);
  assert.equal(x.doc.body.classList.contains('install-only'),true);
 }finally{x.close();}
});
test('manual iPhone help, standalone detection and live language changes work',()=>{
 const x=setup({ios:true}),y=setup({installed:true});try{
  assert.match(x.doc.querySelector('#installHelp').textContent,/Safari.*Share.*Home Screen/);
  x.w.dispatchEvent(new x.w.CustomEvent('fittogether:languagechange',{detail:'de'}));
  assert.equal(x.doc.querySelector('#installTitle').textContent,'FitWithFriends installieren');
  assert.match(x.doc.querySelector('#installHelp').textContent,/Teilen/);
  assert.match(y.doc.querySelector('#installTitle').textContent,/Your FitWithFriends app/);
  assert.ok(y.doc.querySelector('#installAppBtn').classList.contains('hidden'));
  assert.equal(x.calls[0][0],'./sw.js');assert.equal(x.calls[0][1].updateViaCache,'none');
 }finally{x.close();y.close();}
});
test('dismissal and prompt failure both restore usable manual instructions',async()=>{
 for(const fail of [false,true]){
  const x=setup();try{
   const event=new x.w.Event('beforeinstallprompt',{cancelable:true});
   event.prompt=async()=>{if(fail)throw Error('blocked');};event.userChoice=Promise.resolve({outcome:'dismissed'});
   x.w.dispatchEvent(event);x.doc.querySelector('#installAppBtn').click();
   await new Promise(r=>setImmediate(r));
   assert.equal(x.doc.querySelector('#installAppBtn').disabled,false);
   assert.match(x.doc.querySelector('#installHelp').textContent,/browser menu/);
  }finally{x.close();}
 }
});
test('manifest uses stable identity, standalone display and correctly sized launcher icons',()=>{
 const manifest=JSON.parse(fs.readFileSync('manifest.webmanifest','utf8'));
 assert.equal(manifest.id,'./');assert.equal(manifest.scope,'./');assert.equal(manifest.display,'standalone');
 for(const icon of manifest.icons){
  const buffer=fs.readFileSync(icon.src.split('?')[0]);const width=buffer.readUInt32BE(16),height=buffer.readUInt32BE(20);
  assert.equal(icon.sizes,`${width}x${height}`);
 }
 assert.ok(manifest.icons.some(i=>i.purpose==='maskable'));
});
test('worker provides offline navigation, avoids user data caching and keeps notifications in the app scope',async()=>{
 const handlers={},scope='https://example.test/fit-together/';let opened;
 const offline={status:200,offline:true};
 const ctx={URL,Response,fetch:async()=>{throw Error('offline');},caches:{match:async()=>offline},
  self:{registration:{scope},addEventListener:(name,handler)=>handlers[name]=handler},
  clients:{matchAll:async()=>[],openWindow:async(url)=>{opened=url;}}};
 vm.runInNewContext(fs.readFileSync('sw.js','utf8'),ctx);
 let response;
 handlers.fetch({request:{method:'GET',url:scope+'index.html?code=secret',mode:'navigate'},respondWith:p=>response=p});
 assert.equal(await response,offline);
 for(const url of ['https://api.example.test/auth',scope+'app.js',scope+'private-photo.jpg']){
  let intercepted=false;handlers.fetch({request:{method:'GET',url,mode:'cors'},respondWith:()=>intercepted=true});
  assert.equal(intercepted,false);
 }
 let pending;
 handlers.notificationclick({notification:{data:{url:'./index.html'},close(){}},waitUntil:p=>pending=p});await pending;
 assert.equal(opened,scope+'index.html');
 handlers.notificationclick({notification:{data:{url:'https://elsewhere.test/'},close(){}},waitUntil:p=>pending=p});await pending;
 assert.equal(opened,scope+'index.html');
});

test('opening the link shows installation before login; installed app skips it',async()=>{
 const x=setup(),y=setup({installed:true});try{
  const landing=x.doc.querySelector('#installLandingDialog');assert.equal(landing.open,true);
  assert.equal(y.doc.querySelector('#installLandingDialog').open,false);
  let prompts=0;const event=new x.w.Event('beforeinstallprompt',{cancelable:true});
  event.prompt=async()=>{prompts++;};event.userChoice=Promise.resolve({outcome:'dismissed'});
  x.w.dispatchEvent(event);assert.equal(x.doc.querySelector('#installLandingBtn').classList.contains('hidden'),false);
  x.doc.querySelector('#installLandingBtn').click();await new Promise(r=>setImmediate(r));assert.equal(prompts,1);
  assert.equal(x.doc.querySelector('#installContinueBtn'),null);
  const cancel=new x.w.Event('cancel',{cancelable:true});landing.dispatchEvent(cancel);assert.equal(cancel.defaultPrevented,true);
  landing.close();assert.equal(landing.open,true);
  assert.equal(y.doc.body.classList.contains('install-only'),false);
 }finally{x.close();y.close();}
});

test('download page language selector translates the whole page and saves the app preference',()=>{
 const x=setup();try{
  const selector=x.doc.querySelector('#installLanguageSelect');
  selector.value='de';selector.dispatchEvent(new x.w.Event('change'));
  assert.equal(x.doc.documentElement.lang,'de');
  assert.equal(x.doc.querySelector('#installLanguageLabel').textContent,'Sprache');
  assert.equal(x.doc.querySelector('#installLandingBtn').textContent,'FitWithFriends installieren');
  selector.value='en';selector.dispatchEvent(new x.w.Event('change'));
  assert.equal(x.doc.documentElement.lang,'en');
  assert.equal(x.doc.querySelector('#installLanguageLabel').textContent,'Language');
  assert.equal(x.doc.querySelector('#installLandingBtn').textContent,'Install FitWithFriends');
  assert.match(x.doc.querySelector('#installLandingHelp').textContent,/browser menu/);
  assert.equal(x.w.localStorage.getItem('fitTogether_language'),'en');
  x.w.dispatchEvent(new x.w.Event('appinstalled'));
  selector.value='de';selector.dispatchEvent(new x.w.Event('change'));
  assert.match(x.doc.querySelector('#installLandingHelp').textContent,/Installation abgeschlossen/);
  assert.equal(x.doc.querySelector('#installLandingDialog').open,true);
 }finally{x.close();}
});
