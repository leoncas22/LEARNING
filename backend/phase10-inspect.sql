SELECT typname FROM pg_type WHERE typname IN ('LearningPathStatus','NotificationType');
SELECT tablename FROM pg_tables WHERE tablename IN ('learning_paths','learning_path_courses','learning_path_assignments');
