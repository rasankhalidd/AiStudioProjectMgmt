
import { Ticket, TicketStatus, TicketPriority } from '../types';
import { SAMPLE_TICKETS } from '../constants';
import { sendMockEmail } from './notificationService';

const STORAGE_KEY = 'auis_tickets_v1';

const getTicketsFromStorage = (): Ticket[] => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(SAMPLE_TICKETS));
    return SAMPLE_TICKETS as Ticket[];
  }
  return JSON.parse(stored);
};

export const getTickets = async (): Promise<Ticket[]> => {
  await new Promise(resolve => setTimeout(resolve, 500));
  // Return sorted by date descending
  const tickets = getTicketsFromStorage();
  return tickets.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

export const getTicketById = async (id: string): Promise<Ticket | undefined> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  const tickets = getTicketsFromStorage();
  return tickets.find(t => t.id === id);
};

export const createTicket = async (ticketData: Omit<Ticket, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'attachments' | 'internalNotes'> & { attachments: any[] }): Promise<Ticket> => {
  await new Promise(resolve => setTimeout(resolve, 800));
  const tickets = getTicketsFromStorage();
  
  const newTicket: Ticket = {
    ...ticketData,
    id: `T-${1000 + tickets.length + 1}`,
    status: TicketStatus.PENDING,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    internalNotes: [],
    attachments: ticketData.attachments
  };

  tickets.unshift(newTicket);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets));

  // --- TRIGGER EMAIL NOTIFICATION ---
  const subject = `[AUIS Help Desk] Ticket Received: ${newTicket.id}`;
  const body = `Dear ${newTicket.reporterName},\n\nWe have received your ticket regarding "${newTicket.subject}".\n\nA support agent will review your request shortly.\n\nTicket ID: ${newTicket.id}\nCategory: ${newTicket.category}\n\nThank you,\nIT Support Team`;
  
  sendMockEmail(newTicket.reporterEmail, subject, body);
  // ----------------------------------

  return newTicket;
};

export const updateTicketStatus = async (id: string, status: TicketStatus): Promise<void> => {
  const tickets = getTicketsFromStorage();
  const ticketIndex = tickets.findIndex(t => t.id === id);
  if (ticketIndex > -1) {
    const ticket = tickets[ticketIndex];
    ticket.status = status;
    ticket.updatedAt = new Date().toISOString();
    
    if (status === TicketStatus.RESOLVED) {
        ticket.resolvedAt = new Date().toISOString();
        
        // --- TRIGGER RESOLUTION EMAIL ---
        const subject = `[AUIS Help Desk] Ticket Resolved: ${ticket.id}`;
        const body = `Dear ${ticket.reporterName},\n\nYour ticket regarding "${ticket.subject}" has been marked as RESOLVED.\n\nIf you are still experiencing issues, please reply to this email or submit a new ticket.\n\nThank you,\nIT Support Team`;
        sendMockEmail(ticket.reporterEmail, subject, body);
        // --------------------------------
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets));
  }
};

export const addInternalNote = async (id: string, note: string): Promise<void> => {
    const tickets = getTicketsFromStorage();
    const ticketIndex = tickets.findIndex(t => t.id === id);
    if (ticketIndex > -1) {
        if (!tickets[ticketIndex].internalNotes) tickets[ticketIndex].internalNotes = [];
        tickets[ticketIndex].internalNotes.push(note);
        tickets[ticketIndex].updatedAt = new Date().toISOString();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets));
    }
}

export const updateTicketAi = async (id: string, updates: Partial<Ticket>): Promise<void> => {
    const tickets = getTicketsFromStorage();
    const ticketIndex = tickets.findIndex(t => t.id === id);
    if (ticketIndex > -1) {
        tickets[ticketIndex] = { ...tickets[ticketIndex], ...updates };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets));
    }
}
