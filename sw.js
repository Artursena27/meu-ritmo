/* Service worker do Meu Ritmo: só notificações (o app continua sempre online). */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.title || 'Meu Ritmo', {
    body: d.body || '', icon: '/icons/icon-192.png', badge: '/icons/icon-192.png',
    tag: d.tag, renotify: !!d.tag, data: { url: d.url || '/' }
  }));
});

// Tocar na notificação abre o app (ou traz a aba para frente) já no chat, para responder.
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || '/';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(abertas => {
    for (const c of abertas) {
      if (c.url.startsWith(self.registration.scope)) { c.postMessage({ abrirChat: true }); return c.focus(); }
    }
    return self.clients.openWindow(url);
  }));
});
