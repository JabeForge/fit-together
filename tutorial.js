// A local, account-specific introduction. No training data is created here.
(()=>{
 const dialog=document.getElementById('tutorialDialog');
 if(!dialog)return;
 const $=id=>document.getElementById(id);
 const seen=new Set();
 let userId=null,step=0,queued=false,onStart=null;
 const copy={
  de:{label:'KURZ ERKLÄRT',settingsTitle:'So funktioniert’s',settingsText:'Gruppe, Trainings und Nachweise – die wichtigsten Schritte kurz erklärt.',open:'Tutorial öffnen',skip:'Überspringen',back:'Zurück',next:'Weiter',start:'Los geht’s',count:(n)=>`Schritt ${n} von 4`,steps:[
   ['🤝','Gemeinsam starten','Öffne „Gruppe“, erstelle eine Gruppe und teile den Einladungscode. Oder tritt mit dem Code deiner Freunde bei.','Eure Termine und Trainingsstatus werden innerhalb der Gruppe geteilt.'],
   ['📅','Euer nächstes Training','Öffne „Kalender“, wähle einen Tag und tippe auf „Termin hinzufügen“. Lege Zeit, Teilnehmer und bei Bedarf eine Wiederholung fest.','Vereinbart die Strafe bei Verpassen gemeinsam. Du kannst sie beim Termin einstellen – auch auf 0 €.'],
   ['📸','Zeig, dass du da warst','Öffne deinen Trainingstermin. Nimm ein Trainingsfoto auf oder wähle eines aus und lade es als Nachweis hoch. Danach kannst du „Erledigt“ wählen.','„Verpasst“ zählt die festgelegte Strafe zum gemeinsamen Topf. Die App bucht kein Geld ab; die Abrechnung regelt ihr selbst.'],
   ['🔥','Fortschritt im Blick','Auf der „Übersicht“ siehst du Streaks und den gemeinsamen Topf. Unter „Gewicht“, „Erfolge“ und „Bilder“ hältst du deinen Fortschritt fest.','Trainingserinnerungen kannst du in den Einstellungen aktivieren. Dieses Tutorial findest du dort ebenfalls jederzeit wieder.']
  ]},
  en:{label:'QUICK START',settingsTitle:'How it works',settingsText:'Groups, workouts and photo proof – a quick guide to getting started.',open:'Open tutorial',skip:'Skip',back:'Back',next:'Next',start:'Let’s get started',count:(n)=>`Step ${n} of 4`,steps:[
   ['🤝','Start together','Open “Group”, create a group and share its invite code. Or join using a code from your friends.','Your group shares its workout schedule and training statuses.'],
   ['📅','Plan your next workout','Open “Calendar”, choose a day and tap “Add event”. Set the time, participants and an optional repeat schedule.','Agree on a missed-workout penalty together. Set it for each event – you can also choose €0.'],
   ['📸','Show that you showed up','Open your workout event. Take or select a workout photo and upload it as proof. You can then mark the event as “Done”.','“Missed” adds the agreed penalty to your shared pot. The app does not charge money; you arrange any payments yourselves.'],
   ['🔥','See your progress','Your “Overview” shows streaks and the shared pot. Track your progress under “Weight”, “Achievements” and “Photos”.','Enable workout reminders in Settings. You can also reopen this tutorial there at any time.']
  ]}
 };
 const lang=()=>document.documentElement.lang==='en'?'en':'de';
 const key=id=>`fitTogether_tutorial_v1_${id}`;
 const hasSeen=id=>{try{return seen.has(id)||localStorage.getItem(key(id))==='seen';}catch{return seen.has(id);}};
 function render(){
  const c=copy[lang()],s=c.steps[step];
  $('tutorialSettingsTitle').textContent=c.settingsTitle;
  $('tutorialSettingsText').textContent=c.settingsText;
  $('openTutorialBtn').textContent=c.open;
  $('tutorialLabel').textContent=c.label;
  $('tutorialCount').textContent=c.count(step+1);
  $('tutorialIcon').textContent=s[0];
  $('tutorialTitle').textContent=s[1];
  $('tutorialText').textContent=s[2];
  $('tutorialTip').textContent=s[3];
  $('tutorialSkipBtn').textContent=c.skip;
  $('tutorialBackBtn').textContent=c.back;
  $('tutorialBackBtn').disabled=step===0;
  $('tutorialNextBtn').textContent=step===3?c.start:c.next;
  $('tutorialProgress').value=step+1;
  $('tutorialProgress').setAttribute('aria-label',c.count(step+1));
 }
 function tryOpen(){
  if(!queued||!userId||document.querySelector('dialog[open]'))return;
  queued=false;step=0;render();dialog.showModal();
 }
 function finish(start=false){
  if(!userId)return;
  seen.add(userId);try{localStorage.setItem(key(userId),'seen');}catch{}
  queued=false;
  dialog.close();
  if(start)onStart?.();
  window.dispatchEvent(new Event('fittogether:tutorialfinished'));
 }
 $('openTutorialBtn').addEventListener('click',()=>{if(userId){queued=true;tryOpen();}});
 $('tutorialSkipBtn').addEventListener('click',()=>finish());
 $('tutorialBackBtn').addEventListener('click',()=>{if(step>0){step--;render();$('tutorialTitle').focus();}});
 $('tutorialNextBtn').addEventListener('click',()=>{
  if(step===3){finish(true);return;}
  step++;render();$('tutorialTitle').focus();
 });
 dialog.addEventListener('cancel',e=>{e.preventDefault();finish();});
 document.addEventListener('close',()=>tryOpen(),true);
 window.addEventListener('fittogether:languagechange',render);
 window.FitTogetherTutorial={
  showIfNeeded(id,start){userId=id;onStart=start;if(!hasSeen(id)){queued=true;tryOpen();}},
  isPending(id){return !hasSeen(id)||queued||dialog.open;},
  reset(){userId=null;queued=false;onStart=null;if(dialog.open)dialog.close();}
 };
 render();
})();
