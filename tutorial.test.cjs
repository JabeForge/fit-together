const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('index.html','utf8');
function setup(){
 const dom=new JSDOM(html,{url:'https://example.test/',runScripts:'outside-only'}),w=dom.window;
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
 w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'));};
 w.eval(fs.readFileSync('tutorial.js','utf8'));
 return {w,doc:w.document,api:w.FitTogetherTutorial,close:()=>w.close(),click:id=>w.document.getElementById(id).click()};
}
test('manual four-step flow supports back, completion and per-account persistence',()=>{
 const x=setup();try{
  let starts=0,finished=0;x.w.addEventListener('fittogether:tutorialfinished',()=>finished++);
  x.api.showIfNeeded('first',()=>starts++);
  assert.equal(x.doc.querySelector('#tutorialDialog').open,true);
  assert.equal(x.api.isPending('first'),true);
  assert.equal(x.doc.querySelector('#tutorialBackBtn').disabled,true);
  x.click('tutorialNextBtn');assert.match(x.doc.querySelector('#tutorialTitle').textContent,/nächstes Training/);
  x.click('tutorialBackBtn');assert.match(x.doc.querySelector('#tutorialTitle').textContent,/Gemeinsam/);
  for(let i=0;i<3;i++)x.click('tutorialNextBtn');
  assert.match(x.doc.querySelector('#tutorialCount').textContent,/4 von 4/);
  assert.equal(starts,0);x.click('tutorialNextBtn');
  assert.equal(starts,1);assert.equal(finished,1);assert.equal(x.api.isPending('first'),false);
  assert.equal(x.w.localStorage.getItem('fitTogether_tutorial_v1_first'),'seen');
  x.api.showIfNeeded('first',()=>starts++);assert.equal(x.doc.querySelector('#tutorialDialog').open,false);
  x.click('openTutorialBtn');assert.equal(x.doc.querySelector('#tutorialDialog').open,true);
  assert.match(x.doc.querySelector('#tutorialCount').textContent,/1 von 4/);
  x.click('tutorialSkipBtn');assert.equal(starts,1);
  x.api.showIfNeeded('second',()=>starts++);assert.equal(x.doc.querySelector('#tutorialDialog').open,true);
 }finally{x.close();}
});
test('language switches preserve the step and explain photo proof and money tracking',()=>{
 const x=setup();try{
  x.api.showIfNeeded('u',()=>{});x.click('tutorialNextBtn');x.click('tutorialNextBtn');
  x.doc.documentElement.lang='en';x.w.dispatchEvent(new x.w.Event('fittogether:languagechange'));
  assert.equal(x.doc.querySelector('#tutorialCount').textContent,'Step 3 of 4');
  assert.match(x.doc.querySelector('#tutorialText').textContent,/upload it as proof/);
  assert.match(x.doc.querySelector('#tutorialTip').textContent,/does not charge money/);
  assert.equal(x.doc.querySelector('#openTutorialBtn').textContent,'Open tutorial');
  x.doc.documentElement.lang='de';x.w.dispatchEvent(new x.w.Event('fittogether:languagechange'));
  assert.match(x.doc.querySelector('#tutorialTip').textContent,/bucht kein Geld ab/);
 }finally{x.close();}
});
test('queues behind another dialog; Escape skips and logout does not mark it seen',()=>{
 const x=setup();try{
  const blocker=x.doc.querySelector('#passwordDialog');blocker.showModal();
  x.api.showIfNeeded('u',()=>{});assert.equal(x.doc.querySelector('#tutorialDialog').open,false);
  blocker.close();assert.equal(x.doc.querySelector('#tutorialDialog').open,true);
  x.api.reset();assert.equal(x.doc.querySelector('#tutorialDialog').open,false);
  assert.equal(x.w.localStorage.getItem('fitTogether_tutorial_v1_u'),null);
  x.click('openTutorialBtn');assert.equal(x.doc.querySelector('#tutorialDialog').open,false);
  x.api.showIfNeeded('u',()=>{});
  const e=new x.w.Event('cancel',{cancelable:true});x.doc.querySelector('#tutorialDialog').dispatchEvent(e);
  assert.equal(e.defaultPrevented,true);assert.equal(x.api.isPending('u'),false);
 }finally{x.close();}
});
