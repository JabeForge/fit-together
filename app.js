const APP_VERSION = "0.13.4";
const I18N={
 de:{display:'Anzeige',languageRegion:'Sprache & Format',language:'Sprache',format:'Format',dateFormat:'Date format',timeFormat:'Time format',weightUnit:'Weight unit',formatHint:'Sprache und Format sind unabhängig voneinander. Gewichte werden intern weiterhin in kg gespeichert.',calendar:'Kalender',stats:'Statistik',photos:'Bilder',profiles:'Profile',settings:'Einstellungen',today:'Heute',done:'Erledigt',missed:'Verpasst',excused:'Entschuldigt',planned:'Geplant',weight:'Gewicht',weightProgress:'Gewichtsverlauf',progressPhotos:'Fortschrittsbilder',trainingProofs:'Trainingsnachweise'},
 en:{display:'Display',languageRegion:'Language & format',language:'Language',format:'Format',dateFormat:'Datumsformat',timeFormat:'Zeitformat',weightUnit:'Gewichtseinheit',formatHint:'Language, date, time and weight unit can be configured independently. Weights are still stored internally in kilograms.',calendar:'Calendar',stats:'Statistics',photos:'Photos',profiles:'Profiles',settings:'Settings',today:'Today',done:'Done',missed:'Missed',excused:'Excused',planned:'Planned',weight:'Weight',weightProgress:'Weight progress',progressPhotos:'Progress photos',trainingProofs:'Training proof'}
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
 const map={calendar:'calendar',progress:'stats',photos:'photos',profiles:'profiles',settings:'settings'};
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
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.4/+esm";

const SUPABASE_URL = "https://iixnjrxvdpqvkjoizify.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_AlrqVCyUGwfClbmSJEnKZg_ytg6XyOe";
const APP_URL = "https://jabeforge.github.io/fit-together/";
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
  $('#weightDate').value=todayISO();
  $('#photoDate').value=todayISO();
  bindTabs(); bindActions(); bindAuth(); toggleRepeatUntil();
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
  $('#notifyBtn').addEventListener('click',requestNotifications);
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
  $('#openGroupsBtn').addEventListener('click',()=>showTab('profiles'));
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
async function uploadTrainingProof(){
  if(!selectedEventId||!selectedOccurrenceDate)return alert('Kein Termin ausgewählt.');
  const file=$('#proofInput').files?.[0];if(!file)return alert('Bitte zuerst ein Foto auswählen.');
  if(file.size>12*1024*1024)return alert('Das Bild ist größer als 12 MB.');
  const path=`${currentUser.id}/${selectedEventId}/${selectedOccurrenceDate}/${crypto.randomUUID()}.${safeExt(file)}`;
  const btn=$('#uploadProofBtn');btn.disabled=true;btn.textContent='Wird hochgeladen …';
  try{
    const {error:uploadError}=await supabase.storage.from('training-proofs').upload(path,file,{contentType:file.type||'image/jpeg',upsert:false});
    if(uploadError)throw uploadError;
    const {error:dbError}=await supabase.from('training_proofs').insert({event_id:selectedEventId,occurrence_date:selectedOccurrenceDate,profile_id:currentUser.id,storage_path:path});
    if(dbError){await supabase.storage.from('training-proofs').remove([path]);throw dbError;}
    $('#proofInput').value='';await loadTrainingProofs();await renderProofInDialog();
  }catch(err){alert(`Nachweis konnte nicht gespeichert werden: ${err.message||err}`);}
  finally{btn.disabled=false;btn.textContent='Nachweis hochladen';}
}
async function renderProofInDialog(){
  const proof=trainingProofs.find(p=>p.event_id===selectedEventId&&p.occurrence_date===selectedOccurrenceDate&&p.profile_id===currentUser.id);
  const img=$('#proofPreview');
  if(proof?.signed_url){$('#proofStatus').textContent='Dein Nachweis ist gespeichert.';img.src=proof.signed_url;img.classList.remove('hidden');}
  else{$('#proofStatus').textContent='Noch kein eigener Nachweis hochgeladen.';img.removeAttribute('src');img.classList.add('hidden');}
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
  if(activeGroup){$('#currentGroupName').textContent=activeGroup.name;$('#inviteCodeLabel').textContent=activeGroup.invite_code||'–';}
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
  if(!activeGroup)return alert('Erstelle oder wähle zuerst eine Gruppe.');
  const title=$('#eventTitle').value.trim(),date=$('#eventDate').value;
  if(!title||!date)return alert('Bitte Titel und Datum eintragen.');
  const selected=$('#eventOwner').value;
  let participantIds=selected==='all'?groupMembers.map(m=>m.id):[selected.replace('profile:','')];
  participantIds=[...new Set(participantIds.filter(Boolean))];
  if(!participantIds.length)return alert('Keine Teilnehmer gefunden.');
  const payload={
    group_id:activeGroup.id,title,event_date:date,start_time:$('#eventStart').value||null,end_time:$('#eventEnd').value||null,
    color:colorHex($('#eventColor').value),penalty:Number($('#eventPenalty').value||0),notes:$('#eventNote').value.trim()||null,created_by:currentUser.id,
    recurrence:$('#eventRepeat').value||'none',recurrence_until:$('#eventRepeat').value!=='none'?($('#eventRepeatUntil').value||null):null
  };
  const {data,error}=await supabase.from('events').insert(payload).select('id').single();
  if(error)return alert(`Termin konnte nicht gespeichert werden: ${error.message}`);
  const rows=participantIds.map(profile_id=>({event_id:data.id,profile_id,status:'planned'}));
  const {error:partError}=await supabase.from('event_participants').insert(rows);
  if(partError){await supabase.from('events').delete().eq('id',data.id);return alert(`Teilnehmer konnten nicht gespeichert werden: ${partError.message}`);}
  $('#eventTitle').value='';$('#eventNote').value='';$('#eventRepeat').value='none';$('#eventRepeatUntil').value='';toggleRepeatUntil();
  await loadEvents();renderAll();
}
async function finishStatus(status){
  if(!selectedEventId||!selectedOccurrenceDate)return;
  if(status==='done'){
    const proof=trainingProofs.find(p=>p.event_id===selectedEventId&&p.occurrence_date===selectedOccurrenceDate&&p.profile_id===currentUser.id);
    if(!proof){
      alert('Für „Erledigt“ ist ein Trainingsnachweis erforderlich. Bitte zuerst ein Foto hochladen.');
      return;
    }
  }
  await setEventStatus(selectedEventId,status,selectedOccurrenceDate);
  $('#statusDialog').close('saved');
  selectedEventId=null;selectedOccurrenceDate=null;
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

function renderAll(){renderGroupUI();renderTug();renderEvents();renderMonthCalendar();renderStats();renderWeights();renderPhotos();renderTrainingProofs();renderPhotoReminder();renderProfiles();}
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
function eventNode(ev,withDelete,occurrenceDateOverride=null){
  const wrap=document.createElement('div');wrap.className='event-item';
  const occurrenceDate=occurrenceDateOverride||ev.date;
  const statuses=ev.participants.map(p=>{const st=occurrenceStatus(ev,p.profile_id,occurrenceDate);return `<span class="status ${st}">${escapeHtml(p.name)}: ${statusLabel(st)}</span>`;}).join('');
  wrap.innerHTML=`<div class="event-main"><strong>${escapeHtml(ev.title)} <span class="event-sync-badge">● synchronisiert</span></strong><div class="event-meta">${formatDate(occurrenceDate)}${recurrenceText(ev)} · ${ev.start||'–'}${ev.end?`–${ev.end}`:''} · ${euro(ev.penalty)} Strafe</div><div class="status-row">${statuses}</div></div><div class="event-actions"><button class="small-btn status-btn" type="button">Status</button>${withDelete&&ev.created_by===currentUser.id?'<button class="small-btn delete-btn" type="button">🗑</button>':''}</div>`;
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
  const date=$('#weightDate').value,weight=inputWeightToKg($('#weightValue').value);if(!date||!weight)return alert('Bitte Datum und Gewicht eintragen.');
  const {error}=await supabase.from('weight_entries').upsert({profile_id:currentUser.id,weight,measured_on:date},{onConflict:'profile_id,measured_on'});if(error)return alert(`Gewicht konnte nicht gespeichert werden: ${error.message}`);
  $('#weightValue').value='';await loadWeights();renderWeights();
}
function movingAverage(arr,days=7){return arr.map((x,i)=>{const slice=arr.slice(Math.max(0,i-days+1),i+1);return slice.reduce((s,v)=>s+v.weight,0)/slice.length;});}
function renderWeights(){
  $('#weightStart').textContent=weights.length?`${weights[0].weight.toFixed(1)} kg`:'–';$('#weightCurrent').textContent=weights.length?`${weights.at(-1).weight.toFixed(1)} kg`:'–';$('#weightDelta').textContent=weights.length>1?`${(weights.at(-1).weight-weights[0].weight).toFixed(1)} kg`:'–';drawWeightChart(weights);
}
function drawWeightChart(data){
  const c=$('#weightChart'),ctx=c.getContext('2d'),dpr=window.devicePixelRatio||1,cssW=c.clientWidth||900,cssH=Math.max(260,cssW*.4);c.width=cssW*dpr;c.height=cssH*dpr;ctx.scale(dpr,dpr);ctx.clearRect(0,0,cssW,cssH);ctx.fillStyle='#0f1728';ctx.fillRect(0,0,cssW,cssH);
  if(!data.length){ctx.fillStyle='#9da9bd';ctx.font='14px system-ui';ctx.textAlign='center';ctx.fillText('Noch keine Gewichtseinträge.',cssW/2,cssH/2);return;}
  const vals=data.map(x=>x.weight),avg=movingAverage(data),min=Math.min(...vals,...avg)-1,max=Math.max(...vals,...avg)+1,pad=42,x=i=>pad+(data.length===1?0:(i/(data.length-1))*(cssW-pad*2)),y=v=>cssH-pad-((v-min)/(max-min))*(cssH-pad*2);
  ctx.strokeStyle='#26334e';for(let i=0;i<5;i++){const yy=pad+i*(cssH-pad*2)/4;ctx.beginPath();ctx.moveTo(pad,yy);ctx.lineTo(cssW-pad,yy);ctx.stroke();}
  ctx.strokeStyle='#60a5fa';ctx.lineWidth=2.5;ctx.beginPath();data.forEach((p,i)=>i?ctx.lineTo(x(i),y(p.weight)):ctx.moveTo(x(i),y(p.weight)));ctx.stroke();ctx.strokeStyle='#f59e0b';ctx.lineWidth=2;ctx.setLineDash([7,6]);ctx.beginPath();avg.forEach((v,i)=>i?ctx.lineTo(x(i),y(v)):ctx.moveTo(x(i),y(v)));ctx.stroke();ctx.setLineDash([]);
  ctx.fillStyle='#9da9bd';ctx.font='12px system-ui';ctx.textAlign='left';ctx.fillText(`${max.toFixed(1)} kg`,4,pad+4);ctx.fillText(`${min.toFixed(1)} kg`,4,cssH-pad+4);ctx.textAlign='center';ctx.fillText(formatDate(data[0].date),x(0),cssH-12);if(data.length>1)ctx.fillText(formatDate(data.at(-1).date),x(data.length-1),cssH-12);
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
  const due=!last||age>=30;card.classList.toggle('hidden',!due);
  if(due)$('#photoReminderText').textContent=last?`Dein letztes Fortschrittsbild ist ${age} Tage her. Zeit für ein neues Monatsfoto.`:'Du hast noch kein Fortschrittsbild. Starte heute deine Vorher-/Nachher-Reihe.';
}
function snoozePhotoReminder(){try{localStorage.setItem(`fitTogether_photoSnooze_${currentUser.id}`,String(Date.now()+7*86400000));}catch{}$('#photoReminderCard').classList.add('hidden');}
async function requestNotifications(){if(!('Notification'in window))return alert('Dieser Browser unterstützt keine Benachrichtigungen.');const r=await Notification.requestPermission();if(r==='granted')new Notification('FitTogether',{body:'Erinnerungen sind aktiviert.'});}
function checkDueReminders(){/* Push/Background-Erinnerungen folgen später. */}
window.addEventListener('resize',()=>drawWeightChart(weights));

init();



// V0.13.4 – unified visible UI translation layer.
const EN_TEXT = new Map(Object.entries({
'FitTogether Online':'FitTogether Online','Willkommen bei FitTogether':'Welcome to FitTogether','Melde dich an oder erstelle einmalig deinen Account.':'Sign in or create your account.','Anmelden':'Sign in','Registrieren':'Sign up','Anzeigename':'Display name','Passwort':'Password','Account erstellen':'Create account','Gemeinsam durchziehen':'Stick with it together','Aktive Gruppe':'Active group','● Online':'● Online','🔔 Erinnerungen':'🔔 Reminders','Abmelden':'Sign out',
'Übersicht':'Overview','Kalender':'Calendar','Fortschritt':'Progress','Bilder':'Photos','Profile':'Profiles','⚙️ Einstellungen':'⚙️ Settings','Noch keine Gruppe':'No group yet','Erstelle eine Gruppe oder tritt mit einem Einladungscode bei. Danach wird der Kalender automatisch mit allen Gruppenmitgliedern synchronisiert.':'Create a group or join one with an invite code. The calendar will then sync automatically with all group members.','Gruppe einrichten':'Set up group',
'Strafgeld-Tauziehen':'Penalty tug of war','Wer hält besser durch?':'Who keeps going better?','Gleichstand':'Tie','Ich':'Me','Partner':'Partner','Noch keine Strafgelder. Perfekter Start.':'No penalties yet. Perfect start.','🔥 Aktuelle Streak':'🔥 Current streak','erledigte Termine':'completed events','🏆 Beste Streak':'🏆 Best streak','am Stück':'in a row','✅ Geschafft':'✅ Completed','Trainings':'Workouts','💸 Gemeinsamer Topf':'💸 Shared pot','Jahressumme':'Year total','Als Nächstes':'Up next','Nächste Termine':'Upcoming events','+ Termin':'+ Event',
'MO.':'MON','DI.':'TUE','MI.':'WED','DO.':'THU','FR.':'FRI','SA.':'SAT','SO.':'SUN','+ Termin hinzufügen':'+ Add event','Neuer Eintrag':'New entry','Termin eintragen':'Add event','Titel':'Title','Datum':'Date','Von':'From','Bis':'To','Teilnehmer':'Participants','Alle Gruppenmitglieder':'All group members','Nur ich':'Only me','Farbe':'Color','Lila':'Purple','Blau':'Blue','Grün':'Green','Orange':'Orange','Pink':'Pink','Strafe bei Verpassen (€)':'Penalty if missed (€)','Wiederholung':'Repeat','Keine':'None','Wöchentlich':'Weekly','Monatlich':'Monthly','Jährlich':'Yearly','Wiederholen bis (optional)':'Repeat until (optional)','Erinnerung':'Reminder','1 Stunde vorher':'1 hour before','15 Minuten vorher':'15 minutes before','Notiz':'Note','Termin speichern':'Save event','Wiederholungen werden automatisch im Kalender angezeigt. Jede einzelne Wiederholung hat ihren eigenen Status und zählt separat für Streaks und Strafgeld.':'Repeating events are shown automatically in the calendar. Each occurrence has its own status and counts separately for streaks and penalties.','Liste':'List','Alle Termine':'All events',
'Gewicht':'Weight','Verlauf eintragen':'Add weight entry','Gewicht (kg)':'Weight','Speichern':'Save','Start':'Start','Aktuell':'Current','Veränderung':'Change','Die Linie zeigt deine Einträge; zusätzlich wird ein 7-Tage-Trend geglättet dargestellt.':'The line shows your entries; a smoothed 7-day trend is shown as well.',
'📸 Monatsfoto':'📸 Monthly photo','Zeit für ein Fortschrittsbild':'Time for a progress photo','Dein letztes Fortschrittsbild ist mindestens 30 Tage her.':'Your last progress photo is at least 30 days old.','Jetzt aufnehmen':'Take one now','In 7 Tagen erinnern':'Remind me in 7 days','Vorher / Nachher':'Before / after','Fortschrittsbilder':'Progress photos','Sichtbarkeit':'Visibility','🔒 Privat':'🔒 Private','👥 Mit Gruppe teilen':'👥 Share with group','Bild':'Photo','Bild hinzufügen':'Add photo','Bilder werden sicher in Supabase Storage gespeichert. Private Bilder siehst nur du; geteilte Bilder können Mitglieder deiner Gruppe sehen.':'Photos are stored securely in Supabase Storage. Only you can see private photos; shared photos are visible to members of your group.','Veränderung ansehen':'View progress','Fortschritts-Slideshow':'Progress slideshow','Noch nicht genug Bilder für eine Slideshow.':'Not enough photos for a slideshow yet.','‹ Zurück':'‹ Back','▶ Abspielen':'▶ Play','Weiter ›':'Next ›','Galerie':'Gallery','🏋️ Trainingsnachweise':'🏋️ Workout proof','Gym-Bilder':'Gym photos','Diese Bilder gehören zu bestätigten Trainings und sind für Mitglieder der jeweiligen Gruppe sichtbar. Sie bleiben getrennt von deinen Fortschrittsbildern.':'These photos belong to confirmed workouts and are visible to members of the respective group. They stay separate from your progress photos.',
'Gemeinsam trainieren':'Train together','Gruppen':'Groups','Mitglieder':'Members','Aktive Gruppe':'Active group','Einladungslink kopieren':'Copy invite link','Neue Gruppe':'New group','Gruppenname':'Group name','Gruppe erstellen':'Create group','Gruppe beitreten':'Join group','Einladungscode':'Invite code','Beitreten':'Join','Dein Profil':'Your profile','Dieses Profil kannst nur du bearbeiten.':'Only you can edit this profile.','Profil speichern':'Save profile','Schulden':'Debt','Partnerprofil':'Partner profile','Hier siehst du später alles, was sie für dich freigibt.':'You will see everything they share with you here.','🔒 Private Gewichte und Bilder bleiben verborgen. Geteilte Fortschritte erscheinen später hier.':'🔒 Private weights and photos stay hidden. Shared progress will appear here later.',
'Anzeige':'Display','Sprache & Format':'Language & format','Sprache':'Language','Datumsformat':'Date format','Zeitformat':'Time format','Gewichtseinheit':'Weight unit','Sprache, Datum, Uhrzeit und Gewichtseinheit können unabhängig voneinander eingestellt werden. Gewichte werden intern weiterhin in kg gespeichert.':'Language, date, time and weight unit can be configured independently. Weights are still stored internally in kilograms.','App':'App','Benachrichtigungen':'Notifications','Trainingserinnerungen kannst du über die Glocke oben aktivieren. Weitere Push-Einstellungen bauen wir im nächsten Benachrichtigungs-Schritt aus.':'You can enable workout reminders using the bell at the top. More push notification settings will be added in the next notification update.','🔔 Benachrichtigungen aktivieren':'🔔 Enable notifications',
'Trainingsnachweis':'Workout proof','Noch kein Nachweis hochgeladen.':'No proof uploaded yet.','Foto':'Photo','Nachweis hochladen':'Upload proof','✅ Erledigt':'✅ Done','❌ Verpasst':'❌ Missed','🩹 Entschuldigt':'🩹 Excused','Abbrechen':'Cancel','Status':'Status','Geplant':'Planned','Erledigt':'Done','Verpasst':'Missed','Entschuldigt':'Excused','🗑 Löschen':'🗑 Delete','Gruppe':'Group','Privat':'Private','Training':'Workout','Mitglied':'Member','Noch niemand':'No one yet','Optional':'Optional'
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
 x=x.replace(/Dein letztes Fortschrittsbild ist (\d+) Tage her\. Zeit für ein neues Monatsfoto\./g,'Your last progress photo was $1 days ago. Time for a new monthly photo.').replace(/Du hast noch kein Fortschrittsbild\. Starte heute deine Vorher-\/Nachher-Reihe\./g,'You do not have a progress photo yet. Start your before/after series today.');
 x=x.replace(/Für das Tauziehen braucht die Gruppe zwei Mitglieder\. Schick deinen Einladungslink weiter\./g,'The tug of war needs two group members. Share your invite link.').replace(/Gleichstand – noch ist alles offen\./g,'Tie — everything is still open.').replace(/ hat aktuell die wenigsten Strafschulden\./g,' currently has the lowest penalty debt.').replace(/ führt/g,' leads').replace(/Gleichstand bei /g,'Tie at ').replace(/ liegt um (.+) vorne und würde aktuell über den Topf entscheiden\./g,' is ahead by $1 and would currently decide how to use the pot.');
 x=x.replace(/wöchentlich/g,'weekly').replace(/monatlich/g,'monthly').replace(/jährlich/g,'yearly');
 return x;
}
function translateVisibleUI(root=document.body){
 if(!root)return;
 const nodes=[];const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);while(walker.nextNode())nodes.push(walker.currentNode);
 nodes.forEach(n=>{if(!n.parentElement?.closest('script,style'))n.nodeValue=translateDynamic(n.nodeValue);});
 const placeholders={
  'name@beispiel.de':'name@example.com','Passwort':'Password','Dein Name':'Your name','Mindestens 6 Zeichen':'At least 6 characters','z. B. Gym, Schwimmen, Spaziergang':'e.g. Gym, swimming, walk','z. B. 92.4':'e.g. 92.4','z. B. Janek & Estelle':'e.g. Alex & Sam','z. B. A1B2C3D4':'e.g. A1B2C3D4','Optional':'Optional'
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
