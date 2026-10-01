import { create } from 'zustand';

export type RealtimeNotification = {
  id: string;
  message: string;
  createdAt: number;
  isRead: boolean;
  isToastVisible: boolean;
};

type RealtimeNotificationState = {
  notifications: RealtimeNotification[];
  notify: (message: string) => void;
  dismiss: (notificationId: string) => void;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
};

const NOTIFICATION_DURATION_MS = 4_000;
const MAX_NOTIFICATIONS = 50;
const dismissTimers = new Map<string, ReturnType<typeof setTimeout>>();

export const useRealtimeNotificationStore = create<RealtimeNotificationState>(
  (set, get) => ({
    notifications: [],

    notify: (message) => {
      const notification = {
        id: `${Date.now()}-${Math.random()}`,
        message,
        createdAt: Date.now(),
        isRead: false,
        isToastVisible: true,
      };

      set((state) => ({
        notifications: [notification, ...state.notifications].slice(
          0,
          MAX_NOTIFICATIONS,
        ),
      }));

      dismissTimers.set(
        notification.id,
        setTimeout(() => {
          get().dismiss(notification.id);
        }, NOTIFICATION_DURATION_MS),
      );
    },

    dismiss: (notificationId) => {
      clearTimeout(dismissTimers.get(notificationId));
      dismissTimers.delete(notificationId);
      set((state) => ({
        notifications: state.notifications.map((notification) =>
          notification.id === notificationId
            ? { ...notification, isToastVisible: false }
            : notification,
        ),
      }));
    },

    markAsRead: (notificationId) => {
      set((state) => ({
        notifications: state.notifications.map((notification) =>
          notification.id === notificationId
            ? { ...notification, isRead: true }
            : notification,
        ),
      }));
    },

    markAllAsRead: () => {
      set((state) => ({
        notifications: state.notifications.map((notification) => ({
          ...notification,
          isRead: true,
        })),
      }));
    },

    clearAll: () => {
      dismissTimers.forEach((timer) => clearTimeout(timer));
      dismissTimers.clear();
      set({ notifications: [] });
    },
  }),
);
