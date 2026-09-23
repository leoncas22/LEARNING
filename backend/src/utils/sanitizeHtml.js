import sanitizeHtml from 'sanitize-html';

/**
 * TEXT lessons store rich-text HTML (Lesson.content). Whatever the editor
 * sends is untrusted input — this is the ONLY point that content reaches
 * the database, so it's sanitized here, not "trusted because the frontend
 * already validated it".
 */
const OPTIONS = {
  allowedTags: [
    'p', 'br', 'strong', 'em', 'u', 's', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4',
    'blockquote', 'a', 'img', 'code', 'pre', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'span',
  ],
  allowedAttributes: {
    a: ['href', 'target', 'rel'],
    img: ['src', 'alt', 'width', 'height'],
    span: ['class'],
    '*': [],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  transformTags: {
    a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer', target: '_blank' }),
  },
};

export function sanitizeLessonContent(rawHtml) {
  if (typeof rawHtml !== 'string') return rawHtml;
  return sanitizeHtml(rawHtml, OPTIONS);
}

export default sanitizeLessonContent;
