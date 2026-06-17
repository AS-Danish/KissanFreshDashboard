import { useEffect, useState } from 'react';
import { messaging, db } from '@/firebase/config';
import { getToken, onMessage } from 'firebase/messaging';
import { doc, setDoc } from 'firebase/firestore';
import { toast } from 'sonner';

export const useFCM = (userId) => {
  const [fcmToken, setFcmToken] = useState(null);

  useEffect(() => {
    if (!userId || !messaging) return;

    const requestPermissionAndGetToken = async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          const currentToken = await getToken(messaging);
          if (currentToken) {
            setFcmToken(currentToken);
            // Save the token to dashboard_tokens collection for backend to use
            await setDoc(doc(db, 'dashboard_tokens', currentToken), {
              token: currentToken,
              userId: userId,
              updatedAt: new Date().toISOString()
            }, { merge: true });
          } else {
            console.log('No registration token available. Request permission to generate one.');
          }
        } else {
          console.log('Notification permission denied.');
        }
      } catch (error) {
        console.error('An error occurred while retrieving token. ', error);
      }
    };

    requestPermissionAndGetToken();

    const unsubscribe = onMessage(messaging, (payload) => {
      console.log('Message received in foreground:', payload);
      // Show toast for foreground notifications
      toast(payload.notification?.title || 'New Notification', {
        description: payload.notification?.body,
        duration: 5000,
      });
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [userId]);

  return { fcmToken };
};
