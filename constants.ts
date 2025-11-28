import { TicketCategory, TicketPriority, DeviceType } from './types';

export const CATEGORIES = Object.values(TicketCategory);
export const PRIORITIES = Object.values(TicketPriority);
export const DEVICE_TYPES = Object.values(DeviceType);

export const MOCK_USER = {
  id: 'u-123',
  name: 'John Doe',
  email: 'john.doe@auis.edu.krd',
  role: 'USER', // Default role, changed in AuthContext
  avatar: 'https://picsum.photos/200/200'
};

export const SAMPLE_TICKETS = [
  {
    id: 'T-1001',
    reporterName: 'Alice Student',
    reporterEmail: 'alice@auis.edu',
    subject: 'Cannot login to Moodle',
    description: 'I keep getting an "Invalid Credentials" error when trying to access my course list on Moodle. I have tried resetting my password but it does not send the email.',
    category: TicketCategory.LMS,
    priority: TicketPriority.HIGH,
    deviceType: DeviceType.MAC,
    osBrowser: 'MacOS / Chrome',
    status: 'Pending',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    attachments: [],
    consentAiSearch: true,
    internalNotes: []
  },
  {
    id: 'T-1002',
    reporterName: 'Prof. Smith',
    reporterEmail: 'smith@auis.edu',
    subject: 'Projector in B-204 not working',
    description: 'The projector creates a loud buzzing noise and displays no image. Need this for my 2PM class.',
    category: TicketCategory.HARDWARE,
    priority: TicketPriority.URGENT,
    deviceType: DeviceType.PC,
    osBrowser: 'N/A',
    status: 'In Progress',
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    updatedAt: new Date(Date.now() - 1800000).toISOString(),
    attachments: [],
    consentAiSearch: false,
    internalNotes: ['Technician dispatched']
  },
  {
    id: 'T-1003',
    reporterName: 'Staff Member',
    reporterEmail: 'staff@auis.edu',
    subject: 'Wi-Fi keeps disconnecting',
    description: 'Building C, 2nd floor. The connection drops every 5 minutes.',
    category: TicketCategory.NETWORK,
    priority: TicketPriority.MEDIUM,
    deviceType: DeviceType.MOBILE,
    osBrowser: 'iOS 17',
    status: 'Resolved',
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    resolvedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    attachments: [],
    consentAiSearch: true,
    internalNotes: ['AP restarted']
  }
];
