import { useEffect, useState } from 'react';
import { listNotifications, markAllNotificationsRead, markNotificationRead } from '../services/notificationService';

export default function NotificationBell() {
  const [open, setOpen] = useState(false); const [items, setItems] = useState([]); const [unread, setUnread] = useState(0);
  async function load() { try { const result = await listNotifications({ limit: 8 }); setItems(result.data); setUnread(result.unreadCount); } catch { /* notifications should not block navigation */ } }
  useEffect(() => { load(); }, []);
  async function read(item) { if (!item.isRead) { await markNotificationRead(item.id); setUnread((value) => Math.max(0, value - 1)); setItems((rows) => rows.map((row) => row.id === item.id ? { ...row, isRead: true } : row)); } }
  async function readAll() { await markAllNotificationsRead(); setUnread(0); setItems((rows) => rows.map((row) => ({ ...row, isRead: true }))); }
  return <div className="relative"><button type="button" onClick={() => setOpen((value) => !value)} className="relative text-sm text-espresso/70 hover:text-espresso" aria-label="Notifications">Notifications{unread > 0 && <span className="ml-1 inline-flex min-w-5 justify-center rounded-full bg-burgundy px-1 text-xs text-white">{unread}</span>}</button>{open && <div className="absolute right-0 z-30 mt-2 w-80 rounded-2xl border-border-warm bg-white p-3 shadow-lg"><div className="flex justify-between px-2 pb-2"><strong className="text-sm text-espresso">Notifications</strong>{unread > 0 && <button type="button" onClick={readAll} className="text-xs text-gold">Mark all read</button>}</div>{items.length ? items.map((item) => <button key={item.id} type="button" onClick={() => read(item)} className={`block w-full rounded-xl p-2 text-left text-xs ${item.isRead ? 'text-espresso/50' : 'bg-cream text-espresso'}`}><span className="font-medium">{item.title}</span><span className="mt-1 block line-clamp-2">{item.message}</span></button>) : <p className="px-2 py-4 text-xs text-espresso/50">No notifications.</p>}</div>}</div>;
}
