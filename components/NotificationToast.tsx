
import React, { useEffect, useState } from 'react';
import { Mail, X, CheckCircle } from 'lucide-react';
import { NOTIFICATION_EVENT, Notification } from '../services/notificationService';

const NotificationToast = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    const handleNotification = (event: Event) => {
      const customEvent = event as CustomEvent<Notification>;
      const newNotification = customEvent.detail;
      
      setNotifications((prev) => [newNotification, ...prev]);

      // Auto dismiss after 6 seconds
      setTimeout(() => {
        removeNotification(newNotification.id);
      }, 6000);
    };

    window.addEventListener(NOTIFICATION_EVENT, handleNotification);
    return () => window.removeEventListener(NOTIFICATION_EVENT, handleNotification);
  }, []);

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  if (notifications.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-3 pointer-events-none">
      {notifications.map((n) => (
        <div 
          key={n.id} 
          className="bg-white border border-gray-200 shadow-xl rounded-lg p-4 w-96 pointer-events-auto transform transition-all duration-500 ease-in-out animate-slideIn flex items-start gap-3"
        >
          <div className="bg-green-100 p-2 rounded-full flex-shrink-0">
            <Mail className="w-5 h-5 text-green-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start">
              <h4 className="text-sm font-bold text-gray-900">Email Notification Sent</h4>
              <button 
                onClick={() => removeNotification(n.id)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">To: <span className="font-mono">{n.to}</span></p>
            <p className="text-sm font-medium text-auis-700 mt-1 truncate">{n.subject}</p>
            <p className="text-xs text-gray-600 mt-1 line-clamp-2">{n.body}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default NotificationToast;
