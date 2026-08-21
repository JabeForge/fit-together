import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.4/+esm";

const SUPABASE_URL = "https://iixnjrxvdpqvkjoizify.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_AlrqVCyUGwfClbmSJEnKZg_ytg6XyOe";
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
let currentUser = null;
let currentProfile = null;

const STORE_KEY = 'fitTogether_v03';
const defaultState = {
  users: { a: { name: 'Ich', debt: 0 }, b: { name: 'Partner', debt: 0 } },
  events: [],
  weights: [],
  photos: [],
  bestStreak: 0,
  notificationPermissionAsked: false
};
let state = loadState();
let selectedEventId = null;
let calendarCursor = new Date();
calendarCursor.setDate(1);

function loadState(){
  try {
    const raw = localStorage.getItem(STORE_KEY) || localStorage.getItem('fitTogether_v02') || localStorage.getItem('fitTogether_v01') || '{}';
    return { ...defaultState, ...JSON.parse(raw) };
  }
  catch { return structuredClone(defaultState); }
}
function saveState(){ localStorage.setItem(STORE_KEY, JSON.stringify(state)); }
function euro(v){ return `${Number(v || 0).toFixed(v % 1 ? 1 : 0)} €`; }
function todayISO(){ return new Date().toISOString().slice(0,10); }
function formatDate(iso){ return new Intl.DateTimeFormat('de-DE',{weekday:'short',day:'2-digit',month:'2-digit'}).format(new Date(`${iso}T12:00:00`)); }
function uid(){ return `${Date.now()}_${Math.random().toString(36).slice(2,8)}`; }

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];


async function removeLegacyCache(){
  // V0.5: Alte Service Worker haben bei GitHub Pages verschiedene Versionen gemischt.
  // Bis das PWA-Caching neu aufgebaut ist, entfernen wir sie bewusst.
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(reg => reg.unregister()));
    }
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.filter(k => k.startsWith('fit-together-')).map(k => caches.delete(k)));
    }
  } catch (err) {
    console.warn('Alter Cache konnte nicht vollständig entfernt werden.', err);
  }
}

async function init(){
  // Alte Platzhalter nicht als echte Personennamen behandeln.
  if(state.users?.b?.name === 'Freundin') state.users.b.name = 'Partner';
  $('#eventDate').value = todayISO();
  $('#weightDate').value = todayISO();
  $('#photoDate').value = todayISO();
  bindTabs(); bindActions(); bindAuth();
  await removeLegacyCache();
  setInterval(checkDueReminders, 30000);

  const { data: { session } } = await supabase.auth.getSession();
  await applySession(session);
  supabase.auth.onAuthStateChange(async (_event, session) => {
    await applySession(session);
  });
}

function bindTabs(){
  $$('.tab').forEach(btn => btn.addEventListener('click',()=>showTab(btn.dataset.tab)));
}
function showTab(id){
  $$('.tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===id));
  $$('.panel').forEach(p=>p.classList.toggle('active',p.id===id));
}
function bindActions(){
  $('#quickAddBtn').addEventListener('click',()=>showTab('calendar'));
  $('#addEventBtn').addEventListener('click', addEvent);
  $('#addWeightBtn').addEventListener('click', addWeight);
  $('#addPhotoBtn').addEventListener('click', addPhoto);
  $('#notifyBtn').addEventListener('click', requestNotifications);
  $('#prevMonthBtn').addEventListener('click',()=>{ calendarCursor.setMonth(calendarCursor.getMonth()-1); renderMonthCalendar(); });
  $('#nextMonthBtn').addEventListener('click',()=>{ calendarCursor.setMonth(calendarCursor.getMonth()+1); renderMonthCalendar(); });
  $('#todayBtn').addEventListener('click',()=>{ calendarCursor = new Date(); calendarCursor.setDate(1); renderMonthCalendar(); });
  $('#addSelectedDayBtn').addEventListener('click',()=>{ showEventForm($('#eventDate').value || todayISO()); });
  $('#saveOwnProfileBtn').addEventListener('click', saveOwnProfile);
  $('#logoutBtn').addEventListener('click', signOut);
  $('#statusDialog').addEventListener('close',()=>{
    if(!selectedEventId || $('#statusDialog').returnValue==='cancel') return;
    setEventStatus(selectedEventId, $('#statusDialog').returnValue);
    selectedEventId = null;
  });
}

function addEvent(){
  const title = $('#eventTitle').value.trim();
  const date = $('#eventDate').value;
  if(!title || !date) return alert('Bitte Titel und Datum eintragen.');
  const ev = {
    id:uid(), title, date, start:$('#eventStart').value, end:$('#eventEnd').value,
    owner:$('#eventOwner').value, penalty:Number($('#eventPenalty').value||0),
    repeat:$('#eventRepeat').value, reminder:Number($('#eventReminder').value||0),
    note:$('#eventNote').value.trim(), color:$('#eventColor').value || 'violet', statusA:'planned', statusB:'planned', reminderSent:false
  };
  state.events.push(ev);
  if(ev.repeat==='weekly'){
    const base = new Date(`${date}T12:00:00`);
    for(let i=1;i<12;i++){
      const d = new Date(base); d.setDate(d.getDate()+i*7);
      state.events.push({...ev,id:uid(),date:d.toISOString().slice(0,10),reminderSent:false});
    }
  }
  saveState();
  $('#eventTitle').value=''; $('#eventNote').value='';
  renderAll();
}

function eventParticipants(ev){
  if(ev.owner==='a') return ['a'];
  if(ev.owner==='b') return ['b'];
  return ['a','b'];
}
function statusKey(user){ return user==='a'?'statusA':'statusB'; }
function setEventStatus(id,status){
  const ev=state.events.find(e=>e.id===id); if(!ev) return;
  const participants = eventParticipants(ev);
  // V0.1: status applies to all participants when opened from shared event.
  participants.forEach(u=>{
    const key=statusKey(u); const prev=ev[key]||'planned';
    if(prev==='missed') state.users[u].debt=Math.max(0,state.users[u].debt-ev.penalty);
    ev[key]=status;
    if(status==='missed') state.users[u].debt+=ev.penalty;
  });
  recalcStreaks(); saveState(); renderAll();
}
function recalcStreaks(){
  const sorted=[...state.events].sort((a,b)=>new Date(a.date)-new Date(b.date));
  let cur=0,best=0;
  for(const e of sorted){
    const p=eventParticipants(e);
    const done=p.every(u=>e[statusKey(u)]==='done');
    if(done){cur++;best=Math.max(best,cur);} else if(p.some(u=>['missed'].includes(e[statusKey(u)]))) cur=0;
  }
  state.bestStreak=Math.max(state.bestStreak||0,best);
}

function renderAll(){ autoMarkMissed(); syncNameControls(); renderTug(); renderEvents(); renderMonthCalendar(); renderStats(); renderWeights(); renderPhotos(); renderProfiles(); }

function autoMarkMissed(){
  const now = new Date();
  let changed = false;
  state.events.forEach(ev => {
    const end = new Date(`${ev.date}T${ev.end || ev.start || '23:59'}:00`);
    if(end >= now) return;
    eventParticipants(ev).forEach(u => {
      const key = statusKey(u);
      if((ev[key] || 'planned') === 'planned'){
        ev[key] = 'missed';
        state.users[u].debt += Number(ev.penalty || 0);
        changed = true;
      }
    });
  });
  if(changed){ recalcStreaks(); saveState(); }
}

function renderTug(){
  const a=state.users.a.debt,b=state.users.b.debt,total=a+b;
  let redPct=50;
  if(total>0) redPct = 50 + ((b-a)/total)*42;
  redPct=Math.max(8,Math.min(92,redPct));
  $('#redSide').style.width=`${redPct}%`; $('#blueSide').style.width=`${100-redPct}%`; $('#ropeMarker').style.left=`${redPct}%`;
  $('#debtA').textContent=euro(a); $('#debtB').textContent=euro(b); $('#totalPot').textContent=euro(total);
  const diff=Math.abs(a-b);
  if(a===b){ $('#leadBadge').textContent='Gleichstand'; $('#tugText').textContent= total===0?'Noch keine Strafgelder. Perfekter Start.':`Gleichstand bei ${euro(a)}.`; }
  else if(a<b){ $('#leadBadge').textContent=`${state.users.a.name} führt`; $('#tugText').textContent=`${state.users.a.name} liegt um ${euro(diff)} vorne und würde aktuell über den Topf entscheiden.`; }
  else { $('#leadBadge').textContent=`${state.users.b.name} führt`; $('#tugText').textContent=`${state.users.b.name} liegt um ${euro(diff)} vorne und würde aktuell über den Topf entscheiden.`; }
}
function renderStats(){
  const done=state.events.filter(e=>eventParticipants(e).every(u=>e[statusKey(u)]==='done')).length;
  let cur=0; const sorted=[...state.events].sort((a,b)=>new Date(a.date)-new Date(b.date));
  for(const e of sorted){ const p=eventParticipants(e); if(p.every(u=>e[statusKey(u)]==='done')) cur++; else if(p.some(u=>e[statusKey(u)]==='missed')) cur=0; }
  $('#currentStreak').textContent=cur; $('#bestStreak').textContent=state.bestStreak||0; $('#doneCount').textContent=done;
}
function renderEvents(){
  const list=$('#eventList'), next=$('#nextEvents'); list.innerHTML=''; next.innerHTML='';
  const sorted=[...state.events].sort((a,b)=>`${a.date}${a.start}`.localeCompare(`${b.date}${b.start}`));
  if(!sorted.length) list.innerHTML='<div class="empty">Noch keine Termine. Trag euren ersten Termin ein.</div>';
  sorted.forEach(ev=>list.appendChild(eventNode(ev,true)));
  const upcoming=sorted.filter(e=>new Date(`${e.date}T${e.end||'23:59'}`)>=new Date()).slice(0,4);
  if(!upcoming.length) next.innerHTML='<div class="empty">Keine kommenden Termine.</div>';
  upcoming.forEach(ev=>next.appendChild(eventNode(ev,false)));
}
function eventNode(ev,withDelete){
  const wrap=document.createElement('div'); wrap.className='event-item';
  const p=eventParticipants(ev); const statuses=p.map(u=>ev[statusKey(u)]||'planned');
  const statusHtml=statuses.map((s,i)=>`<span class="status ${s}">${p[i]==='a'?state.users.a.name:state.users.b.name}: ${statusText(s)}</span>`).join('');
  wrap.innerHTML=`<div class="event-main"><strong>${escapeHtml(ev.title)}</strong><div class="event-meta">${formatDate(ev.date)} · ${ev.start||'–'}–${ev.end||'–'} · ${euro(ev.penalty)} bei Verpassen</div>${ev.note?`<div class="event-meta">${escapeHtml(ev.note)}</div>`:''}<div class="status-row">${statusHtml}</div></div><div class="event-actions"><button class="small-btn update">Status</button>${withDelete?'<button class="small-btn delete">🗑</button>':''}</div>`;
  wrap.querySelector('.update').addEventListener('click',()=>{ selectedEventId=ev.id; $('#dialogEventName').textContent=ev.title; $('#statusDialog').showModal(); });
  if(withDelete) wrap.querySelector('.delete').addEventListener('click',()=>deleteEvent(ev.id));
  return wrap;
}
function statusText(s){ return ({planned:'Geplant',done:'Erledigt',missed:'Verpasst',excused:'Entschuldigt'})[s]||s; }
function deleteEvent(id){
  const ev=state.events.find(e=>e.id===id); if(!ev) return;
  eventParticipants(ev).forEach(u=>{ if(ev[statusKey(u)]==='missed') state.users[u].debt=Math.max(0,state.users[u].debt-ev.penalty); });
  state.events=state.events.filter(e=>e.id!==id); saveState(); renderAll();
}


function syncNameControls(){
  $('#userANameLabel').textContent = state.users.a.name;
  $('#userBNameLabel').textContent = state.users.b.name;
  const owner = $('#eventOwner');
  if(owner){
    const aOpt = owner.querySelector('option[value="a"]');
    const bOpt = owner.querySelector('option[value="b"]');
    if(aOpt) aOpt.textContent = state.users.a.name;
    if(bOpt) bOpt.textContent = state.users.b.name;
  }
}

function renderMonthCalendar(){
  const grid = $('#monthGrid');
  if(!grid) return;
  const y = calendarCursor.getFullYear(), m = calendarCursor.getMonth();
  const monthLabel = new Intl.DateTimeFormat('de-DE',{month:'long',year:'numeric'}).format(calendarCursor);
  $('#calendarMonthTitle').textContent = monthLabel.charAt(0).toUpperCase()+monthLabel.slice(1);
  grid.innerHTML='';

  const first = new Date(y,m,1,12);
  const mondayOffset = (first.getDay()+6)%7;
  const start = new Date(y,m,1-mondayOffset,12);
  let selectedIso = $('#eventDate').value || todayISO();

  for(let i=0;i<42;i++){
    const d = new Date(start); d.setDate(start.getDate()+i);
    const iso = localISO(d);
    const cell = document.createElement('button');
    cell.type='button';
    cell.className='calendar-day';
    cell.dataset.date=iso;
    if(d.getMonth()!==m) cell.classList.add('other-month');
    if(iso===todayISO()) cell.classList.add('today');
    if(iso===selectedIso) cell.classList.add('selected');

    const dayNo=document.createElement('span');
    dayNo.className='day-number';
    dayNo.textContent=d.getDate();
    cell.appendChild(dayNo);

    const holder=document.createElement('span');
    holder.className='calendar-events';
    const dayEvents=state.events.filter(e=>e.date===iso).sort((a,b)=>(a.start||'').localeCompare(b.start||''));
    dayEvents.slice(0,3).forEach(ev=>{
      const chip=document.createElement('span');
      chip.className=`calendar-event ${ev.color||'violet'} ${calendarEventStatus(ev)}`;
      const time=document.createElement('span');
      time.className='calendar-event-time';
      time.textContent=ev.start || '';
      const title=document.createElement('span');
      title.className='calendar-event-title';
      title.textContent=ev.title;
      chip.append(time,title);
      holder.appendChild(chip);
    });
    if(dayEvents.length>3){
      const more=document.createElement('span');
      more.className='calendar-more';
      more.textContent=`+${dayEvents.length-3} mehr`;
      holder.appendChild(more);
    }
    cell.appendChild(holder);

    cell.addEventListener('click',()=>{
      $('#eventDate').value=iso;
      grid.querySelectorAll('.calendar-day.selected').forEach(x=>x.classList.remove('selected'));
      cell.classList.add('selected');
    });
    cell.addEventListener('dblclick',()=>showEventForm(iso));
    grid.appendChild(cell);
  }
}
function showEventForm(iso){
  $('#eventDate').value=iso;
  $('#eventFormCard').scrollIntoView({behavior:'smooth',block:'start'});
  setTimeout(()=>$('#eventTitle').focus(),250);
}
function localISO(d){
  const yy=d.getFullYear(), mm=String(d.getMonth()+1).padStart(2,'0'), dd=String(d.getDate()).padStart(2,'0');
  return `${yy}-${mm}-${dd}`;
}
function calendarEventStatus(ev){
  const p=eventParticipants(ev);
  if(p.some(u=>ev[statusKey(u)]==='missed')) return 'missed';
  if(p.every(u=>ev[statusKey(u)]==='done')) return 'done';
  return '';
}

async function saveOwnProfile(){
  const name=$('#ownNameInput').value.trim();
  if(!name) return alert('Bitte einen Namen eintragen.');
  if(!currentUser) return alert('Bitte zuerst anmelden.');
  const { error } = await supabase.from('profiles').update({ name }).eq('id', currentUser.id);
  if(error) return alert(`Profil konnte nicht gespeichert werden: ${error.message}`);
  currentProfile = { ...(currentProfile || {}), id: currentUser.id, name };
  state.users.a.name=name;
  saveState(); renderAll();
}
function renderProfiles(){
  if(!$('#ownProfileName')) return;
  const a=state.users.a,b=state.users.b;
  $('#ownProfileName').textContent=a.name; $('#ownNameInput').value=a.name;
  $('#partnerProfileName').textContent=b.name;
  $('#ownAvatar').textContent=(a.name[0]||'?').toUpperCase(); $('#partnerAvatar').textContent=(b.name[0]||'?').toUpperCase();
  $('#ownProfileDebt').textContent=euro(a.debt); $('#partnerProfileDebt').textContent=euro(b.debt);
  $('#ownProfileDone').textContent=countDoneFor('a'); $('#partnerProfileDone').textContent=countDoneFor('b');
}
function countDoneFor(user){
  return state.events.filter(e=>eventParticipants(e).includes(user) && e[statusKey(user)]==='done').length;
}

function addWeight(){
  const date=$('#weightDate').value, weight=Number($('#weightValue').value);
  if(!date || !weight) return alert('Bitte Datum und Gewicht eintragen.');
  state.weights=state.weights.filter(w=>w.date!==date); state.weights.push({date,weight}); state.weights.sort((a,b)=>a.date.localeCompare(b.date));
  saveState(); $('#weightValue').value=''; renderWeights();
}
function renderWeights(){
  const w=state.weights;
  $('#weightStart').textContent=w.length?`${w[0].weight.toFixed(1)} kg`:'–';
  $('#weightCurrent').textContent=w.length?`${w.at(-1).weight.toFixed(1)} kg`:'–';
  $('#weightDelta').textContent=w.length>1?`${(w.at(-1).weight-w[0].weight).toFixed(1)} kg`:'–';
  drawWeightChart(w);
}
function movingAverage(arr,days=7){
  return arr.map((x,i)=>{ const slice=arr.slice(Math.max(0,i-days+1),i+1); return slice.reduce((s,v)=>s+v.weight,0)/slice.length; });
}
function drawWeightChart(data){
  const c=$('#weightChart'),ctx=c.getContext('2d'); const dpr=window.devicePixelRatio||1; const cssW=c.clientWidth||900; const cssH=Math.max(260,cssW*.4); c.width=cssW*dpr;c.height=cssH*dpr;ctx.scale(dpr,dpr);ctx.clearRect(0,0,cssW,cssH);
  ctx.fillStyle='#0f1728';ctx.fillRect(0,0,cssW,cssH);
  if(!data.length){ctx.fillStyle='#9da9bd';ctx.font='14px system-ui';ctx.textAlign='center';ctx.fillText('Noch keine Gewichtseinträge.',cssW/2,cssH/2);return;}
  const vals=data.map(x=>x.weight),avg=movingAverage(data),min=Math.min(...vals,...avg)-1,max=Math.max(...vals,...avg)+1; const pad=42;
  const x=i=>pad+(data.length===1?0:(i/(data.length-1))*(cssW-pad*2)); const y=v=>cssH-pad-((v-min)/(max-min))*(cssH-pad*2);
  ctx.strokeStyle='#26334e';ctx.lineWidth=1; for(let i=0;i<5;i++){const yy=pad+i*(cssH-pad*2)/4;ctx.beginPath();ctx.moveTo(pad,yy);ctx.lineTo(cssW-pad,yy);ctx.stroke();}
  ctx.strokeStyle='#60a5fa';ctx.lineWidth=2.5;ctx.beginPath();data.forEach((p,i)=>i?ctx.lineTo(x(i),y(p.weight)):ctx.moveTo(x(i),y(p.weight)));ctx.stroke();
  ctx.strokeStyle='#f59e0b';ctx.lineWidth=2;ctx.setLineDash([7,6]);ctx.beginPath();avg.forEach((v,i)=>i?ctx.lineTo(x(i),y(v)):ctx.moveTo(x(i),y(v)));ctx.stroke();ctx.setLineDash([]);
  data.forEach((p,i)=>{ctx.fillStyle='#dbeafe';ctx.beginPath();ctx.arc(x(i),y(p.weight),3.5,0,Math.PI*2);ctx.fill();});
  ctx.fillStyle='#9da9bd';ctx.font='12px system-ui';ctx.textAlign='left';ctx.fillText(`${max.toFixed(1)} kg`,4,pad+4);ctx.fillText(`${min.toFixed(1)} kg`,4,cssH-pad+4);
  ctx.textAlign='center';ctx.fillText(formatDate(data[0].date),x(0),cssH-12);if(data.length>1)ctx.fillText(formatDate(data.at(-1).date),x(data.length-1),cssH-12);
  ctx.textAlign='left';ctx.fillStyle='#60a5fa';ctx.fillText('● Gewicht',pad,18);ctx.fillStyle='#f59e0b';ctx.fillText('— 7-Tage-Trend',pad+82,18);
}

function addPhoto(){
  const file=$('#photoInput').files[0]; if(!file) return alert('Bitte ein Bild auswählen.');
  if(file.size>2_500_000) return alert('Für diese lokale V0.1 bitte ein Bild unter 2,5 MB wählen.');
  const reader=new FileReader(); reader.onload=()=>{
    state.photos.unshift({id:uid(),date:$('#photoDate').value||todayISO(),visibility:$('#photoVisibility').value,dataUrl:reader.result});
    saveState(); $('#photoInput').value=''; renderPhotos();
  }; reader.readAsDataURL(file);
}
function renderPhotos(){
  const grid=$('#photoGrid');grid.innerHTML='';
  if(!state.photos.length){grid.innerHTML='<div class="empty">Noch keine Fortschrittsbilder.</div>';return;}
  state.photos.forEach(p=>{const el=document.createElement('article');el.className='photo-card';el.innerHTML=`<img src="${p.dataUrl}" alt="Fortschrittsbild vom ${p.date}"><div class="photo-info"><span>${formatDate(p.date)}</span><span>${p.visibility==='private'?'🔒 Privat':'👥 Geteilt'}</span></div>`;grid.appendChild(el);});
}

async function requestNotifications(){
  if(!('Notification' in window)) return alert('Dieser Browser unterstützt keine Benachrichtigungen.');
  const result=await Notification.requestPermission();
  if(result==='granted') new Notification('FitTogether',{body:'Erinnerungen sind aktiviert. Solange die App aktiv ist, erinnern wir dich an Termine.'});
  else alert('Benachrichtigungen wurden nicht erlaubt.');
}
function checkDueReminders(){
  if(!('Notification' in window) || Notification.permission!=='granted') return;
  const now=Date.now(); let changed=false;
  state.events.forEach(ev=>{
    if(ev.reminderSent||!ev.reminder) return;
    const start=new Date(`${ev.date}T${ev.start||'00:00'}:00`).getTime();
    const trigger=start-ev.reminder*60000;
    if(now>=trigger && now<start && start-now<=(ev.reminder*60000+65000)){
      new Notification(`Bald: ${ev.title}`,{body:`Start um ${ev.start}. Nicht vergessen – sonst wird's teuer 😄`}); ev.reminderSent=true; changed=true;
    }
  });
  if(changed) saveState();
}
function escapeHtml(s){ return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
window.addEventListener('resize',()=>drawWeightChart(state.weights));
function bindAuth(){
  $('#showLoginBtn').addEventListener('click',()=>showAuthMode('login'));
  $('#showRegisterBtn').addEventListener('click',()=>showAuthMode('register'));
  $('#loginBtn').addEventListener('click', signIn);
  $('#registerBtn').addEventListener('click', signUp);
  $('#loginPassword').addEventListener('keydown',e=>{ if(e.key==='Enter') signIn(); });
  $('#registerPassword').addEventListener('keydown',e=>{ if(e.key==='Enter') signUp(); });
}
function showAuthMode(mode){
  const login=mode==='login';
  $('#loginForm').classList.toggle('hidden',!login);
  $('#registerForm').classList.toggle('hidden',login);
  $('#showLoginBtn').classList.toggle('active',login);
  $('#showRegisterBtn').classList.toggle('active',!login);
  $('#authMessage').textContent='';
}
function setAuthMessage(text,isError=false){
  const el=$('#authMessage'); el.textContent=text; el.classList.toggle('error',isError);
}
async function signUp(){
  const name=$('#registerName').value.trim();
  const email=$('#registerEmail').value.trim();
  const password=$('#registerPassword').value;
  if(!name || !email || password.length<6) return setAuthMessage('Bitte Name, E-Mail und ein Passwort mit mindestens 6 Zeichen eingeben.',true);
  setAuthMessage('Account wird erstellt …');
  try {
    const { data, error } = await supabase.auth.signUp({ email, password, options:{ data:{ display_name:name } } });
    if(error) return setAuthMessage(error.message,true);
    if(data.session){
      setAuthMessage('Account erstellt. Du bist angemeldet.');
    } else {
      showAuthMode('login');
      $('#loginEmail').value=email;
      setAuthMessage('Account erstellt. Bitte bestätige zuerst die E-Mail und melde dich danach an.');
    }
  } catch (err) {
    console.error(err);
    setAuthMessage('Verbindung zu Supabase fehlgeschlagen. Bitte Internetverbindung prüfen und erneut versuchen.',true);
  }
}
async function signIn(){
  const email=$('#loginEmail').value.trim();
  const password=$('#loginPassword').value;
  if(!email || !password) return setAuthMessage('Bitte E-Mail und Passwort eingeben.',true);
  setAuthMessage('Anmeldung läuft …');
  try {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if(error) return setAuthMessage(error.message,true);
    setAuthMessage('Angemeldet.');
  } catch (err) {
    console.error(err);
    setAuthMessage('Verbindung zu Supabase fehlgeschlagen. Bitte erneut versuchen.',true);
  }
}
async function signOut(){
  await supabase.auth.signOut();
}
async function applySession(session){
  currentUser=session?.user || null;
  if(!currentUser){
    currentProfile=null;
    $('#authScreen').classList.remove('hidden');
    $('#appShell').classList.remove('hidden');
    document.body.classList.add('auth-open');
    return;
  }
  $('#authScreen').classList.add('hidden');
  $('#appShell').classList.remove('hidden');
  document.body.classList.remove('auth-open');
  await loadOnlineProfile();
  renderAll();
}
async function loadOnlineProfile(){
  const { data, error } = await supabase.from('profiles').select('id,name,avatar_url,created_at').eq('id',currentUser.id).single();
  if(error){
    console.error('Profil laden fehlgeschlagen', error);
    state.users.a.name=currentUser.email?.split('@')[0] || 'Ich';
    return;
  }
  currentProfile=data;
  state.users.a.name=data.name || 'Ich';
  saveState();
}

init();
