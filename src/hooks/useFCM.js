import { useEffect, useState } from 'react';
import { getMessagingInstance, db } from '@/firebase/config';
import { getToken, onMessage } from 'firebase/messaging';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { toast } from 'sonner';

export const useFCM = (userId) => {
  const [fcmToken, setFcmToken] = useState(null);

  useEffect(() => {
    if (!userId || typeof Notification === 'undefined') return;

    let active = true;
    let unsubscribeMessage;

    const initializeMessaging = async () => {
      try {
        // Permission prompts must follow an explicit user action. Reuse an existing
        // grant here; the dashboard settings UI owns any future prompt.
        if (Notification.permission !== 'granted') return;

        const messaging = await getMessagingInstance();
        if (!messaging || !active) return;

        const currentToken = await getToken(messaging);
        if (!currentToken || !active) return;

        setFcmToken(currentToken);
        await setDoc(doc(db, 'dashboard_tokens', currentToken), {
          token: currentToken,
          userId,
          updatedAt: serverTimestamp(),
        }, { merge: true });

        if (!active) return;
        unsubscribeMessage = onMessage(messaging, (payload) => {
          toast(payload.notification?.title || 'New notification', {
            description: payload.notification?.body,
            duration: 5000,
          });
        });
      } catch (error) {
        console.error('Unable to initialize dashboard notifications.', error);
      }
    };

    initializeMessaging();

    return () => {
      active = false;
      unsubscribeMessage?.();
    };
  }, [userId]);

  return { fcmToken };
};
