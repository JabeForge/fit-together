// V0.6: vorerst kein Offline-Cache, damit GitHub Pages keine alten Dateien mischt.
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
