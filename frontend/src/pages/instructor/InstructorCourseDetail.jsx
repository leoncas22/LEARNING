import CourseDetail from '../hr/CourseDetail';
import InstructorLayout from '../../layouts/InstructorLayout';

export default function InstructorCourseDetail() {
  return <CourseDetail basePath="/instructor" Layout={InstructorLayout} />;
}
