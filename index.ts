// Supabase Edge Function: send-training-reminders
// Secrets required: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
  webpush.setVapidDetails(
    Deno.env.get("VAPID_SUBJECT") || "mailto:admin@example.com",
    Deno.env.get("VAPID_PUBLIC_KEY")!,
    Deno.env.get("VAPID_PRIVATE_KEY")!
  );

  const now = new Date();
  const horizon = new Date(now.getTime() + 61 * 60 * 1000);
  const today = now.toISOString().slice(0,10);
  const tomorrow = horizon.toISOString().slice(0,10);

  // This first backend version handles non-repeating events in the next hour.
  // Recurring occurrence expansion can be added after the push transport is verified.
  const { data: events, error } = await supabase
    .from("events")
    .select("id,title,event_date,start_time,recurrence,event_participants(profile_id)")
    .in("event_date",[today,tomorrow]);
  if(error) return new Response(error.message,{status:500});

  let sent=0;
  for(const ev of events||[]){
    if(!ev.start_time) continue;
    const dt=new Date(`${ev.event_date}T${ev.start_time}`);
    const mins=(dt.getTime()-now.getTime())/60000;
    if(mins<59 || mins>61) continue;
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
          if(e?.statusCode===404||e?.statusCode===410)await supabase.from("push_subscriptions").delete().eq("id",sub.id);
        }
      }
    }
  }
  return Response.json({ok:true,sent});
});
