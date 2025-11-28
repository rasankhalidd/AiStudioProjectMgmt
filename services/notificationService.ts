
export interface Notification {
  id: string;
  to: string;
  subject: string;
  body: string;
  timestamp: number;
  type: 'email' | 'system';
}

// Event name for cross-component communication
export const NOTIFICATION_EVENT = 'auis-notification-event';

export const sendMockEmail = (to: string, subject: string, body: string) => {
  const notification: Notification = {
    id: Date.now().toString(),
    to,
    subject,
    body,
    timestamp: Date.now(),
    type: 'email'
  };

  // 1. Log to console (Server log simulation)
  console.log(`[MOCK EMAIL SERVER] Sending to: ${to} | Subject: ${subject}`);

  // 2. Persist to local storage (Sent items simulation)
  const history = JSON.parse(localStorage.getItem('auis_email_history') || '[]');
  history.unshift(notification);
  localStorage.setItem('auis_email_history', JSON.stringify(history));

  // 3. Dispatch event for UI Toast
  const event = new CustomEvent(NOTIFICATION_EVENT, { detail: notification });
  window.dispatchEvent(event);
};

export const getEmailHistory = (): Notification[] => {
  return JSON.parse(localStorage.getItem('auis_email_history') || '[]');
};
