import QuizList from '../hr/QuizList';
import InstructorLayout from '../../layouts/InstructorLayout';

export default function InstructorQuizList() {
  return <QuizList basePath="/instructor" Layout={InstructorLayout} />;
}
