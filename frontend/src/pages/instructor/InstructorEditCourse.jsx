import EditCourse from '../hr/EditCourse';
import InstructorLayout from '../../layouts/InstructorLayout';

export default function InstructorEditCourse() {
  return <EditCourse basePath="/instructor" Layout={InstructorLayout} instructorMode />;
}
