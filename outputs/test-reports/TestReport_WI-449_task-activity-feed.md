# Test Results — Work Item 449

_Generated: 2026-05-03 21:15 UTC_

---

## Summary

| Metric | Value |
|---|---|
| **Status** | FAIL |
| **Total** | 85 |
| **Passed** | 83 |
| **Failed** | 2 |
| **Skipped** | 0 |
| **Coverage** | 0.0% |

---

## Failed Tests

-  useComments fetchComments error case - sets fetchError when response is not ok  
  _Error: expected 'Request failed with status 500' to be 'Failed to load comments. Please try a…' // Object.is equality_
- dotnet build or runtime error  
  _Error:   Determining projects to restore...
  All projects are up-to-date for restore.
/Users/nainikakovelamudi/Desktop/SDLC-demo/demo-app/backend/src/Services/ActivityService.cs(73,9): error CS0117: 'ActivityEntryDto' does not contain a definition for 'Description' [/Users/nainikakovelamudi/Desktop/SDLC-d_

---

## Passed Tests

-  ActivityFeed render test - renders activity entries with event type and datetime when entries are provided
-  ActivityFeed interaction test - renders loading text when fetchLoading is true
-  ActivityFeed edge case - renders empty state message when entries array is empty and not loading or errored
-  AssigneeAvatar render test - renders the initials of the given name inside the avatar
-  AssigneeAvatar interaction test - renders a tooltip element containing the full name
-  AssigneeAvatar edge case - renders a single initial when name has only one word
-  CommentPanel render test - renders Comments and Activity tabs when activeTask is provided
-  CommentPanel interaction test - clicking the Activity tab calls fetchActivity with the task id
-  CommentPanel edge case - returns null and does not render when activeTask is null
-  CompletedTasksSection render test - renders the section heading and task cards when completed tasks are provided
-  CompletedTasksSection interaction test - calls onComplete with the correct task id when a task card fires the callback
-  CompletedTasksSection edge case - renders the heading and empty message when completedTasks is an empty array
-  DueDateBadge render test - renders the Due Today badge when dueDate matches today
-  DueDateBadge interaction test - renders the Overdue badge when dueDate is before today
-  DueDateBadge edge case - renders nothing when dueDate is undefined
-  DueDateBadge edge case - renders nothing when dueDate is in the future
-  DueDateBadge edge case - the badge is non-interactive and has no click handler
-  EyeIcon render test - renders an svg element that is hidden from assistive technology
-  EyeIcon interaction test - applies a provided className to the svg element
-  EyeIcon edge case - renders without crashing when no props are provided
-  Header render test - renders the Task Manager title and the CheckTickIcon beside it
-  Header interaction test - clicking the theme toggle button calls toggleTheme
-  Header edge case - renders correctly in dark mode without crashing
-  LoadMoreButton render test - renders the button when visible is true
-  LoadMoreButton interaction test - calls onClick when the button is clicked
-  LoadMoreButton edge case - renders nothing when visible is false
-  PriorityFilter render test - renders a select with all priority options and an all-priorities option
-  PriorityFilter interaction test - calls onChange with the selected priority when a priority option is chosen
-  PriorityFilter edge case - calls onChange with null when the all-priorities option is selected
-  PriorityIcon render test - renders an svg with the correct aria-label for medium priority
-  PriorityIcon interaction test - renders the correct title attribute as tooltip text for high priority
-  PriorityIcon edge case - renders without crashing for low priority and applies blue color class
-  SmileyIcon render test - renders an svg with the correct aria-label and default size
-  SmileyIcon interaction test - renders with custom size and color props when provided
-  SmileyIcon edge case - renders without crashing when no props are provided
-  TaskCard render test - renders the task title and comment button when onCommentClick is provided
-  TaskCard interaction test - calls onCommentClick with the task when the comment button is clicked
-  TaskCard edge case - does not render comment button when onCommentClick is not provided
-  TaskForm render test - renders the form with a priority select defaulting to medium
-  TaskForm interaction test - allows changing the priority to high and submits with that priority
-  TaskForm edge case - shows a validation error when submitted with an empty title
-  WeatherIcon render test - renders a span with the correct aria-label for a known condition
-  WeatherIcon interaction test - applies the provided className to the rendered span
-  WeatherIcon edge case - renders the fallback icon when condition is an unrecognised string
-  WeatherWidget render test - renders condition and temperature in Fahrenheit when weather data is available
-  WeatherWidget interaction test - renders only the condition when temperature f is undefined
-  WeatherWidget edge case - renders weather error state without crashing when error is present
-  useActivity success case - returns activity entries when fetch succeeds
-  useActivity error case - sets fetchError and returns empty entries when fetch response is not ok
-  useActivity loading state - fetchLoading is true while fetchActivity is in flight
-  useComments success case - returns users array when fetch succeeds
-  useComments error case - sets error and returns empty users when fetch response is not ok
-  useComments loading state - fetchLoading is true while fetchComments is in flight
-  useComments fetchComments success case - returns comments when fetch succeeds
-  useComments fetchComments loading state - fetchLoading is true while fetchComments is in flight
-  useComments postComment success case - returns new comment and appends it to comments list
-  useComments postComment error case - returns null when post response is not ok
-  useComments postComment loading state - initial comments list is empty before any post
-  useCompleteTask success case - returns true when the PATCH request succeeds
-  useCompleteTask error case - returns false and sets completeError when fetch response is not ok
-  useCompleteTask loading state - completeError is null before any call is made
-  useCompletedTasks success case - returns only completed tasks sorted descending by completedAt
-  useCompletedTasks error case - returns an empty completedTasks array when the fetch fails
-  useCompletedTasks loading state - returns an empty completedTasks array while fetch is in flight
-  usePriorityFilter success case - filterTasks returns all tasks when selectedPriority is null
-  usePriorityFilter error case - filterTasks returns only matching tasks when a priority is selected
-  usePriorityFilter loading state - clearFilter resets selectedPriority to null and filterTasks returns all tasks
-  useTasks success case - fetches tasks and returns them when response is ok
-  useTasks error case - sets error message when fetch response is not ok
-  useTasks loading state - exposes loading as true while fetch is in flight
-  useTasks completeTask - optimistically updates task to completed in local state
-  useTasks completeTask - reverts task state when PATCH request fails
-  useUpcomingTasks success case - returns only the first 4 upcoming tasks on initial load
-  useUpcomingTasks error case - exposes error string and empty visibleTasks when fetch fails
-  useUpcomingTasks loading state - exposes loading as true while fetch is in flight
-  useUpcomingTasks loadMore - appends next 4 tasks when called once
-  useUpcomingTasks hasMore - is false when all tasks are already visible
-  useWeather success case - returns weather data including temperature f when fetch succeeds
-  useWeather error case - sets error and returns null weather when fetch response is not ok
-  useWeather loading state - exposes loading as true while fetch is in flight
-  getWeatherIcon success case - returns the correct emoji for a known condition
-  getWeatherIcon error case - returns the fallback emoji for an unknown condition
-  getWeatherIcon loading state - is case-insensitive and trims whitespace before lookup

---

## Skipped Tests

_(none)_
