// FitTogether V0.18 Edge Function: send-training-reminders
// Required secrets: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT, CRON_SECRET
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const APP_TIME_ZONE = "Europe/Berlin";

function berlinNowParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE, year:"numeric", month:"2-digit", day:"2-digit",
    hour:"2-digit", minute:"2-digit", second:"2-digit", hourCycle:"h23"
  }).formatToParts(date);
  const get=(type)=>Number(parts.find(p=>p.type===type)?.value||0);
  return {year:get("year"),month:get("month"),day:get("day"),hour:get("hour"),minute:get("minute"),second:get("second")};
}
function civilMinuteValue(dateISO,time){
  const [y,m,d]=dateISO.split("-").map(Number);
  const [hh,mm]=time.slice(0,5).split(":").map(Number);
  return Date.UTC(y,m-1,d,hh,mm,0)/60000;
}
Deno.serve(async(req)=>{
  if(req.headers.get("x-cron-secret")!==Deno.env.get("CRON_SECRET"))return new Response("Unauthorized",{status:401});
  const supabase=createClient(Deno.env.get("SUPABASE_URL"),Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
  webpush.setVapidDetails(Deno.env.get("VAPID_SUBJECT")||"mailto:admin@example.com",Deno.env.get("VAPID_PUBLIC_KEY"),Deno.env.get("VAPID_PRIVATE_KEY"));

  const b=berlinNowParts();
  const today=`${b.year}-${String(b.month).padStart(2,"0")}-${String(b.day).padStart(2,"0")}`;
  const t=new Date(Date.UTC(b.year,b.month-1,b.day+1));
  const tomorrow=`${t.getUTCFullYear()}-${String(t.getUTCMonth()+1).padStart(2,"0")}-${String(t.getUTCDate()).padStart(2,"0")}`;
  const nowCivilMinutes=Date.UTC(b.year,b.month-1,b.day,b.hour,b.minute,b.second)/60000;

  const {data:events,error}=await supabase.from("events")
    .select("id,title,event_date,start_time,recurrence,event_participants(profile_id)")
    .in("event_date",[today,tomorrow]);
  if(error)return new Response(error.message,{status:500});

  let sent=0;
  for(const ev of events||[]){
    if(!ev.start_time)continue;
    const mins=civilMinuteValue(ev.event_date,ev.start_time)-nowCivilMinutes;
    if(mins<59||mins>=60)continue;
    for(const p of ev.event_participants||[]){
      const {data:subs}=await supabase.from("push_subscriptions").select("*").eq("profile_id",p.profile_id);
      for(const sub of subs||[]){
        try{
          await webpush.sendNotification(
            {endpoint:sub.endpoint,keys:{p256dh:sub.p256dh,auth:sub.auth}},
            JSON.stringify({title:ev.title||"FitTogether",body:`Training in 1 Stunde · ${ev.start_time.slice(0,5)}`,url:"./index.html",tag:`event-${ev.id}-${ev.event_date}`})
          );
          sent++;
        }catch(e){
          console.error("Push send failed",e);
          if(e?.statusCode===404||e?.statusCode===410)await supabase.from("push_subscriptions").delete().eq("id",sub.id);
        }
      }
    }
  }
  return Response.json({ok:true,sent,timeZone:APP_TIME_ZONE});
});
