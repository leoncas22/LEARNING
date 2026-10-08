const BASE = process.env.LMS_FRONTEND_URL || 'http://127.0.0.1:5174';
const employee = { username: process.env.LMS_EMPLOYEE_USER, password: process.env.LMS_EMPLOYEE_PASSWORD };
const admin = { username: process.env.LMS_ADMIN_USER, password: process.env.LMS_ADMIN_PASSWORD };

async function login(page, ui, account) {
  await page.goto(`${BASE}/login`);
  const snapshot = await ui.snapshot();
  const fields = [...snapshot.matchAll(/@(e\d+) textbox/g)].map((m) => m[1]);
  const button = snapshot.match(/@(e\d+) button "Sign In"/i)?.[1];
  const responsePromise = page.waitForResponse((r) => r.url().includes('/api/auth/login') && r.request().method() === 'POST');
  await ui.fill(`@${fields[0]}`, account.username); await ui.fill(`@${fields[1]}`, account.password); await ui.click(`@${button}`);
  const response = await responsePromise; return { status: response.status(), payload: await response.json() };
}
async function api(page, path, token) { return page.evaluate(async ({ path, token }) => { const r = await fetch(path, { headers: { Authorization: `Bearer ${token}` } }); return { status: r.status, payload: await r.json() }; }, { path, token }); }
export default async function run(page, ui) {
  const result = { employee: {}, admin: {}, failures: [] };
  const emp = await login(page, ui, employee); result.employee.loginStatus = emp.status; const et = emp.payload.data.accessToken;
  const courses = await api(page, '/api/me/courses?limit=50', et); result.employee.coursesApiStatus = courses.status; result.employee.courseCount = courses.payload.data?.length || 0;
  if (!courses.payload.data?.length) { result.failures.push('Employee has no enrolled course'); return result; }
  const course = courses.payload.data.find((item) => item.status !== 'COMPLETED') || courses.payload.data[0]; result.employee.courseId = course.course?.id;
  const detail = await api(page, `/api/me/courses/${course.course.id}`, et); result.employee.detailStatus = detail.status;
  const lesson = detail.payload.data?.modules?.flatMap((module) => module.lessons || []).find((item) => !item.completed);
  if (!lesson) { result.failures.push('No incomplete lesson available'); return result; }
  result.employee.lessonId = lesson.id; const before = detail.payload.data.enrollment.progress;
  const completion = await page.evaluate(async ({ lessonId, token }) => { const r = await fetch(`/api/lessons/${lessonId}/complete`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } }); return { status: r.status, payload: await r.json() }; }, { lessonId: lesson.id, token: et });
  result.employee.completionStatus = completion.status; result.employee.completionResponse = completion.payload.data;
  const afterDetail = await api(page, `/api/me/courses/${course.course.id}`, et); result.employee.progressBefore = before; result.employee.progressAfter = afterDetail.payload.data?.enrollment?.progress;
  const adm = await login(page, ui, admin); result.admin.loginStatus = adm.status; const at = adm.payload.data.accessToken;
  const report = await api(page, '/api/reports/trainings?limit=100', at); result.admin.reportStatus = report.status; const reportRows = report.payload.data?.data || []; result.admin.progressRows = reportRows.filter((row) => row.courseId === course.course.id && row.userId === emp.payload.data.user.id).map((row) => ({ status: row.status, progress: row.progress, reportStatus: row.reportStatus }));
  if (completion.status !== 200) result.failures.push('Lesson completion did not return 200');
  if (result.employee.progressAfter === result.employee.progressBefore) result.failures.push('Employee course progress did not change');
  if (!result.admin.progressRows.length) result.failures.push('Admin report did not contain the employee course row');
  return result;
}
