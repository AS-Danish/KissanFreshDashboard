importScripts("https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js");

const firebaseConfig = {
  apiKey: "AIzaSyCyL4u05ylJ22E_9oG-UBQqQxofw9rxN1U",
  authDomain: "kissanfresh-a72c1.firebaseapp.com",
  projectId: "kissanfresh-a72c1",
  storageBucket: "kissanfresh-a72c1.firebasestorage.app",
  messagingSenderId: "191097124850",
  appId: "1:191097124850:web:0011b1f5a90b25af0f9d6b"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title || 'New Notification';
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/favicon.ico',
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
