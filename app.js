const APP_VERSION = "0.19.6";
const I18N={
 de:{display:'Anzeige',languageRegion:'Sprache & Format',language:'Sprache',format:'Format',dateFormat:'Date format',timeFormat:'Time format',weightUnit:'Weight unit',formatHint:'Sprache und Format sind unabhängig voneinander. Gewichte werden intern weiterhin in kg gespeichert.',calendar:'Kalender',stats:'Statistik',photos:'Bilder',profiles:'Profile',settings:'Einstellungen',today:'Heute',done:'Erledigt',missed:'Verpasst',excused:'Entschuldigt',planned:'Geplant',weight:'Gewicht',weightProgress:'Gewichtsverlauf',progressPhotos:'Fortschrittsbilder',trainingProofs:'Trainingsnachweise',groups:'Gruppe',achievements:'Erfolge'},
 en:{display:'Display',languageRegion:'Language & format',language:'Language',format:'Format',dateFormat:'Datumsformat',timeFormat:'Zeitformat',weightUnit:'Gewichtseinheit',formatHint:'Language, date, time and weight unit can be configured independently. Weights are still stored internally in kilograms.',calendar:'Calendar',stats:'Statistics',photos:'Photos',profiles:'Profiles',settings:'Settings',today:'Today',done:'Done',missed:'Missed',excused:'Excused',planned:'Planned',weight:'Weight',weightProgress:'Weight progress',progressPhotos:'Progress photos',trainingProofs:'Training proof',groups:'Group',achievements:'Achievements'}
};
let appLanguage=localStorage.getItem('fitTogether_language')||((navigator.language||'').toLowerCase().startsWith('de')?'de':'en');
let dateFormat=localStorage.getItem('fitTogether_dateFormat')||(((navigator.language||'').toLowerCase()==='en-us')?'mdy':'dmy');
let timeFormat=localStorage.getItem('fitTogether_timeFormat')||(((navigator.language||'').toLowerCase()==='en-us')?'12':'24');
let weightUnit=localStorage.getItem('fitTogether_weightUnit')||(((navigator.language||'').toLowerCase()==='en-us')?'lb':'kg');
function t(key){return I18N[appLanguage]?.[key]||I18N.de[key]||key;}
function applyLocale(){
 document.documentElement.lang=appLanguage;
 document.querySelectorAll('[data-i18n]').forEach(el=>{const v=t(el.dataset.i18n);if(v)el.textContent=v;});
 const ls=document.querySelector('#languageSelect');
 const ds=document.querySelector('#dateFormatSelect'),ts=document.querySelector('#timeFormatSelect'),ws=document.querySelector('#weightUnitSelect');
 if(ls)ls.value=appLanguage;if(ds)ds.value=dateFormat;if(ts)ts.value=timeFormat;if(ws)ws.value=weightUnit;
 // main navigation
 const map={calendar:'calendar',weight:'weight',achievements:'achievements',photos:'photos',groups:'groups',profiles:'profiles',settings:'settings'};
 document.querySelectorAll('[data-tab]').forEach(b=>{const k=map[b.dataset.tab];if(k){const icon=(b.textContent.match(/^\s*[^\wÄÖÜäöü]+/)||[''])[0].trim();b.textContent=(icon?icon+' ':'')+t(k);}});
 renderAll();
}
function setLanguage(v){appLanguage=v;localStorage.setItem('fitTogether_language',v);applyLocale();}
function setDateFormat(v){dateFormat=v;localStorage.setItem('fitTogether_dateFormat',v);renderAll();}
function setTimeFormat(v){timeFormat=v;localStorage.setItem('fitTogether_timeFormat',v);renderAll();}
function setWeightUnit(v){weightUnit=v;localStorage.setItem('fitTogether_weightUnit',v);renderAll();}
function displayWeight(kg){const n=Number(kg);return weightUnit==='lb'?`${(n*2.2046226218).toFixed(1)} lb`:`${n.toFixed(1)} kg`;}
function inputWeightToKg(v){const n=Number(v);return weightUnit==='lb'?n/2.2046226218:n;}
function dateLabel(iso){if(!iso)return'';const [y,m,d]=String(iso).slice(0,10).split('-');return dateFormat==='mdy'?`${m}/${d}/${y}`:`${d}.${m}.${y}`;}
function timeLabel(hm){if(!hm)return'';if(timeFormat!=='12')return hm.slice(0,5);let [h,m]=hm.slice(0,5).split(':').map(Number);const ap=h>=12?'PM':'AM';h=h%12||12;return `${h}:${String(m).padStart(2,'0')} ${ap}`;}

console.info(`FitTogether V${APP_VERSION}`);
const versionEl=document.querySelector('.app-version');if(versionEl)versionEl.textContent=`V${APP_VERSION}`;
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.4/+esm";

const SUPABASE_URL = "https://iixnjrxvdpqvkjoizify.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_AlrqVCyUGwfClbmSJEnKZg_ytg6XyOe";
const APP_URL = "https://jabeforge.github.io/fit-together/";
const PUSH_VAPID_PUBLIC_KEY = "BM0bJRkL_fxPV-ZDD9hbmuREjxpZztV-yi26VjU-1Vba40deDcxiwNhr-aa1wFGEq04uUVQ2M8glLr3H-2B2ahs";
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const euro = v => `${Number(v || 0).toFixed(Number(v || 0) % 1 ? 1 : 0)} €`;
const todayISO = () => new Date().toISOString().slice(0,10);
const localISO = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const formatDate = iso => new Intl.DateTimeFormat('de-DE',{weekday:'short',day:'2-digit',month:'2-digit'}).format(new Date(`${iso}T12:00:00`));
const escapeHtml = s => String(s ?? '').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

let currentUser = null;
let currentProfile = null;
let groups = [];
let activeGroup = null;
let groupMembers = [];
let events = [];
let weights = [];
let occurrenceStatuses = [];
let progressPhotos = [];
let trainingProofs = [];
let selectedEventId = null;
let selectedOccurrenceDate = null;
let slideIndex = 0;
let slideTimer = null;
let pendingSeriesAction = null;
let editingSeriesId = null;
let reminderTimer = null;
const sentReminderKeys = new Set(JSON.parse(localStorage.getItem("fitTogether_sentReminders")||"[]"));
let calendarCursor = new Date();
calendarCursor.setDate(1);
let pendingInvite = new URLSearchParams(location.search).get('join') || '';
if (pendingInvite) {
  try { localStorage.setItem('fitTogether_pendingInvite', pendingInvite); } catch {}
} else {
  try { pendingInvite = localStorage.getItem('fitTogether_pendingInvite') || ''; } catch {}
}

async function removeLegacyCache(){
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(r=>r.unregister()));
    }
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.filter(k=>k.startsWith('fit-together-')).map(k=>caches.delete(k)));
    }
    // Große alte lokale App-Daten nicht weiter mitschleppen.
    ['fitTogether_v01','fitTogether_v02','fitTogether_v03'].forEach(k=>localStorage.removeItem(k));
  } catch(err){ console.warn('Cache-Bereinigung:',err); }
}

async function init(){
  $('#eventDate').value=todayISO();
  $('#weightDate').value=todayISO();$('#weightDate').max=todayISO();loadWeightScaleSettings();$('#weightDate').max=todayISO();
  $('#photoDate').value=todayISO();
  bindTabs(); bindActions();
  if($('#defaultReminderSelect'))$('#defaultReminderSelect').value=String(localStorage.getItem('fitTogether_defaultReminder')||60);
  if($('#ownNotificationsOnly'))$('#ownNotificationsOnly').checked=localStorage.getItem('fitTogether_ownNotificationsOnly')!=='false';
  updateNotificationStatus();updatePushStatus();scheduleReminderChecks(); bindAuth(); toggleRepeatUntil();
  await removeLegacyCache();
  try {
    const { data:{session}, error } = await supabase.auth.getSession();
    if(error) throw error;
    await applySession(session);
  } catch(err){ console.error(err); await applySession(null); }
  supabase.auth.onAuthStateChange((_event,session)=>setTimeout(()=>applySession(session).catch(console.error),0));
  setInterval(checkDueReminders,30000);
}

function bindTabs(){
  $$('.tab').forEach(btn=>btn.addEventListener('click',()=>showTab(btn.dataset.tab)));
}
function showTab(id){
  $$('.tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===id));
  $$('.panel').forEach(p=>p.classList.toggle('active',p.id===id));
}
function bindActions(){
  $('#languageSelect')?.addEventListener('change',e=>setLanguage(e.target.value));
  $('#regionSelect')?.addEventListener('change',e=>setRegion(e.target.value));
  $('#quickAddBtn').addEventListener('click',()=>showTab('calendar'));
  $('#addEventBtn').addEventListener('click',addEvent);
  $('#addWeightBtn').addEventListener('click',addWeight);
  $('#weightEntryList')?.addEventListener('click',e=>{const b=e.target.closest('[data-delete-weight]');if(b)deleteWeightEntry(b.dataset.deleteWeight);});
  $('#weightTimeline')?.addEventListener('click',e=>{const dot=e.target.closest('[data-weight-index]');if(dot)selectWeightPoint(Number(dot.dataset.weightIndex));});
  $('#weightScaleMode')?.addEventListener('change',saveWeightScaleSettings);
  $('#weightScaleMin')?.addEventListener('change',saveWeightScaleSettings);
  $('#weightScaleMax')?.addEventListener('change',saveWeightScaleSettings);
  $('#proofCameraBtn')?.addEventListener('click',openProofCamera);
  $('#proofGalleryBtn')?.addEventListener('click',()=>$('#proofInput')?.click());
  $('#proofInput')?.addEventListener('change',()=>showSelectedProofFile());
  $('#proofCameraCaptureBtn')?.addEventListener('click',captureProofCameraFrame);
  $('#proofCameraCloseBtn')?.addEventListener('click',closeProofCamera);
  $('#proofCameraCancelBtn')?.addEventListener('click',closeProofCamera);
  $('#proofCameraDialog')?.addEventListener('close',stopProofCamera);
  $('#addPhotoBtn').addEventListener('click',addProgressPhoto);
  $('#uploadProofBtn').addEventListener('click',uploadTrainingProof);
  $('#statusDoneBtn').addEventListener('click',()=>finishStatus('done'));
  $('#statusMissedBtn').addEventListener('click',()=>finishStatus('missed'));
  $('#statusExcusedBtn').addEventListener('click',()=>finishStatus('excused'));
  $('#slidePrevBtn').addEventListener('click',()=>changeSlide(-1));
  $('#slideNextBtn').addEventListener('click',()=>changeSlide(1));
  $('#slidePlayBtn').addEventListener('click',toggleSlideshow);
  $('#photoReminderNowBtn').addEventListener('click',()=>{showTab('photos');$('#photoInput').scrollIntoView({behavior:'smooth',block:'center'});});
  $('#photoReminderLaterBtn').addEventListener('click',snoozePhotoReminder);
  $('#notifyBtn').addEventListener('click',enableClosedAppPush);
  $('#settingsNotifyBtn')?.addEventListener('click',enableClosedAppPush);
  $('#disablePushBtn')?.addEventListener('click',disableClosedAppPush);
  $('#testNotifyBtn')?.addEventListener('click',testNotification);
  $('#defaultReminderSelect')?.addEventListener('change',saveReminderSettings);
  $('#ownNotificationsOnly')?.addEventListener('change',saveReminderSettings);
  $('#prevMonthBtn').addEventListener('click',()=>{calendarCursor.setMonth(calendarCursor.getMonth()-1);renderMonthCalendar();});
  $('#nextMonthBtn').addEventListener('click',()=>{calendarCursor.setMonth(calendarCursor.getMonth()+1);renderMonthCalendar();});
  $('#todayBtn').addEventListener('click',()=>{calendarCursor=new Date();calendarCursor.setDate(1);renderMonthCalendar();});
  $('#addSelectedDayBtn').addEventListener('click',()=>showEventForm($('#eventDate').value||todayISO()));
  $('#eventRepeat').addEventListener('change',toggleRepeatUntil);
  $('#saveOwnProfileBtn').addEventListener('click',saveOwnProfile);
  $('#logoutBtn').addEventListener('click',()=>supabase.auth.signOut());
  $('#createGroupBtn').addEventListener('click',createGroup);
  $('#joinGroupBtn').addEventListener('click',()=>joinGroup($('#joinGroupCode').value));
  $('#copyInviteBtn').addEventListener('click',copyInviteLink);
  $('#openGroupsBtn').addEventListener('click',()=>showTab('groups'));
  $('#activeGroupSelect').addEventListener('change',async e=>{
    const found=groups.find(g=>g.id===e.target.value);
    if(found){ activeGroup=found; try{localStorage.setItem('fitTogether_activeGroup',found.id);}catch{} await loadActiveGroupData(); }
  });
  $('#statusDialog').addEventListener('close',()=>{ if($('#statusDialog').returnValue==='cancel'){ selectedEventId=null; selectedOccurrenceDate=null; } });
}

function bindAuth(){
  $('#showLoginBtn').addEventListener('click',()=>showAuthMode('login'));
  $('#showRegisterBtn').addEventListener('click',()=>showAuthMode('register'));
  $('#loginBtn').addEventListener('click',signIn);
  $('#registerBtn').addEventListener('click',signUp);
  $('#loginPassword').addEventListener('keydown',e=>{if(e.key==='Enter')signIn();});
  $('#registerPassword').addEventListener('keydown',e=>{if(e.key==='Enter')signUp();});
}
function showAuthMode(mode){
  const login=mode==='login';
  $('#loginForm').classList.toggle('hidden',!login); $('#registerForm').classList.toggle('hidden',login);
  $('#showLoginBtn').classList.toggle('active',login); $('#showRegisterBtn').classList.toggle('active',!login);
  setAuthMessage('');
}
function setAuthMessage(text,isError=false){ const el=$('#authMessage');el.textContent=text;el.classList.toggle('error',isError); }
async function signUp(){
  const name=$('#registerName').value.trim(), email=$('#registerEmail').value.trim(), password=$('#registerPassword').value;
  if(!name||!email||password.length<6) return setAuthMessage('Bitte Name, E-Mail und ein Passwort mit mindestens 6 Zeichen eingeben.',true);
  setAuthMessage('Account wird erstellt …');
  try{
    const redirect=pendingInvite?`${APP_URL}?join=${encodeURIComponent(pendingInvite)}`:APP_URL;
    const {data,error}=await supabase.auth.signUp({email,password,options:{data:{display_name:name},emailRedirectTo:redirect}});
    if(error) return setAuthMessage(error.message,true);
    if(data.session) await applySession(data.session);
    else { showAuthMode('login'); $('#loginEmail').value=email; setAuthMessage('Account erstellt. Bitte E-Mail bestätigen und danach anmelden.'); }
  }catch(err){setAuthMessage(`Technischer Fehler: ${err?.message||err}`,true);}
}
async function signIn(){
  const email=$('#loginEmail').value.trim(),password=$('#loginPassword').value;
  if(!email||!password)return setAuthMessage('Bitte E-Mail und Passwort eingeben.',true);
  setAuthMessage('Anmeldung läuft …');
  try{
    const {data,error}=await supabase.auth.signInWithPassword({email,password});
    if(error)return setAuthMessage(error.message,true);
    if(!data?.session)return setAuthMessage('Keine Sitzung erhalten.',true);
    await applySession(data.session);
  }catch(err){setAuthMessage(`Technischer Fehler: ${err?.message||err}`,true);}
}
async function applySession(session){
  currentUser=session?.user||null;
  if(!currentUser){
    currentProfile=null; groups=[]; activeGroup=null; groupMembers=[]; events=[]; weights=[]; occurrenceStatuses=[]; progressPhotos=[]; trainingProofs=[];
    $('#authScreen').classList.remove('hidden'); $('#appShell').classList.add('hidden'); document.body.classList.add('auth-open');
    return;
  }
  $('#authScreen').classList.add('hidden'); $('#appShell').classList.remove('hidden'); document.body.classList.remove('auth-open');
  await loadOnlineProfile();
  await loadGroups();
  if(pendingInvite) await joinPendingInvite();
  if(activeGroup) await loadActiveGroupData(); else renderAll();
}
async function loadOnlineProfile(){
  const {data,error}=await supabase.from('profiles').select('id,name,avatar_url,created_at').eq('id',currentUser.id).single();
  if(error){console.error(error);currentProfile={id:currentUser.id,name:currentUser.email?.split('@')[0]||'Ich'};return;}
  currentProfile=data;
}

async function loadGroups(){
  const {data,error}=await supabase.from('group_members').select('group_id,groups(id,name,invite_code,created_by)').eq('profile_id',currentUser.id);
  if(error){ console.error(error); setGroupMessage(`Gruppen konnten nicht geladen werden: ${error.message}`,true); groups=[]; activeGroup=null; renderGroupUI(); return; }
  groups=(data||[]).map(r=>r.groups).filter(Boolean);
  let preferred='';try{preferred=localStorage.getItem('fitTogether_activeGroup')||'';}catch{}
  activeGroup=groups.find(g=>g.id===preferred)||groups[0]||null;
  renderGroupUI();
}
async function loadActiveGroupData(){
  if(!activeGroup){groupMembers=[];events=[];renderAll();return;}
  await Promise.all([loadGroupMembers(),loadEvents(),loadWeights(),loadProgressPhotos()]);
  await loadOccurrenceStatuses();
  await loadTrainingProofs();
  await autoMarkOwnMissed();
  renderAll();
}
async function loadGroupMembers(){
  const {data,error}=await supabase.from('group_members').select('profile_id,joined_at,profiles(id,name,avatar_url)').eq('group_id',activeGroup.id).order('joined_at');
  if(error){console.error(error);groupMembers=[];return;}
  groupMembers=(data||[]).map(r=>r.profiles).filter(Boolean);
  populateParticipantSelect();
}
async function loadEvents(){
  const {data,error}=await supabase.from('events')
    .select('id,group_id,title,event_date,start_time,end_time,color,penalty,notes,created_by,created_at,recurrence,recurrence_until,event_participants(profile_id,status,completed_at,profiles(id,name))')
    .eq('group_id',activeGroup.id).order('event_date').order('start_time');
  if(error){console.error(error);setGroupMessage(`Kalender konnte nicht geladen werden: ${error.message}`,true);events=[];return;}
  events=(data||[]).map(e=>({
    id:e.id,title:e.title,date:e.event_date,start:(e.start_time||'').slice(0,5),end:(e.end_time||'').slice(0,5),
    color:normalizeColor(e.color),penalty:Number(e.penalty||0),note:e.notes||'',created_by:e.created_by,recurrence:e.recurrence||'none',recurrence_until:e.recurrence_until||null,
    participants:(e.event_participants||[]).map(p=>({profile_id:p.profile_id,status:p.status,name:p.profiles?.name||'Mitglied',completed_at:p.completed_at}))
  }));
}
async function loadOccurrenceStatuses(){
  if(!events.length){ occurrenceStatuses=[]; return; }
  const ids=events.map(e=>e.id);
  const {data,error}=await supabase.from('event_occurrence_status')
    .select('event_id,occurrence_date,profile_id,status,completed_at')
    .in('event_id',ids);
  if(error){ console.error(error); occurrenceStatuses=[]; return; }
  occurrenceStatuses=data||[];
}

async function loadWeights(){
  const {data,error}=await supabase.from('weight_entries').select('weight,measured_on').eq('profile_id',currentUser.id).order('measured_on');
  if(error){console.error(error);weights=[];return;}
  weights=(data||[]).map(w=>({date:w.measured_on,weight:Number(w.weight)}));
}


async function signedImageUrl(bucket,path){
  if(!path)return null;
  const {data,error}=await supabase.storage.from(bucket).createSignedUrl(path,3600);
  if(error){console.warn('Signed URL:',error.message);return null;}
  return data?.signedUrl||null;
}
async function loadProgressPhotos(){
  const {data,error}=await supabase.from('progress_photos')
    .select('id,profile_id,image_url,visibility,taken_on,created_at,profiles(name)')
    .order('taken_on',{ascending:false});
  if(error){console.error(error);progressPhotos=[];return;}
  progressPhotos=await Promise.all((data||[]).map(async r=>({...r,owner_name:r.profiles?.name||'Mitglied',signed_url:await signedImageUrl('progress-photos',r.image_url)})));
}
async function loadTrainingProofs(){
  if(!events.length){trainingProofs=[];return;}
  const {data,error}=await supabase.from('training_proofs')
    .select('id,event_id,occurrence_date,profile_id,storage_path,created_at,profiles(name)')
    .in('event_id',events.map(e=>e.id));
  if(error){console.error(error);trainingProofs=[];return;}
  trainingProofs=await Promise.all((data||[]).map(async r=>({...r,owner_name:r.profiles?.name||'Mitglied',signed_url:await signedImageUrl('training-proofs',r.storage_path)})));
}
function safeExt(file){
  const ext=(file?.name?.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'');
  return ['jpg','jpeg','png','webp','heic','heif'].includes(ext)?ext:'jpg';
}
async function addProgressPhoto(){
  if(!currentUser)return;
  const file=$('#photoInput').files?.[0],date=$('#photoDate').value||todayISO(),visibility=$('#photoVisibility').value;
  if(!file)return alert('Bitte zuerst ein Bild auswählen.');
  if(file.size>12*1024*1024)return alert('Das Bild ist größer als 12 MB. Bitte ein kleineres Bild verwenden.');
  const path=`${currentUser.id}/${date}/${crypto.randomUUID()}.${safeExt(file)}`;
  $('#addPhotoBtn').disabled=true;$('#addPhotoBtn').textContent='Wird hochgeladen …';
  try{
    const {error:uploadError}=await supabase.storage.from('progress-photos').upload(path,file,{contentType:file.type||'image/jpeg',upsert:false});
    if(uploadError)throw uploadError;
    const {error:dbError}=await supabase.from('progress_photos').insert({profile_id:currentUser.id,image_url:path,visibility,taken_on:date});
    if(dbError){await supabase.storage.from('progress-photos').remove([path]);throw dbError;}
    $('#photoInput').value='';await loadProgressPhotos();renderPhotos();
  }catch(err){alert(`Bild konnte nicht gespeichert werden: ${err.message||err}`);}
  finally{$('#addPhotoBtn').disabled=false;$('#addPhotoBtn').textContent='Bild hinzufügen';}
}
async function deleteProgressPhoto(photo){
  if(photo.profile_id!==currentUser.id)return;
  if(!confirm('Dieses Fortschrittsbild wirklich löschen?'))return;
  const {error}=await supabase.from('progress_photos').delete().eq('id',photo.id);
  if(error)return alert(error.message);
  await supabase.storage.from('progress-photos').remove([photo.image_url]);
  await loadProgressPhotos();renderPhotos();
}
let proofCameraStream=null;
let proofCapturedFile=null;
function showSelectedProofFile(){
  const file=$('#proofInput')?.files?.[0]||proofCapturedFile,label=$('#proofSelectedFile');
  if(label)label.textContent=file?`${appLanguage==='en'?'Selected':'Ausgewählt'}: ${file.name||'Foto'} · ${(file.size/1024/1024).toFixed(1)} MB`:(appLanguage==='en'?'No new image selected.':'Noch kein neues Bild ausgewählt.');
}
async function openProofCamera(){
  const dlg=$('#proofCameraDialog'),video=$('#proofCameraVideo'),msg=$('#proofCameraMessage');
  if(!navigator.mediaDevices?.getUserMedia){alert('Dieser Browser unterstützt die In-App-Kamera nicht. Nutze „Bild auswählen“.');return;}
  try{
    dlg.showModal();msg.textContent='Kamera wird gestartet …';
    proofCameraStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});
    video.srcObject=proofCameraStream;await video.play();msg.textContent='Kamera bereit.';
  }catch(err){console.error(err);msg.textContent='Kamera konnte nicht geöffnet werden.';}
}
function stopProofCamera(){
  if(proofCameraStream){proofCameraStream.getTracks().forEach(t=>t.stop());proofCameraStream=null;}
  const video=$('#proofCameraVideo');if(video)video.srcObject=null;
}
function closeProofCamera(){stopProofCamera();$('#proofCameraDialog')?.close();}
async function captureProofCameraFrame(){
  const video=$('#proofCameraVideo');if(!video?.videoWidth)return;
  const canvas=document.createElement('canvas');canvas.width=video.videoWidth;canvas.height=video.videoHeight;
  canvas.getContext('2d').drawImage(video,0,0,canvas.width,canvas.height);
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',0.9));if(!blob)return;
  proofCapturedFile=new File([blob],`training-${Date.now()}.jpg`,{type:'image/jpeg'});
  showSelectedProofFile();closeProofCamera();
}
async function uploadTrainingProof(){
  if(!selectedEventId||!selectedOccurrenceDate){alert('Kein Termin ausgewählt.');return false;}
  const file=$('#proofInput').files?.[0]||proofCapturedFile;if(!file){alert('Bitte zuerst ein Foto aufnehmen oder auswählen.');return false;}
  if(file.size>12*1024*1024){alert('Das Bild ist größer als 12 MB.');return false;}
  const path=`${currentUser.id}/${selectedEventId}/${selectedOccurrenceDate}/${crypto.randomUUID()}.${safeExt(file)}`;
  const btn=$('#uploadProofBtn');btn.disabled=true;btn.textContent='Wird hochgeladen …';
  try{
    const {error:uploadError}=await supabase.storage.from('training-proofs').upload(path,file,{contentType:file.type||'image/jpeg',upsert:false});
    if(uploadError)throw uploadError;
    const {error:dbError}=await supabase.from('training_proofs').insert({event_id:selectedEventId,occurrence_date:selectedOccurrenceDate,profile_id:currentUser.id,storage_path:path});
    if(dbError){await supabase.storage.from('training-proofs').remove([path]);throw dbError;}
    $('#proofInput').value='';proofCapturedFile=null;showSelectedProofFile();await loadTrainingProofs();await renderProofInDialog();
    return true;
  }catch(err){alert(`Nachweis konnte nicht gespeichert werden: ${err.message||err}`);return false;}
  finally{btn.disabled=false;btn.textContent=appLanguage==='en'?'Upload proof':'Nachweis vorab hochladen';}
}
async function renderProofInDialog(){
  const proof=trainingProofs.find(p=>p.event_id===selectedEventId&&p.occurrence_date===selectedOccurrenceDate&&p.profile_id===currentUser.id);
  const img=$('#proofPreview');
  if(proof?.signed_url){
    $('#proofStatus').textContent=appLanguage==='en'?'✅ Your workout proof is saved. You can mark the workout as done.':'✅ Dein Trainingsnachweis ist gespeichert. Du kannst das Training als erledigt markieren.';
    img.src=proof.signed_url;img.classList.remove('hidden');
  }else{
    $('#proofStatus').textContent=appLanguage==='en'?'📷 A workout photo is required for “Done”. You can select it and press Done directly.':'📷 Für „Erledigt“ ist ein Trainingsfoto Pflicht. Du kannst es auswählen und direkt auf Erledigt drücken.';
    img.removeAttribute('src');img.classList.add('hidden');
  }
}
function openStatusDialog(ev,date){
  selectedEventId=ev.id;selectedOccurrenceDate=date;$('#dialogEventName').textContent=`${ev.title} · ${formatDate(date)}`;$('#proofInput').value='';renderProofInDialog();$('#statusDialog').showModal();
}

function normalizeColor(c){
  if(['violet','blue','green','orange','pink'].includes(c))return c;
  const map={'#6c5ce7':'violet','#8b5cf6':'violet','#22b7f2':'blue','#3b82f6':'blue','#22c55e':'green','#f59e0b':'orange','#ec4899':'pink'};
  return map[String(c||'').toLowerCase()]||'violet';
}
function colorHex(name){return {violet:'#8b5cf6',blue:'#22b7f2',green:'#22c55e',orange:'#f59e0b',pink:'#ec4899'}[name]||'#8b5cf6';}
function toggleRepeatUntil(){
  const recurring=$('#eventRepeat').value!=='none';
  $('#eventRepeatUntilWrap').classList.toggle('hidden',!recurring);
  if(!recurring)$('#eventRepeatUntil').value='';
}
function daysInMonth(year,month){return new Date(year,month+1,0).getDate();}
function eventOccursOn(ev,iso){
  if(iso<ev.date)return false;
  if(ev.recurrence_until && iso>ev.recurrence_until)return false;
  if(ev.date===iso)return true;
  if(ev.recurrence==='none')return false;
  const start=new Date(`${ev.date}T12:00:00`), target=new Date(`${iso}T12:00:00`);
  if(ev.recurrence==='weekly'){
    const days=Math.round((target-start)/86400000);
    return days>=0 && days%7===0;
  }
  if(ev.recurrence==='monthly'){
    const months=(target.getFullYear()-start.getFullYear())*12+(target.getMonth()-start.getMonth());
    if(months<0)return false;
    return target.getDate()===Math.min(start.getDate(),daysInMonth(target.getFullYear(),target.getMonth()));
  }
  if(ev.recurrence==='yearly'){
    if(target.getFullYear()<start.getFullYear() || target.getMonth()!==start.getMonth())return false;
    return target.getDate()===Math.min(start.getDate(),daysInMonth(target.getFullYear(),target.getMonth()));
  }
  return false;
}
function recurrenceText(ev){
  const names={weekly:'wöchentlich',monthly:'monatlich',yearly:'jährlich'};
  if(!names[ev.recurrence])return '';
  return ev.recurrence_until?` · ${names[ev.recurrence]} bis ${formatDate(ev.recurrence_until)}`:` · ${names[ev.recurrence]}`;
}
function nextOccurrenceDate(ev,from=new Date()){
  let d=new Date(`${ev.date}T12:00:00`);
  const target=new Date(from);target.setHours(12,0,0,0);
  if(d<target)d=target;
  for(let i=0;i<3660;i++){
    const iso=localISO(d);
    if(ev.recurrence_until && iso>ev.recurrence_until)return null;
    if(eventOccursOn(ev,iso))return iso;
    d.setDate(d.getDate()+1);
  }
  return null;
}
function occurrenceDatesThrough(ev,endDate=new Date()){
  const out=[];let d=new Date(`${ev.date}T12:00:00`);const end=new Date(endDate);end.setHours(12,0,0,0);
  for(let i=0;i<3660 && d<=end;i++,d.setDate(d.getDate()+1)){
    const iso=localISO(d);if(ev.recurrence_until&&iso>ev.recurrence_until)break;if(eventOccursOn(ev,iso))out.push(iso);
  }
  return out;
}
function occurrenceStatus(ev,profileId,date){
  const row=occurrenceStatuses.find(x=>x.event_id===ev.id&&x.profile_id===profileId&&x.occurrence_date===date);
  if(row)return row.status;
  const base=ev.participants.find(p=>p.profile_id===profileId);
  if(date===ev.date && base && base.status!=='planned')return base.status;
  return 'planned';
}


async function createGroup(){
  const name=$('#newGroupName').value.trim(); if(!name)return setGroupMessage('Bitte einen Gruppennamen eingeben.',true);
  setGroupMessage('Gruppe wird erstellt …');
  const {data,error}=await supabase.rpc('create_fit_group',{p_name:name});
  if(error)return setGroupMessage(`Gruppe konnte nicht erstellt werden: ${error.message}`,true);
  $('#newGroupName').value=''; setGroupMessage('Gruppe erstellt.'); await loadGroups();
  if(activeGroup)await loadActiveGroupData();
}
async function joinGroup(code){
  code=(code||'').trim(); if(!code)return setGroupMessage('Bitte einen Einladungscode eingeben.',true);
  setGroupMessage('Beitritt läuft …');
  const {data,error}=await supabase.rpc('join_fit_group',{p_code:code});
  if(error)return setGroupMessage(`Beitritt fehlgeschlagen: ${error.message}`,true);
  pendingInvite='';try{localStorage.removeItem('fitTogether_pendingInvite');}catch{}
  history.replaceState({},'',APP_URL);
  setGroupMessage('Gruppe beigetreten.'); await loadGroups();
  const joinedId=typeof data==='string'?data:null; if(joinedId)activeGroup=groups.find(g=>g.id===joinedId)||activeGroup;
  if(activeGroup)await loadActiveGroupData();
}
async function joinPendingInvite(){
  if(!pendingInvite)return;
  await joinGroup(pendingInvite);
}
function setGroupMessage(text,isError=false){const el=$('#groupMessage');if(!el)return;el.textContent=text;el.style.color=isError?'#fecaca':'';}
function renderGroupUI(){
  const select=$('#activeGroupSelect');select.innerHTML='';
  if(!groups.length){const o=document.createElement('option');o.textContent='Keine Gruppe';o.value='';select.appendChild(o);select.disabled=true;}
  else{select.disabled=false;groups.forEach(g=>{const o=document.createElement('option');o.value=g.id;o.textContent=g.name;o.selected=activeGroup?.id===g.id;select.appendChild(o);});}
  $('#noGroupBanner').classList.toggle('hidden',!!activeGroup);
  $('#currentGroupBox').classList.toggle('hidden',!activeGroup);
  if(activeGroup){
    $('#currentGroupName').textContent=activeGroup.name;$('#inviteCodeLabel').textContent=activeGroup.invite_code||'–';
    const qr=$('#inviteQr');
    if(qr&&activeGroup.invite_code){
      const link=`${APP_URL}?join=${encodeURIComponent(activeGroup.invite_code)}`;
      qr.src=`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(link)}`;
      qr.classList.remove('hidden');
    }
  }
  renderMembers();
}
function renderMembers(){
  const list=$('#groupMemberList');list.innerHTML='';
  $('#groupMemberCount').textContent=`${groupMembers.length} ${groupMembers.length===1?'Mitglied':'Mitglieder'}`;
  if(!activeGroup){list.innerHTML='<div class="empty">Noch keine aktive Gruppe.</div>';return;}
  if(!groupMembers.length){list.innerHTML='<div class="empty">Mitglieder werden geladen …</div>';return;}
  groupMembers.forEach(m=>{
    const chip=document.createElement('div');chip.className=`member-chip ${m.id===currentUser.id?'me':''}`;
    chip.innerHTML=`<span class="member-avatar">${escapeHtml((m.name||'?')[0].toUpperCase())}</span><span>${escapeHtml(m.name)}${m.id===currentUser.id?' (du)':''}</span>`;
    list.appendChild(chip);
  });
}
async function copyInviteLink(){
  if(!activeGroup?.invite_code)return;
  const link=`${APP_URL}?join=${encodeURIComponent(activeGroup.invite_code)}`;
  try{await navigator.clipboard.writeText(link);setGroupMessage('Einladungslink kopiert.');}
  catch{prompt('Diesen Link verschicken:',link);}
}
function populateParticipantSelect(){
  const sel=$('#eventOwner');sel.innerHTML='';
  const all=document.createElement('option');all.value='all';all.textContent='Alle Gruppenmitglieder';sel.appendChild(all);
  const self=document.createElement('option');self.value=`profile:${currentUser.id}`;self.textContent='Nur ich';sel.appendChild(self);
  groupMembers.filter(m=>m.id!==currentUser.id).forEach(m=>{const o=document.createElement('option');o.value=`profile:${m.id}`;o.textContent=m.name;sel.appendChild(o);});
}

async function addEvent(){
  if(!activeGroup)return alert(appLanguage==='en'?'Create or select a group first.':'Erstelle oder wähle zuerst eine Gruppe.');
  const title=$('#eventTitle').value.trim(),date=$('#eventDate').value;
  if(!title||!date)return alert(appLanguage==='en'?'Please enter a title and date.':'Bitte Titel und Datum eintragen.');
  const selected=$('#eventOwner').value;
  let participantIds=selected==='all'?groupMembers.map(m=>m.id):[selected.replace('profile:','')];
  participantIds=[...new Set(participantIds.filter(Boolean))];
  if(!participantIds.length)return alert(appLanguage==='en'?'No participants found.':'Keine Teilnehmer gefunden.');
  const payload={
    group_id:activeGroup.id,title,event_date:date,start_time:$('#eventStart').value||null,end_time:$('#eventEnd').value||null,
    color:colorHex($('#eventColor').value),penalty:Number($('#eventPenalty').value||0),notes:$('#eventNote').value.trim()||null,created_by:currentUser.id,
    recurrence:$('#eventRepeat').value||'none',recurrence_until:$('#eventRepeat').value!=='none'?($('#eventRepeatUntil').value||null):null
  };
  let eventId=editingSeriesId;
  if(editingSeriesId){
    const {error}=await supabase.from('events').update(payload).eq('id',editingSeriesId);
    if(error)return alert(`${appLanguage==='en'?'Event could not be updated':'Termin konnte nicht aktualisiert werden'}: ${error.message}`);
    const {error:delPart}=await supabase.from('event_participants').delete().eq('event_id',editingSeriesId);
    if(delPart)return alert(delPart.message);
  }else{
    const {data,error}=await supabase.from('events').insert(payload).select('id').single();
    if(error)return alert(`${appLanguage==='en'?'Event could not be saved':'Termin konnte nicht gespeichert werden'}: ${error.message}`);
    eventId=data.id;
  }
  const rows=participantIds.map(profile_id=>({event_id:eventId,profile_id,status:'planned'}));
  const {error:partError}=await supabase.from('event_participants').insert(rows);
  if(partError)return alert(`${appLanguage==='en'?'Participants could not be saved':'Teilnehmer konnten nicht gespeichert werden'}: ${partError.message}`);
  editingSeriesId=null;
  const saveBtn=document.querySelector('#addEventForm button[type="submit"]');if(saveBtn)saveBtn.textContent=appLanguage==='en'?'Save event':'Termin speichern';
  $('#eventTitle').value='';$('#eventNote').value='';$('#eventRepeat').value='none';$('#eventRepeatUntil').value='';toggleRepeatUntil();
  await loadEvents();await loadOccurrenceStatuses();renderAll();
}
async function finishStatus(status){
  if(!selectedEventId||!selectedOccurrenceDate)return;
  if(status==='done'){
    let proof=trainingProofs.find(p=>p.event_id===selectedEventId&&p.occurrence_date===selectedOccurrenceDate&&p.profile_id===currentUser.id);
    if(!proof){
      const file=$('#proofInput').files?.[0]||proofCapturedFile;
      if(!file){
        alert(appLanguage==='en'?'A workout photo is required before you can mark this event as done. Take or select a photo first.':'Für „Erledigt“ ist ein Trainingsfoto erforderlich. Nimm zuerst ein Foto auf oder wähle eines aus.');
        return;
      }
      await uploadTrainingProof();
      proof=trainingProofs.find(p=>p.event_id===selectedEventId&&p.occurrence_date===selectedOccurrenceDate&&p.profile_id===currentUser.id);
      if(!proof)return;
    }
  }
  await setEventStatus(selectedEventId,status,selectedOccurrenceDate);
  $('#statusDialog').close('saved');
  selectedEventId=null;selectedOccurrenceDate=null;
}

function askSeriesChoice(ev,date,action='edit'){
  if(!ev?.repeat || ev.repeat==='none') return Promise.resolve('all');
  return new Promise(resolve=>{
    pendingSeriesAction={resolve};
    const dlg=$('#seriesActionDialog');
    $('#seriesActionTitle').textContent=action==='delete'?(appLanguage==='en'?'Delete repeating event':'Wiederholten Termin löschen'):(appLanguage==='en'?'Edit repeating event':'Wiederholten Termin bearbeiten');
    $('#seriesActionText').textContent=appLanguage==='en'?'Do you want to change only this occurrence or the entire series?':'Möchtest du nur diesen Termin oder die gesamte Serie ändern?';
    $('#seriesOnlyBtn').textContent=appLanguage==='en'?'Only this occurrence':'Nur diesen Termin';
    $('#seriesAllBtn').textContent=appLanguage==='en'?'Entire series':'Gesamte Serie';
    dlg.showModal();
    dlg.addEventListener('close',()=>{if(pendingSeriesAction){pendingSeriesAction.resolve(null);pendingSeriesAction=null;}},{once:true});
  });
}
function resolveSeriesChoice(choice){
  if(!pendingSeriesAction)return;
  const r=pendingSeriesAction.resolve;pendingSeriesAction=null;$('#seriesActionDialog').close('chosen');r(choice);
}
async function createOccurrenceOverride(ev,date,patch={}){
  // A one-off copy detaches this occurrence from the repeating series.
  const payload={
    group_id:ev.group_id,created_by:currentUser.id,title:patch.title??ev.title,
    event_date:date,start_time:patch.start_time??ev.start_time,end_time:patch.end_time??ev.end_time,
    participant_mode:patch.participant_mode??ev.participant_mode,color:patch.color??ev.color,
    penalty:patch.penalty??ev.penalty,repeat:'none',repeat_until:null,reminder:patch.reminder??ev.reminder,
    note:patch.note??ev.note
  };
  const {data,error}=await supabase.from('events').insert(payload).select().single();
  if(error)throw error;
  return data;
}
async function suppressSeriesOccurrence(ev,date){
  // Store an excused occurrence marker so the original generated occurrence no longer counts.
  // The UI hides it when an override exists or when explicitly removed below.
  const existing=occurrenceStatuses.find(x=>x.event_id===ev.id&&x.occurrence_date===date&&x.profile_id===currentUser.id);
  const payload={event_id:ev.id,occurrence_date:date,profile_id:currentUser.id,status:'excused'};
  if(existing) await supabase.from('event_occurrence_status').update({status:'excused'}).eq('id',existing.id);
  else await supabase.from('event_occurrence_status').insert(payload);
  await loadOccurrenceStatuses();
}
async function setEventStatus(id,statusUi,date){
  const ev=events.find(e=>e.id===id);if(!ev)return;
  const mine=ev.participants.find(p=>p.profile_id===currentUser.id);
  if(!mine)return alert('Du bist bei diesem Termin nicht als Teilnehmer eingetragen.');
  date=date||ev.date;
  const dbStatus={done:'completed',missed:'missed',excused:'excused'}[statusUi]||statusUi;
  const row={event_id:id,occurrence_date:date,profile_id:currentUser.id,status:dbStatus,completed_at:dbStatus==='completed'?new Date().toISOString():null};
  const {error}=await supabase.from('event_occurrence_status').upsert(row,{onConflict:'event_id,occurrence_date,profile_id'});
  if(error)return alert(`Status konnte nicht gespeichert werden: ${error.message}`);
  await loadOccurrenceStatuses();renderAll();
}
async function autoMarkOwnMissed(){
  const now=new Date();const rows=[];
  for(const ev of events){
    if(!ev.participants.some(p=>p.profile_id===currentUser.id))continue;
    for(const date of occurrenceDatesThrough(ev,now)){
      if(occurrenceStatus(ev,currentUser.id,date)!=='planned')continue;
      const end=new Date(`${date}T${ev.end||ev.start||'23:59'}:00`);
      if(end<now)rows.push({event_id:ev.id,occurrence_date:date,profile_id:currentUser.id,status:'missed',completed_at:null});
    }
  }
  if(rows.length){
    const {error}=await supabase.from('event_occurrence_status').upsert(rows,{onConflict:'event_id,occurrence_date,profile_id'});
    if(error)console.error(error);else await loadOccurrenceStatuses();
  }
}


function enhanceEventSeriesControls(){
  document.querySelectorAll('[data-event-id]').forEach(card=>{
    if(card.querySelector('.series-edit-btn'))return;
    const id=card.dataset.eventId,ev=events.find(e=>e.id===id);if(!ev)return;
    const date=card.dataset.occurrenceDate||ev.event_date;
    const box=document.createElement('div');box.className='series-card-actions';
    box.innerHTML=`<button type="button" class="small-btn series-edit-btn">${appLanguage==='en'?'✏️ Edit':'✏️ Bearbeiten'}</button><button type="button" class="small-btn series-delete-btn">${appLanguage==='en'?'🗑 Delete':'🗑 Löschen'}</button>`;
    box.querySelector('.series-edit-btn').addEventListener('click',async e=>{e.stopPropagation();await editOccurrenceOrSeries(ev,date);});
    box.querySelector('.series-delete-btn').addEventListener('click',async e=>{e.stopPropagation();await deleteOccurrenceOrSeries(ev,date);});
    card.appendChild(box);
  });
}
async function editOccurrenceOrSeries(ev,date){
  const choice=await askSeriesChoice(ev,date,'edit');if(!choice)return;
  if(choice==='all'){
    editingSeriesId=ev.id;
    showTab('calendar');$('#eventTitle').value=ev.title||'';$('#eventDate').value=ev.event_date||date;
    if($('#eventStart'))$('#eventStart').value=ev.start_time||'';if($('#eventEnd'))$('#eventEnd').value=ev.end_time||'';
    if($('#eventRepeat'))$('#eventRepeat').value=ev.recurrence||'none';if($('#eventRepeatUntil'))$('#eventRepeatUntil').value=ev.recurrence_until||'';
    if($('#eventPenalty'))$('#eventPenalty').value=ev.penalty??0;if($('#eventNote'))$('#eventNote').value=ev.notes||'';
    if($('#eventColor')){const cmap={'#8b5cf6':'purple','#3b82f6':'blue','#22c55e':'green','#f59e0b':'orange','#ec4899':'pink'};$('#eventColor').value=cmap[String(ev.color||'').toLowerCase()]||'purple';}
    if($('#eventOwner')){const ids=(ev.participants||[]).map(p=>p.profile_id);$('#eventOwner').value=ids.length===groupMembers.length?'all':`profile:${ids[0]||currentUser.id}`;}
    toggleRepeatUntil();showEventForm(ev.event_date||date);
    const saveBtn=document.querySelector('#addEventForm button[type="submit"]');if(saveBtn)saveBtn.textContent=appLanguage==='en'?'Update series':'Serie aktualisieren';
  }else{
    try{await suppressSeriesOccurrence(ev,date);const copy=await createOccurrenceOverride(ev,date);events.push(copy);renderAll();}
    catch(err){alert(err.message||err);}
  }
}
async function deleteOccurrenceOrSeries(ev,date){
  const choice=await askSeriesChoice(ev,date,'delete');if(!choice)return;
  if(choice==='all'){
    if(!confirm(appLanguage==='en'?'Delete the entire series?':'Die gesamte Serie wirklich löschen?'))return;
    const {error}=await supabase.from('events').delete().eq('id',ev.id);if(error)return alert(error.message);
    await loadEvents();await loadOccurrenceStatuses();renderAll();
  }else{
    try{await suppressSeriesOccurrence(ev,date);renderAll();}catch(err){alert(err.message||err);}
  }
}
function renderAll(){renderGroupUI();renderTug();renderEvents();renderMonthCalendar();renderStats();renderAchievements();renderAdvancedStats();renderYearEnd();renderWeights();renderPhotos();renderTrainingProofs();renderPhotoReminder();renderProfiles();setTimeout(enhanceEventSeriesControls,0);}
function memberDebt(id){return occurrenceStatuses.reduce((sum,r)=>{const ev=events.find(e=>e.id===r.event_id);return sum+(r.profile_id===id&&r.status==='missed'?Number(ev?.penalty||0):0);},0);}
function renderTug(){
  const hero=$('.hero-card'),ranking=$('#multiRanking');hero.classList.remove('solo','multi');ranking.classList.add('hidden');ranking.innerHTML='';
  if(!activeGroup||groupMembers.length<2){
    hero.classList.add('solo');$('#leadBadge').textContent='Noch solo';$('#tugText').textContent='Für das Tauziehen braucht die Gruppe zwei Mitglieder. Schick deinen Einladungslink weiter.';$('#totalPot').textContent=euro(groupMembers.reduce((s,m)=>s+memberDebt(m.id),0));return;
  }
  if(groupMembers.length>2){
    hero.classList.add('multi');
    const ranked=[...groupMembers].map(m=>({...m,debt:memberDebt(m.id)})).sort((a,b)=>a.debt-b.debt||a.name.localeCompare(b.name,'de'));
    const medals=['🥇','🥈','🥉'];
    ranking.innerHTML=ranked.map((m,i)=>`<div class="rank-row ${m.id===currentUser.id?'me':''}"><span class="rank-place">${medals[i]||`${i+1}.`}</span><span class="rank-name">${escapeHtml(m.name)}${m.id===currentUser.id?' (du)':''}</span><span class="rank-debt">${euro(m.debt)}</span></div>`).join('');
    ranking.classList.remove('hidden');
    $('#leadBadge').textContent=`${ranked[0].name} führt`;
    $('#tugText').textContent=ranked.every(x=>x.debt===ranked[0].debt)?'Gleichstand – noch ist alles offen.':`${ranked[0].name} hat aktuell die wenigsten Strafschulden.`;
    $('#totalPot').textContent=euro(ranked.reduce((sum,m)=>sum+m.debt,0));return;
  }
  const [a,b]=groupMembers;const da=memberDebt(a.id),db=memberDebt(b.id),total=da+db;let redPct=50;
  if(total>0)redPct=50+((db-da)/total)*42;redPct=Math.max(8,Math.min(92,redPct));
  $('#redSide').style.width=`${redPct}%`;$('#blueSide').style.width=`${100-redPct}%`;$('#ropeMarker').style.left=`${redPct}%`;
  $('#userANameLabel').textContent=a.name;$('#userBNameLabel').textContent=b.name;$('#debtA').textContent=euro(da);$('#debtB').textContent=euro(db);$('#totalPot').textContent=euro(total);
  if(da===db){$('#leadBadge').textContent='Gleichstand';$('#tugText').textContent=total===0?'Noch keine Strafgelder. Perfekter Start.':`Gleichstand bei ${euro(da)}.`;}
  else{const leader=da<db?a:b,diff=Math.abs(da-db);$('#leadBadge').textContent=`${leader.name} führt`;$('#tugText').textContent=`${leader.name} liegt um ${euro(diff)} vorne und würde aktuell über den Topf entscheiden.`;}
}
function myParticipant(ev){return ev.participants.find(p=>p.profile_id===currentUser.id);}
function renderStats(){
  const items=[];const now=new Date();
  events.filter(e=>myParticipant(e)).forEach(e=>occurrenceDatesThrough(e,now).forEach(date=>items.push({date,status:occurrenceStatus(e,currentUser.id,date)})));
  items.sort((a,b)=>a.date.localeCompare(b.date));
  const done=items.filter(x=>x.status==='completed').length;let cur=0,best=0;
  items.forEach(x=>{if(x.status==='completed'){cur++;best=Math.max(best,cur);}else if(x.status==='missed')cur=0;});
  $('#currentStreak').textContent=cur;$('#bestStreak').textContent=best;$('#doneCount').textContent=done;
}

function allMyOccurrences(){
  if(!currentUser)return[];
  const now=new Date();
  const items=[];
  events.filter(e=>myParticipant(e)).forEach(ev=>{
    occurrenceDatesThrough(ev,now).forEach(date=>{
      items.push({date,status:occurrenceStatus(ev,currentUser.id,date),event:ev});
    });
  });
  return items.sort((a,b)=>a.date.localeCompare(b.date));
}
function dayDiff(a,b){return Math.round((new Date(`${b}T12:00:00`)-new Date(`${a}T12:00:00`))/86400000);}
function isoWeekKey(iso){
  const d=new Date(`${iso}T12:00:00`);
  const day=(d.getDay()+6)%7;
  d.setDate(d.getDate()-day+3);
  const firstThu=new Date(d.getFullYear(),0,4,12);
  const firstDay=(firstThu.getDay()+6)%7;
  firstThu.setDate(firstThu.getDate()-firstDay+3);
  const week=1+Math.round((d-firstThu)/604800000);
  return `${d.getFullYear()}-W${String(week).padStart(2,'0')}`;
}
function monthKey(iso){return String(iso).slice(0,7);}
function consecutiveKeys(sortedKeys,kind){
  if(!sortedKeys.length)return 0;
  let cur=1,best=1;
  for(let i=1;i<sortedKeys.length;i++){
    const prev=sortedKeys[i-1],now=sortedKeys[i];
    let consecutive=false;
    if(kind==='month'){
      const [py,pm]=prev.split('-').map(Number),[ny,nm]=now.split('-').map(Number);
      consecutive=(ny*12+nm)===(py*12+pm+1);
    }else{
      const [py,pw]=prev.split('-W').map(Number),[ny,nw]=now.split('-W').map(Number);
      if(py===ny)consecutive=nw===pw+1;
      else if(ny===py+1){
        const dec28=new Date(py,11,28,12);
        const lastWeek=Number(isoWeekKey(localISO(dec28)).split('-W')[1]);
        consecutive=pw===lastWeek&&nw===1;
      }
    }
    cur=consecutive?cur+1:1;best=Math.max(best,cur);
  }
  return best;
}
function weeklyStreakMetrics(items){
  const by=new Map();
  items.forEach(x=>{const k=isoWeekKey(x.date);if(!by.has(k))by.set(k,[]);by.get(k).push(x);});
  const active=[...by.entries()].sort((a,b)=>a[0].localeCompare(b[0]));
  const perfect=active.filter(([,rows])=>rows.length&&rows.every(r=>r.status==='completed'||r.status==='excused')).map(([k])=>k);
  let best=0,cur=0,last=null;
  for(const [key,rows] of active){
    const ok=rows.length&&rows.every(r=>r.status==='completed'||r.status==='excused');
    if(!ok){cur=0;last=key;continue;}
    let consecutive=true;
    if(last){
      const test=consecutiveKeys([last,key],'week');
      consecutive=test===2;
    }
    cur=consecutive?cur+1:1;best=Math.max(best,cur);last=key;
  }
  return {current:cur,best,perfectWeeks:perfect.length};
}
function cleanMonthMetrics(items){
  const by=new Map();
  items.forEach(x=>{const k=monthKey(x.date);if(!by.has(k))by.set(k,[]);by.get(k).push(x);});
  const months=[...by.entries()].sort((a,b)=>a[0].localeCompare(b[0]));
  let cur=0,best=0,last=null;
  for(const [key,rows] of months){
    const clean=rows.length>0&&!rows.some(r=>r.status==='missed');
    if(!clean){cur=0;last=key;continue;}
    const consecutive=!last||consecutiveKeys([last,key],'month')===2;
    cur=consecutive?cur+1:1;best=Math.max(best,cur);last=key;
  }
  return {current:cur,best};
}
function reliabilityMetrics(items){
  const today=todayISO();
  const recent=items.filter(x=>dayDiff(x.date,today)>=0&&dayDiff(x.date,today)<=29);
  const eligible=recent.filter(x=>x.status!=='planned');
  const success=eligible.filter(x=>x.status==='completed'||x.status==='excused').length;
  const current=eligible.length?Math.round(success/eligible.length*100):0;

  // Best historic calendar-month reliability; at least 3 decided workouts.
  const by=new Map();
  items.forEach(x=>{if(x.status==='planned')return;const k=monthKey(x.date);if(!by.has(k))by.set(k,[]);by.get(k).push(x);});
  let best=0;
  for(const rows of by.values()){
    if(rows.length<3)continue;
    const good=rows.filter(r=>r.status==='completed'||r.status==='excused').length;
    best=Math.max(best,Math.round(good/rows.length*100));
  }
  best=Math.max(best,current);
  return {current,best,decided:eligible.length};
}
function weightLossMetrics(){
  if(!weights.length)return{current:0,best:0,start:0,trend:0};
  const sorted=[...weights].sort((a,b)=>a.date.localeCompare(b.date));
  const start=Number(sorted[0].weight);
  // Use a rolling average over up to the last 5 measurements so one low weigh-in
  // from an empty stomach / water fluctuation does not immediately unlock a medal.
  const trendSeries=sorted.map((w,i)=>{
    const slice=sorted.slice(Math.max(0,i-4),i+1);
    return slice.reduce((s,x)=>s+Number(x.weight),0)/slice.length;
  });
  const currentTrend=trendSeries.at(-1);
  const bestTrend=Math.min(...trendSeries);
  return{
    current:Math.max(0,start-currentTrend),
    best:Math.max(0,start-bestTrend),
    start,
    trend:currentTrend
  };
}
function achievementLevel(best,thresholds){
  if(best>=thresholds[2])return 3;
  if(best>=thresholds[1])return 2;
  if(best>=thresholds[0])return 1;
  return 0;
}
function achievementMedalHtml(level){
  if(level===3)return '<span class="earned-medal medal-gold" title="Gold">★<small>G</small></span>';
  if(level===2)return '<span class="earned-medal medal-silver" title="Silber">★<small>S</small></span>';
  if(level===1)return '<span class="earned-medal medal-bronze" title="Bronze">★<small>B</small></span>';
  return '<span class="earned-medal medal-none" title="Noch keine Medaille">–</span>';
}
function achievementProgress(current,thresholds){
  const level=achievementLevel(current,thresholds);
  if(level>=3)return{pct:100,label:`${current} / ${thresholds[2]}`,next:'Gold erreicht'};
  const next=thresholds[level];
  const prev=level?thresholds[level-1]:0;
  const pct=Math.max(0,Math.min(100,((current-prev)/(next-prev))*100));
  return{pct,label:`${current} / ${next}`,next:level===2?'Bis Gold':level===1?'Bis Silber':'Bis Bronze'};
}
function renderAchievements(){
  const grid=$('#achievementGrid'),badge=$('#achievementSummaryBadge');if(!grid||!badge)return;
  const items=allMyOccurrences();
  const done=items.filter(x=>x.status==='completed').length;
  const rel=reliabilityMetrics(items);
  const weeks=weeklyStreakMetrics(items);
  const clean=cleanMonthMetrics(items);
  const loss=weightLossMetrics();
  const photos=myProgressPhotos().length;

  const defs=[
    {
      icon:'🏋️',name:'Durchgezogen',
      desc:'Zählt nur Trainings, die wirklich als „Erledigt“ bestätigt wurden.',
      current:done,best:done,thresholds:[10,50,100],unit:' Trainings',
      bronze:'10 erledigte Trainings',silver:'50 erledigte Trainings',gold:'100 erledigte Trainings'
    },
    {
      icon:'🎯',name:'Zuverlässig',
      desc:'Erfolgsquote aus Erledigt + Entschuldigt gegenüber entschiedenen Terminen. Für historische Medaillen zählt nur ein Monat mit mindestens 3 Terminen.',
      current:rel.current,best:rel.best,thresholds:[80,90,100],unit:'%',
      bronze:'80 % zuverlässig',silver:'90 % zuverlässig',gold:'100 % zuverlässig'
    },
    {
      icon:'🔥',name:'Streak',
      desc:'Eine perfekte Woche zählt nur, wenn alle eigenen geplanten Trainings erledigt oder entschuldigt sind. „Verpasst“ setzt die aktuelle Serie zurück.',
      current:weeks.current,best:weeks.best,thresholds:[2,4,12],unit:' Wochen',
      bronze:'2 perfekte Wochen',silver:'4 perfekte Wochen',gold:'12 perfekte Wochen'
    },
    {
      icon:'⚖️',name:'Auf Kurs',
      desc:'Gewichtsfortschritt wird aus einem geglätteten Trend der letzten Messungen berechnet. Ein einzelner niedriger Wert durch Wasser oder leeren Magen reicht nicht.',
      current:Number(loss.current.toFixed(1)),best:Number(loss.best.toFixed(1)),thresholds:[3,7,12],unit:' kg',
      bronze:'3 kg Trend-Fortschritt',silver:'7 kg Trend-Fortschritt',gold:'12 kg Trend-Fortschritt'
    },
    {
      icon:'🛡️',name:'Keine Ausreden',
      desc:'Ein kompletter Monat ohne einen einzigen als „Verpasst“ gewerteten eigenen Termin. Mehrere saubere Monate müssen direkt aufeinander folgen.',
      current:clean.current,best:clean.best,thresholds:[1,3,6],unit:' Monate',
      bronze:'1 sauberer Monat',silver:'3 Monate in Folge',gold:'6 Monate in Folge'
    },
    {
      icon:'📸',name:'Zeitraffer',
      desc:'Zählt nur deine Fortschrittsbilder. Bei einem Foto alle 14 Tage entsprechen 26 Bilder ungefähr einem kompletten Jahr.',
      current:photos,best:photos,thresholds:[5,13,26],unit:' Bilder',
      bronze:'5 Fortschrittsbilder',silver:'13 Fortschrittsbilder',gold:'26 Fortschrittsbilder'
    }
  ];

  grid.innerHTML=defs.map(a=>{
    const unlocked=achievementLevel(a.best,a.thresholds);
    const prog=achievementProgress(a.current,a.thresholds);
    const currentText=`${a.current}${a.unit}`;
    const bestText=a.best!==a.current?` · Bestwert ${a.best}${a.unit}`:'';
    return `<article class="achievement-item medal-${unlocked}">
      <div class="achievement-top">
        <span class="achievement-icon">${a.icon}</span>
        <div>
          <strong>${escapeHtml(a.name)}</strong>
          <span>${escapeHtml(a.desc)}</span>
        </div>
        ${achievementMedalHtml(unlocked)}
      </div>
      <div class="achievement-tier-table">
        <span class="${unlocked>=1?'tier-earned':''}"><b>Bronze</b>${escapeHtml(a.bronze)}</span>
        <span class="${unlocked>=2?'tier-earned':''}"><b>Silber</b>${escapeHtml(a.silver)}</span>
        <span class="${unlocked>=3?'tier-earned':''}"><b>Gold</b>${escapeHtml(a.gold)}</span>
      </div>
      <div class="achievement-value"><strong>${currentText}</strong><span>${bestText}</span></div>
      <div class="achievement-track"><div class="achievement-fill" style="width:${prog.pct}%"></div></div>
      <div class="achievement-foot"><span>${prog.label}</span><span>${prog.next}</span></div>
    </article>`;
  }).join('');

  const gold=defs.filter(a=>achievementLevel(a.best,a.thresholds)>=3).length;
  const silver=defs.filter(a=>achievementLevel(a.best,a.thresholds)===2).length;
  const bronze=defs.filter(a=>achievementLevel(a.best,a.thresholds)===1).length;
  badge.textContent=`Gold ${gold} · Silber ${silver} · Bronze ${bronze}`;
}
function renderAdvancedStats(){
  const box=$('#advancedStatsGrid');if(!box)return;
  const items=allMyOccurrences(),today=todayISO();
  const recent=items.filter(x=>dayDiff(x.date,today)>=0&&dayDiff(x.date,today)<=29);
  const decided=recent.filter(x=>x.status!=='planned');
  const done=decided.filter(x=>x.status==='completed').length;
  const missed=decided.filter(x=>x.status==='missed').length;
  const excused=decided.filter(x=>x.status==='excused').length;
  const rate=decided.length?Math.round((done+excused)/decided.length*100):0;
  const weeks=weeklyStreakMetrics(items);
  box.innerHTML=[
    ['✅',appLanguage==='en'?'Completion rate':'Erfolgsquote',`${rate}%`],
    ['🏋️',appLanguage==='en'?'Completed':'Erledigt',String(done)],
    ['❌',appLanguage==='en'?'Missed':'Verpasst',String(missed)],
    ['🩹',appLanguage==='en'?'Excused':'Entschuldigt',String(excused)],
    ['🔥',appLanguage==='en'?'Current perfect weeks':'Aktuelle perfekte Wochen',String(weeks.current)],
    ['📸',appLanguage==='en'?'Progress photos':'Fortschrittsbilder',String(myProgressPhotos().length)]
  ].map(([icon,label,value])=>`<div class="advanced-stat"><span>${icon} ${label}</span><strong>${value}</strong></div>`).join('');
}

function renderEvents(){
  const list=$('#eventList'),next=$('#nextEvents');list.innerHTML='';next.innerHTML='';const sorted=[...events].sort((a,b)=>`${a.date}${a.start}`.localeCompare(`${b.date}${b.start}`));
  if(!activeGroup){list.innerHTML='<div class="empty">Wähle zuerst eine Gruppe.</div>';next.innerHTML='<div class="empty">Noch keine Gruppe.</div>';return;}
  if(!sorted.length)list.innerHTML='<div class="empty">Noch keine Termine. Trag euren ersten Termin ein.</div>';
  const now=new Date();
  sorted.forEach(ev=>{
    const shownDate=nextOccurrenceDate(ev,now)||ev.date;
    list.appendChild(eventNode(ev,true,shownDate));
  });
  const upcoming=events.map(ev=>{
    const date=nextOccurrenceDate(ev,now);
    return date?{...ev,date}:null;
  }).filter(Boolean).filter(e=>new Date(`${e.date}T${e.end||e.start||'23:59'}`)>=now)
    .sort((a,b)=>`${a.date}${a.start}`.localeCompare(`${b.date}${b.start}`)).slice(0,4);
  if(!upcoming.length)next.innerHTML='<div class="empty">Keine kommenden Termine.</div>';upcoming.forEach(ev=>next.appendChild(eventNode(ev,false,ev.date)));
}
function statusLabel(s){return {planned:'Geplant',completed:'Erledigt',missed:'Verpasst',excused:'Entschuldigt'}[s]||s;}
function eventCreatorName(ev){
  if(ev.created_by===currentUser?.id)return currentProfile?.name||'Du';
  return groupMembers.find(m=>m.id===ev.created_by)?.name||'Mitglied';
}
function eventNode(ev,withDelete,occurrenceDateOverride=null){
  const wrap=document.createElement('div');wrap.className='event-item';
  const occurrenceDate=occurrenceDateOverride||ev.date;
  const statuses=ev.participants.map(p=>{const st=occurrenceStatus(ev,p.profile_id,occurrenceDate);const icon=st==='completed'?'✅':st==='missed'?'❌':st==='excused'?'🩹':'🕒';return `<span class="status ${st}">${icon} ${escapeHtml(p.name)}: ${statusLabel(st)}${st==='missed'&&ev.penalty?` · ${euro(ev.penalty)}`:''}</span>`;}).join('');
  wrap.innerHTML=`<div class="event-main"><strong>${escapeHtml(ev.title)} <span class="event-sync-badge">● synchronisiert</span></strong><div class="event-meta">${formatDate(occurrenceDate)}${recurrenceText(ev)} · ${ev.start||'–'}${ev.end?`–${ev.end}`:''} · ${euro(ev.penalty)} Strafe</div><div class="event-creator">Erstellt von: ${escapeHtml(eventCreatorName(ev))}</div><div class="status-row participant-status-row">${statuses}</div></div><div class="event-actions"><button class="small-btn status-btn" type="button">Status</button>${withDelete&&ev.created_by===currentUser.id?'<button class="small-btn delete-btn" type="button">🗑</button>':''}</div>`;
  wrap.querySelector('.status-btn').addEventListener('click',()=>{openStatusDialog(ev,occurrenceDate);});
  const del=wrap.querySelector('.delete-btn');if(del)del.addEventListener('click',async()=>{if(confirm(`„${ev.title}“${ev.recurrence!=='none'?' und die ganze Serie':''} löschen?`)){const {error}=await supabase.from('events').delete().eq('id',ev.id);if(error)alert(error.message);else{await loadEvents();await loadOccurrenceStatuses();renderAll();}}});
  return wrap;
}
function renderMonthCalendar(){
  const grid=$('#monthGrid');grid.innerHTML='';const y=calendarCursor.getFullYear(),m=calendarCursor.getMonth();$('#calendarMonthTitle').textContent=new Intl.DateTimeFormat('de-DE',{month:'long',year:'numeric'}).format(calendarCursor);
  const first=new Date(y,m,1),offset=(first.getDay()+6)%7,start=new Date(y,m,1-offset);const today=todayISO(),selected=$('#eventDate').value;
  for(let i=0;i<42;i++){
    const d=new Date(start);d.setDate(start.getDate()+i);const iso=localISO(d),cell=document.createElement('button');cell.type='button';cell.className='calendar-day';
    if(d.getMonth()!==m)cell.classList.add('other-month');if(iso===today)cell.classList.add('today');if(iso===selected)cell.classList.add('selected');
    const dayEvents=events.filter(e=>eventOccursOn(e,iso)).sort((a,b)=>(a.start||'').localeCompare(b.start||''));
    const visibleEvents=dayEvents.slice(0,3);
    cell.innerHTML=`<span class="day-number">${d.getDate()}</span><span class="calendar-events">${visibleEvents.map(e=>`<span class="calendar-event ${e.color} ${calendarEventStatus(e,iso)}" title="Status für ${escapeHtml(e.title)} ändern"><span class="calendar-event-time">${escapeHtml(e.start||'')}</span><span class="calendar-event-title">${calendarStatusSymbol(e,iso)}${escapeHtml(e.title)}</span></span>`).join('')}${dayEvents.length>3?`<span class="calendar-more">+${dayEvents.length-3} mehr</span>`:''}</span>`;
    cell.querySelectorAll('.calendar-event').forEach((chip,index)=>chip.addEventListener('click',event=>{
      event.stopPropagation();
      const ev=visibleEvents[index];
      if(!ev?.participants.some(p=>p.profile_id===currentUser.id))return alert('Du bist bei diesem Termin nicht als Teilnehmer eingetragen.');
      openStatusDialog(ev,iso);
    }));
    cell.addEventListener('click',()=>{$('#eventDate').value=iso;renderMonthCalendar();});cell.addEventListener('dblclick',()=>showEventForm(iso));grid.appendChild(cell);
  }
}
function calendarStatusSymbol(ev,date){const c=calendarEventStatus(ev,date);return c==='done'?'✓ ':c==='missed'?'✕ ':c==='excused'?'🩹 ':'';}
function calendarEventStatus(ev,date){
  const sts=ev.participants.map(p=>occurrenceStatus(ev,p.profile_id,date));
  if(sts.some(s=>s==='missed'))return'missed';
  if(sts.length&&sts.every(s=>s==='completed'))return'done';
  if(sts.length&&sts.every(s=>s==='completed'||s==='excused')&&sts.some(s=>s==='excused'))return'excused';
  return'';
}
function showEventForm(iso){$('#eventDate').value=iso;$('#eventFormCard').scrollIntoView({behavior:'smooth',block:'start'});setTimeout(()=>$('#eventTitle').focus(),250);}

async function saveOwnProfile(){
  const name=$('#ownNameInput').value.trim();if(!name)return alert('Bitte einen Namen eintragen.');
  const {error}=await supabase.from('profiles').update({name}).eq('id',currentUser.id);if(error)return alert(error.message);
  currentProfile={...currentProfile,name};await loadGroupMembers();renderAll();
}
function renderProfiles(){
  const me=currentProfile||{name:'Ich'};$('#ownProfileName').textContent=me.name;$('#ownNameInput').value=me.name;$('#ownAvatar').textContent=(me.name?.[0]||'?').toUpperCase();$('#ownProfileDebt').textContent=euro(memberDebt(currentUser?.id));$('#ownProfileDone').textContent=occurrenceStatuses.filter(r=>r.profile_id===currentUser?.id&&r.status==='completed').length;
  const partner=groupMembers.find(m=>m.id!==currentUser?.id);
  $('#partnerProfileName').textContent=partner?.name||'Noch niemand';$('#partnerAvatar').textContent=(partner?.name?.[0]||'?').toUpperCase();$('#partnerProfileDebt').textContent=partner?euro(memberDebt(partner.id)):'–';$('#partnerProfileDone').textContent=partner?occurrenceStatuses.filter(r=>r.profile_id===partner.id&&r.status==='completed').length:'–';
  renderMembers();
}

async function addWeight(){
  const date=$('#weightDate').value,weight=inputWeightToKg($('#weightValue').value);
  if(!date||!weight)return alert('Bitte Datum und Gewicht eintragen.');
  if(date>todayISO())return alert('Gewicht kann nicht für einen zukünftigen Tag eingetragen werden.');
  const {error}=await supabase.from('weight_entries').upsert({profile_id:currentUser.id,weight,measured_on:date},{onConflict:'profile_id,measured_on'});
  if(error)return alert(`Gewicht konnte nicht gespeichert werden: ${error.message}`);
  $('#weightValue').value='';await loadWeights();renderWeights();renderAchievements();renderAdvancedStats();
}
async function deleteWeightEntry(date){
  const entry=weights.find(w=>w.date===date);if(!entry)return;
  if(!confirm(`Gewichtseintrag vom ${formatDate(date)} (${entry.weight.toFixed(1)} kg) wirklich löschen?`))return;
  const {error}=await supabase.from('weight_entries').delete().eq('profile_id',currentUser.id).eq('measured_on',date);
  if(error)return alert(`Eintrag konnte nicht gelöscht werden: ${error.message}`);
  await loadWeights();weightChartSelectedIndex=null;renderWeights();renderAchievements();renderAdvancedStats();
}
function movingAverage(arr,days=7){return arr.map((x,i)=>{const slice=arr.slice(Math.max(0,i-days+1),i+1);return slice.reduce((s,v)=>s+v.weight,0)/slice.length;});}

function availableYearEndYears(){
  const years=new Set([new Date().getFullYear()]);
  for(const ev of events){if(ev.event_date)years.add(Number(String(ev.event_date).slice(0,4)));}
  for(const st of occurrenceStatuses){if(st.occurrence_date)years.add(Number(String(st.occurrence_date).slice(0,4)));}
  return [...years].filter(Boolean).sort((a,b)=>b-a);
}
function yearMemberStats(profileId,year){
  let missed=0,done=0,excused=0,debt=0;
  for(const st of occurrenceStatuses){
    if(st.profile_id!==profileId||Number(String(st.occurrence_date).slice(0,4))!==year)continue;
    const ev=events.find(e=>e.id===st.event_id);
    if(st.status==='missed'){missed++;debt+=Number(ev?.penalty||0);}
    else if(st.status==='completed'||st.status==='done')done++;
    else if(st.status==='excused')excused++;
  }
  return {missed,done,excused,debt};
}
function renderYearEnd(){
  const sel=$('#yearEndSelect'),summary=$('#yearEndSummary'),membersBox=$('#yearEndMembers'),decision=$('#yearEndDecision');
  if(!sel||!summary||!membersBox||!decision)return;
  const years=availableYearEndYears(),previous=Number(sel.value)||new Date().getFullYear();
  sel.innerHTML=years.map(y=>`<option value="${y}">${y}</option>`).join('');
  sel.value=years.includes(previous)?String(previous):String(years[0]);
  const year=Number(sel.value),members=groupMembers||[];
  if(!activeGroup||!members.length){
    summary.innerHTML=`<div class="empty">${appLanguage==='en'?'Join a group to see the annual settlement.':'Tritt einer Gruppe bei, um den Jahresabschluss zu sehen.'}</div>`;
    membersBox.innerHTML='';decision.innerHTML='';return;
  }
  const rows=members.map(m=>({member:m,...yearMemberStats(m.id,year)}));
  const pot=rows.reduce((n,r)=>n+r.debt,0),misses=rows.reduce((n,r)=>n+r.missed,0),done=rows.reduce((n,r)=>n+r.done,0);
  summary.innerHTML=`<div class="stat-grid year-stats">
    <div><span>${appLanguage==='en'?'Shared pot':'Gemeinsamer Topf'}</span><strong>${euro(pot)}</strong></div>
    <div><span>${appLanguage==='en'?'Missed':'Verpasst'}</span><strong>${misses}</strong></div>
    <div><span>${appLanguage==='en'?'Completed':'Erledigt'}</span><strong>${done}</strong></div>
  </div>`;
  membersBox.innerHTML=rows.map(r=>`<article class="year-member">
    <div class="avatar small">${escapeHtml((r.member.name||'?')[0].toUpperCase())}</div>
    <div class="year-member-main"><strong>${escapeHtml(r.member.name||'')}</strong><span>${r.done} ${appLanguage==='en'?'done':'erledigt'} · ${r.missed} ${appLanguage==='en'?'missed':'verpasst'} · ${r.excused} ${appLanguage==='en'?'excused':'entschuldigt'}</span></div>
    <strong>${euro(r.debt)}</strong>
  </article>`).join('');
  const minMiss=Math.min(...rows.map(r=>r.missed)),winners=rows.filter(r=>r.missed===minMiss);
  if(rows.length<2){
    decision.innerHTML=`<div class="info-banner">${appLanguage==='en'?'The decision rule becomes relevant once the group has at least two members.':'Die Entscheidungsregel wird relevant, sobald die Gruppe mindestens zwei Mitglieder hat.'}</div>`;
  }else if(winners.length===1){
    decision.innerHTML=`<div class="winner-banner">🏆 <strong>${escapeHtml(winners[0].member.name)}</strong> ${appLanguage==='en'?`had the fewest missed events in ${year} and decides how the ${euro(pot)} pot is used.`:`hatte ${year} die wenigsten verpassten Termine und entscheidet, wofür der Topf von ${euro(pot)} verwendet wird.`}</div>`;
  }else{
    decision.innerHTML=`<div class="info-banner">🤝 ${appLanguage==='en'?`Tie: ${winners.map(r=>escapeHtml(r.member.name)).join(', ')} share the fewest missed events. Decide together what happens to the ${euro(pot)} pot.`:`Gleichstand: ${winners.map(r=>escapeHtml(r.member.name)).join(', ')} haben gleich wenige Termine verpasst. Ihr entscheidet gemeinsam über den Topf von ${euro(pot)}.`}</div>`;
  }
}
let weightChartSelectedIndex=null;
let weightChartGeometry=null;

function loadWeightScaleSettings(){
  const mode=localStorage.getItem('fitTogether_weightScaleMode')||'auto';
  const min=localStorage.getItem('fitTogether_weightScaleMin')||'85';
  const max=localStorage.getItem('fitTogether_weightScaleMax')||'100';
  if($('#weightScaleMode'))$('#weightScaleMode').value=mode;
  if($('#weightScaleMin'))$('#weightScaleMin').value=min;
  if($('#weightScaleMax'))$('#weightScaleMax').value=max;
  updateWeightScaleControls();
}
function updateWeightScaleControls(){
  const custom=$('#weightScaleMode')?.value==='custom';
  $('#weightScaleMinWrap')?.classList.toggle('hidden',!custom);
  $('#weightScaleMaxWrap')?.classList.toggle('hidden',!custom);
}
function saveWeightScaleSettings(){
  const mode=$('#weightScaleMode')?.value||'auto';
  const min=Number($('#weightScaleMin')?.value||85),max=Number($('#weightScaleMax')?.value||100);
  if(mode==='custom'&&(!Number.isFinite(min)||!Number.isFinite(max)||max<=min)){alert('Das Maximum muss größer als das Minimum sein.');return;}
  localStorage.setItem('fitTogether_weightScaleMode',mode);
  localStorage.setItem('fitTogether_weightScaleMin',String(min));
  localStorage.setItem('fitTogether_weightScaleMax',String(max));
  updateWeightScaleControls();drawWeightChart(weights);
}
function renderWeights(){
  $('#weightStart').textContent=weights.length?displayWeight(weights[0].weight):'–';
  $('#weightCurrent').textContent=weights.length?displayWeight(weights.at(-1).weight):'–';
  $('#weightDelta').textContent=weights.length>1?`${(weightUnit==='lb'?(weights.at(-1).weight-weights[0].weight)*2.2046226218:(weights.at(-1).weight-weights[0].weight)).toFixed(1)} ${weightUnit}`:'–';
  const list=$('#weightEntryList');
  if(list)list.innerHTML=weights.length?[...weights].reverse().map(w=>`<div class="weight-entry-row"><div><strong>${displayWeight(w.weight)}</strong><span>${dateLabel(w.date)}</span></div><button type="button" class="danger-text-btn" data-delete-weight="${w.date}">${appLanguage==='en'?'Delete':'Löschen'}</button></div>`).join(''):'<div class="empty">Noch keine Gewichtseinträge.</div>';
  if(weightChartSelectedIndex!==null&&weightChartSelectedIndex>=weights.length)weightChartSelectedIndex=weights.length?weights.length-1:null;
  drawWeightChart(weights);renderWeightTimeline();updateWeightCursorInfo();
}
function renderWeightTimeline(){
  const timeline=$('#weightTimeline');if(!timeline)return;
  if(!weights.length){timeline.innerHTML='';return;}
  timeline.innerHTML=weights.map((w,i)=>`<button type="button" class="weight-timeline-dot ${i===weightChartSelectedIndex?'selected':''}" data-weight-index="${i}" title="${dateLabel(w.date)} · ${displayWeight(w.weight)}"><span></span></button>`).join('');
}
function selectWeightPoint(index){
  if(!weights[index])return;
  weightChartSelectedIndex=index;renderWeightTimeline();updateWeightCursorInfo();drawWeightChart(weights);
}
function updateWeightCursorInfo(){
  const el=$('#weightCursorInfo');if(!el)return;
  if(weightChartSelectedIndex===null||!weights[weightChartSelectedIndex]){
    el.innerHTML=`<strong>${appLanguage==='en'?'Select measurement':'Messpunkt auswählen'}</strong><span>${appLanguage==='en'?'Tap a point below the graph.':'Tippe auf einen Punkt unter dem Graphen.'}</span>`;return;
  }
  const p=weights[weightChartSelectedIndex];
  el.innerHTML=`<strong>${displayWeight(p.weight)}</strong><span>${dateLabel(p.date)}</span>`;
}
function drawWeightChart(data){
  const c=$('#weightChart'),ctx=c.getContext('2d'),dpr=window.devicePixelRatio||1,cssW=c.clientWidth||900,cssH=Math.max(260,cssW*.4);
  c.width=cssW*dpr;c.height=cssH*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,cssW,cssH);ctx.fillStyle='#0f1728';ctx.fillRect(0,0,cssW,cssH);
  if(!data.length){weightChartGeometry=null;ctx.fillStyle='#9da9bd';ctx.font='14px system-ui';ctx.textAlign='center';ctx.fillText('Noch keine Gewichtseinträge.',cssW/2,cssH/2);return;}
  const vals=data.map(x=>x.weight),avg=movingAverage(data),highest=Math.max(...vals,...avg),pad=48,plotW=cssW-pad*2,plotH=cssH-pad*2;
  const mode=$('#weightScaleMode')?.value||localStorage.getItem('fitTogether_weightScaleMode')||'auto';
  let min,max;
  if(mode==='custom'){
    min=Number($('#weightScaleMin')?.value||localStorage.getItem('fitTogether_weightScaleMin')||85);
    max=Number($('#weightScaleMax')?.value||localStorage.getItem('fitTogether_weightScaleMax')||100);
  }else{
    max=Math.ceil((highest+3)/5)*5;min=Math.max(0,max-25);
  }
  const x=i=>pad+(data.length===1?plotW/2:(i/(data.length-1))*plotW),y=v=>cssH-pad-((v-min)/(max-min))*plotH;
  weightChartGeometry={pad,plotW,plotH,min,max};
  ctx.strokeStyle='#26334e';ctx.lineWidth=1;
  for(let i=0;i<6;i++){
    const yy=pad+i*plotH/5;ctx.beginPath();ctx.moveTo(pad,yy);ctx.lineTo(cssW-pad,yy);ctx.stroke();
    const kg=max-i*(max-min)/5;ctx.fillStyle='#9da9bd';ctx.font='11px system-ui';ctx.textAlign='left';
    ctx.fillText(weightUnit==='lb'?`${(kg*2.2046226218).toFixed(0)} lb`:`${kg.toFixed(0)} kg`,4,yy+4);
  }
  ctx.strokeStyle='#60a5fa';ctx.lineWidth=2.5;ctx.beginPath();data.forEach((p,i)=>i?ctx.lineTo(x(i),y(p.weight)):ctx.moveTo(x(i),y(p.weight)));ctx.stroke();
  ctx.strokeStyle='#f59e0b';ctx.lineWidth=2;ctx.setLineDash([7,6]);ctx.beginPath();avg.forEach((v,i)=>i?ctx.lineTo(x(i),y(v)):ctx.moveTo(x(i),y(v)));ctx.stroke();ctx.setLineDash([]);
  if(weightChartSelectedIndex!==null&&data[weightChartSelectedIndex]){
    const i=weightChartSelectedIndex,xx=x(i),yy=y(data[i].weight);
    ctx.strokeStyle='#ef4444';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(xx,pad);ctx.lineTo(xx,cssH-pad);ctx.stroke();
    ctx.beginPath();ctx.arc(xx,yy,6,0,Math.PI*2);ctx.fillStyle='#ef4444';ctx.fill();
  }
  ctx.fillStyle='#9da9bd';ctx.font='12px system-ui';ctx.textAlign='center';ctx.fillText(dateLabel(data[0].date),x(0),cssH-12);if(data.length>1)ctx.fillText(dateLabel(data.at(-1).date),x(data.length-1),cssH-12);
}
function renderPhotos(){
  renderSlideshow();
  const grid=$('#photoGrid');grid.innerHTML='';
  if(!progressPhotos.length){grid.innerHTML='<div class="empty">Noch keine Fortschrittsbilder. Lade dein erstes Monatsbild hoch.</div>';return;}
  progressPhotos.forEach(photo=>{
    const card=document.createElement('article');card.className='photo-card';
    const visibility=photo.visibility==='shared'?'👥 Gruppe':'🔒 Privat';
    card.innerHTML=`${photo.signed_url?`<img src="${photo.signed_url}" alt="Fortschrittsbild von ${escapeHtml(photo.owner_name)}" />`:'<div class="empty">Bild konnte nicht geladen werden.</div>'}<div class="photo-info"><span><span class="photo-owner">${escapeHtml(photo.owner_name)}</span><br>${formatDate(photo.taken_on)}</span><span>${visibility}</span></div>${photo.profile_id===currentUser.id?'<div class="photo-actions"><button class="small-btn delete-photo-btn" type="button">🗑 Löschen</button></div>':''}`;
    card.querySelector('.delete-photo-btn')?.addEventListener('click',()=>deleteProgressPhoto(photo));grid.appendChild(card);
  });
}
function myProgressPhotos(){return progressPhotos.filter(p=>p.profile_id===currentUser?.id).sort((a,b)=>String(a.taken_on).localeCompare(String(b.taken_on)));}
function renderSlideshow(){
  const photos=myProgressPhotos(),box=$('#progressSlideshow'),counter=$('#slideCounter');
  if(!box||!counter)return;
  if(!photos.length){box.innerHTML='<div class="empty">Noch keine eigenen Fortschrittsbilder.</div>';counter.textContent='0 / 0';return;}
  slideIndex=Math.max(0,Math.min(slideIndex,photos.length-1));const p=photos[slideIndex];counter.textContent=`${slideIndex+1} / ${photos.length}`;
  box.innerHTML=`${p.signed_url?`<img src="${p.signed_url}" alt="Fortschrittsbild ${slideIndex+1}" />`:''}<div class="slide-caption"><strong>${formatDate(p.taken_on)}</strong><span>${p.visibility==='shared'?'👥 Gruppe':'🔒 Privat'}</span></div>`;
}
function changeSlide(step){const n=myProgressPhotos().length;if(!n)return;slideIndex=(slideIndex+step+n)%n;renderSlideshow();}
function toggleSlideshow(){
  const btn=$('#slidePlayBtn');
  if(slideTimer){clearInterval(slideTimer);slideTimer=null;btn.textContent='▶ Abspielen';return;}
  if(myProgressPhotos().length<2)return alert('Für die Slideshow brauchst du mindestens zwei Fortschrittsbilder.');
  btn.textContent='⏸ Pause';slideTimer=setInterval(()=>changeSlide(1),1800);
}
function renderTrainingProofs(){
  const grid=$('#proofGrid');if(!grid)return;grid.innerHTML='';
  const sorted=[...trainingProofs].sort((a,b)=>String(b.occurrence_date).localeCompare(String(a.occurrence_date)));
  if(!sorted.length){grid.innerHTML='<div class="empty">Noch keine Trainingsnachweise vorhanden.</div>';return;}
  sorted.forEach(proof=>{const ev=events.find(e=>e.id===proof.event_id);const card=document.createElement('article');card.className='photo-card';card.innerHTML=`${proof.signed_url?`<img src="${proof.signed_url}" alt="Trainingsnachweis von ${escapeHtml(proof.owner_name)}" />`:'<div class="empty">Bild konnte nicht geladen werden.</div>'}<div class="photo-info"><span><span class="photo-owner">${escapeHtml(proof.owner_name)}</span><br>${formatDate(proof.occurrence_date)}</span><span>🏋️ ${escapeHtml(ev?.title||'Training')}</span></div>`;grid.appendChild(card);});
}
function renderPhotoReminder(){
  const card=$('#photoReminderCard');if(!card||!currentUser)return;
  let snooze=0;try{snooze=Number(localStorage.getItem(`fitTogether_photoSnooze_${currentUser.id}`)||0);}catch{}
  if(Date.now()<snooze){card.classList.add('hidden');return;}
  const mine=myProgressPhotos();const last=mine.at(-1);const age=last?Math.floor((new Date(`${todayISO()}T12:00:00`)-new Date(`${last.taken_on}T12:00:00`))/86400000):9999;
  const due=!last||age>=14;card.classList.toggle('hidden',!due);
  if(due)$('#photoReminderText').textContent=last?`Dein letztes Fortschrittsbild ist ${age} Tage her. Zeit für dein nächstes 14-Tage-Foto.`:'Du hast noch kein Fortschrittsbild. Starte heute deine Vorher-/Nachher-Reihe.';
}
function snoozePhotoReminder(){try{localStorage.setItem(`fitTogether_photoSnooze_${currentUser.id}`,String(Date.now()+7*86400000));}catch{}$('#photoReminderCard').classList.add('hidden');}

function urlBase64ToUint8Array(base64String){
  const padding='='.repeat((4-base64String.length%4)%4);
  const base64=(base64String+padding).replace(/-/g,'+').replace(/_/g,'/');
  const raw=atob(base64);return Uint8Array.from([...raw].map(c=>c.charCodeAt(0)));
}
async function getServiceWorkerRegistration(){
  if(!('serviceWorker' in navigator))throw new Error(appLanguage==='en'?'Service workers are not supported.':'Service Worker werden nicht unterstützt.');
  return navigator.serviceWorker.register('./sw.js?v=0.17');
}
async function updatePushStatus(){
  const el=$('#pushStatus'),badge=$('#notificationBadge');
  if(!('serviceWorker' in navigator)||!('PushManager' in window)){
    if(el)el.textContent=appLanguage==='en'?'Closed-app push is not supported by this browser.':'Push bei geschlossener App wird von diesem Browser nicht unterstützt.';
    if(badge)badge.textContent=appLanguage==='en'?'Unsupported':'Nicht unterstützt';
    return;
  }
  try{
    const reg=await navigator.serviceWorker.getRegistration();
    const sub=reg?await reg.pushManager.getSubscription():null;
    if(el)el.textContent=appLanguage==='en'?(sub?'Closed-app push is enabled on this device.':'Closed-app push is not set up yet.'):(sub?'Push bei geschlossener App ist auf diesem Gerät aktiviert.':'Push bei geschlossener App ist noch nicht eingerichtet.');
    if(badge)badge.textContent=sub?(appLanguage==='en'?'Active':'Aktiv'):(appLanguage==='en'?'Not set up':'Nicht eingerichtet');
    $('#settingsNotifyBtn')?.classList.toggle('hidden',!!sub);
    $('#disablePushBtn')?.classList.toggle('hidden',!sub);
  }catch(err){
    console.warn('Push status failed',err);
  }
}

async function disableClosedAppPush(){
  if(!currentUser)return;
  try{
    const reg=await navigator.serviceWorker.getRegistration();
    const sub=reg?await reg.pushManager.getSubscription():null;
    if(sub){
      const endpoint=sub.endpoint;
      await sub.unsubscribe();
      const {error}=await supabase.from('push_subscriptions').delete().eq('profile_id',currentUser.id).eq('endpoint',endpoint);
      if(error)console.warn('Subscription row cleanup:',error.message);
    }
    await updatePushStatus();
    updateNotificationStatus();
    alert(appLanguage==='en'?'Closed-app push was disabled on this device.':'Push wurde auf diesem Gerät deaktiviert.');
  }catch(err){
    alert(`${appLanguage==='en'?'Push could not be disabled':'Push konnte nicht deaktiviert werden'}: ${err.message||err}`);
  }
}
async function ensurePushSubscription(showSuccess=true){
  if(PUSH_VAPID_PUBLIC_KEY.includes('PASTE_YOUR'))throw new Error(appLanguage==='en'?'VAPID public key missing.':'VAPID Public Key fehlt.');
  if(!currentUser)throw new Error(appLanguage==='en'?'Please sign in first.':'Bitte zuerst anmelden.');
  if(!('serviceWorker' in navigator)||!('PushManager' in window))throw new Error(appLanguage==='en'?'Push is not supported by this browser.':'Push wird von diesem Browser nicht unterstützt.');
  if(Notification.permission!=='granted')throw new Error(appLanguage==='en'?'Notification permission is not granted.':'Benachrichtigungen sind noch nicht erlaubt.');

  const reg=await getServiceWorkerRegistration();
  await navigator.serviceWorker.ready;
  let sub=await reg.pushManager.getSubscription();

  // If an old subscription belongs to another VAPID key, recreate it.
  if(sub){
    try{
      const opts=sub.options;
      const currentKey=opts?.applicationServerKey?Array.from(new Uint8Array(opts.applicationServerKey)):[];
      const wanted=Array.from(urlBase64ToUint8Array(PUSH_VAPID_PUBLIC_KEY));
      if(currentKey.length && (currentKey.length!==wanted.length || currentKey.some((v,i)=>v!==wanted[i]))){
        await sub.unsubscribe();
        sub=null;
      }
    }catch{}
  }

  if(!sub){
    sub=await reg.pushManager.subscribe({
      userVisibleOnly:true,
      applicationServerKey:urlBase64ToUint8Array(PUSH_VAPID_PUBLIC_KEY)
    });
  }

  const json=sub.toJSON();
  const row={
    profile_id:currentUser.id,
    endpoint:json.endpoint,
    p256dh:json.keys?.p256dh,
    auth:json.keys?.auth,
    user_agent:navigator.userAgent,
    updated_at:new Date().toISOString()
  };
  const {error}=await supabase.from('push_subscriptions').upsert(row,{onConflict:'profile_id,endpoint'});
  if(error)throw error;
  await updatePushStatus();
  if(showSuccess)alert(appLanguage==='en'?'Push is enabled on this device.':'Push ist auf diesem Gerät aktiviert.');
  return sub;
}

async function enableClosedAppPush(){
  try{
    const permission=Notification.permission==='granted'?'granted':await Notification.requestPermission();
    if(permission!=='granted'){updatePushStatus();return;}
    await ensurePushSubscription(true);
  }catch(err){
    alert(`${appLanguage==='en'?'Push setup failed':'Push-Einrichtung fehlgeschlagen'}: ${err.message||err}`);
  }
}

async function maybeOfferNotificationOnboarding(){
  if(!currentUser || !('Notification' in window))return;

  // Permission was already granted (for example via the old bell button):
  // silently finish the real Push subscription and save it to Supabase.
  if(Notification.permission==='granted'){
    try{ await ensurePushSubscription(false); }catch(err){ console.warn('Automatic push registration failed',err); }
    return;
  }

  // Browser permission dialogs should be triggered by a real user click.
  if(Notification.permission!=='default')return;
  const key=`fitTogether_notificationOnboarding_${currentUser.id}`;
  if(localStorage.getItem(key)==='shown')return;
  localStorage.setItem(key,'shown');
  const dlg=document.querySelector('#notificationOnboardingDialog');
  if(dlg?.showModal)dlg.showModal();
}
async function requestNotifications(){
  if(!('Notification' in window))return alert(appLanguage==='en'?'This browser does not support notifications.':'Dieser Browser unterstützt keine Benachrichtigungen.');
  const permission=await Notification.requestPermission();
  updateNotificationStatus();
  if(permission==='granted'){
    scheduleReminderChecks();
    try{ await ensurePushSubscription(false); }catch(err){ console.warn('Push subscription failed',err); }
    new Notification('FitTogether',{body:appLanguage==='en'?'Notifications enabled.':'Benachrichtigungen aktiviert.'});
  }
}
function updateNotificationStatus(){
  const el=$('#notificationStatus');if(!el)return;
  const p=('Notification' in window)?Notification.permission:'unsupported';
  el.textContent=appLanguage==='en'?(p==='granted'?'Notifications are enabled.':p==='denied'?'Notifications are blocked in the browser.':'Notifications are not enabled yet.'):(p==='granted'?'Benachrichtigungen sind aktiviert.':p==='denied'?'Benachrichtigungen sind im Browser blockiert.':'Benachrichtigungen sind noch nicht aktiviert.');
}
function reminderSettings(){
  return {
    minutes:Number(localStorage.getItem('fitTogether_defaultReminder')||60),
    ownOnly:localStorage.getItem('fitTogether_ownNotificationsOnly')!=='false'
  };
}
function saveReminderSettings(){
  localStorage.setItem('fitTogether_defaultReminder',$('#defaultReminderSelect')?.value||'60');
  localStorage.setItem('fitTogether_ownNotificationsOnly',String($('#ownNotificationsOnly')?.checked??true));
  scheduleReminderChecks();
}
function occurrenceDateTime(date,time){
  const t=(time||'09:00').slice(0,5);return new Date(`${date}T${t}:00`);
}
function upcomingOccurrencesForReminders(){
  const now=new Date(), horizon=new Date(now.getTime()+2*86400000), out=[];
  for(const ev of events){
    const dates=eventOccurrenceDates(ev,now.toISOString().slice(0,10),horizon.toISOString().slice(0,10));
    for(const date of dates){
      const dt=occurrenceDateTime(date,ev.start_time);
      if(dt>=now&&dt<=horizon)out.push({ev,date,dt});
    }
  }
  return out;
}
function checkReminders(){
  if(!('Notification' in window)||Notification.permission!=='granted')return;
  const cfg=reminderSettings(),now=Date.now();
  for(const {ev,date,dt} of upcomingOccurrencesForReminders()){
    if(cfg.ownOnly && !(ev.participants||[]).some(p=>p.profile_id===currentUser?.id))continue;
    const mins=(dt.getTime()-now)/60000;
    const eventMinutes=Number(ev.reminder_minutes||ev.reminder||cfg.minutes);
    if(mins<=eventMinutes&&mins>-2){
      const key=`${ev.id}|${date}|${eventMinutes}`;
      if(sentReminderKeys.has(key))continue;
      const when=timeLabel((ev.start_time||'09:00').slice(0,5));
      new Notification(ev.title||'FitTogether',{body:appLanguage==='en'?`Workout today at ${when}.`:`Training heute um ${when}.`});
      sentReminderKeys.add(key);localStorage.setItem('fitTogether_sentReminders',JSON.stringify([...sentReminderKeys].slice(-300)));
    }
  }
}
function scheduleReminderChecks(){
  if(reminderTimer)clearInterval(reminderTimer);
  checkReminders();reminderTimer=setInterval(checkReminders,60000);
}
function testNotification(){
  if(!('Notification' in window)||Notification.permission!=='granted')return requestNotifications();
  new Notification('FitTogether',{body:appLanguage==='en'?'Test notification — it works!':'Test-Benachrichtigung – funktioniert!'});
}

function checkDueReminders(){/* Push/Background-Erinnerungen folgen später. */}
window.addEventListener('resize',()=>drawWeightChart(weights));

init();
setTimeout(()=>maybeOfferNotificationOnboarding(),1200);



// V0.13.4 – unified visible UI translation layer.
const EN_TEXT = new Map(Object.entries({
'FitTogether Online':'FitTogether Online','Willkommen bei FitTogether':'Welcome to FitTogether','Melde dich an oder erstelle einmalig deinen Account.':'Sign in or create your account.','Anmelden':'Sign in','Registrieren':'Sign up','Anzeigename':'Display name','Passwort':'Password','Account erstellen':'Create account','Gemeinsam durchziehen':'Stick with it together','Aktive Gruppe':'Active group','● Online':'● Online','🔔 Erinnerungen':'🔔 Reminders','Abmelden':'Sign out',
'Übersicht':'Overview','Kalender':'Calendar','Fortschritt':'Progress','Bilder':'Photos','Profile':'Profiles','⚙️ Einstellungen':'⚙️ Settings','Noch keine Gruppe':'No group yet','Erstelle eine Gruppe oder tritt mit einem Einladungscode bei. Danach wird der Kalender automatisch mit allen Gruppenmitgliedern synchronisiert.':'Create a group or join one with an invite code. The calendar will then sync automatically with all group members.','Gruppe einrichten':'Set up group',
'Strafgeld-Tauziehen':'Penalty tug of war','Wer hält besser durch?':'Who keeps going better?','Gleichstand':'Tie','Ich':'Me','Partner':'Partner','Noch keine Strafgelder. Perfekter Start.':'No penalties yet. Perfect start.','🔥 Aktuelle Streak':'🔥 Current streak','erledigte Termine':'completed events','🏆 Beste Streak':'🏆 Best streak','am Stück':'in a row','✅ Geschafft':'✅ Completed','Trainings':'Workouts','💸 Gemeinsamer Topf':'💸 Shared pot','Jahressumme':'Year total','Als Nächstes':'Up next','Nächste Termine':'Upcoming events','+ Termin':'+ Event',
'MO.':'MON','DI.':'TUE','MI.':'WED','DO.':'THU','FR.':'FRI','SA.':'SAT','SO.':'SUN','+ Termin hinzufügen':'+ Add event','Neuer Eintrag':'New entry','Termin eintragen':'Add event','Titel':'Title','Datum':'Date','Von':'From','Bis':'To','Teilnehmer':'Participants','Alle Gruppenmitglieder':'All group members','Nur ich':'Only me','Farbe':'Color','Lila':'Purple','Blau':'Blue','Grün':'Green','Orange':'Orange','Pink':'Pink','Strafe bei Verpassen (€)':'Penalty if missed (€)','Wiederholung':'Repeat','Keine':'None','Wöchentlich':'Weekly','Monatlich':'Monthly','Jährlich':'Yearly','Wiederholen bis (optional)':'Repeat until (optional)','Erinnerung':'Reminder','1 Stunde vorher':'1 hour before','15 Minuten vorher':'15 minutes before','Notiz':'Note','Termin speichern':'Save event','Wiederholungen werden automatisch im Kalender angezeigt. Jede einzelne Wiederholung hat ihren eigenen Status und zählt separat für Streaks und Strafgeld.':'Repeating events are shown automatically in the calendar. Each occurrence has its own status and counts separately for streaks and penalties.','Liste':'List','Alle Termine':'All events',
'Gewicht':'Weight','Verlauf eintragen':'Add weight entry','Gewicht (kg)':'Weight','Speichern':'Save','Start':'Start','Aktuell':'Current','Veränderung':'Change','Die Linie zeigt deine Einträge; zusätzlich wird ein 7-Tage-Trend geglättet dargestellt.':'The line shows your entries; a smoothed 7-day trend is shown as well.',
'📸 Monatsfoto':'📸 Monthly photo','Zeit für ein Fortschrittsbild':'Time for a progress photo','Dein letztes Fortschrittsbild ist mindestens 14 Tage her.':'Your last progress photo is at least 30 days old.','Jetzt aufnehmen':'Take one now','In 7 Tagen erinnern':'Remind me in 7 days','Vorher / Nachher':'Before / after','Fortschrittsbilder':'Progress photos','Sichtbarkeit':'Visibility','🔒 Privat':'🔒 Private','👥 Mit Gruppe teilen':'👥 Share with group','Bild':'Photo','Bild hinzufügen':'Add photo','Bilder werden sicher in Supabase Storage gespeichert. Private Bilder siehst nur du; geteilte Bilder können Mitglieder deiner Gruppe sehen.':'Photos are stored securely in Supabase Storage. Only you can see private photos; shared photos are visible to members of your group.','Veränderung ansehen':'View progress','Fortschritts-Slideshow':'Progress slideshow','Noch nicht genug Bilder für eine Slideshow.':'Not enough photos for a slideshow yet.','‹ Zurück':'‹ Back','▶ Abspielen':'▶ Play','Weiter ›':'Next ›','Galerie':'Gallery','🏋️ Trainingsnachweise':'🏋️ Workout proof','Gym-Bilder':'Gym photos','Diese Bilder gehören zu bestätigten Trainings und sind für Mitglieder der jeweiligen Gruppe sichtbar. Sie bleiben getrennt von deinen Fortschrittsbildern.':'These photos belong to confirmed workouts and are visible to members of the respective group. They stay separate from your progress photos.',
'Gemeinsam trainieren':'Train together','Gruppen':'Groups','Mitglieder':'Members','Aktive Gruppe':'Active group','Einladungslink kopieren':'Copy invite link','Neue Gruppe':'New group','Gruppenname':'Group name','Gruppe erstellen':'Create group','Gruppe beitreten':'Join group','Einladungscode':'Invite code','Beitreten':'Join','Dein Profil':'Your profile','Dieses Profil kannst nur du bearbeiten.':'Only you can edit this profile.','Profil speichern':'Save profile','Schulden':'Debt','Partnerprofil':'Partner profile','Hier siehst du später alles, was sie für dich freigibt.':'You will see everything they share with you here.','🔒 Private Gewichte und Bilder bleiben verborgen. Geteilte Fortschritte erscheinen später hier.':'🔒 Private weights and photos stay hidden. Shared progress will appear here later.',
'Anzeige':'Display','Sprache & Format':'Language & format','Sprache':'Language','Datumsformat':'Date format','Zeitformat':'Time format','Gewichtseinheit':'Weight unit','Sprache, Datum, Uhrzeit und Gewichtseinheit können unabhängig voneinander eingestellt werden. Gewichte werden intern weiterhin in kg gespeichert.':'Language, date, time and weight unit can be configured independently. Weights are still stored internally in kilograms.','App':'App','Benachrichtigungen':'Notifications','Trainingserinnerungen kannst du über die Glocke oben aktivieren. Weitere Push-Einstellungen bauen wir im nächsten Benachrichtigungs-Schritt aus.':'You can enable workout reminders using the bell at the top.','🔔 Benachrichtigungen aktivieren':'🔔 Enable notifications','Standard-Erinnerung':'Default reminder','2 Stunden vorher':'2 hours before','1 Tag vorher':'1 day before','Nur eigene Termine':'Only my events','Test senden':'Send test','Benachrichtigungen sind noch nicht aktiviert.':'Notifications are not enabled yet.','Hinweis: Browser-Benachrichtigungen funktionieren zuverlässig, solange die App geöffnet ist. Echte Push-Nachrichten bei komplett geschlossener App benötigen später einen Server/Push-Dienst.':'Note: Browser notifications work reliably while the app is open. True push notifications when the app is completely closed will later require a server/push service.',
'Trainingsnachweis':'Workout proof','Noch kein Nachweis hochgeladen.':'No proof uploaded yet.','Foto':'Photo','Nachweis hochladen':'Upload proof','✅ Erledigt':'✅ Done','❌ Verpasst':'❌ Missed','🩹 Entschuldigt':'🩹 Excused','Abbrechen':'Cancel','Status':'Status','Geplant':'Planned','Erledigt':'Done','Verpasst':'Missed','Entschuldigt':'Excused','🗑 Löschen':'🗑 Delete','Gruppe':'Group','Privat':'Private','Training':'Workout','Mitglied':'Member','Noch niemand':'No one yet','Optional':'Optional','📲 Push bei geschlossener App einrichten':'📲 Set up closed-app push','🔔 Push aktivieren':'🔔 Enable push','🔕 Push deaktivieren':'🔕 Disable push','Nicht eingerichtet':'Not set up','Aktiv':'Active','Die Einstellungen werden automatisch gespeichert. Geschlossene-App-Pushs werden aktuell serverseitig 1 Stunde vor dem Training gesendet.':'Settings are saved automatically. Closed-app push is currently sent server-side 1 hour before the workout.','Nachweis vorab hochladen':'Upload proof early','Push bei geschlossener App ist noch nicht eingerichtet.':'Closed-app push is not set up yet.','Jahresabschluss':'Annual settlement','Gemeinsamer Geldtopf':'Shared money pot','Gemeinsamer Topf':'Shared pot','Nur diesen Termin':'Only this occurrence','Gesamte Serie':'Entire series','Wiederholten Termin löschen':'Delete repeating event','Wiederholten Termin bearbeiten':'Edit repeating event','Möchtest du nur diesen Termin oder die gesamte Serie ändern?':'Do you want to change only this occurrence or the entire series?'
}));
const DE_TEXT = new Map([...EN_TEXT].map(([de,en])=>[en,de]));
function translateExact(text){
 const trimmed=String(text??'').trim(); if(!trimmed)return text;
 const dict=appLanguage==='en'?EN_TEXT:DE_TEXT;
 return dict.has(trimmed)?String(text).replace(trimmed,dict.get(trimmed)):text;
}
function translateDynamic(text){
 let x=String(text??''); if(appLanguage!=='en')return translateExact(x);
 const exact=translateExact(x); if(exact!==x)return exact;
 x=x.replace(/(\d+) Mitglieder\b/g,'$1 members').replace(/(\d+) Mitglied\b/g,'$1 member');
 x=x.replace(/\bNoch solo\b/g,'Solo for now').replace(/\bKeine Gruppe\b/g,'No group');
 x=x.replace(/Noch keine aktive Gruppe\./g,'No active group yet.').replace(/Mitglieder werden geladen …/g,'Loading members …');
 x=x.replace(/Gruppe wird erstellt …/g,'Creating group …').replace(/Gruppe erstellt\./g,'Group created.').replace(/Beitritt läuft …/g,'Joining …').replace(/Gruppe beigetreten\./g,'Joined group.').replace(/Einladungslink kopiert\./g,'Invite link copied.');
 x=x.replace(/Wähle zuerst eine Gruppe\./g,'Select a group first.').replace(/Noch keine Gruppe\./g,'No group yet.').replace(/Noch keine Termine\. Trag euren ersten Termin ein\./g,'No events yet. Add your first event.').replace(/Keine kommenden Termine\./g,'No upcoming events.');
 x=x.replace(/● synchronisiert/g,'● synced').replace(/(\d+(?:[.,]\d+)?) € Strafe/g,'€$1 penalty').replace(/ und die ganze Serie/g,' and the entire series');
 x=x.replace(/Status für (.+) ändern/g,'Change status for $1').replace(/\+(\d+) mehr/g,'+$1 more');
 x=x.replace(/Noch keine Gewichtseinträge\./g,'No weight entries yet.').replace(/Noch keine Fortschrittsbilder\. Lade dein erstes Monatsbild hoch\./g,'No progress photos yet. Upload your first monthly photo.').replace(/Noch keine eigenen Fortschrittsbilder\./g,'No personal progress photos yet.').replace(/Noch keine Trainingsnachweise vorhanden\./g,'No workout proof yet.').replace(/Bild konnte nicht geladen werden\./g,'Image could not be loaded.');
 x=x.replace(/Fortschrittsbild von /g,'Progress photo by ').replace(/Trainingsnachweis von /g,'Workout proof by ').replace(/Fortschrittsbild (\d+)/g,'Progress photo $1');
 x=x.replace(/Dein letztes Fortschrittsbild ist (\d+) Tage her\. Zeit für ein neues Monatsfoto\./g,'Your last progress photo was $1 days ago. Time for your next 14-day photo.').replace(/Du hast noch kein Fortschrittsbild\. Starte heute deine Vorher-\/Nachher-Reihe\./g,'You do not have a progress photo yet. Start your before/after series today.');
 x=x.replace(/Für das Tauziehen braucht die Gruppe zwei Mitglieder\. Schick deinen Einladungslink weiter\./g,'The tug of war needs two group members. Share your invite link.').replace(/Gleichstand – noch ist alles offen\./g,'Tie — everything is still open.').replace(/ hat aktuell die wenigsten Strafschulden\./g,' currently has the lowest penalty debt.').replace(/ führt/g,' leads').replace(/Gleichstand bei /g,'Tie at ').replace(/ liegt um (.+) vorne und würde aktuell über den Topf entscheiden\./g,' is ahead by $1 and would currently decide how to use the pot.');
 x=x.replace(/wöchentlich/g,'weekly').replace(/monatlich/g,'monthly').replace(/jährlich/g,'yearly');
 return x;
}
function translateVisibleUI(root=document.body){
 if(!root)return;
 const nodes=[];const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);while(walker.nextNode())nodes.push(walker.currentNode);
 nodes.forEach(n=>{if(!n.parentElement?.closest('script,style'))n.nodeValue=translateDynamic(n.nodeValue);});
 const placeholders={
  'name@beispiel.de':'name@example.com','Passwort':'Password','Dein Name':'Your name','Mindestens 6 Zeichen':'At least 6 characters','z. B. Gym, Schwimmen, Spaziergang':'e.g. Gym, swimming, walk','z. B. 92.4':'e.g. 92.4','z. B. Janek & Estelle':'e.g. Alex & Sam','z. B. A1B2C3D4':'e.g. A1B2C3D4','Optional':'Optional','📲 Push bei geschlossener App einrichten':'📲 Set up closed-app push','Push bei geschlossener App ist noch nicht eingerichtet.':'Closed-app push is not set up yet.','Jahresabschluss':'Annual settlement','Gemeinsamer Geldtopf':'Shared money pot','Gemeinsamer Topf':'Shared pot','Nur diesen Termin':'Only this occurrence','Gesamte Serie':'Entire series','Wiederholten Termin löschen':'Delete repeating event','Wiederholten Termin bearbeiten':'Edit repeating event','Möchtest du nur diesen Termin oder die gesamte Serie ändern?':'Do you want to change only this occurrence or the entire series?'
 };
 root.querySelectorAll?.('[placeholder]').forEach(el=>{const v=el.getAttribute('placeholder');if(appLanguage==='en'&&placeholders[v])el.setAttribute('placeholder',placeholders[v]);});
 root.querySelectorAll?.('[aria-label],[title]').forEach(el=>{for(const a of ['aria-label','title']){if(el.hasAttribute(a))el.setAttribute(a,translateDynamic(el.getAttribute(a)));}});
 // Weight label follows selected unit.
 const w=document.querySelector('label:has(#weightValue)');if(w){const input=w.querySelector('#weightValue');if(input){for(const n of [...w.childNodes])if(n.nodeType===3&&n.nodeValue.trim())n.nodeValue=(appLanguage==='en'?'Weight':'Gewicht')+` (${weightUnit})`;}}
}
const _applyLocaleBase=applyLocale;
applyLocale=function(){_applyLocaleBase();translateVisibleUI();setTimeout(()=>translateVisibleUI(),0);};
const uiTranslationObserver=new MutationObserver(muts=>{if(appLanguage!=='en')return;for(const m of muts)for(const n of m.addedNodes){if(n.nodeType===1)translateVisibleUI(n);else if(n.nodeType===3)n.nodeValue=translateDynamic(n.nodeValue);}});
document.addEventListener('DOMContentLoaded',()=>{uiTranslationObserver.observe(document.body,{childList:true,subtree:true});translateVisibleUI();});
