async function login(page, ui, email) {
  await page.context().clearCookies();
  await page.goto('http://127.0.0.1:5174/login');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  const snapshot = await ui.snapshot();
  const refs = [...snapshot.matchAll(/@(e\d+) textbox/g)].map((m) => m[1]);
  const signIn = snapshot.match(/@(e\d+) button "Sign in"/i)?.[1];
  await ui.fill(`@${refs[0]}`, email);
  await ui.fill(`@${refs[1]}`, 'Password123!');
  await ui.click(`@${signIn}`);
  await page.waitForTimeout(900);
}

async function inspect(page, path) {
  await page.goto(`http://127.0.0.1:5174${path}`);
  await page.waitForTimeout(500);
  return { path, body: (await page.locator('body').innerText()).slice(0, 1800) };
}

export default async function run(page, ui) {
  const result = {};
  await login(page, ui, 'hr.admin@pt-nusantara-teknologi.co.id');
  result.hr = [];
  for (const path of ['/hr', '/hr/announcements', '/hr/audit-logs', '/hr/courses', '/hr/quizzes', '/hr/certifications', '/hr/competencies']) result.hr.push(await inspect(page, path));
  await login(page, ui, 'employee1@pt-nusantara-teknologi.co.id');
  result.employee = [];
  for (const path of ['/employee', '/employee/courses', '/employee/quizzes', '/employee/certificates', '/employee/competencies', '/employee/announcements']) result.employee.push(await inspect(page, path));
  await login(page, ui, 'instructor1@pt-nusantara-teknologi.co.id');
  result.instructor = [];
  for (const path of ['/instructor', '/instructor/courses', '/instructor/learners', '/instructor/quizzes']) result.instructor.push(await inspect(page, path));
  return result;
}
