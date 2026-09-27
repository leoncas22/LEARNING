const BASE = process.env.LMS_FRONTEND_URL || 'http://127.0.0.1:5174';
const admin = { username: process.env.LMS_ADMIN_USER, password: process.env.LMS_ADMIN_PASSWORD };
const employee = { username: process.env.LMS_EMPLOYEE_USER, password: process.env.LMS_EMPLOYEE_PASSWORD };
async function login(page, ui, account) {
  await page.goto(`${BASE}/login`); const snapshot = await ui.snapshot();
  const fields = [...snapshot.matchAll(/@(e\d+) textbox/g)].map((m) => m[1]); const button = snapshot.match(/@(e\d+) button "Sign In"/i)?.[1];
  const p = page.waitForResponse((r) => r.url().includes('/api/auth/login') && r.request().method() === 'POST'); await ui.fill(`@${fields[0]}`, account.username); await ui.fill(`@${fields[1]}`, account.password); await ui.click(`@${button}`); const r = await p; return { status: r.status(), payload: await r.json() };
}
async function api(page, path, token, options = {}) { return page.evaluate(async ({ path, token, options }) => { const r = await fetch(path, { ...options, headers: { ...(options.headers || {}), Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }); return { status: r.status, payload: await r.json().catch(() => ({})) }; }, { path, token, options }); }
export default async function run(page, ui) {
  const result = { failures: {} }; const title = `Phase 12 E2E Announcement ${Date.now()}`;
  const a = await login(page, ui, admin); result.adminLogin = a.status; const at = a.payload.data.accessToken;
  await page.goto(`${BASE}/hr/announcements`); await page.waitForTimeout(700); const form = page.locator('form').first();
  await form.locator('input').first().fill(title); await form.locator('textarea').first().fill('Database-backed notification verification.');
  const createPromise = page.waitForResponse((r) => r.url().endsWith('/api/announcements') && r.request().method() === 'POST'); await form.getByRole('button', { name: /Save draft/i }).click(); const created = await createPromise; result.createStatus = created.status(); const createdPayload = await created.json(); const id = createdPayload.data?.id;
  await page.waitForTimeout(500); const article = page.locator('article').filter({ hasText: title }).first(); const publishPromise = page.waitForResponse((r) => r.url().includes(`/api/announcements/${id}/publish`) && r.request().method() === 'POST'); await article.getByRole('button', { name: 'Publish', exact: true }).click(); const published = await publishPromise; result.publishStatus = published.status();
  const e = await login(page, ui, employee); result.employeeLogin = e.status; const et = e.payload.data.accessToken;
  const notifications = await api(page, '/api/notifications?limit=100', et); result.notificationsStatus = notifications.status; const match = (notifications.payload.data || []).find((n) => n.title === title); result.notificationFound = Boolean(match); result.unreadCount = notifications.payload.unreadCount;
  if (match) { const read = await api(page, `/api/notifications/${match.id}/read`, et, { method: 'PATCH' }); result.markReadStatus = read.status; const after = await api(page, '/api/notifications?limit=100', et); result.unreadAfterRead = after.payload.unreadCount; }
  await page.goto(`${BASE}/employee/announcements`); await page.waitForTimeout(600); result.announcementVisible = (await page.locator('body').innerText()).includes(title);
  if (result.createStatus !== 201 || result.publishStatus !== 200) result.failures.announcement = 'Create/publish response status unexpected'; if (!result.notificationFound) result.failures.notification = 'Published announcement did not create employee notification'; if (!result.announcementVisible) result.failures.ui = 'Employee announcement UI did not show published announcement'; return result;
}
