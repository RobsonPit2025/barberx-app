

// firebase-messaging-sw.js
// Service worker para receber notificações FCM em background
importScripts('https://www.gstatic.com/firebasejs/9.22.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.2/firebase-messaging-compat.js');

// Inicialize apenas com o senderId do seu projeto Firebase
firebase.initializeApp({
  messagingSenderId: "YOUR_SENDER_ID" // substitua pelo seu messagingSenderId do firebaseConfig
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

// Trata clique na notificação (foca ou abre a página do app)
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
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