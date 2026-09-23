export default async function run(page, ui) {
  const before = await ui.snapshot();
  await ui.fill('@e1', 'hr.admin@pt-nusantara-teknologi.co.id');
  await ui.fill('@e2', 'Password123!');
  await ui.click('@e4');
  await page.waitForTimeout(1200);
  const url = page.url();
  const text = await page.locator('body').innerText();
  const after = await ui.snapshot({ full: true });
  return { url, text: text.slice(0, 3000), snapshot: after.slice(0, 6000) };
}
