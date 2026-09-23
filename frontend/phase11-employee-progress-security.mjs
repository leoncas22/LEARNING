 async function login(page, ui, email) {
  await page.goto('http://127.0.0.1:5174/login'); await page.evaluate(() => localStorage.clear()); await page.reload();
  const s = await ui.snapshot(); const refs = [...s.matchAll(/@(e\d+) textbox/g)].map((m) => m[1]); const sign = s.match(/@(e\d+) button "Sign in"/i)?.[1];
  await ui.fill(`@${refs[0]}`, email); await ui.fill(`@${refs[1]}`, 'Password123!'); await ui.click(`@${sign}`); await page.waitForTimeout(800);
}
export default async function run(page, ui) {
  await login(page, ui, 'employee1@pt-nusantara-teknologi.co.id');
  await page.goto('http://127.0.0.1:5174/employee/courses'); await page.waitForTimeout(700);
  const card = page.locator('div.bg-white').filter({ hasText: 'Data Privacy Fundamentals' }).first();
  const courseHref = await card.locator('a[href^="/employee/courses/"]').getAttribute('href');
  const result = { courseHref };
  if (!courseHref) return { ...result, error: 'assigned test course link missing', body: await page.locator('body').innerText() };
  await page.goto(`http://127.0.0.1:5174${courseHref}`); await page.waitForTimeout(800);
  result.before = (await page.locator('body').innerText()).slice(0, 2400);
  result.contentTypes = await page.locator('aside button').evaluateAll((bs) => bs.map((b) => b.innerText));
  const textButton = page.locator('aside button').filter({ hasText: 'Phase 11 Verified Text' }).first();
  result.textLessonPresent = await textButton.count() > 0;
  if (result.textLessonPresent) { await textButton.click(); await page.waitForTimeout(250); }
  result.selectedText = (await page.locator('body').innerText()).slice(-900);
  const complete = page.getByRole('button', { name: 'Mark Complete', exact: true });
  result.canComplete = await complete.count() > 0;
  if (result.canComplete) { await complete.click(); await page.waitForTimeout(800); }
  result.afterComplete = (await page.locator('body').innerText()).slice(-1100);
  await page.reload(); await page.waitForTimeout(800); result.afterRefresh = (await page.locator('body').innerText()).slice(-1100);
  result.employeeLessonCreateStatus = await page.evaluate(async () => { const r = await fetch('/api/modules/00000-0000-0000-0000-000/lessons', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: 'unauthorized', type: 'TEXT', content: 'x' }) }); return r.status; });
  await page.goto('http://127.0.0.1:5174/employee/learning-paths'); await page.waitForTimeout(700);
  const pathLink = page.locator('a[href^="/employee/learning-paths/"]').first(); result.pathHref = await pathLink.getAttribute('href');
  if (result.pathHref) { await page.goto(`http://127.0.0.1:5174${result.pathHref}`); await page.waitForTimeout(700); result.path = (await page.locator('body').innerText()).slice(0, 1800); }
  return result;
}
