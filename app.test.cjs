const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('index.html','utf8');
const code=fs.readFileSync('app.js','utf8').replace(/^import .*;$/m,'').replace(/^init\(\);$/m,'').replace(/^setTimeout\(\(\)=>maybeOfferNotificationOnboarding\(\),1200\);$/m,'');
function setup(){
 const dom=new JSDOM(html,{url:'https://example.test/fit-together/',runScripts:'outside-only'});
 const w=dom.window,calls=[];
 const auth={
  resetPasswordForEmail:async(...args)=>{calls.push(['reset',...args]);return{error:null};},
  signInWithPassword:async(...args)=>{calls.push(['verify',...args]);return{error:null};},
  updateUser:async(...args)=>{calls.push(['update',...args]);return{error:null};}
 };
 w.createClient=()=>({auth});w.alert=()=>{};w.confirm=()=>true;
 w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:(_,key)=>key==='measureText'?()=>({width:0}):()=>{}});
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
 w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'));};
 vm.runInContext(code,dom.getInternalVMContext());
 const run=s=>vm.runInContext(s,dom.getInternalVMContext());
 const close=()=>{run('uiTranslationObserver.disconnect()');dom.window.close();};
 return {dom,w,calls,auth,run,close,doc:w.document};
}
test('English settings, achievements, status and placeholders survive a DE/EN round trip',()=>{
 const x=setup();try{
  x.run(`currentUser={id:'u',email:'u@example.test'};currentProfile={name:'Kalender'};activeGroup={id:'g',name:'Gewicht'};groups=[activeGroup];groupMembers=[{id:'u',name:'Kalender'}];events=[{id:'e',title:'Schwimmen',date:todayISO(),start:'18:00',end:'19:00',color:'blue',penalty:2,created_by:'u',recurrence:'none',participants:[{profile_id:'u',name:'Kalender',status:'completed'}]}];`);
  x.run("setLanguage('en')");
  assert.equal(x.doc.documentElement.lang,'en');
  assert.match(x.doc.querySelector('#achievementGrid').textContent,/Showing up/);
  assert.doesNotMatch(x.doc.querySelector('#achievementGrid').textContent,/Durchgezogen|Zuverlässig|Silber|Trainings|Wochen|Bis Bronze/);
  assert.match(x.doc.querySelector('#eventList').textContent,/Created by: Kalender/);
  assert.match(x.doc.querySelector('#eventList').textContent,/Kalender: Done/);
  assert.match(x.doc.querySelector('#eventList').textContent,/Schwimmen/);
  assert.equal(x.doc.querySelector('#ownProfileName').textContent,'Kalender');
  assert.equal(x.doc.querySelector('#currentGroupName').textContent,'Gewicht');
  assert.equal(x.doc.querySelector('#loginPassword').placeholder,'Password');
  x.run("setLanguage('de')");
  assert.equal(x.doc.querySelector('#loginPassword').placeholder,'Passwort');
  assert.match(x.doc.querySelector('#achievementGrid').textContent,/Durchgezogen/);
  assert.match(x.doc.querySelector('#eventList').textContent,/Kalender: Erledigt/);
  assert.equal(x.doc.querySelector('[data-tab=home]').textContent,'Übersicht');
  x.run("setLanguage('en')");
  assert.match(x.doc.querySelector('#achievementGrid').textContent,/Showing up/);
  assert.equal(x.doc.querySelector('#loginPassword').placeholder,'Password');
 }finally{x.close();}
});
test('late-created nodes and changed text are translated without changing user content',async()=>{
 const x=setup();try{
  x.run("setLanguage('en')");
  const p=x.doc.createElement('p');p.textContent='Kamera bereit.';x.doc.body.append(p);
  await new Promise(r=>setImmediate(r));assert.equal(p.textContent,'Camera ready.');
  p.firstChild.nodeValue='Kamera wird gestartet …';
  await new Promise(r=>setImmediate(r));assert.equal(p.textContent,'Starting camera …');
  const u=x.doc.createElement('span');u.dataset.userContent='';u.textContent='Gewicht';x.doc.body.append(u);
  await new Promise(r=>setImmediate(r));assert.equal(u.textContent,'Gewicht');
 }finally{x.close();}
});
test('password reset validates email and uses a non-enumerating success message',async()=>{
 const x=setup();try{
  x.run("setLanguage('en')");x.doc.querySelector('#loginEmail').value='invalid';
  await x.run('sendPasswordReset()');assert.equal(x.calls.length,0);
  x.doc.querySelector('#loginEmail').value='u@example.test';await x.run('sendPasswordReset()');
  assert.equal(x.calls[0][0],'reset');assert.equal(x.calls[0][2].redirectTo,'https://jabeforge.github.io/fit-together/');
  assert.match(x.doc.querySelector('#authMessage').textContent,/If an account exists/);
  assert.equal(x.doc.querySelector('#forgotPasswordBtn').disabled,false);
 }finally{x.close();}
});
test('password changes require matching values and current password verification',async()=>{
 const x=setup();try{
  x.run("currentUser={id:'u',email:'u@example.test'};openPasswordDialog(false)");
  x.doc.querySelector('#newPassword').value='test-new-password';x.doc.querySelector('#confirmPassword').value='different-password';
  await x.run('savePassword({preventDefault(){}})');assert.equal(x.calls.length,0);
  x.doc.querySelector('#confirmPassword').value='test-new-password';
  await x.run('savePassword({preventDefault(){}})');assert.equal(x.calls.length,0);
  x.doc.querySelector('#currentPassword').value='test-old-password';
  x.auth.signInWithPassword=async()=>({error:{message:'invalid'}});
  await x.run('savePassword({preventDefault(){}})');assert.equal(x.calls.filter(c=>c[0]==='update').length,0);
  x.auth.signInWithPassword=async(...args)=>{x.calls.push(['verify',...args]);return{error:null};};
  await x.run('savePassword({preventDefault(){}})');assert.deepEqual(x.calls.map(c=>c[0]),['verify','update']);
  assert.equal(x.doc.querySelector('#newPassword').value,'');
 }finally{x.close();}
});
test('recovery skips old password, reports expired-session errors and blocks signed-out updates',async()=>{
 const x=setup();try{
  x.run("setLanguage('en');currentUser={id:'u'};openPasswordDialog(true)");
  x.doc.querySelector('#newPassword').value='test-new-password';x.doc.querySelector('#confirmPassword').value='test-new-password';
  x.auth.updateUser=async()=>({error:{message:'Session expired'}});
  await x.run('savePassword({preventDefault(){}})');assert.match(x.doc.querySelector('#passwordMessage').textContent,/Session expired/);
  assert.equal(x.calls.length,0);assert.equal(x.doc.querySelector('#savePasswordBtn').disabled,false);
  x.run('currentUser=null');await x.run('savePassword({preventDefault(){}})');
  assert.match(x.doc.querySelector('#passwordMessage').textContent,/sign in again/);
 }finally{x.close();}
});
test('partial months and one-workout reliability do not unlock medals',()=>{
 const x=setup();try{
  const current=x.run('todayISO()');
  const clean=x.run(`cleanMonthMetrics([{date:'${current}',status:'completed'}])`);
  assert.equal(clean.best,0);
  const reliability=x.run(`reliabilityMetrics([{date:'${current}',status:'completed'}])`);
  assert.equal(reliability.current,100);assert.equal(reliability.best,0);
  const past=x.run(`cleanMonthMetrics([{date:'2025-01-01',status:'planned'}])`);assert.equal(past.best,0);
 }finally{x.close();}
});
test('signed-out startup binds password controls and applies English immediately',async()=>{
 const x=setup();try{
  x.auth.getSession=async()=>({data:{session:null},error:null});
  x.auth.onAuthStateChange=()=>({data:{subscription:{unsubscribe(){}}}});
  await x.run('init()');
  assert.equal(x.doc.querySelector('#forgotPasswordBtn').textContent,'Forgot password?');
  assert.equal(x.doc.querySelector('#authLanguageSelect').value,'en');
  assert.equal(x.doc.querySelector('#authScreen').classList.contains('hidden'),false);
  x.doc.querySelector('#authLanguageSelect').value='de';
  x.doc.querySelector('#authLanguageSelect').dispatchEvent(new x.w.Event('change'));
  assert.equal(x.doc.querySelector('#forgotPasswordBtn').textContent,'Passwort vergessen?');
 }finally{x.close();}
});
