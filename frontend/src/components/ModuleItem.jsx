import LessonItem from './LessonItem';

export function ModuleItem({ module: mod, index, onEditModule, onDeleteModule, onAddLesson, onEditLesson, onDeleteLesson }) {
  return (
    <div className="border border-border-warm rounded-2xl overflow-hidden bg-white">
      <div className="flex items-center justify-between px-5 py-4 bg-cream/40">
        <div>
          <p className="text-xs text-espresso/40 font-medium">Module {index + 1}</p>
          <h3 className="text-sm font-semibold text-espresso">{mod.title}</h3>
          {mod.description && <p className="text-xs text-espresso/50 mt-0.5">{mod.description}</p>}
        </div>
        <div className="flex items-center gap-3">
          <button type="button" onClick={onEditModule} className="text-xs text-espresso/60 hover:text-gold">
            Edit
          </button>
          <button type="button" onClick={onDeleteModule} className="text-xs text-espresso/60 hover:text-burgundy">
            Delete
          </button>
        </div>
      </div>
      <div className="divide-y divide-border-warm/60">
        {mod.lessons.length === 0 ? (
          <p className="px-5 py-4 text-sm text-espresso/40">No lessons yet.</p>
        ) : (
          mod.lessons.map((lesson) => (
            <LessonItem key={lesson.id} lesson={lesson} onEdit={() => onEditLesson(lesson)} onDelete={() => onDeleteLesson(lesson)} />
          ))
        )}
      </div>
      <div className="px-5 py-3 border-t border-border-warm">
        <button type="button" onClick={onAddLesson} className="text-sm text-gold hover:underline font-medium">
          + Add Lesson
        </button>
      </div>
    </div>
  );
}

export default ModuleItem;
