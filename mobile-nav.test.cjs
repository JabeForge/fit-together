const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');
function setup(){
 const dom=new JSDOM(fs.readFileSync('index.html','utf8'),{url:'https://example.test/',runScripts:'outside-only'}),w=dom.window,doc=w.document;
 const media={matches:true,addEventListener:(_,fn)=>media.change=fn};w.matchMedia=()=>media;w.scrollTo=()=>{};
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
 w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'));};
 doc.querySelector('#appShell').classList.remove('hidden');
 for(const tab of doc.querySelectorAll('.tabs .tab'))tab.addEventListener('click',()=>{
  for(const other of doc.querySelectorAll('.tabs .tab'))other.classList.toggle('active',other===tab);
  for(const panel of doc.querySelectorAll('.panel'))panel.classList.toggle('active',panel.id===tab.dataset.tab);
  w.dispatchEvent(new w.Event('fittogether:tabchange'));
 });
 w.eval(fs.readFileSync('mobile-nav.js','utf8'));
 return {w,doc,media,button:doc.querySelector('#mobileMenuBtn'),dialog:doc.querySelector('#mobileMenuDialog'),close:()=>w.close()};
}
test('all eight destinations navigate through existing tabs and close the menu',()=>{
 const x=setup();try{
  const items=[...x.doc.querySelectorAll('[data-mobile-tab]')];assert.equal(items.length,8);
  for(const item of items){
   x.button.click();assert.equal(x.dialog.open,true);assert.equal(x.button.getAttribute('aria-expanded'),'true');
   item.click();assert.equal(x.dialog.open,false);assert.equal(x.button.getAttribute('aria-expanded'),'false');
   assert.equal(x.doc.querySelector(`#${item.dataset.mobileTab}`).classList.contains('active'),true);
   assert.equal(item.getAttribute('aria-current'),'page');
   assert.equal(x.doc.body.classList.contains('mobile-menu-open'),false);
  }
 }finally{x.close();}
});
test('locale and programmatic navigation update labels and current destination',()=>{
 const x=setup();try{
  x.doc.querySelector('[data-tab=photos]').click();
  assert.equal(x.doc.querySelector('[data-mobile-tab=photos]').getAttribute('aria-current'),'page');
  x.doc.documentElement.lang='en';
  const labels=['Overview','Calendar','Weight','Achievements','Photos','Group','Profiles','⚙️ Settings'];
  [...x.doc.querySelectorAll('.tabs .tab')].forEach((el,i)=>el.textContent=labels[i]);
  x.w.dispatchEvent(new x.w.Event('fittogether:languagechange'));
  assert.equal(x.button.getAttribute('aria-label'),'Open navigation menu');
  assert.equal(x.doc.querySelector('#mobileMenuTitle').textContent,'Menu');
  assert.equal(x.doc.querySelector('[data-mobile-tab=settings]').textContent,'⚙Settings');
  assert.equal(x.doc.querySelector('[data-mobile-tab=achievements] .mobile-menu-label').textContent,'Achievements');
 }finally{x.close();}
});
test('backdrop closes; another dialog blocks opening; desktop resize and sign-out close',async()=>{
 const x=setup();try{
  x.button.click();
  x.dialog.getBoundingClientRect=()=>({left:100,right:380,top:200,bottom:600});
  x.dialog.dispatchEvent(new x.w.MouseEvent('click',{clientX:12,clientY:150,bubbles:true}));
  assert.equal(x.dialog.open,false);
  const blocker=x.doc.querySelector('#tutorialDialog');blocker.showModal();x.button.click();assert.equal(x.dialog.open,false);blocker.close();
  x.button.click();x.doc.querySelector('#mobileMenuCloseBtn').click();assert.equal(x.dialog.open,false);
  x.button.click();x.media.matches=false;x.media.change({matches:false});assert.equal(x.dialog.open,false);
  x.button.click();assert.equal(x.dialog.open,false);
  x.media.matches=true;x.button.click();x.doc.querySelector('#appShell').classList.add('hidden');
  await new Promise(resolve=>setImmediate(resolve));assert.equal(x.dialog.open,false);
  assert.equal(x.doc.body.classList.contains('mobile-menu-open'),false);
 }finally{x.close();}
});
