export default async function run(page, ui) {
  const before = await ui.snapshot();
  const refs = [...before.matchAll(/@(e\d+) textbox/g)].map((m) => m[1]);
  const signIn = before.match(/@(e\d+) button "Sign in"/i)?.[1];
  await ui.fill(`@${refs[0]}`, 'instructor1@pt-nusantara-teknologi.co.id');
  await ui.fill(`@${refs[1]}`, 'Password123!');
  await ui.click(`@${signIn}`);
  await page.waitForTimeout(800);
  const paths = ['/instructor/courses', '/instructor/learners', '/instructor/quizzes'];
  const results = [];
  for (const path of paths) {
    await page.goto(`http://127.0.0.1:5174${path}`);
    await page.waitForTimeout(500);
    results.push({ path, body: (await page.locator('body').innerText()).slice(0, 1800), title: await page.title() });
  }
  return results;
}
