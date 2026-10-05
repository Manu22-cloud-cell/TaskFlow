import { create } from 'zustand';

export type RealtimeNotification = {
  id: string;
  message: string;
  createdAt: number;
  isRead: boolean;
  isToastVisible: boolean;
  href?: string;
  personal?: boolean;
};

type RealtimeNotificationState = {
  notifications: RealtimeNotification[];
  notify: (
    message: string,
    options?: {
      id?: string;
      href?: string;
      personal?: boolean;
      showToast?: boolean;
    },
  ) => void;
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

    notify: (message, options = {}) => {
      const id = options.id ?? `${Date.now()}-${Math.random()}`;
      const existing = get().notifications.find((item) => item.id === id);
      if (existing) {
        // The personal message is more specific than the project-room message.
        if (options.personal && !existing.personal) {
          set((state) => ({
            notifications: state.notifications.map((item) =>
              item.id === id
                ? { ...item, message, href: options.href, personal: true }
                : item,
            ),
          }));
        }
        return;
      }
      const notification = {
        id,
        message,
        createdAt: Date.now(),
        isRead: false,
        isToastVisible: options.showToast ?? true,
        href: options.href,
        personal: options.personal,
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
