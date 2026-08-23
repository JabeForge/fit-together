// FitTogether V0.17 – service worker + Web Push
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));

self.addEventListener('push',event=>{
  let data={};
  try{ data=event.data?.json()||{}; }catch{ data={body:event.data?.text()||'FitTogether'}; }
  const title=data.title||'FitTogether';
  const options={
    body:data.body||'Du hast eine Trainingserinnerung.',
    icon:data.icon||'./icon-192.png',
    badge:data.badge||'./icon-192.png',
    data:{url:data.url||'./index.html'},
    tag:data.tag||'fit-together-reminder',
    renotify:false
  };
  event.waitUntil(self.registration.showNotification(title,options));
});
self.addEventListener('notificationclick',event=>{
  event.notification.close();
  const target=new URL(event.notification.data?.url||'./index.html',self.location.origin).href;
  event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{
    for(const client of list){if('focus' in client){client.navigate(target);return client.focus();}}
    return clients.openWindow?clients.openWindow(target):undefined;
  }));
});
