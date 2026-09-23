const TYPE_ICONS = { TEXT: '📄', VIDEO: '🎬', PDF: '📑', DOCUMENT: '📁', LINK: '🔗' };

export function LessonItem({ lesson, onEdit, onDelete }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl hover:bg-cream/60 transition group">
      <div className="flex items-center gap-3 min-w-0">
        <span aria-hidden="true">{TYPE_ICONS[lesson.type] || '📄'}</span>
        <div className="min-w-0">
          <p className="text-sm text-espresso truncate">{lesson.title}</p>
          <p className="text-xs text-espresso/40">
            {lesson.type}
            {lesson.duration ? ` · ${lesson.duration} min` : ''}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition">
        <button type="button" onClick={onEdit} className="text-xs text-espresso/60 hover:text-gold">
          Edit
        </button>
        <button type="button" onClick={onDelete} className="text-xs text-espresso/60 hover:text-burgundy">
          Delete
        </button>
      </div>
    </div>
  );
}

export default LessonItem;
