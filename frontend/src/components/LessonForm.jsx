import { useState } from 'react';
import * as miscService from '../services/miscService';

const inputClass =
  'w-full rounded-xl border border-border-warm bg-white px-4 py-2.5 text-espresso placeholder:text-espresso/30 focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold transition';

const TYPES = [
  { value: 'TEXT', label: 'Text' },
  { value: 'VIDEO', label: 'Video' },
  { value: 'PDF', label: 'PDF' },
  { value: 'DOCUMENT', label: 'Document' },
  { value: 'LINK', label: 'Link' },
];

export function LessonForm({ initial, onSubmit, onCancel, submitLabel = 'Save' }) {
  const [title, setTitle] = useState(initial?.title || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [type, setType] = useState(initial?.type || 'TEXT');
  const [content, setContent] = useState(initial?.content || '');
  const [videoUrl, setVideoUrl] = useState(initial?.videoUrl || '');
  const [fileUrl, setFileUrl] = useState(initial?.fileUrl || '');
  const [duration, setDuration] = useState(initial?.duration || '');
  const [uploadProgress, setUploadProgress] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadProgress(0);
    try {
      const result = await miscService.uploadFile(file, setUploadProgress);
      setFileUrl(result.url);
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed.');
    } finally {
      setUploadProgress(null);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setFieldErrors({});
    setIsSubmitting(true);
    try {
      await onSubmit({
        title,
        description,
        type,
        content: type === 'TEXT' ? content : undefined,
        videoUrl: type === 'VIDEO' ? videoUrl : undefined,
        fileUrl: type === 'PDF' || type === 'DOCUMENT' || type === 'LINK' ? fileUrl : undefined,
        duration: duration ? Number(duration) : undefined,
      });
    } catch (err) {
      const data = err.response?.data;
      if (data?.error === 'VALIDATION_ERROR' && data.details) {
        setFieldErrors(data.details);
      } else {
        setError(data?.message || 'Something went wrong.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="rounded-xl border border-burgundy/20 bg-burgundy/5 text-burgundy text-sm px-4 py-2.5">{error}</div>}

      <div>
        <label className="block text-sm font-medium text-espresso mb-1.5">Title</label>
        <input required value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
      </div>

      <div>
        <label className="block text-sm font-medium text-espresso mb-1.5">Type</label>
        <select value={type} onChange={(e) => setType(e.target.value)} className={inputClass}>
          {TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {type === 'TEXT' && (
        <div>
          <label className="block text-sm font-medium text-espresso mb-1.5">Content</label>
          <textarea
            rows={6}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className={inputClass}
            placeholder="Lesson text (HTML is sanitized server-side)"
          />
          {fieldErrors.content && <p className="mt-1.5 text-sm text-burgundy">{fieldErrors.content}</p>}
        </div>
      )}

      {type === 'VIDEO' && (
        <div>
          <label className="block text-sm font-medium text-espresso mb-1.5">Video URL</label>
          <input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} className={inputClass} placeholder="https://..." />
          {fieldErrors.videoUrl && <p className="mt-1.5 text-sm text-burgundy">{fieldErrors.videoUrl}</p>}
        </div>
      )}

      {(type === 'PDF' || type === 'DOCUMENT') && (
        <div>
          <label className="block text-sm font-medium text-espresso mb-1.5">File</label>
          <input type="file" onChange={handleFileChange} className="text-sm text-espresso" />
          {uploadProgress !== null && <p className="text-xs text-espresso/50 mt-1">Uploading... {uploadProgress}%</p>}
          {fileUrl && <p className="text-xs text-espresso/60 mt-1">Uploaded: {fileUrl}</p>}
          {fieldErrors.fileUrl && <p className="mt-1.5 text-sm text-burgundy">{fieldErrors.fileUrl}</p>}
        </div>
      )}

      {type === 'LINK' && (
        <div>
          <label className="block text-sm font-medium text-espresso mb-1.5">External URL</label>
          <input value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} className={inputClass} placeholder="https://..." />
          {fieldErrors.fileUrl && <p className="mt-1.5 text-sm text-burgundy">{fieldErrors.fileUrl}</p>}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-espresso mb-1.5">Duration (minutes)</label>
        <input type="number" min="1" value={duration} onChange={(e) => setDuration(e.target.value)} className={inputClass} />
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

export default LessonForm;
