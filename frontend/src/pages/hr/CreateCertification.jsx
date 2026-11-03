import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import HrLayout from "../../layouts/HrLayout";
import { createCertification } from "../../services/certificationService";
import { listCourses } from "../../services/courseService";
import apiClient from "../../services/apiClient";

const VALIDITY_PRESETS = [
  { label: "Never Expires", days: null },
  { label: "1 Month (30 days)", days: 30 },
  { label: "3 Months (90 days)", days: 90 },
  { label: "6 Months (180 days)", days: 180 },
  { label: "1 Year (365 days)", days: 365 },
  { label: "2 Years (730 days)", days: 730 },
  { label: "Custom", days: "custom" },
];

export default function CreateCertification() {
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [courseId, setCourseId] = useState("");
  const [status, setStatus] = useState("DRAFT");

  // Validity
  const [validityPreset, setValidityPreset] = useState(null);
  const [customDays, setCustomDays] = useState("");

  // Requirements
  const [minProgressPct, setMinProgressPct] = useState(100);
  const [quizId, setQuizId] = useState("");
  const [minQuizScore, setMinQuizScore] = useState(80);

  // Available options
  const [courses, setCourses] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [optionsError, setOptionsError] = useState("");
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [quizzesLoading, setQuizzesLoading] = useState(false);
  const [retryLoading, setRetryLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function fetchCourses() {
      setCoursesLoading(true);
      setOptionsError("");
      try {
        const res = await listCourses({ limit: 100 });
        if (!cancelled) setCourses(res.data || []);
      } catch (err) {
        if (!cancelled) setOptionsError(err.response?.data?.message || "Unable to load courses. Retry to choose a course.");
      } finally {
        if (!cancelled) {
          setCoursesLoading(false);
        }
      }
    }
    fetchCourses();
    return () => { cancelled = true; };
  }, []);

  // When courseId changes, fetch quizzes for that course
  useEffect(() => {
    let cancelled = false;
    async function fetchQuizzes() {
      if (!courseId) {
        setQuizzes([]);
        setQuizId("");
        setQuizzesLoading(false);
        return;
      }
      setQuizzesLoading(true);
      setOptionsError("");
      try {
        const res = await apiClient.get("/quizzes", {
          params: { courseId, limit: 50 },
        });
        if (!cancelled) setQuizzes(res.data?.data || []);
      } catch (err) {
        if (!cancelled) setOptionsError(err.response?.data?.message || "Unable to load quizzes for the selected course.");
      } finally {
        if (!cancelled) {
          setQuizzesLoading(false);
        }
      }
    }
    fetchQuizzes();
    return () => { cancelled = true; };
  }, [courseId]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (isLoading) return;
    if (!title.trim()) {
      setError("Certification name is required");
      return;
    }

    setIsLoading(true);
    setError(null);

    let finalValidityDays = null;
    if (validityPreset === "custom") {
      finalValidityDays = customDays ? parseInt(customDays, 10) : null;
    } else if (validityPreset !== null) {
      finalValidityDays = validityPreset;
    }

    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      courseId: courseId || null,
      validityDays: finalValidityDays,
      status,
      requirements: {
        minProgressPct: courseId ? minProgressPct : null,
        quizId: quizId || null,
        minQuizScore: quizId ? minQuizScore : null,
      },
    };

    try {
      const created = await createCertification(payload);
      navigate(`/hr/certifications/${created.id}`);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create certification");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <HrLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Link
              to="/hr/certifications"
              className="text-xs font-medium text-gold hover:underline"
            >
              &larr; Back to Certifications
            </Link>
            <h1 className="text-2xl font-bold text-espresso mt-1">
              Create Certification
            </h1>
            <p className="text-sm text-espresso/60">
              Establish an official credential with automated issuing criteria
            </p>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-burgundy/10 text-burgundy text-sm border border-burgundy/20">
            {error}
          </div>
        )}
        {optionsError && (
          <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl bg-burgundy/5 text-burgundy text-sm border-burgundy/20" role="alert">
            <span>{optionsError}</span>
            <button type="button" disabled={retryLoading} onClick={async () => {
              setRetryLoading(true);
              setOptionsError("");
              const retryingQuizzes = Boolean(courseId);
              if (retryingQuizzes) setQuizzesLoading(true);
              else setCoursesLoading(true);
              try {
                if (courseId) {
                  const res = await apiClient.get("/quizzes", { params: { courseId, limit: 50 } });
                  setQuizzes(res.data?.data || []);
                } else {
                  const res = await listCourses({ limit: 100 });
                  setCourses(res.data || []);
                }
              } catch (requestError) {
                setOptionsError(requestError.response?.data?.message || "Unable to load options.");
              } finally {
                setRetryLoading(false);
                if (retryingQuizzes) setQuizzesLoading(false);
                else setCoursesLoading(false);
              }
            }} className="underline disabled:opacity-50">{retryLoading ? "Retrying..." : "Try again"}</button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* General Info */}
          <div className="bg-white rounded-2xl border border-border-warm p-6 space-y-4 shadow-sm">
            <h2 className="text-base font-semibold text-espresso">
              Certification Information
            </h2>

            <div>
              <label htmlFor="certification-title" className="block text-xs font-medium uppercase tracking-wider text-espresso/70 mb-1">
                Certification Name *
              </label>
              <input
                id="certification-title"
                type="text"
                minLength={2}
                maxLength={150}
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Cyber Security Awareness Certification"
                className="w-full rounded-xl border border-border-warm px-3.5 py-2.5 text-sm text-espresso focus:outline-none focus:ring-2 focus:ring-gold/50"
              />
            </div>

            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-espresso/70 mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Describe what knowledge this certificate validates..."
                className="w-full rounded-xl border border-border-warm px-3.5 py-2.5 text-sm text-espresso focus:outline-none focus:ring-2 focus:ring-gold/50"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="certification-course" className="block text-xs font-medium uppercase tracking-wider text-espresso/70 mb-1">
                  Required Course
                </label>
                <select
                  id="certification-course"
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                  aria-busy={coursesLoading}
                  disabled={coursesLoading}
                  className="w-full rounded-xl border border-border-warm px-3.5 py-2.5 text-sm text-espresso bg-white focus:outline-none focus:ring-2 focus:ring-gold/50"
                >
                  <option value="">Select a Course (Optional)</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-espresso/70 mb-1">
                  Initial Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full rounded-xl border border-border-warm px-3.5 py-2.5 text-sm text-espresso bg-white focus:outline-none focus:ring-2 focus:ring-gold/50"
                >
                  <option value="DRAFT">DRAFT (Inactive)</option>
                  <option value="ACTIVE">ACTIVE (Ready to Issue)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Requirements */}
          <div className="bg-white rounded-2xl border border-border-warm p-6 space-y-4 shadow-sm">
            <h2 className="text-base font-semibold text-espresso">
              Issuance Requirements
            </h2>
            <p className="text-xs text-espresso/60">
              When an employee fulfills all conditions, a verified certificate
              is automatically issued.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-espresso/70 mb-1">
                  Course Completion Minimum
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={minProgressPct}
                    onChange={(e) =>
                      setMinProgressPct(parseInt(e.target.value, 10) || 100)
                    }
                    disabled={!courseId}
                    className="w-full rounded-xl border border-border-warm px-3.5 py-2.5 text-sm text-espresso focus:outline-none focus:ring-2 focus:ring-gold/50 disabled:opacity-40"
                  />
                  <span className="text-sm font-medium text-espresso/70">
                    %
                  </span>
                </div>
              </div>

              <div>
                <label htmlFor="certification-quiz" className="block text-xs font-medium uppercase tracking-wider text-espresso/70 mb-1">
                  Required Quiz Assessment
                </label>
                <select
                  id="certification-quiz"
                  value={quizId}
                  onChange={(e) => setQuizId(e.target.value)}
                  aria-busy={quizzesLoading}
                  disabled={!courseId || quizzesLoading || quizzes.length === 0}
                  className="w-full rounded-xl border border-border-warm px-3.5 py-2.5 text-sm text-espresso bg-white focus:outline-none focus:ring-2 focus:ring-gold/50 disabled:opacity-40"
                >
                  <option value="">None / Not Required</option>
                  {quizzes.map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.title} (Pass score: {q.passingScore}%)
                    </option>
                  ))}
                </select>
              </div>

              {quizId && (
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-espresso/70 mb-1">
                    Minimum Quiz Score
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={minQuizScore}
                      onChange={(e) =>
                        setMinQuizScore(parseInt(e.target.value, 10) || 0)
                      }
                      className="w-full rounded-xl border border-border-warm px-3.5 py-2.5 text-sm text-espresso focus:outline-none focus:ring-2 focus:ring-gold/50"
                    />
                    <span className="text-sm font-medium text-espresso/70">
                      %
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Validity */}
          <div className="bg-white rounded-2xl border border-border-warm p-6 space-y-4 shadow-sm">
            <h2 className="text-base font-semibold text-espresso">
              Validity & Expiration
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {VALIDITY_PRESETS.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setValidityPreset(p.days)}
                  className={`px-3 py-2.5 text-xs font-medium rounded-xl border transition text-center ${
                    validityPreset === p.days
                      ? "border-gold bg-gold/10 text-espresso font-semibold"
                      : "border-border-warm text-espresso/70 hover:bg-cream"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {validityPreset === "custom" && (
              <div className="mt-3">
                <label className="block text-xs font-medium uppercase tracking-wider text-espresso/70 mb-1">
                  Custom Validity in Days
                </label>
                <input
                  type="number"
                  min="1"
                  value={customDays}
                  onChange={(e) => setCustomDays(e.target.value)}
                  placeholder="e.g. 180"
                  className="w-48 rounded-xl border border-border-warm px-3.5 py-2 text-sm text-espresso focus:outline-none focus:ring-2 focus:ring-gold/50"
                />
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Link
              to="/hr/certifications"
              className="px-4 py-2.5 rounded-xl border border-border-warm text-sm font-medium text-espresso hover:bg-cream transition"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2.5 rounded-xl bg-espresso text-cream text-sm font-medium hover:bg-espresso/90 transition shadow-sm disabled:opacity-50"
            >
              {isLoading ? "Creating..." : "Create Certification"}
            </button>
          </div>
        </form>
      </div>
    </HrLayout>
  );
}
