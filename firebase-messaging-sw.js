// firebase-messaging-sw.js
// Service Worker compatível com Live Server e Firebase Hosting

importScripts('https://www.gstatic.com/firebasejs/9.22.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.2/firebase-messaging-compat.js');

// Configuração do Firebase
firebase.initializeApp({
  apiKey: "AIzaSyBzqUQG0z7r6_0NfZ3Fz0lU6T5D_3Q5yYw",
  authDomain: "barbex-app.firebaseapp.com",
  projectId: "barbex-app",
  storageBucket: "barbex-app.appspot.com",
  messagingSenderId: "275897396550",
  appId: "1:275897396550:web:8a9c6e4f4d2b1e0f3d2c8a"
});

const messaging = firebase.messaging();

// Recebe mensagens em segundo plano (quando o app não está ativo)
messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Mensagem recebida em background:', payload);
  const notification = payload.notification || {};
  const title = notification.title || 'Notificação BarberX';
  const options = {
    body: notification.body || payload.data?.body || '',
    icon: notification.icon || '/icons/icon-192.png',
    data: payload.data || {}
  };
  self.registration.showNotification(title, options);
});

// Trata clique na notificação
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      for (const client of windowClients) {
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});