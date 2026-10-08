async function login(page, ui, email) {
  await page.goto('http://127.0.0.1:5174/login');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  const snapshot = await ui.snapshot();
  const refs = [...snapshot.matchAll(/@(e\d+) textbox/g)].map((m) => m[1]);
  const signIn = snapshot.match(/@(e\d+) button "Sign in"/i)?.[1];
  await ui.fill(`@${refs[0]}`, email);
  await ui.fill(`@${refs[1]}`, 'Password123!');
  await ui.click(`@${signIn}`);
  await page.waitForTimeout(700);
}

async function createLesson(page, type, title, value) {
  await page.getByRole('button', { name: '+ Add Lesson', exact: true }).first().click();
  await page.waitForTimeout(150);
  const form = page.locator('form').last();
  await form.getByLabel('Title').fill(title);
  await form.getByLabel('Type').selectOption(type);
  if (type === 'TEXT') await form.getByLabel('Content').fill(value);
  if (type === 'VIDEO') await form.getByLabel('Video URL').fill(value);
  if (type === 'LINK') await form.getByLabel('External URL').fill(value);
  await form.getByRole('button', { name: 'Add Lesson', exact: true }).click();
  await page.waitForTimeout(650);
}

export default async function run(page, ui) {
  await login(page, ui, 'instructor1@pt-nusantara-teknologi.co.id');
  await page.goto('http://127.0.0.1:5174/instructor/courses');
  await page.waitForTimeout(650);
  const courseHref = await page.locator('a[href^="/instructor/courses/"]').first().getAttribute('href');
  if (!courseHref) return { error: 'No instructor course link', body: await page.locator('body').innerText() };
  await page.goto(`http://127.0.0.1:5174${courseHref}`);
  await page.waitForTimeout(700);
  const before = (await page.locator('body').innerText()).slice(0, 2200);
  await createLesson(page, 'TEXT', 'Verified Text Article', '<p>Read this rich learning article.</p>');
  await createLesson(page, 'VIDEO', 'Verified Video Resource', 'https://example.com/training.mp4');
  await createLesson(page, 'LINK', 'Verified External Resource', 'https://www.example.com/learning');
  const afterCreate = (await page.locator('body').innerText()).slice(0, 3000);
  await page.reload();
  await page.waitForTimeout(650);
  const afterRefresh = (await page.locator('body').innerText()).slice(0, 3000);
  await page.goto('http://127.0.0.1:5174/employee/courses');
  await page.waitForTimeout(650);
  const employeeCourseHref = await page.locator('a[href^="/employee/courses/"]').first().getAttribute('href');
  let employee = { href: employeeCourseHref };
  if (employeeCourseHref) {
    await page.goto(`http://127.0.0.1:5174${employeeCourseHref}`);
    await page.waitForTimeout(700);
    employee.body = (await page.locator('body').innerText()).slice(0, 2600);
    employee.types = await page.locator('aside button').evaluateAll((buttons) => buttons.map((b) => b.innerText));
  }
  return { courseHref, before, afterCreate, afterRefresh, employee };
}
