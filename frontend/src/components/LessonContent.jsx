export function LessonContent({ lesson }) {
  if (!lesson) return null;

  switch (lesson.type) {
    case 'TEXT':
      return (
        <div
          className="prose prose-sm max-w-none text-espresso"
          // Safe: this HTML was sanitized server-side (sanitizeHtml.js) before
          // ever being stored — see the LMS core documentation's Security section. Never render
          // unsanitized user HTML this way.
          dangerouslySetInnerHTML={{ __html: lesson.content || '' }}
        />
      );
    case 'VIDEO': {
      let parsedUrl;
      try { parsedUrl = new URL(lesson.videoUrl); } catch { parsedUrl = null; }
      const host = parsedUrl?.hostname.replace(/^www\\./, '');
      const isEmbed = host === 'youtube.com' || host === 'youtu.be' || host === 'vimeo.com';
      const embedUrl = host === 'youtu.be'
        ? `https://www.youtube.com/embed/${parsedUrl.pathname.slice(1)}`
        : host === 'youtube.com' && parsedUrl.searchParams.get('v')
          ? `https://www.youtube.com/embed/${parsedUrl.searchParams.get('v')}`
          : host === 'vimeo.com'
            ? `https://player.vimeo.com/video/${parsedUrl.pathname.split('/').filter(Boolean).pop()}`
            : lesson.videoUrl;
      return isEmbed ? (
        <div className="aspect-video rounded-xl overflow-hidden bg-espresso">
          <iframe src={embedUrl} title={lesson.title} className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
        </div>
      ) : (
        <div className="aspect-video rounded-xl overflow-hidden bg-espresso">
          <video src={lesson.videoUrl} controls className="w-full h-full"><track kind="captions" /></video>
        </div>
      );
    }
    case 'PDF':
    case 'DOCUMENT':
      return (
        <div className="border border-border-warm rounded-xl p-6 text-center">
          <p className="text-sm text-espresso/60 mb-3">{lesson.fileName || 'This lesson includes a downloadable file.'}</p>
          <a
            href={lesson.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-4 py-2 rounded-xl bg-espresso text-cream text-sm font-medium hover:bg-espresso/90 transition"
          >
            Open File
          </a>
        </div>
      );
    case 'LINK':
      return (
        <div className="border border-border-warm rounded-xl p-6 text-center">
          <p className="text-sm text-espresso/60 mb-3">This lesson links to external content.</p>
          <a
            href={lesson.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-4 py-2 rounded-xl bg-espresso text-cream text-sm font-medium hover:bg-espresso/90 transition"
          >
            Open Link ↗
          </a>
        </div>
      );
    default:
      return <p className="text-sm text-espresso/50">Unsupported lesson type.</p>;
  }
}

export default LessonContent;
