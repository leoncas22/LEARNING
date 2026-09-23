async function login(page, ui, email) {
  await page.goto('http://127.0.0.1:5174/login');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  const snapshot = await ui.snapshot();
  const refs = [...snapshot.matchAll(/@(e\d+) textbox/g)].map((m) => m[1]);
  const signIn = snapshot.match(/@(e\d+) button "Sign in"/i)?.[1];
  await ui.fill(`@${refs[0]}`, email); await ui.fill(`@${refs[1]}`, 'Password123!'); await ui.click(`@${signIn}`);
  await page.waitForTimeout(900);
}
async function inspect(page, path) { await page.goto(`http://127.0.0.1:5174${path}`); await page.waitForTimeout(650); return { path, url: page.url(), text: (await page.locator('body').innerText()).slice(0, 1800) }; }
async function addLesson(page, type, title, value) {
  const add = page.getByRole('button', { name: '+ Add Lesson', exact: true }).first();
  if (!(await add.count())) return { error: 'add lesson control missing' };
  await add.click(); await page.waitForTimeout(200);
  const modal = page.locator('form').last();
  const inputs = modal.locator('input');
  await inputs.nth(0).fill(title);
  await modal.locator('select').selectOption(type);
  if (type === 'TEXT') await modal.locator('textarea').fill(value);
  if (type === 'VIDEO' || type === 'LINK') await inputs.nth(1).fill(value);
  await modal.getByRole('button', { name: type === 'TEXT' ? 'Add Lesson' : 'Add Lesson', exact: true }).click();
  await page.waitForTimeout(700);
  return { type, title, present: (await page.locator('body').innerText()).includes(title) };
}
export default async function run(page, ui) {
  const result = { instructor: {}, employee: {}, hr: {} };
  await login(page, ui, 'instructor1@pt-nusantara-teknologi.co.id');
  result.instructor.dashboard = await inspect(page, '/instructor');
  result.instructor.courses = await inspect(page, '/instructor/courses');
  const href = await page.locator('a[href^="/instructor/courses/"]').first().getAttribute('href');
  result.instructor.courseHref = href;
  if (href) {
    await page.goto(`http://127.0.0.1:5174${href}`); await page.waitForTimeout(700);
    result.instructor.before = (await page.locator('body').innerText()).slice(0, 1600);
    result.instructor.text = await addLesson(page, 'TEXT', 'Phase 11 Verified Text', '<p>Verified article content.</p>');
    result.instructor.video = await addLesson(page, 'VIDEO', 'Phase 11 Verified Video', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    result.instructor.link = await addLesson(page, 'LINK', 'Phase 11 Verified Link', 'https://www.example.com/learning');
    result.instructor.afterCreate = (await page.locator('body').innerText()).slice(0, 2200);
    await page.reload(); await page.waitForTimeout(700); result.instructor.afterRefresh = (await page.locator('body').innerText()).slice(0, 2200);
  }
  await login(page, ui, 'employee1@pt-nusantara-teknologi.co.id');
  result.employee.courses = await inspect(page, '/employee/courses');
  const employeeHref = await page.locator('a[href^="/employee/courses/"]').first().getAttribute('href'); result.employee.courseHref = employeeHref;
  if (employeeHref) { result.employee.course = await inspect(page, employeeHref); result.employee.types = await page.locator('aside button').evaluateAll((bs) => bs.map((b) => b.innerText)); }
  await login(page, ui, 'hr.admin@pt-nusantara-teknologi.co.id');
  for (const p of ['/hr', '/hr/courses', '/hr/trainings', '/hr/learning-paths']) result.hr[p] = await inspect(page, p);
  return result;
}
