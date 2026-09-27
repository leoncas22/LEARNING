const BASE = process.env.LMS_FRONTEND_URL || 'http://127.0.0.1:5174';
const roles = [
  ['COMPANY_ADMIN', process.env.LMS_ADMIN_USER, process.env.LMS_ADMIN_PASSWORD, '/hr'],
  ['EMPLOYEE', process.env.LMS_EMPLOYEE_USER, process.env.LMS_EMPLOYEE_PASSWORD, '/employee'],
  ['INSTRUCTOR', process.env.LMS_INSTRUCTOR_USER, process.env.LMS_INSTRUCTOR_PASSWORD, '/instructor'],
];

export default async function run(page, ui) {
  const result = { roles: [], expectedBootstrap401: true, failures: [] };
  const failed = [];
  page.on('requestfailed', (request) => {
    if (!request.url().includes('/api/auth/me') && !request.url().includes('/api/auth/refresh')) {
      failed.push({ url: request.url(), error: request.failure()?.errorText });
    }
  });
  for (const [role, username, password, home] of roles) {
    if (!username || !password) { result.roles.push({ role, status: 'missing-environment-credentials' }); continue; }
    await page.goto(`${BASE}/login`);
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    const initial = await ui.snapshot();
    const fields = [...initial.matchAll(/@(e\d+) textbox/g)].map((m) => m[1]);
    const button = initial.match(/@(e\d+) button "Sign In"/i)?.[1];
    const loginResponsePromise = page.waitForResponse((r) => r.url().includes('/api/auth/login') && r.request().method() === 'POST', { timeout: 10000 });
    await ui.fill(`@${fields[0]}`, username);
    await ui.fill(`@${fields[1]}`, password);
    await ui.click(`@${button}`);
    const loginResponse = await loginResponsePromise;
    const loginPayload = await loginResponse.json();
    await page.waitForTimeout(500);
    const url = page.url();
    const text = await page.locator('body').innerText();
    const storage = await page.evaluate(() => ({ localStorage: Object.keys(localStorage), sessionStorage: Object.keys(sessionStorage) }));
    result.roles.push({ role, loginStatus: loginResponse.status(), returnedRole: loginPayload.data?.user?.role, returnedCompany: Boolean(loginPayload.data?.user?.company), accessTokenReturned: Boolean(loginPayload.data?.accessToken), sensitiveFields: JSON.stringify(loginPayload).includes('password'), homeUrl: url, homeLoaded: url.includes(home), identityVisible: text.includes(loginPayload.data?.user?.name || '__missing__'), storage });
    if (loginResponse.status() !== 200 || loginPayload.data?.user?.role !== role || !url.includes(home)) failed.push(role);
    const logout = page.getByRole('button', { name: /log out/i }).first();
    if (await logout.count()) { await logout.click(); await page.waitForTimeout(350); }
  }
  result.failures = failed;
  return result;
}
