export const TASKS_URL = '/api/v1/tasks';
export const WEATHER_API_URL = '/api/v1/weather';
export const COMPLETE_TASK_URL_TEMPLATE = '/api/v1/tasks/:id/complete';
export const COMPLETE_TASK_URL = (id: string): string =>
  COMPLETE_TASK_URL_TEMPLATE.replace(':id', id);
export const USERS_URL = '/api/v1/users';
