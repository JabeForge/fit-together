// V0.7: vorerst kein Offline-Cache, damit GitHub Pages keine alten Dateien mischt.
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
