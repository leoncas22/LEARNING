import CreateQuiz from '../hr/CreateQuiz';
import InstructorLayout from '../../layouts/InstructorLayout';

export default function InstructorQuizCreate() {
  return <CreateQuiz basePath="/instructor" Layout={InstructorLayout} />;
}
