export function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/**
 * Appends a short random suffix until `slug` is free on `model` (a Prisma
 * delegate with a unique `slug` column, e.g. prisma.company).
 */
export async function uniqueSlug(model, baseSlug) {
  let candidate = baseSlug;
  let attempt = 0;
  // eslint-disable-next-line no-await-in-loop
  while (await model.findUnique({ where: { slug: candidate } })) {
    attempt += 1;
    candidate = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}${attempt > 3 ? attempt : ''}`;
  }
  return candidate;
}

export default slugify;
