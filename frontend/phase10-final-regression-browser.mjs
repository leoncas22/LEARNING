async function login(page, ui, email) {
  await page.context().clearCookies(); await page.goto('http://127.0.0.1:5174/login'); await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForTimeout(250);
  const snap = await ui.snapshot(); const refs = [...snap.matchAll(/@(e\d+) textbox/g)].map((m) => m[1]); const signIn = snap.match(/@(e\d+) button "Sign in"/i)?.[1];
  await ui.fill(`@${refs[0]}`, email); await ui.fill(`@${refs[1]}`, 'Password123!'); await ui.click(`@${signIn}`); await page.waitForTimeout(700);
}
async function check(page, path) { await page.goto(`http://127.0.0.1:5174${path}`); await page.waitForTimeout(400); return { path, url: page.url(), text: (await page.locator('body').innerText()).slice(0, 550) }; }
export default async function run(page, ui) {
  const result = {};
  await login(page, ui, 'hr.admin@pt-nusantara-teknologi.co.id'); result.admin = []; for (const p of ['/hr', '/hr/courses', '/hr/trainings', '/hr/learning-paths', '/hr/announcements', '/hr/audit-logs', '/hr/certifications', '/hr/competencies']) result.admin.push(await check(page, p));
  await login(page, ui, 'employee1@pt-nusantara-teknologi.co.id'); result.employee = []; for (const p of ['/employee/courses', '/employee/quizzes', '/employee/certificates', '/employee/competencies', '/employee/announcements', '/employee/learning-paths']) result.employee.push(await check(page, p));
  await login(page, ui, 'instructor1@pt-nusantara-teknologi.co.id'); result.instructor = []; for (const p of ['/instructor', '/instructor/courses', '/instructor/learners', '/instructor/quizzes']) result.instructor.push(await check(page, p));
  return result;
}
