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
let selectedEventId = null;
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
  $('#quickAddBtn').addEventListener('click',()=>showTab('calendar'));
  $('#addEventBtn').addEventListener('click',addEvent);
  $('#addWeightBtn').addEventListener('click',addWeight);
  $('#addPhotoBtn').addEventListener('click',()=>alert('Fortschrittsbilder kommen im nächsten Schritt in Supabase Storage. Sie werden bewusst nicht mehr in localStorage gespeichert.'));
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
  $('#statusDialog').addEventListener('close',async()=>{
    if(!selectedEventId || $('#statusDialog').returnValue==='cancel') return;
    await setEventStatus(selectedEventId,$('#statusDialog').returnValue);
    selectedEventId=null;
  });
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
    currentProfile=null; groups=[]; activeGroup=null; groupMembers=[]; events=[]; weights=[];
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
  await Promise.all([loadGroupMembers(),loadEvents(),loadWeights()]);
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
async function loadWeights(){
  const {data,error}=await supabase.from('weight_entries').select('weight,measured_on').eq('profile_id',currentUser.id).order('measured_on');
  if(error){console.error(error);weights=[];return;}
  weights=(data||[]).map(w=>({date:w.measured_on,weight:Number(w.weight)}));
}

function normalizeColor(c){
  if(['violet','blue','green','orange','pink'].includes(c))return c;
  const map={'#6c5ce7':'violet','#8b5cf6':'violet','#22b7f2':'blue','#3b82f6':'blue','#22c55e':'green','#f59e0b':'orange','#ec4899':'pink'};
  return map[String(c||'').toLowerCase()]||'violet';
}
function colorHex(name){return {violet:'#8b5cf6',blue:'#22b7f2',green:'#22c55e',orange:'#f59e0b',pink:'#ec4899'}[name]||'#8b5cf6';}
function toggleRepeatUntil(){
  const weekly=$('#eventRepeat').value==='weekly';
  $('#eventRepeatUntilWrap').classList.toggle('hidden',!weekly);
  if(!weekly)$('#eventRepeatUntil').value='';
}
function eventOccursOn(ev,iso){
  if(ev.date===iso)return true;
  if(ev.recurrence!=='weekly')return false;
  if(iso<ev.date)return false;
  if(ev.recurrence_until && iso>ev.recurrence_until)return false;
  const start=new Date(`${ev.date}T12:00:00`);
  const target=new Date(`${iso}T12:00:00`);
  const days=Math.round((target-start)/86400000);
  return days>=0 && days%7===0;
}
function recurrenceText(ev){
  if(ev.recurrence!=='weekly')return '';
  return ev.recurrence_until?` · wöchentlich bis ${formatDate(ev.recurrence_until)}`:' · wöchentlich';
}
function nextOccurrenceDate(ev,from=new Date()){
  const fromIso=localISO(from);
  if(ev.recurrence!=='weekly')return ev.date>=fromIso?ev.date:null;
  let d=new Date(`${ev.date}T12:00:00`);
  const target=new Date(`${fromIso}T12:00:00`);
  if(d<target){
    const diff=Math.floor((target-d)/86400000);
    d.setDate(d.getDate()+Math.ceil(diff/7)*7);
  }
  const iso=localISO(d);
  if(ev.recurrence_until && iso>ev.recurrence_until)return null;
  return iso;
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
    recurrence:$('#eventRepeat').value||'none',recurrence_until:$('#eventRepeat').value==='weekly'?($('#eventRepeatUntil').value||null):null
  };
  const {data,error}=await supabase.from('events').insert(payload).select('id').single();
  if(error)return alert(`Termin konnte nicht gespeichert werden: ${error.message}`);
  const rows=participantIds.map(profile_id=>({event_id:data.id,profile_id,status:'planned'}));
  const {error:partError}=await supabase.from('event_participants').insert(rows);
  if(partError){await supabase.from('events').delete().eq('id',data.id);return alert(`Teilnehmer konnten nicht gespeichert werden: ${partError.message}`);}
  $('#eventTitle').value='';$('#eventNote').value='';$('#eventRepeat').value='none';$('#eventRepeatUntil').value='';toggleRepeatUntil();
  await loadEvents();renderAll();
}
async function setEventStatus(id,statusUi){
  const ev=events.find(e=>e.id===id);if(!ev)return;
  const mine=ev.participants.find(p=>p.profile_id===currentUser.id);
  if(!mine)return alert('Du bist bei diesem Termin nicht als Teilnehmer eingetragen.');
  const dbStatus={done:'completed',missed:'missed',excused:'excused'}[statusUi]||statusUi;
  const update={status:dbStatus,completed_at:dbStatus==='completed'?new Date().toISOString():null};
  const {error}=await supabase.from('event_participants').update(update).eq('event_id',id).eq('profile_id',currentUser.id);
  if(error)return alert(`Status konnte nicht gespeichert werden: ${error.message}`);
  await loadEvents();renderAll();
}
async function autoMarkOwnMissed(){
  const now=new Date();const ids=[];
  for(const ev of events){
    const mine=ev.participants.find(p=>p.profile_id===currentUser.id);if(!mine||mine.status!=='planned')continue;
    const end=new Date(`${ev.date}T${ev.end||ev.start||'23:59'}:00`);if(end<now)ids.push(ev.id);
  }
  for(const id of ids)await supabase.from('event_participants').update({status:'missed',completed_at:null}).eq('event_id',id).eq('profile_id',currentUser.id);
  if(ids.length)await loadEvents();
}

function renderAll(){renderGroupUI();renderTug();renderEvents();renderMonthCalendar();renderStats();renderWeights();renderPhotos();renderProfiles();}
function memberDebt(id){return events.reduce((sum,e)=>sum+(e.participants.find(p=>p.profile_id===id)?.status==='missed'?Number(e.penalty||0):0),0);}
function renderTug(){
  const hero=$('.hero-card');hero.classList.remove('solo','multi');
  if(!activeGroup||groupMembers.length<2){
    hero.classList.add('solo');$('#leadBadge').textContent='Noch solo';$('#tugText').textContent='Für das Tauziehen braucht die Gruppe zwei Mitglieder. Schick deinen Einladungslink weiter.';$('#totalPot').textContent=euro(groupMembers.reduce((s,m)=>s+memberDebt(m.id),0));return;
  }
  if(groupMembers.length>2){
    hero.classList.add('multi');const ranked=[...groupMembers].map(m=>({...m,debt:memberDebt(m.id)})).sort((a,b)=>a.debt-b.debt);
    $('#leadBadge').textContent=`${groupMembers.length} Mitglieder`;$('#tugText').textContent=`Aktuell vorne: ${ranked[0].name} mit ${euro(ranked[0].debt)}. Für 3+ Mitglieder bauen wir später eine Rangliste.`;$('#totalPot').textContent=euro(ranked.reduce((s,m)=>s+m.debt,0));return;
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
  const mine=events.filter(e=>myParticipant(e));const done=mine.filter(e=>myParticipant(e).status==='completed').length;
  let cur=0,best=0;[...mine].sort((a,b)=>a.date.localeCompare(b.date)).forEach(e=>{const st=myParticipant(e).status;if(st==='completed'){cur++;best=Math.max(best,cur);}else if(st==='missed')cur=0;});
  $('#currentStreak').textContent=cur;$('#bestStreak').textContent=best;$('#doneCount').textContent=done;
}
function renderEvents(){
  const list=$('#eventList'),next=$('#nextEvents');list.innerHTML='';next.innerHTML='';const sorted=[...events].sort((a,b)=>`${a.date}${a.start}`.localeCompare(`${b.date}${b.start}`));
  if(!activeGroup){list.innerHTML='<div class="empty">Wähle zuerst eine Gruppe.</div>';next.innerHTML='<div class="empty">Noch keine Gruppe.</div>';return;}
  if(!sorted.length)list.innerHTML='<div class="empty">Noch keine Termine. Trag euren ersten Termin ein.</div>';
  sorted.forEach(ev=>list.appendChild(eventNode(ev,true)));
  const now=new Date();
  const upcoming=events.map(ev=>{
    const date=nextOccurrenceDate(ev,now);
    return date?{...ev,date}:null;
  }).filter(Boolean).filter(e=>new Date(`${e.date}T${e.end||e.start||'23:59'}`)>=now)
    .sort((a,b)=>`${a.date}${a.start}`.localeCompare(`${b.date}${b.start}`)).slice(0,4);
  if(!upcoming.length)next.innerHTML='<div class="empty">Keine kommenden Termine.</div>';upcoming.forEach(ev=>next.appendChild(eventNode(ev,false)));
}
function statusLabel(s){return {planned:'Geplant',completed:'Erledigt',missed:'Verpasst',excused:'Entschuldigt'}[s]||s;}
function eventNode(ev,withDelete){
  const wrap=document.createElement('div');wrap.className='event-item';
  const statuses=ev.participants.map(p=>`<span class="status ${p.status}">${escapeHtml(p.name)}: ${statusLabel(p.status)}</span>`).join('');
  wrap.innerHTML=`<div class="event-main"><strong>${escapeHtml(ev.title)} <span class="event-sync-badge">● synchronisiert</span></strong><div class="event-meta">${formatDate(ev.date)}${recurrenceText(ev)} · ${ev.start||'–'}${ev.end?`–${ev.end}`:''} · ${euro(ev.penalty)} Strafe</div><div class="status-row">${statuses}</div></div><div class="event-actions"><button class="small-btn status-btn" type="button">Status</button>${withDelete&&ev.created_by===currentUser.id?'<button class="small-btn delete-btn" type="button">🗑</button>':''}</div>`;
  wrap.querySelector('.status-btn').addEventListener('click',()=>{selectedEventId=ev.id;$('#dialogEventName').textContent=ev.title;$('#statusDialog').showModal();});
  const del=wrap.querySelector('.delete-btn');if(del)del.addEventListener('click',async()=>{if(confirm(`„${ev.title}“ löschen?`)){const {error}=await supabase.from('events').delete().eq('id',ev.id);if(error)alert(error.message);else{await loadEvents();renderAll();}}});
  return wrap;
}
function renderMonthCalendar(){
  const grid=$('#monthGrid');grid.innerHTML='';const y=calendarCursor.getFullYear(),m=calendarCursor.getMonth();$('#calendarMonthTitle').textContent=new Intl.DateTimeFormat('de-DE',{month:'long',year:'numeric'}).format(calendarCursor);
  const first=new Date(y,m,1),offset=(first.getDay()+6)%7,start=new Date(y,m,1-offset);const today=todayISO(),selected=$('#eventDate').value;
  for(let i=0;i<42;i++){
    const d=new Date(start);d.setDate(start.getDate()+i);const iso=localISO(d),cell=document.createElement('button');cell.type='button';cell.className='calendar-day';
    if(d.getMonth()!==m)cell.classList.add('other-month');if(iso===today)cell.classList.add('today');if(iso===selected)cell.classList.add('selected');
    const dayEvents=events.filter(e=>eventOccursOn(e,iso)).sort((a,b)=>(a.start||'').localeCompare(b.start||''));
    cell.innerHTML=`<span class="day-number">${d.getDate()}</span><span class="calendar-events">${dayEvents.slice(0,3).map(e=>`<span class="calendar-event ${e.color} ${calendarEventStatus(e)}"><span class="calendar-event-time">${escapeHtml(e.start||'')}</span><span class="calendar-event-title">${escapeHtml(e.title)}</span></span>`).join('')}${dayEvents.length>3?`<span class="calendar-more">+${dayEvents.length-3} mehr</span>`:''}</span>`;
    cell.addEventListener('click',()=>{$('#eventDate').value=iso;renderMonthCalendar();});cell.addEventListener('dblclick',()=>showEventForm(iso));grid.appendChild(cell);
  }
}
function calendarEventStatus(ev){if(ev.participants.some(p=>p.status==='missed'))return'missed';if(ev.participants.length&&ev.participants.every(p=>p.status==='completed'))return'done';return'';}
function showEventForm(iso){$('#eventDate').value=iso;$('#eventFormCard').scrollIntoView({behavior:'smooth',block:'start'});setTimeout(()=>$('#eventTitle').focus(),250);}

async function saveOwnProfile(){
  const name=$('#ownNameInput').value.trim();if(!name)return alert('Bitte einen Namen eintragen.');
  const {error}=await supabase.from('profiles').update({name}).eq('id',currentUser.id);if(error)return alert(error.message);
  currentProfile={...currentProfile,name};await loadGroupMembers();renderAll();
}
function renderProfiles(){
  const me=currentProfile||{name:'Ich'};$('#ownProfileName').textContent=me.name;$('#ownNameInput').value=me.name;$('#ownAvatar').textContent=(me.name?.[0]||'?').toUpperCase();$('#ownProfileDebt').textContent=euro(memberDebt(currentUser?.id));$('#ownProfileDone').textContent=events.filter(e=>e.participants.find(p=>p.profile_id===currentUser?.id)?.status==='completed').length;
  const partner=groupMembers.find(m=>m.id!==currentUser?.id);
  $('#partnerProfileName').textContent=partner?.name||'Noch niemand';$('#partnerAvatar').textContent=(partner?.name?.[0]||'?').toUpperCase();$('#partnerProfileDebt').textContent=partner?euro(memberDebt(partner.id)):'–';$('#partnerProfileDone').textContent=partner?events.filter(e=>e.participants.find(p=>p.profile_id===partner.id)?.status==='completed').length:'–';
  renderMembers();
}

async function addWeight(){
  const date=$('#weightDate').value,weight=Number($('#weightValue').value);if(!date||!weight)return alert('Bitte Datum und Gewicht eintragen.');
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
function renderPhotos(){const grid=$('#photoGrid');grid.innerHTML='<div class="empty">Online-Fortschrittsbilder kommen als nächster Schritt mit Supabase Storage.</div>';}
async function requestNotifications(){if(!('Notification'in window))return alert('Dieser Browser unterstützt keine Benachrichtigungen.');const r=await Notification.requestPermission();if(r==='granted')new Notification('FitTogether',{body:'Erinnerungen sind aktiviert.'});}
function checkDueReminders(){/* Push/Background-Erinnerungen folgen später. */}
window.addEventListener('resize',()=>drawWeightChart(weights));

init();
