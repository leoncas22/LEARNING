export default async function run(page, ui) {
  const before = await ui.snapshot();
  const fields = before.match(/@(e\d+) textbox/g) || [];
  const refs = [...before.matchAll(/@(e\d+) textbox/g)].map((m) => m[1]);
  if (refs.length < 2) return { error: 'login fields not found', snapshot: before };
  await ui.fill(`@${refs[0]}`, 'instructor1@pt-nusantara-teknologi.co.id');
  await ui.fill(`@${refs[1]}`, 'Password123!');
  const signIn = before.match(/@(e\d+) button "Sign in"/i)?.[1];
  if (!signIn) return { error: 'sign in button not found', snapshot: before };
  await ui.click(`@${signIn}`);
  await page.waitForTimeout(1200);
  const snapshot = await ui.snapshot({ full: true });
  return { url: page.url(), body: (await page.locator('body').innerText()).slice(0, 4000), snapshot: snapshot.slice(0, 8000) };
}
