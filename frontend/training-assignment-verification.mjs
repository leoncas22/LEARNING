const BASE = process.env.LMS_FRONTEND_URL || 'http://127.0.0.1:5174';
const admin = { username: process.env.LMS_ADMIN_USER, password: process.env.LMS_ADMIN_PASSWORD };
const employee = { username: process.env.LMS_EMPLOYEE_USER, password: process.env.LMS_EMPLOYEE_PASSWORD };

async function login(page, ui, account) {
  await page.goto(`${BASE}/login`);
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  const snapshot = await ui.snapshot();
  const fields = [...snapshot.matchAll(/@(e\d+) textbox/g)].map((m) => m[1]);
  const button = snapshot.match(/@(e\d+) button "Sign In"/i)?.[1];
  await ui.fill(`@${fields[0]}`, account.username);
  await ui.fill(`@${fields[1]}`, account.password);
  const responsePromise = page.waitForResponse((r) => r.url().includes('/api/auth/login') && r.request().method() === 'POST');
  await ui.click(`@${button}`);
  const response = await responsePromise;
  if (!response.ok()) throw new Error(`Login failed with ${response.status()}`);
  return response.json();
}

export default async function run(page, ui) {
  const result = { admin: {}, employee: {}, failures: [] };
  const loginData = await login(page, ui, admin);
  result.admin.loginRole = loginData.data.user.role;
  await page.goto(`${BASE}/hr/learning-paths`);
  await page.waitForTimeout(700);
  const links = page.locator('a[href^="/hr/learning-paths/"]');
  const count = await links.count();
  result.admin.pathCount = count;
  if (!count) { result.failures.push('No learning path available'); return result; }
  const href = await links.first().getAttribute('href');
  result.admin.pathHref = href;
  await page.goto(`${BASE}${href}`);
  await page.waitForTimeout(700);
  const statusBefore = (await page.locator('body').innerText()).match(/\b(DRAFT|PUBLISHED|ARCHIVED)\b/)?.[1] || null;
  const publish = page.getByRole('button', { name: 'Publish', exact: true });
  if (await publish.count()) {
    const publishResponse = page.waitForResponse((r) => r.url().includes('/publish') && r.request().method() === 'POST');
    await publish.click();
    const response = await publishResponse;
    result.admin.publishStatus = response.status();
    await page.waitForTimeout(600);
  }
  const selects = page.locator('select');
  const selectCount = await selects.count();
  result.admin.selectCount = selectCount;
  const employeeSelect = selectCount >= 2 ? selects.nth(2) : selects.nth(1);
  const employeeValue = await employeeSelect.locator('option').evaluateAll((options) => options.find((option) => option.value && !/select/i.test(option.textContent))?.value || null);
  result.admin.employeeOptionAvailable = Boolean(employeeValue);
  if (!employeeValue) { result.failures.push('No employee assignment option available'); return result; }
  await employeeSelect.selectOption(employeeValue);
  const assign = page.getByRole('button', { name: 'Assign learning path', exact: true });
  if (!(await assign.count())) { result.failures.push('Assignment button unavailable'); return result; }
  const assignResponsePromise = page.waitForResponse((r) => r.url().includes('/assign') && r.request().method() === 'POST');
  await assign.click();
  const assignResponse = await assignResponsePromise;
  result.admin.assignmentStatus = assignResponse.status();
  result.admin.assignmentPayload = await assignResponse.json();
  await page.waitForTimeout(700);
  result.admin.pathTitle = await page.locator('h1').first().innerText();

  const employeeLogin = await login(page, ui, employee);
  await page.goto(`${BASE}/employee/learning-paths`);
  await page.waitForTimeout(800);
  const employeeAccessToken = employeeLogin.data.accessToken;
  const employeePathResponse = await page.evaluate(async (accessToken) => {
    const response = await fetch('/api/me/learning-paths', { headers: { Authorization: `Bearer ${accessToken}` } });
    return { status: response.status, payload: await response.json() };
  }, employeeAccessToken);
  result.employee.learningPathApiStatus = employeePathResponse.status;
  result.employee.learningPathCount = employeePathResponse.payload.data?.length ?? 0;
  result.employee.pathTitles = (employeePathResponse.payload.data || []).map((item) => item.title);
  result.employee.uiContainsAssignedPath = (await page.locator('body').innerText()).includes(result.admin.pathTitle);
  if (result.admin.assignmentStatus !== 201) result.failures.push('Assignment API did not return 201');
  if (!result.employee.pathTitles.includes(result.admin.pathTitle)) result.failures.push('Employee API did not return assigned path');
  return result;
}
