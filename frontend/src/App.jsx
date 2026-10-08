import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import ProtectedRoute from './routes/ProtectedRoute';

import Login from './pages/auth/Login';
import RegisterCompany from './pages/auth/RegisterCompany';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import VerifyEmail from './pages/auth/VerifyEmail';
import DashboardPlaceholder from './pages/DashboardPlaceholder';
import InstructorDashboard from './pages/instructor/InstructorDashboard';
import InstructorCourses from './pages/instructor/InstructorCourses';
import InstructorCourseDetail from './pages/instructor/InstructorCourseDetail';
import InstructorEditCourse from './pages/instructor/InstructorEditCourse';
import InstructorLearners from './pages/instructor/InstructorLearners';
import InstructorQuizList from './pages/instructor/InstructorQuizList';
import InstructorQuizCreate from './pages/instructor/InstructorQuizCreate';
import InstructorQuizDetail from './pages/instructor/InstructorQuizDetail';
import InstructorQuizResults from './pages/instructor/InstructorQuizResults';

import HrDashboard from './pages/hr/HrDashboard';
import CourseList from './pages/hr/CourseList';
import CreateCourse from './pages/hr/CreateCourse';
import CourseDetail from './pages/hr/CourseDetail';
import EditCourse from './pages/hr/EditCourse';
import Trainings from './pages/hr/Trainings';
import UserManagement from './pages/hr/UserManagement';
import Departments from './pages/hr/Departments';

import EmployeeDashboard from './pages/employee/EmployeeDashboard';
import MyLearning from './pages/employee/MyLearning';
import CoursePage from './pages/employee/CoursePage';

import QuizList from './pages/hr/QuizList';
import CreateQuiz from './pages/hr/CreateQuiz';
import QuizDetail from './pages/hr/QuizDetail';
import QuizResults from './pages/hr/QuizResults';

import MyQuizzes from './pages/employee/MyQuizzes';
import QuizTakingPage from './pages/employee/QuizTakingPage';
import QuizResultPage from './pages/employee/QuizResultPage';
import QuizHistory from './pages/employee/QuizHistory';

// Certification and competency management
import Certifications from './pages/hr/Certifications';
import CreateCertification from './pages/hr/CreateCertification';
import CertificationDetail from './pages/hr/CertificationDetail';
import Certificates from './pages/hr/Certificates';
import Competencies from './pages/hr/Competencies';
import CreateCompetency from './pages/hr/CreateCompetency';
import CompetencyDetail from './pages/hr/CompetencyDetail';

import MyCertificates from './pages/employee/MyCertificates';
import CertificateDetail from './pages/employee/CertificateDetail';
import MyCompetencies from './pages/employee/MyCompetencies';
import EmployeeCompetencyDetail from './pages/employee/CompetencyDetail';
import HrAnnouncements from './pages/hr/Announcements';
import AuditLogs from './pages/hr/AuditLogs';
import EmployeeAnnouncements from './pages/employee/Announcements';
import HrLearningPaths from './pages/hr/LearningPaths';
import HrLearningPathDetail from './pages/hr/LearningPathDetail';
import EmployeeLearningPaths from './pages/employee/LearningPaths';
import EmployeeLearningPathDetail from './pages/employee/LearningPathDetail';

import CertificateVerification from './pages/verify/CertificateVerification';

function RootRedirect() {
  const { isAuthenticated, isLoading, user, homePathForRole } = useAuth();
  if (isLoading) return null;
  return <Navigate to={isAuthenticated ? homePathForRole(user.role) : '/login'} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />

      {/* Public auth routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register-company" element={<RegisterCompany />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/verify-email" element={<VerifyEmail />} />

      {/* Public certificate verification */}
      <Route path="/verify/:verificationCode" element={<CertificateVerification />} />

      {/* Super Admin — platform-level UI is a future enhancement */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
            <DashboardPlaceholder title="Super Admin Dashboard" />
          </ProtectedRoute>
        }
      />

      {/* Instructor workspace */}
      <Route path="/instructor" element={<ProtectedRoute allowedRoles={['INSTRUCTOR']}><InstructorDashboard /></ProtectedRoute>} />
      <Route path="/instructor/courses" element={<ProtectedRoute allowedRoles={['INSTRUCTOR']}><InstructorCourses /></ProtectedRoute>} />
      <Route path="/instructor/courses/:id" element={<ProtectedRoute allowedRoles={['INSTRUCTOR']}><InstructorCourseDetail /></ProtectedRoute>} />
      <Route path="/instructor/courses/:id/edit" element={<ProtectedRoute allowedRoles={['INSTRUCTOR']}><InstructorEditCourse /></ProtectedRoute>} />
      <Route path="/instructor/learners" element={<ProtectedRoute allowedRoles={['INSTRUCTOR']}><InstructorLearners /></ProtectedRoute>} />
      <Route path="/instructor/quizzes" element={<ProtectedRoute allowedRoles={['INSTRUCTOR']}><InstructorQuizList /></ProtectedRoute>} />
      <Route path="/instructor/quizzes/create" element={<ProtectedRoute allowedRoles={['INSTRUCTOR']}><InstructorQuizCreate /></ProtectedRoute>} />
      <Route path="/instructor/quizzes/:id" element={<ProtectedRoute allowedRoles={['INSTRUCTOR']}><InstructorQuizDetail /></ProtectedRoute>} />
      <Route path="/instructor/quizzes/:quizId/results" element={<ProtectedRoute allowedRoles={['INSTRUCTOR']}><InstructorQuizResults /></ProtectedRoute>} />

      {/* HR and company administration */}
      <Route
        path="/hr"
        element={
          <ProtectedRoute allowedRoles={['COMPANY_ADMIN']}>
            <HrDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/hr/courses"
        element={
          <ProtectedRoute allowedRoles={['COMPANY_ADMIN']}>
            <CourseList />
          </ProtectedRoute>
        }
      />
      <Route
        path="/hr/courses/create"
        element={
          <ProtectedRoute allowedRoles={['COMPANY_ADMIN']}>
            <CreateCourse />
          </ProtectedRoute>
        }
      />
      <Route
        path="/hr/courses/:id"
        element={
          <ProtectedRoute allowedRoles={['COMPANY_ADMIN']}>
            <CourseDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/hr/courses/:id/edit"
        element={
          <ProtectedRoute allowedRoles={['COMPANY_ADMIN']}>
            <EditCourse />
          </ProtectedRoute>
        }
      />
      <Route
        path="/hr/trainings"
        element={
          <ProtectedRoute allowedRoles={['COMPANY_ADMIN']}>
            <Trainings />
          </ProtectedRoute>
        }
      />
      <Route path="/hr/users" element={<ProtectedRoute allowedRoles={['COMPANY_ADMIN']}><UserManagement /></ProtectedRoute>} />
      <Route path="/hr/departments" element={<ProtectedRoute allowedRoles={['COMPANY_ADMIN']}><Departments /></ProtectedRoute>} />

      {/* Quiz and assessment management (HR) */}
      <Route
        path="/hr/quizzes"
        element={
          <ProtectedRoute allowedRoles={['COMPANY_ADMIN']}>
            <QuizList />
          </ProtectedRoute>
        }
      />
      <Route
        path="/hr/quizzes/create"
        element={
          <ProtectedRoute allowedRoles={['COMPANY_ADMIN']}>
            <CreateQuiz />
          </ProtectedRoute>
        }
      />
      <Route
        path="/hr/quizzes/:id"
        element={
          <ProtectedRoute allowedRoles={['COMPANY_ADMIN']}>
            <QuizDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/hr/quizzes/:quizId/results"
        element={
          <ProtectedRoute allowedRoles={['COMPANY_ADMIN']}>
            <QuizResults />
          </ProtectedRoute>
        }
      />

      {/* Employee learning experience */}
      <Route
        path="/employee"
        element={
          <ProtectedRoute allowedRoles={['EMPLOYEE']}>
            <EmployeeDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/employee/courses"
        element={
          <ProtectedRoute allowedRoles={['EMPLOYEE']}>
            <MyLearning />
          </ProtectedRoute>
        }
      />
      <Route
        path="/employee/courses/:id"
        element={
          <ProtectedRoute allowedRoles={['EMPLOYEE']}>
            <CoursePage />
          </ProtectedRoute>
        }
      />

      {/* Quiz and assessment experience (Employee) */}
      <Route
        path="/employee/quizzes"
        element={
          <ProtectedRoute allowedRoles={['EMPLOYEE']}>
            <MyQuizzes />
          </ProtectedRoute>
        }
      />
      <Route
        path="/employee/quizzes/:quizId"
        element={
          <ProtectedRoute allowedRoles={['EMPLOYEE']}>
            <QuizTakingPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/employee/quizzes/:attemptId/result"
        element={
          <ProtectedRoute allowedRoles={['EMPLOYEE']}>
            <QuizResultPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/employee/quiz-history"
        element={
          <ProtectedRoute allowedRoles={['EMPLOYEE']}>
            <QuizHistory />
          </ProtectedRoute>
        }
      />

      {/* Certification and competency management (HR) */}
      <Route
        path="/hr/certifications"
        element={
          <ProtectedRoute allowedRoles={['COMPANY_ADMIN']}>
            <Certifications />
          </ProtectedRoute>
        }
      />
      <Route
        path="/hr/certifications/create"
        element={
          <ProtectedRoute allowedRoles={['COMPANY_ADMIN']}>
            <CreateCertification />
          </ProtectedRoute>
        }
      />
      <Route
        path="/hr/certifications/:id"
        element={
          <ProtectedRoute allowedRoles={['COMPANY_ADMIN']}>
            <CertificationDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/hr/certificates"
        element={
          <ProtectedRoute allowedRoles={['COMPANY_ADMIN']}>
            <Certificates />
          </ProtectedRoute>
        }
      />
      <Route
        path="/hr/competencies"
        element={
          <ProtectedRoute allowedRoles={['COMPANY_ADMIN']}>
            <Competencies />
          </ProtectedRoute>
        }
      />
      <Route
        path="/hr/competencies/create"
        element={
          <ProtectedRoute allowedRoles={['COMPANY_ADMIN']}>
            <CreateCompetency />
          </ProtectedRoute>
        }
      />
      <Route path="/hr/learning-paths" element={<ProtectedRoute allowedRoles={['COMPANY_ADMIN']}><HrLearningPaths /></ProtectedRoute>} />
      <Route path="/hr/learning-paths/:id" element={<ProtectedRoute allowedRoles={['COMPANY_ADMIN']}><HrLearningPathDetail /></ProtectedRoute>} />
      <Route path="/employee/learning-paths" element={<ProtectedRoute allowedRoles={['EMPLOYEE']}><EmployeeLearningPaths /></ProtectedRoute>} />
      <Route path="/employee/learning-paths/:id" element={<ProtectedRoute allowedRoles={['EMPLOYEE']}><EmployeeLearningPathDetail /></ProtectedRoute>} />
      <Route path="/hr/announcements"
        element={<ProtectedRoute allowedRoles={['COMPANY_ADMIN']}><HrAnnouncements /></ProtectedRoute>}
      />
      <Route path="/hr/audit-logs" element={<ProtectedRoute allowedRoles={['COMPANY_ADMIN']}><AuditLogs /></ProtectedRoute>} />
      <Route
        path="/hr/competencies/:id"
        element={
          <ProtectedRoute allowedRoles={['COMPANY_ADMIN']}>
            <CompetencyDetail />
          </ProtectedRoute>
        }
      />

      {/* Certification and competency experience (Employee) */}
      <Route
        path="/employee/certificates"
        element={
          <ProtectedRoute allowedRoles={['EMPLOYEE']}>
            <MyCertificates />
          </ProtectedRoute>
        }
      />
      <Route
        path="/employee/certificates/:id"
        element={
          <ProtectedRoute allowedRoles={['EMPLOYEE']}>
            <CertificateDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/employee/competencies"
        element={
          <ProtectedRoute allowedRoles={['EMPLOYEE']}>
            <MyCompetencies />
          </ProtectedRoute>
        }
      />
      <Route
        path="/employee/announcements"
        element={<ProtectedRoute allowedRoles={['EMPLOYEE']}><EmployeeAnnouncements /></ProtectedRoute>}
      />
      <Route
        path="/employee/competencies/:id"
        element={
          <ProtectedRoute allowedRoles={['EMPLOYEE']}>
            <EmployeeCompetencyDetail />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
