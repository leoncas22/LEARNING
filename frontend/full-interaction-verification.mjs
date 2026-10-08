export default async function run(page, ui) {
  const before = await ui.snapshot(); const refs = [...before.matchAll(/@(e\d+) textbox/g)].map((m) => m[1]); const signIn = before.match(/@(e\d+) button "Sign in"/i)?.[1];
  await ui.fill(`@${refs[0]}`, 'hr.admin@pt-nusantara-teknologi.co.id'); await ui.fill(`@${refs[1]}`, 'Password123!'); await ui.click(`@${signIn}`); await page.waitForTimeout(700);
  const id = '521432cb-29e2-42b4-916c-41d770690a15';
  await page.goto(`http://127.0.0.1:5174/hr/learning-paths/${id}`); await page.waitForTimeout(900);
  const initial = (await page.locator('body').innerText()).slice(0, 2200);
  const selects = page.locator('select'); const selectCount = await selects.count();
  let addResult = 'not-run';
  if (selectCount > 0) { const options = await selects.nth(0).locator('option').evaluateAll((opts) => opts.map((o) => ({ value: o.value, text: o.textContent }))); const add = options.find((o) => o.value); if (add) { await selects.nth(0).selectOption(add.value); await page.getByRole('button', { name: 'Add', exact: true }).click(); await page.waitForTimeout(700); addResult = add.text; } }
  const afterAdd = (await page.locator('body').innerText()).slice(0, 2200);
  const up = page.getByRole('button', { name: '↑' }).first(); if (await up.count() && !(await up.isDisabled())) { await up.click(); await page.waitForTimeout(600); }
  await page.reload(); await page.waitForTimeout(700); const afterReorderRefresh = (await page.locator('body').innerText()).slice(0, 2200);
  const remove = page.getByRole('button', { name: 'Remove' }).last(); if (await remove.count()) { page.once('dialog', (dialog) => dialog.accept()); await remove.click(); await page.waitForTimeout(700); }
  const afterRemove = (await page.locator('body').innerText()).slice(0, 2200);
  const archive = page.getByRole('button', { name: 'Archive' }); if (await archive.count()) { await archive.click(); await page.waitForTimeout(700); }
  const archived = (await page.locator('body').innerText()).slice(0, 900);
  const publish = page.getByRole('button', { name: 'Publish' }); if (await publish.count()) { await publish.click(); await page.waitForTimeout(700); }
  const published = (await page.locator('body').innerText()).slice(0, 900);
  return { url: page.url(), selectCount, addResult, initial, afterAdd, afterReorderRefresh, afterRemove, archived, published };
}
