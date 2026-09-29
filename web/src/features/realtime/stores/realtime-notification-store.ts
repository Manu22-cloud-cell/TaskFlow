import { create } from 'zustand';

export type RealtimeNotification = {
  id: string;
  message: string;
};

type RealtimeNotificationState = {
  notifications: RealtimeNotification[];
  notify: (message: string) => void;
  dismiss: (notificationId: string) => void;
};

const NOTIFICATION_DURATION_MS = 4_000;

export const useRealtimeNotificationStore = create<RealtimeNotificationState>(
  (set) => ({
    notifications: [],

    notify: (message) => {
      const notification = {
        id: `${Date.now()}-${Math.random()}`,
        message,
      };

      set((state) => ({
        notifications: [...state.notifications, notification],
      }));

      window.setTimeout(() => {
        set((state) => ({
          notifications: state.notifications.filter(
            (currentNotification) => currentNotification.id !== notification.id,
          ),
        }));
      }, NOTIFICATION_DURATION_MS);
    },

    dismiss: (notificationId) => {
      set((state) => ({
        notifications: state.notifications.filter(
          (notification) => notification.id !== notificationId,
        ),
      }));
    },
  }),
);
