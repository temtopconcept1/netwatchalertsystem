import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";

/**
 * Subscribes to backend realtime events. Falls back gracefully — callers
 * typically also poll on an interval, so if the socket connection fails
 * (e.g. blocked network), the UI still stays fresh.
 */
export function useRealtime(handlers: {
  onDeviceUpdated?: (payload: any) => void;
  onAlertsChanged?: (payload: any) => void;
  onBrowserNotification?: (payload: any) => void;
}) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = io({ path: "/socket.io", withCredentials: true, reconnectionAttempts: 5 });
    socketRef.current = socket;

    if (handlers.onDeviceUpdated) socket.on("device:updated", handlers.onDeviceUpdated);
    if (handlers.onAlertsChanged) socket.on("alerts:changed", handlers.onAlertsChanged);
    if (handlers.onBrowserNotification) {
      socket.on("notification:browser", (payload) => {
        handlers.onBrowserNotification?.(payload);
        if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
          try {
            new Notification(payload.title, { body: payload.body });
          } catch {
            // some browsers restrict Notification construction — ignore
          }
        }
      });
    }

    return () => {
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

export function requestBrowserNotificationPermission() {
  if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
    Notification.requestPermission().catch(() => {});
  }
}
