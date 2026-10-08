export default async function run(page, ui) {
  const before = await ui.snapshot(); const refs = [...before.matchAll(/@(e\d+) textbox/g)].map((m) => m[1]); const signIn = before.match(/@(e\d+) button "Sign in"/i)?.[1];
  await ui.fill(`@${refs[0]}`, 'employee1@pt-nusantara-teknologi.co.id'); await ui.fill(`@${refs[1]}`, 'Password123!'); await ui.click(`@${signIn}`); await page.waitForTimeout(900);
  const paths = ['/employee/learning-paths', '/employee/courses', '/employee/announcements']; const results = [];
  for (const path of paths) { await page.goto(`http://127.0.0.1:5174${path}`); await page.waitForTimeout(500); results.push({ path, url: page.url(), body: (await page.locator('body').innerText()).slice(0, 1400) }); }
  return results;
}
