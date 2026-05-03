import { useState } from 'react';
import { createTask } from '../hooks/useCreateTask';
import { useAssignableUsers } from '../hooks/useAssignableUsers';
import type { Task } from '../types';
import {
  LABEL_ADD_TASK,
  LABEL_ADD_TASK_ARIA,
  LABEL_ASSIGNED_TO,
  LABEL_ASSIGNED_TO_PLACEHOLDER,
  LABEL_DESCRIPTION,
  LABEL_DESCRIPTION_PLACEHOLDER,
  LABEL_DUE_DATE,
  LABEL_SUBMIT_ERROR,
  LABEL_TASK_FORM_HEADING,
  LABEL_TASK_FORM_HEADING_ICON_ARIA,
  LABEL_TITLE,
  LABEL_TITLE_PLACEHOLDER,
  LABEL_TITLE_REQUIRED,
} from '../utils/strings';

export interface TaskFormProps {
  onTaskCreated: (task: Task) => void;
}

const EMPTY_TITLE = '';
const EMPTY_DESCRIPTION = '';
const EMPTY_DUE_DATE = '';
const EMPTY_ASSIGNED_TO = '';

export function TaskForm({ onTaskCreated }: TaskFormProps) {
  const [title, setTitle] = useState<string>(EMPTY_TITLE);
  const [description, setDescription] = useState<string>(EMPTY_DESCRIPTION);
  const [dueDate, setDueDate] = useState<string>(EMPTY_DUE_DATE);
  const [assignedTo, setAssignedTo] = useState<string>(EMPTY_ASSIGNED_TO);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const { users } = useAssignableUsers();

  const resetForm = () => {
    setTitle(EMPTY_TITLE);
    setDescription(EMPTY_DESCRIPTION);
    setDueDate(EMPTY_DUE_DATE);
    setAssignedTo(EMPTY_ASSIGNED_TO);
    setTitleError(null);
    setSubmitError(null);
  };

  const validateTitle = (value: string): boolean => {
    if (value.trim() === '') {
      setTitleError(LABEL_TITLE_REQUIRED);
      return false;
    }
    setTitleError(null);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitError(null);

    if (!validateTitle(title)) {
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        title: title.trim(),
        ...(description.trim() ? { description: description.trim() } : {}),
        ...(dueDate ? { dueDate } : {}),
        ...(assignedTo ? { assignedTo } : {}),
      };
      const newTask = await createTask(payload);
      onTaskCreated(newTask);
      resetForm();
    } catch {
      setSubmitError(LABEL_SUBMIT_ERROR);
    } finally {
      setSubmitting(false);
    }
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
    if (titleError) {
      validateTitle(e.target.value);
    }
  };

  return (
    <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
      <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
        {LABEL_TASK_FORM_HEADING}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="w-[1em] h-[1em]"
          aria-label={LABEL_TASK_FORM_HEADING_ICON_ARIA}
          aria-hidden="true"
          focusable="false"
        >
          <path d="M21.731 2.269a2.625 2.625 0 0 0-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 0 0 0-3.712ZM19.513 8.199l-3.712-3.712-8.4 8.4a5.25 5.25 0 0 0-1.32 2.214l-.8 2.685a.75.75 0 0 0 .933.933l2.685-.8a5.25 5.25 0 0 0 2.214-1.32l8.4-8.4Z" />
        </svg>
      </h2>
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label
            htmlFor="task-title"
            className="text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            {LABEL_TITLE}
            <span className="text-red-500 ml-1" aria-hidden="true">*</span>
          </label>
          <input
            id="task-title"
            type="text"
            value={title}
            onChange={handleTitleChange}
            placeholder={LABEL_TITLE_PLACEHOLDER}
            aria-required="true"
            aria-describedby={titleError ? 'task-title-error' : undefined}
            aria-invalid={titleError ? 'true' : 'false'}
            className={`rounded-md border px-3 py-2 text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
              titleError
                ? 'border-red-500 dark:border-red-400'
                : 'border-gray-300 dark:border-gray-600'
            }`}
          />
          {titleError && (
            <p
              id="task-title-error"
              role="alert"
              className="text-xs text-red-600 dark:text-red-400 mt-1"
            >
              {titleError}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label
            htmlFor="task-description"
            className="text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            {LABEL_DESCRIPTION}
          </label>
          <textarea
            id="task-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={LABEL_DESCRIPTION_PLACEHOLDER}
            rows={3}
            className="rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors resize-none"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label
            htmlFor="task-assigned-to"
            className="text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            {LABEL_ASSIGNED_TO}
          </label>
          <select
            id="task-assigned-to"
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
            aria-label={LABEL_ASSIGNED_TO}
            className="rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
          >
            <option value="">{LABEL_ASSIGNED_TO_PLACEHOLDER}</option>
            {users.map((user) => (
              <option key={user} value={user}>
                {user}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label
            htmlFor="task-due-date"
            className="text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            {LABEL_DUE_DATE}
          </label>
          <input
            id="task-due-date"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
          />
        </div>

        {submitError && (
          <p role="alert" className="text-xs text-red-600 dark:text-red-400">
            {submitError}
          </p>
        )}

        <button
          type="submit"
          aria-label={LABEL_ADD_TASK_ARIA}
          disabled={submitting}
          className="self-start px-4 py-2 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {LABEL_ADD_TASK}
        </button>
      </form>
    </section>
  );
}
