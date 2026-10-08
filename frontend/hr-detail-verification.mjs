export default async function run(page, ui) {
  const before = await ui.snapshot(); const refs = [...before.matchAll(/@(e\d+) textbox/g)].map((m) => m[1]); const signIn = before.match(/@(e\d+) button "Sign in"/i)?.[1];
  await ui.fill(`@${refs[0]}`, 'hr.admin@pt-nusantara-teknologi.co.id'); await ui.fill(`@${refs[1]}`, 'Password123!'); await ui.click(`@${signIn}`); await page.waitForTimeout(900);
  await page.goto('http://127.0.0.1:5174/hr/learning-paths'); await page.waitForTimeout(800);
  const links = await page.locator('a[href^="/hr/learning-paths/"]').evaluateAll((els) => els.map((e) => e.getAttribute('href')));
  if (!links.length) return { listUrl: page.url(), body: (await page.locator('body').innerText()).slice(0, 1600), links };
  await page.goto(`http://127.0.0.1:5174${links[0]}`); await page.waitForTimeout(900);
  return { listUrl: 'ok', detailUrl: page.url(), body: (await page.locator('body').innerText()).slice(0, 3000), links };
}
