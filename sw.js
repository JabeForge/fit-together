// FitTogether V0.22.0: offline help + existing Web Push.
const CACHE='fittogether-install-0.22.0';
const ASSETS=['./offline.html','./icon-192.png','./icon-512.png','./icon-180.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(
  caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('fittogether-install-')&&k!==CACHE).map(k=>caches.delete(k))))
    .then(()=>self.clients.claim())
));
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url),scope=new URL(self.registration.scope);
  if(event.request.method!=='GET'||url.origin!==scope.origin||!url.pathname.startsWith(scope.pathname))return;
  if(event.request.mode==='navigate'){
    // Never cache login URLs, API responses, photos or user data.
    event.respondWith(fetch(event.request).catch(()=>caches.match(new URL('./offline.html',scope).href)));
  }else if(ASSETS.some(path=>new URL(path,scope).href===url.href)){
    event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request)));
  }
});

self.addEventListener('push',event=>{
  let data={};
  try{ data=event.data?.json()||{}; }catch{ data={body:event.data?.text()||'FitTogether'}; }
  const title=data.title||'FitTogether';
  const options={
    body:data.body||'You have a training reminder.',
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
  const scope=new URL(self.registration.scope);
  let url;try{url=new URL(event.notification.data?.url||'./index.html',scope);}catch{url=new URL('./index.html',scope);}
  const target=url.origin===scope.origin&&url.pathname.startsWith(scope.pathname)?url.href:new URL('./index.html',scope).href;
  event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{
    for(const client of list){if(client.url.startsWith(self.registration.scope)&&'focus' in client){client.navigate(target);return client.focus();}}
    return clients.openWindow?clients.openWindow(target):undefined;
  }));
});
