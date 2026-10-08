const BASE = process.env.LMS_FRONTEND_URL || 'http://127.0.0.1:5174';
const account = { username: process.env.LMS_ADMIN_USER, password: process.env.LMS_ADMIN_PASSWORD };

export default async function run(page, ui) {
  const result = { base: BASE, steps: [], failures: [], storage: null };
  const record = (step, status, detail = {}) => result.steps.push({ step, status, ...detail });
  page.on('requestfailed', (request) => result.failures.push({ url: request.url(), failure: request.failure()?.errorText || 'unknown' }));
  page.on('pageerror', (error) => result.failures.push({ step: 'pageerror', error: error.message }));

  try {
    const root = await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    record('GET frontend /login', root?.status() === 200 ? 'passed' : 'failed', { httpStatus: root?.status(), url: page.url() });
  } catch (error) { record('GET frontend /login', 'failed', { error: error.message }); return result; }

  const snapshot = await ui.snapshot();
  const fields = [...snapshot.matchAll(/@(e\d+) textbox/g)].map((match) => match[1]);
  const signIn = snapshot.match(/@(e\d+) button "Sign In"/i)?.[1];
  if (!account.username || !account.password) { record('environment credentials', 'failed', { reason: 'Missing LMS_ADMIN_USER/LMS_ADMIN_PASSWORD' }); return result; }
  if (!fields[0] || !fields[1] || !signIn) { record('login form', 'failed', { snapshot }); return result; }
  record('login form', 'passed');

  try {
    await ui.fill(`@${fields[0]}`, account.username);
    await ui.fill(`@${fields[1]}`, account.password);
    const loginResponsePromise = page.waitForResponse((response) => response.url().includes('/api/auth/login') && response.request().method() === 'POST', { timeout: 10000 });
    await ui.click(`@${signIn}`);
    const loginResponse = await loginResponsePromise;
    record('POST /api/auth/login', loginResponse.ok() ? 'passed' : 'failed', { httpStatus: loginResponse.status() });
  } catch (error) { record('POST /api/auth/login', 'failed', { error: error.message }); return result; }

  result.storage = await page.evaluate(() => ({ localStorage: Object.keys(localStorage), sessionStorage: Object.keys(sessionStorage) }));
  try {
    const meResponse = await page.waitForResponse((response) => response.url().includes('/api/auth/me') && response.request().method() === 'GET', { timeout: 10000 });
    record('GET /api/auth/me', meResponse.ok() ? 'passed' : 'failed', { httpStatus: meResponse.status() });
  } catch (error) { record('GET /api/auth/me', 'failed', { error: error.message }); }

  await page.waitForTimeout(500);
  record('protected /hr', /^\/hr/.test(new URL(page.url()).pathname) ? 'passed' : 'failed', { url: page.url(), text: (await page.locator('body').innerText()).slice(0, 300) });
  return result;
}
