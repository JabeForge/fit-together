// FitTogether V0.19.4 – reminders + server-side missed-status sync
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const APP_TIME_ZONE = "Europe/Berlin";

function berlinNowParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year:"numeric", month:"2-digit", day:"2-digit",
    hour:"2-digit", minute:"2-digit", second:"2-digit",
    hourCycle:"h23"
  }).formatToParts(date);
  const get=(type:string)=>Number(parts.find(p=>p.type===type)?.value||0);
  return {year:get("year"),month:get("month"),day:get("day"),hour:get("hour"),minute:get("minute"),second:get("second")};
}
function dateISO(y:number,m:number,d:number){
  const x=new Date(Date.UTC(y,m-1,d));
  return `${x.getUTCFullYear()}-${String(x.getUTCMonth()+1).padStart(2,"0")}-${String(x.getUTCDate()).padStart(2,"0")}`;
}
function civilMinuteValue(date:string,time:string){
  const [y,m,d]=date.split("-").map(Number);
  const [hh,mm]=time.slice(0,5).split(":").map(Number);
  return Date.UTC(y,m-1,d,hh,mm,0)/60000;
}
function occursOn(ev:any,iso:string){
  if(iso<ev.event_date)return false;
  if(ev.recurrence_until && iso>ev.recurrence_until)return false;
  if(!ev.recurrence || ev.recurrence==="none")return iso===ev.event_date;
  const start=new Date(`${ev.event_date}T12:00:00Z`);
  const cur=new Date(`${iso}T12:00:00Z`);
  const days=Math.round((cur.getTime()-start.getTime())/86400000);
  if(ev.recurrence==="weekly")return days>=0&&days%7===0;
  if(ev.recurrence==="monthly")return cur.getUTCDate()===start.getUTCDate();
  if(ev.recurrence==="yearly")return cur.getUTCDate()===start.getUTCDate()&&cur.getUTCMonth()===start.getUTCMonth();
  return false;
}

Deno.serve(async(req)=>{
  if(req.headers.get("x-cron-secret")!==Deno.env.get("CRON_SECRET")){
    return new Response("Unauthorized",{status:401});
  }

  const supabase=createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  webpush.setVapidDetails(
    Deno.env.get("VAPID_SUBJECT")||"mailto:admin@example.com",
    Deno.env.get("VAPID_PUBLIC_KEY")!,
    Deno.env.get("VAPID_PRIVATE_KEY")!
  );

  const b=berlinNowParts();
  const today=dateISO(b.year,b.month,b.day);
  const tomorrow=dateISO(b.year,b.month,b.day+1);
  const catchupStart=dateISO(b.year,b.month,b.day-30);
  const nowCivilMinutes=Date.UTC(b.year,b.month-1,b.day,b.hour,b.minute,b.second)/60000;

  const {data:events,error}=await supabase.from("events")
    .select("id,title,event_date,start_time,end_time,penalty,recurrence,recurrence_until,event_participants(profile_id)")
    .lte("event_date",tomorrow);

  if(error)return new Response(error.message,{status:500});

  // 1) Server-side status sync for every participant.
  // This no longer depends on the person opening the app after the workout.
  const eventIds=(events||[]).map((e:any)=>e.id);
  let existing:any[]=[];
  if(eventIds.length){
    const {data,error:statusError}=await supabase.from("event_occurrence_status")
      .select("event_id,occurrence_date,profile_id,status")
      .in("event_id",eventIds)
      .gte("occurrence_date",catchupStart)
      .lte("occurrence_date",today);
    if(statusError)return new Response(statusError.message,{status:500});
    existing=data||[];
  }
  const statusKey=(eventId:string,date:string,profileId:string)=>`${eventId}|${date}|${profileId}`;
  const existingMap=new Map(existing.map(r=>[statusKey(r.event_id,r.occurrence_date,r.profile_id),r.status]));
  const missedRows:any[]=[];

  for(const ev of events||[]){
    const startDate=ev.event_date>catchupStart?ev.event_date:catchupStart;
    let cursor=new Date(`${startDate}T12:00:00Z`);
    const endDate=new Date(`${today}T12:00:00Z`);
    for(let guard=0;guard<32 && cursor<=endDate;guard++,cursor.setUTCDate(cursor.getUTCDate()+1)){
      const iso=cursor.toISOString().slice(0,10);
      if(!occursOn(ev,iso))continue;
      const endTime=(ev.end_time||ev.start_time||"23:59").slice(0,5);
      const endMinutes=civilMinuteValue(iso,endTime);
      if(endMinutes>=nowCivilMinutes)continue;
      for(const participant of ev.event_participants||[]){
        const key=statusKey(ev.id,iso,participant.profile_id);
        if(existingMap.has(key))continue;
        missedRows.push({
          event_id:ev.id,
          occurrence_date:iso,
          profile_id:participant.profile_id,
          status:"missed",
          completed_at:null
        });
        existingMap.set(key,"missed");
      }
    }
  }

  if(missedRows.length){
    const {error:missError}=await supabase.from("event_occurrence_status")
      .upsert(missedRows,{onConflict:"event_id,occurrence_date,profile_id"});
    if(missError)return new Response(missError.message,{status:500});
  }

  // 2) Existing one-hour push transport for non-repeating events.
  let sent=0;
  for(const ev of events||[]){
    if(!ev.start_time || ev.event_date<today || ev.event_date>tomorrow)continue;
    const mins=civilMinuteValue(ev.event_date,ev.start_time)-nowCivilMinutes;
    if(mins<59||mins>=60)continue;
    for(const p of ev.event_participants||[]){
      const {data:subs}=await supabase.from("push_subscriptions").select("*").eq("profile_id",p.profile_id);
      for(const sub of subs||[]){
        try{
          await webpush.sendNotification(
            {endpoint:sub.endpoint,keys:{p256dh:sub.p256dh,auth:sub.auth}},
            JSON.stringify({
              title:ev.title||"FitTogether",
              body:`Training in 1 Stunde · ${ev.start_time.slice(0,5)}`,
              url:"./index.html",
              tag:`event-${ev.id}-${ev.event_date}`
            })
          );
          sent++;
        }catch(e:any){
          console.error("Push send failed",e);
          if(e?.statusCode===404||e?.statusCode===410){
            await supabase.from("push_subscriptions").delete().eq("id",sub.id);
          }
        }
      }
    }
  }

  return Response.json({
    ok:true,
    sent,
    autoMissed:missedRows.length,
    timeZone:APP_TIME_ZONE
  });
});
