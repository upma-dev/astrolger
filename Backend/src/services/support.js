import { Ticket, User, Astrologer } from '../models/index.js';
import { pushAdmins } from './push.js';

/* Shared support-ticket helpers (customer app, astrologer app, login screen, admin). */

export const SUBJECTS = ['Payment / wallet', 'Consultation', 'Account / login', 'Payout', 'KYC', 'Other'];
const clean = (v, max) => String(v || '').trim().slice(0, max);

// The conversation, including tickets created before threads existed (message + single reply).
export function thread(t) {
  const o = t.toObject ? t.toObject() : t;
  const msgs = o.messages?.length ? o.messages : [
    ...(o.message ? [{ from: 'customer', text: o.message, at: o.createdAt }] : []),
    ...(o.reply ? [{ from: 'admin', text: o.reply, at: o.updatedAt }] : []),
  ];
  return { ...o, messages: msgs };
}

export async function createTicket({ app, ownerId, guest, source = 'app', subject, message }) {
  const text = clean(message, 2000);
  if (text.length < 3) { const e = new Error('Please write your message'); e.status = 400; throw e; }
  const doc = { app, source, subject: clean(subject, 80) || 'Other', message: text, messages: [{ from: 'customer', text }], unreadAdmin: true };
  if (ownerId) doc[app === 'astrologer' ? 'astrologer' : 'user'] = ownerId;
  if (guest) {
    doc.guest = { name: clean(guest.name, 60), phone: clean(guest.phone, 15).replace(/\D/g, '').slice(-10) };
    // Same number as an existing account: link it so the reply also shows in that person's profile.
    const Model = app === 'astrologer' ? Astrologer : User;
    const found = doc.guest.phone ? await Model.findOne({ phone: doc.guest.phone }).select('_id') : null;
    if (found) doc[app === 'astrologer' ? 'astrologer' : 'user'] = found._id;
  }
  return Ticket.create(doc);
}

export async function addMessage(ticket, from, text) {
  const body = clean(text, 2000);
  if (!body) { const e = new Error('Message is empty'); e.status = 400; throw e; }
  if (!ticket.messages?.length) Object.assign(ticket, { messages: thread(ticket).messages });
  ticket.messages.push({ from, text: body });
  if (from === 'customer') { ticket.status = 'open'; ticket.unreadAdmin = true; ticket.unreadOwner = false; }
  else { ticket.unreadOwner = true; ticket.unreadAdmin = false; ticket.reply = body; }
  await ticket.save();
  return ticket;
}

// Lets open admin panels refresh their badges/lists at once.
export const notifyAdmins = (req, t) => {
  const last = t.messages?.[t.messages.length - 1]?.text || t.message || '';
  const who = t.guest?.name || (t.app === 'astrologer' ? 'An astrologer' : 'A customer');
  req.app.get('io')?.to('admins').emit('support:update', { id: String(t._id), app: t.app, text: last.slice(0, 140), who });
  pushAdmins({ title: `New ${t.app === 'astrologer' ? 'astrologer' : 'customer'} support message`, body: `${t.subject ? t.subject + ': ' : ''}${last}`, link: t.app === 'astrologer' ? '/admin/astro/support' : '/admin/users/support', kind: 'chat', tag: `ticket-${t._id}` });
};
