const BASE = process.env.LMS_FRONTEND_URL || 'http://127.0.0.1:5174';
const accounts = {
  COMPANY_ADMIN: { username: process.env.LMS_ADMIN_USER, password: process.env.LMS_ADMIN_PASSWORD },
  EMPLOYEE: { username: process.env.LMS_EMPLOYEE_USER, password: process.env.LMS_EMPLOYEE_PASSWORD },
  INSTRUCTOR: { username: process.env.LMS_INSTRUCTOR_USER, password: process.env.LMS_INSTRUCTOR_PASSWORD },
};

async function login(page, ui, account) {
  await page.goto(`${BASE}/login`);
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  const snapshot = await ui.snapshot();
  const inputs = [...snapshot.matchAll(/@(e\d+) textbox/g)].map((m) => m[1]);
  const signIn = snapshot.match(/@(e\d+) button "Sign In"/i)?.[1];
  if (!inputs[0] || !inputs[1] || !signIn) throw new Error('Login form was not available');
  await ui.fill(`@${inputs[0]}`, account.username);
  await ui.fill(`@${inputs[1]}`, account.password);
  await ui.click(`@${signIn}`);
  await page.waitForTimeout(800);
  return page.url();
}

async function body(page) { return (await page.locator('body').innerText()).slice(0, 1200); }
async function visit(page, path) {
  await page.goto(`${BASE}${path}`);
  await page.waitForTimeout(450);
  return { path, url: page.url(), text: await body(page), hasLoading: (await page.locator('text=Loading').count()) > 0 };
}
async function logout(page) {
  const button = page.getByRole('button', { name: /sign out|logout/i }).first();
  if (await button.count()) { await button.click(); await page.waitForTimeout(350); }
}

export default async function run(page, ui) {
  const result = { roles: {}, live: {}, security: {}, responseShapes: {}, consoleRelevant: true };
  const failures = [];
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  for (const [role, account] of Object.entries(accounts)) {
    if (!account.username || !account.password) throw new Error(`Missing credentials for ${role}`);
    const loginUrl = await login(page, ui, account);
    await page.waitForTimeout(250);
    const meResponse = null;
    const rolePaths = {
      COMPANY_ADMIN: ['/hr', '/hr/courses', '/hr/trainings', '/hr/certifications', '/hr/competencies', '/hr/announcements', '/hr/audit-logs', '/hr/learning-paths'],
      EMPLOYEE: ['/employee', '/employee/courses', '/employee/quizzes', '/employee/certificates', '/employee/competencies', '/employee/learning-paths', '/employee/announcements', '/employee/quiz-history'],
      INSTRUCTOR: ['/instructor', '/instructor/courses', '/instructor/learners', '/instructor/quizzes'],
    }[role];
    const pages = [];
    for (const path of rolePaths) {
      pages.push(await visit(page, path));
      if (pages.length >= 5 && role !== 'COMPANY_ADMIN') break;
    }
    result.roles[role] = { loginUrl, meStatus: meResponse?.status() ?? null, pages };
    if (pages.some((item) => item.hasLoading && item.text.length < 180)) failures.push(`${role} has a stuck loading page`);
    await logout(page);
  }

  await login(page, ui, accounts.COMPANY_ADMIN);
  const adminMe = await visit(page, '/hr');
  result.responseShapes.adminDashboard = { url: adminMe.url, containsDashboard: /Dashboard/i.test(adminMe.text) };
  await page.goto(`${BASE}/hr/learning-paths`); await page.waitForTimeout(600);
  const pathLinks = page.locator('a[href^="/hr/learning-paths/"]');
  const pathCount = await pathLinks.count();
  if (!pathCount) failures.push('No existing learning path available for assignment test');
  let pathHref = null;
  if (pathCount) {
    pathHref = await pathLinks.first().getAttribute('href');
    await page.goto(`${BASE}${pathHref}`); await page.waitForTimeout(600);
    const publish = page.getByRole('button', { name: 'Publish', exact: true });
    if (await publish.count()) { await publish.click(); await page.waitForTimeout(600); }
    const selects = page.locator('select');
    const selectCount = await selects.count();
    const employeeSelect = selectCount > 1 ? selects.nth(1) : selects.first();
    const employeeOption = await employeeSelect.locator('option').evaluateAll((options) => options.find((option) => option.value && !/select/i.test(option.textContent))?.value || null);
    const assignButton = page.getByRole('button', { name: /Assign learning path/i });
    if (employeeOption && await assignButton.count()) {
      await employeeSelect.selectOption(employeeOption);
      await assignButton.click();
      await page.waitForTimeout(800);
      result.live.assignment = { pathHref, assigned: !/Unable to assign|error/i.test(await body(page)) };
    } else result.live.assignment = { pathHref, assigned: false, reason: 'No employee option or assign control' };
  }
  await logout(page);

  await login(page, ui, accounts.EMPLOYEE);
  await page.goto(`${BASE}/employee/learning-paths`); await page.waitForTimeout(700);
  const employeePathText = await body(page);
  result.live.assignment = { ...(result.live.assignment || {}), employeeSeesAssignedPath: pathHref ? employeePathText.length > 0 && !/No learning paths assigned/i.test(employeePathText) : null };
  const courseLinks = page.locator('a[href^="/employee/courses/"]');
  if (await courseLinks.count()) {
    const courseHref = await courseLinks.first().getAttribute('href');
    await page.goto(`${BASE}${courseHref}`); await page.waitForTimeout(700);
    const before = await body(page);
    const complete = page.getByRole('button', { name: /Mark Complete/i }).first();
    if (await complete.count()) {
      await complete.click(); await page.waitForTimeout(800);
      const after = await body(page);
      await page.reload(); await page.waitForTimeout(700);
      const refreshed = await body(page);
      result.live.progress = { courseHref, completionTriggered: true, changedOrPersisted: after !== before || refreshed !== before, refreshed: /Progress|Completed/i.test(refreshed) };
    } else result.live.progress = { courseHref, completionTriggered: false, reason: 'No incomplete lesson available' };
  } else result.live.progress = { completionTriggered: false, reason: 'No enrolled course available' };
  await page.goto(`${BASE}/employee/announcements`); await page.waitForTimeout(500);
  await logout(page);

  await login(page, ui, accounts.COMPANY_ADMIN);
  await page.goto(`${BASE}/hr/announcements`); await page.waitForTimeout(600);
  const title = `Authenticated workflow ${Date.now()}`;
  const form = page.locator('form').first();
  await form.locator('input').first().fill(title);
  await form.locator('textarea').first().fill('Authenticated database notification verification.');
  await form.getByRole('button', { name: /Save draft/i }).click();
  await page.waitForTimeout(600);
  const article = page.locator('article').filter({ hasText: title }).first();
  const publishAnnouncement = article.getByRole('button', { name: 'Publish', exact: true });
  if (await publishAnnouncement.count()) { await publishAnnouncement.click(); await page.waitForTimeout(800); }
  result.live.announcement = { title, published: /Authenticated workflow/.test(await body(page)) };
  await logout(page);

  await login(page, ui, accounts.EMPLOYEE);
  await page.goto(`${BASE}/employee/announcements`); await page.waitForTimeout(700);
  const announcementText = await body(page);
  await page.goto(`${BASE}/employee`); await page.waitForTimeout(700);
  const notificationText = await body(page);
  result.live.notification = { announcementVisible: announcementText.includes(title), notificationSurfaceLoaded: /Notifications/i.test(notificationText) };
  result.security.frontendStorage = await page.evaluate(() => ({ localStorage: Object.keys(localStorage), sessionStorage: Object.keys(sessionStorage) }));
  await logout(page);

  await login(page, ui, accounts.EMPLOYEE);
  await page.goto(`${BASE}/hr`); await page.waitForTimeout(600);
  result.security.employeeHrRedirect = page.url();
  await page.goto(`${BASE}/hr/audit-logs`); await page.waitForTimeout(600);
  result.security.employeeAuditRedirect = page.url();
  await logout(page);

  result.pageErrors = pageErrors;
  result.failures = failures;
  return result;
}
