import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import env from '../config/env.js';

/**
 * Every call site (lesson file upload today; course thumbnails, submission
 * attachments, etc. in later phases) talks to this module only — never to
 * `fs` or an S3 SDK directly. Swapping STORAGE_DRIVER=s3 (or supabase) in
 * production means implementing `uploadBuffer`/`getPublicUrl` here against
 * that provider's SDK; nothing else in the codebase changes.
 */

const uploadDir = path.resolve(process.cwd(), env.storage.localUploadDir);

function ensureLocalDirExists() {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
}

function safeExtension(originalName) {
  const ext = path.extname(originalName || '').toLowerCase();
  return /^\.[a-z0-9]{1,10}$/.test(ext) ? ext : '';
}

/**
 * Stores a file buffer and returns a URL the frontend can use directly as
 * Lesson.fileUrl. Local driver writes to disk and serves via a static
 * route; s3/supabase drivers would instead PUT to the bucket and return
 * its public/CDN URL.
 */
export async function uploadBuffer(buffer, originalName, { mimetype } = {}) {
  if (env.storage.driver === 'local') {
    ensureLocalDirExists();
    const filename = `${crypto.randomUUID()}${safeExtension(originalName)}`;
    fs.writeFileSync(path.join(uploadDir, filename), buffer);
    return { url: `/uploads/${filename}`, provider: 'local', mimetype: mimetype ?? null };
  }

  throw new Error(
    `Storage driver "${env.storage.driver}" is not implemented yet. ` +
      'Implement uploadBuffer() for it here — every call site is already provider-agnostic.'
  );
}

export default { uploadBuffer };
