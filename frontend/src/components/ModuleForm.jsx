import { useState } from 'react';

const inputClass =
  'w-full rounded-xl border border-border-warm bg-white px-4 py-2.5 text-espresso placeholder:text-espresso/30 focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold transition';

export function ModuleForm({ initial, onSubmit, onCancel, submitLabel = 'Save' }) {
  const [title, setTitle] = useState(initial?.title || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await onSubmit({ title, description });
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="rounded-xl border border-burgundy/20 bg-burgundy/5 text-burgundy text-sm px-4 py-2.5">{error}</div>}
      <div>
        <label className="block text-sm font-medium text-espresso mb-1.5">Module Title</label>
        <input required value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} placeholder="Introduction to Company" />
      </div>
      <div>
        <label className="block text-sm font-medium text-espresso mb-1.5">Description</label>
        <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className={inputClass} />
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 rounded-xl border border-border-warm text-sm font-medium text-espresso hover:bg-cream transition">
          Cancel
        </button>
        <button type="submit" disabled={isSubmitting} className="px-4 py-2 rounded-xl bg-espresso text-cream text-sm font-medium hover:bg-espresso/90 transition disabled:opacity-50">
          {isSubmitting ? 'Saving...' : submitLabel}
        </button>
      </div>
    </form>
  );
}

export default ModuleForm;
