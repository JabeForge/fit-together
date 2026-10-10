const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');
function setup({released='0.27.2',installed=true,offline=false}={}){
 const dom=new JSDOM(fs.readFileSync('index.html','utf8'),{url:'https://example.test/fit-together/index.html',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window;let reloads=0,checks=0,fetches=0,fetchOptions;
 w.fitTogetherIsStandalone=()=>installed;
 Object.defineProperty(w.navigator,'onLine',{value:!offline});
 w.document.querySelector('#authScreen').classList.add('hidden');
 w.fetch=async(url,options)=>{fetches++;fetchOptions=options;return {ok:true,text:async()=>`<meta name="app-version" content="${released}">`};};
 w.eval(fs.readFileSync('app-updates.js','utf8'));
 const api=w.FitTogetherUpdates.start({update:async()=>checks++},{reload:()=>reloads++});
 return {w,api,close:()=>w.close(),get reloads(){return reloads;},get checks(){return checks;},get fetches(){return fetches;},get options(){return fetchOptions;}};
}
const tick=()=>new Promise(r=>setImmediate(r));
test('new release loads once on a safe opening with a fresh version check',async()=>{
 const x=setup();try{
  await tick();assert.equal(x.reloads,1);assert.equal(x.checks,1);
  assert.equal(x.w.document.querySelectorAll('#appUpdateStatus').length,1);
  assert.equal(x.options.cache,'no-store');assert.equal(x.options.credentials,'omit');
  await x.api.check(true);assert.equal(x.reloads,1);
 }finally{x.close();}
});
test('unchanged release and offline checks do not reload',async()=>{
 for(const opts of [{released:'0.27.1'},{offline:true}]){
  const x=setup(opts);try{await tick();assert.equal(x.reloads,0);if(opts.offline)assert.equal(x.fetches,0);}finally{x.close();}
 }
});
test('edited fields, open dialogs and account recovery protect the current session',async()=>{
 for(const block of ['input','dialog','recovery','login','interaction']){
  const x=setup();try{
   if(block==='input')x.w.document.querySelector('#eventTitle').dispatchEvent(new x.w.Event('input',{bubbles:true}));
   if(block==='dialog')x.w.document.querySelector('#statusDialog').setAttribute('open','');
   if(block==='recovery')x.w.fitTogetherRecoveryActive=true;
   if(block==='login')x.w.document.querySelector('#authScreen').classList.remove('hidden');
   if(block==='interaction')x.w.document.body.click();
   await tick();assert.equal(x.reloads,0,block);
   assert.equal(x.w.document.querySelector('#appUpdateStatus').hidden,false);
  }finally{x.close();}
 }
});
test('background checks only announce updates; return to installed app applies them',async()=>{
 const x=setup({released:'0.27.1'});try{
  await tick();x.w.fetch=async()=>({ok:true,text:async()=>'<meta name="app-version" content="0.27.2">'});
  await x.api.check(false);assert.equal(x.reloads,0);
  x.w.document.dispatchEvent(new x.w.Event('visibilitychange'));await tick();assert.equal(x.reloads,1);
 }finally{x.close();}
});
test('download page never reloads automatically and update status follows language',async()=>{
 const x=setup({installed:false});try{
  await tick();assert.equal(x.reloads,0);
  x.w.document.documentElement.lang='de';x.w.dispatchEvent(new x.w.Event('fittogether:languagechange'));
  assert.match(x.w.document.querySelector('#appUpdateStatus').textContent,/Update ist bereit/);
  x.w.fetch=async()=>{throw Error('unavailable');};await x.api.check(true);assert.equal(x.reloads,0);
 }finally{x.close();}
});
