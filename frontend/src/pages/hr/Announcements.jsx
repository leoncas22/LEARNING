import { useEffect, useState } from "react";
import HrLayout from "../../layouts/HrLayout";
import { Modal } from "../../components/ui/Modal";
import {
  archiveAnnouncement,
  createAnnouncement,
  listAnnouncements,
  getAnnouncement,
  publishAnnouncement,
  updateAnnouncement,
} from "../../services/announcementService";
import { listEmployees } from "../../services/employeeService";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  StatusBadge,
  useConfirm,
} from "../../components/ui/Primitives";

export default function Announcements() {
  const [items, setItems] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [form, setForm] = useState({
    title: "",
    content: "",
    audience: "COMPANY",
    departmentId: "",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitNotice, setSubmitNotice] = useState("");
  const [busyId, setBusyId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const { confirm, dialog } = useConfirm();

  async function load() {
    setLoading(true);
    setError("");
    try {
      const result = await listAnnouncements();
      setItems(result.data);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load announcements.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
    listEmployees()
      .then((employees) => {
        const unique = new Map();
        employees.forEach((employee) => {
          if (employee.department)
            unique.set(employee.department.id, employee.department);
        });
        setDepartments(
          [...unique.values()].sort((a, b) => a.name.localeCompare(b.name)),
        );
      })
      .catch(() => setDepartments([]));
  }, []);

  async function submit(event) {
    event.preventDefault();
    if (isSubmitting || !form.title.trim() || !form.content.trim()) return;
    setSubmitError("");
    setSubmitNotice("");
    setIsSubmitting(true);
    try {
      await createAnnouncement({
        ...form,
        departmentId: form.audience === "DEPARTMENT" ? form.departmentId : null,
      });
      setForm({
        title: "",
        content: "",
        audience: "COMPANY",
        departmentId: "",
      });
      await load();
      setSubmitNotice("Announcement saved as a draft.");
    } catch (err) {
      setSubmitNotice("");
      setSubmitError(
        err.response?.data?.message || "Unable to create announcement.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function openEdit(item) {
    if (busyId || editingId) return;
    setEditingId(item.id);
    setEditForm({
      title: item.title || "",
      content: item.content || "",
      audience: item.departmentId ? "DEPARTMENT" : "COMPANY",
      departmentId: item.departmentId || "",
      status: item.status,
    });
    setSubmitError("");
    setSubmitNotice("");
    try {
      const current = await getAnnouncement(item.id);
      if (current.status === "ARCHIVED") {
        setSubmitError("Archived announcements cannot be edited.");
        setEditingId(null);
        setEditForm(null);
        return;
      }
      setEditForm({
        title: current.title || "",
        content: current.content || "",
        audience: current.departmentId ? "DEPARTMENT" : "COMPANY",
        departmentId: current.departmentId || "",
        status: current.status,
      });
    } catch (err) {
      setSubmitError(err.response?.data?.message || "Unable to load this announcement for editing.");
      setEditingId(null);
      setEditForm(null);
    }
  }

  function closeEdit() {
    if (busyId === editingId) return;
    setEditingId(null);
    setEditForm(null);
    setSubmitError("");
  }

  async function saveEdit(event) {
    event.preventDefault();
    if (!editingId || !editForm || busyId) return;
    setSubmitError("");
    setSubmitNotice("");
    setBusyId(editingId);
    try {
      const payload = {
        title: editForm.title.trim(),
        content: editForm.content.trim(),
        audience: editForm.audience,
        departmentId: editForm.audience === "DEPARTMENT" ? editForm.departmentId : null,
      };
      await updateAnnouncement(editingId, payload);
      setEditingId(null);
      setEditForm(null);
      setSubmitNotice("Announcement updated successfully.");
      await load();
    } catch (err) {
      setSubmitNotice("");
      setSubmitError(err.response?.data?.message || "Unable to update announcement.");
    } finally {
      setBusyId("");
    }
  }

  async function changeStatus(item) {
    if (busyId) return;
    if (item.status === "PUBLISHED") {
      const accepted = await confirm({
        title: `Archive ${item.title}?`,
        description: "This announcement will no longer be available as a published update.",
        confirmLabel: "Archive announcement",
        danger: true,
      });
      if (!accepted) return;
    }
    setBusyId(item.id);
    setSubmitError("");
    setSubmitNotice("");
    try {
      if (item.status === "DRAFT") await publishAnnouncement(item.id);
      else if (item.status === "PUBLISHED") await archiveAnnouncement(item.id);
      else return;
      setSubmitNotice(
        item.status === "DRAFT"
          ? "Announcement published."
          : "Announcement archived.",
      );
      await load();
    } catch (err) {
      setSubmitError(
        err.response?.data?.message || "Unable to update announcement.",
      );
    } finally {
      setBusyId("");
    }
  }

  return (
    <HrLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-espresso">
            Announcements
          </h1>
          <p className="text-sm text-espresso/60 mt-1">
            Share important updates with employees.
          </p>
        </div>
        <form
          onSubmit={submit}
          className="bg-white border-border-warm rounded-2xl p-5 space-y-3"
        >
          <h2 className="font-semibold text-espresso">Create announcement</h2>
          <label htmlFor="new-announcement-title" className="sr-only">Announcement title</label>
          <input
            id="new-announcement-title"
            aria-label="Announcement title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Title"
            className="w-full rounded-xl border-border-warm px-3 py-2.5 text-sm"
            required
          />
          <label htmlFor="new-announcement-content" className="sr-only">Announcement message</label>
          <textarea
            id="new-announcement-content"
            aria-label="Announcement message"
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
            placeholder="Message"
            rows="4"
            className="w-full rounded-xl border-border-warm px-3 py-2.5 text-sm"
            required
          />
          <label htmlFor="new-announcement-audience" className="sr-only">Announcement audience</label>
          <select
            id="new-announcement-audience"
            aria-label="Announcement audience"
            value={form.audience}
            onChange={(e) =>
              setForm({ ...form, audience: e.target.value, departmentId: "" })
            }
            className="w-full rounded-xl border-border-warm px-3 py-2.5 text-sm"
          >
            <option value="COMPANY">All employees</option>
            <option value="DEPARTMENT">A department</option>
          </select>
          {form.audience === "DEPARTMENT" && (
            <>
              <label htmlFor="new-announcement-department" className="sr-only">Target department</label>
              <select
              id="new-announcement-department"
              aria-label="Target department"
              value={form.departmentId}
              onChange={(e) =>
                setForm({ ...form, departmentId: e.target.value })
              }
              className="w-full rounded-xl border-border-warm px-3 py-2.5 text-sm"
              required
            >
              <option value="">Select department</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
              </select>
            </>
          )}
          {submitError && (
            <p className="text-sm text-burgundy" role="alert">
              {submitError}
            </p>
          )}
          {submitNotice && (
            <p className="text-sm text-emerald-700" role="status">
              {submitNotice}
            </p>
          )}
          <button
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl bg-espresso text-white text-sm disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
          >
            {isSubmitting ? "Saving..." : "Save draft"}
          </button>
        </form>
        {submitError && <p className="text-sm text-burgundy" role="alert">{submitError}</p>}
        {submitNotice && <p className="text-sm text-emerald-700" role="status">{submitNotice}</p>}
        {dialog}
        {loading ? (
          <LoadingState label="Loading announcements..." />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : items.length === 0 ? (
          <EmptyState title="No announcements yet" />
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <article
                key={item.id}
                className="bg-white border-border-warm rounded-2xl p-5"
              >
                <div className="flex justify-between gap-3">
                  <div>
                    <h2 className="font-semibold text-espresso">
                      {item.title}
                    </h2>
                    <p className="text-xs text-espresso/50 mt-1">
                      {item.department?.name || "All employees"}
                    </p>
                  </div>
                  <StatusBadge status={item.status} />
                </div>
                <p className="text-sm text-espresso/70 mt-3 whitespace-pre-wrap">
                  {item.content}
                </p>
                {item.status !== "ARCHIVED" && (
                  <div className="mt-4 flex-wrap items-center gap-4">
                    <button
                      type="button"
                      aria-label={`Edit announcement ${item.title}`}
                      disabled={Boolean(busyId) || Boolean(editingId)}
                      onClick={() => openEdit(item)}
                      className="text-sm text-gold hover:text-espresso disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold rounded"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={busyId === item.id || Boolean(editingId)}
                      onClick={() => changeStatus(item)}
                      className="text-sm text-gold hover:text-burgundy disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold rounded"
                    >
                      {busyId === item.id
                        ? "Updating..."
                        : item.status === "DRAFT"
                          ? "Publish"
                          : "Archive"}
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
      <Modal
        open={Boolean(editingId && editForm)}
        title={`Edit ${editForm?.status || ""} announcement`}
        onClose={closeEdit}
        wide
      >
        {editForm && (
          <form onSubmit={saveEdit} className="space-y-4">
            <p className="text-xs text-espresso/60">Current status: <StatusBadge status={editForm.status || ""} /></p>
            <label htmlFor="edit-announcement-title" className="block text-sm font-medium text-espresso">Title</label>
            <input
              id="edit-announcement-title"
              aria-label="Announcement title"
              value={editForm.title}
              onChange={(event) => setEditForm((current) => ({ ...current, title: event.target.value }))}
              maxLength={200}
              required
              disabled={busyId === editingId}
              className="w-full rounded-xl border-border-warm px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold"
            />
            <label htmlFor="edit-announcement-content" className="block text-sm font-medium text-espresso">Message</label>
            <textarea
              id="edit-announcement-content"
              aria-label="Announcement message"
              value={editForm.content}
              onChange={(event) => setEditForm((current) => ({ ...current, content: event.target.value }))}
              maxLength={100000}
              required
              rows={5}
              disabled={busyId === editingId}
              className="w-full rounded-xl border-border-warm px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold"
            />
            <label htmlFor="edit-announcement-audience" className="block text-sm font-medium text-espresso">Audience</label>
            <select
              id="edit-announcement-audience"
              aria-label="Announcement audience"
              value={editForm.audience}
              onChange={(event) => setEditForm((current) => ({ ...current, audience: event.target.value, departmentId: "" }))}
              disabled={busyId === editingId}
              className="w-full rounded-xl border-border-warm px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold"
            >
              <option value="COMPANY">All employees</option>
              <option value="DEPARTMENT">A department</option>
            </select>
            {editForm.audience === "DEPARTMENT" && (
              <>
                <label htmlFor="edit-announcement-department" className="block text-sm font-medium text-espresso">Department</label>
                <select
                  id="edit-announcement-department"
                  aria-label="Target department"
                  value={editForm.departmentId}
                  onChange={(event) => setEditForm((current) => ({ ...current, departmentId: event.target.value }))}
                  required
                  disabled={busyId === editingId || departments.length === 0}
                  className="w-full rounded-xl border-border-warm px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold disabled:opacity-50"
                >
                  <option value="">Select department</option>
                  {departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
                </select>
                {departments.length === 0 && <p className="text-xs text-burgundy" role="alert">No departments are available to target.</p>}
              </>
            )}
            {submitError && <p className="text-sm text-burgundy" role="alert">{submitError}</p>}
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={closeEdit} disabled={busyId === editingId} className="rounded-xl border-border-warm px-4 py-2 text-sm font-medium text-espresso hover:bg-cream disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold">Cancel</button>
              <button type="submit" disabled={busyId === editingId || !editForm.title.trim() || !editForm.content.trim() || (editForm.audience === "DEPARTMENT" && !editForm.departmentId)} className="rounded-xl bg-espresso px-4 py-2 text-sm font-medium text-white hover:bg-espresso/90 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold">
                {busyId === editingId ? "Saving..." : "Save changes"}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </HrLayout>
  );
}
