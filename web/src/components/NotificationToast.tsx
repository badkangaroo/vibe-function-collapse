import React, { useEffect } from 'react';
import { useAppStore } from '../store/appStore';
import { Notification } from '../types';

const NotificationToast: React.FC = () => {
  const { notifications, removeNotification } = useAppStore();

  useEffect(() => {
    // Auto-remove notifications after 5 seconds
    if (notifications.length > 0) {
      const timer = setTimeout(() => {
        const oldest = notifications[0];
        // Only remove if it's older than 5 seconds (sanity check)
        if (Date.now() - oldest.timestamp >= 4500) {
            removeNotification(oldest.id);
        }
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notifications, removeNotification]);

  if (notifications.length === 0) return null;

  return (
    <div className="notification-container">
      {notifications.map((notification: Notification) => (
        <div 
          key={notification.id} 
          className={`notification-toast ${notification.type}`}
          onClick={() => removeNotification(notification.id)}
        >
          <span className="notification-icon">
            {notification.type === 'success' && '✓'}
            {notification.type === 'error' && '✕'}
            {notification.type === 'warning' && '⚠'}
            {notification.type === 'info' && 'ℹ'}
          </span>
          <span className="notification-message">{notification.message}</span>
          <button className="notification-close">×</button>
        </div>
      ))}
    </div>
  );
};

export default NotificationToast;
