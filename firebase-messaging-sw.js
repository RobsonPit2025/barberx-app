// firebase-messaging-sw.js
// Service Worker compatível com Firebase Hosting e notificações visuais (com suporte total a background)

importScripts('https://www.gstatic.com/firebasejs/10.12.3/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.3/firebase-messaging-compat.js');

// Configuração do Firebase
firebase.initializeApp({
  apiKey: "AIzaSyD9I9th39b-qZOGTErAZ2RaGbKDM8ZUZfg",
  authDomain: "barbex-app.firebaseapp.com",
  projectId: "barbex-app",
  storageBucket: "barbex-app.appspot.com",
  messagingSenderId: "91864465722",
  appId: "1:91864465722:web:7e6b7b4ff7c2327f6a49c0"
});

const messaging = firebase.messaging();

// ✅ Exibir notificação visual mesmo quando o app estiver em segundo plano
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Mensagem recebida em background:', payload);

  const notificationTitle = payload.notification?.title || 'Nova notificação 💈';
  const notificationOptions = {
    body: payload.notification?.body || 'Você tem uma nova atualização!',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    vibrate: [200, 100, 200],
    data: payload.data || {},
    requireInteraction: true
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// ✅ Clique na notificação abre o site
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === 'https://barbex-app.web.app/' && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('https://barbex-app.web.app/');
      }
    })
  );
});