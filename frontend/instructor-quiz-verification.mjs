export default async function run(page, ui) {
  const before = await ui.snapshot();
  const refs = [...before.matchAll(/@(e\d+) textbox/g)].map((m) => m[1]);
  const signIn = before.match(/@(e\d+) button "Sign in"/i)?.[1];
  await ui.fill(`@${refs[0]}`, 'instructor1@pt-nusantara-teknologi.co.id');
  await ui.fill(`@${refs[1]}`, 'Password123!');
  await ui.click(`@${signIn}`);
  await page.waitForTimeout(1000);
  const afterLogin = { url: page.url(), body: (await page.locator('body').innerText()).slice(0, 1000) };
  await page.goto('http://127.0.0.1:5174/instructor/quizzes');
  await page.waitForTimeout(1000);
  return {
    afterLogin,
    quiz: {
      url: page.url(),
      body: (await page.locator('body').innerText()).slice(0, 2500),
      snapshot: (await ui.snapshot({ full: true })).slice(0, 5000),
    },
  };
}
