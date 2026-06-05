import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TaskForm } from '../components/TaskForm';

const mocks = vi.hoisted(() => ({
  createTask: vi.fn(),
  useAssignableUsers: vi.fn(),
}));

vi.mock('../hooks/useCreateTask', () => ({
  createTask: mocks.createTask,
}));

vi.mock('../hooks/useAssignableUsers', () => ({
  useAssignableUsers: mocks.useAssignableUsers,
}));

const noop = () => {};

beforeEach(() => {
  mocks.useAssignableUsers.mockReturnValue({ users: [], loading: false, error: null });
  mocks.createTask.mockResolvedValue({
    id: '1',
    title: 'Test Task',
    completed: false,
    priority: 'medium',
    createdAt: new Date().toISOString(),
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('TaskForm', () => {
  it('renders the character counter with initial value 0/100', () => {
    render(<TaskForm onTaskCreated={noop} />);
    const counter = screen.getByLabelText('Title character count');
    expect(counter).toBeTruthy();
    expect(counter.textContent).toBe('0/100');
  });

  it('updates the character counter on every keystroke', async () => {
    const user = userEvent.setup();
    render(<TaskForm onTaskCreated={noop} />);
    const input = screen.getByRole('textbox', { name: /title/i });
    await user.type(input, 'Hello');
    const counter = screen.getByLabelText('Title character count');
    expect(counter.textContent).toBe('5/100');
  });

  it('counter text is not red when character count is 80 or below', async () => {
    const user = userEvent.setup();
    render(<TaskForm onTaskCreated={noop} />);
    const input = screen.getByRole('textbox', { name: /title/i });
    const eightyChars = 'a'.repeat(80);
    await user.type(input, eightyChars);
    const counter = screen.getByLabelText('Title character count');
    expect(counter.textContent).toBe('80/100');
    expect(counter.className).not.toMatch(/text-red/);
  });

  it('counter text turns red when character count exceeds 80', async () => {
    const user = userEvent.setup();
    render(<TaskForm onTaskCreated={noop} />);
    const input = screen.getByRole('textbox', { name: /title/i });
    const eightyOneChars = 'a'.repeat(81);
    await user.type(input, eightyOneChars);
    const counter = screen.getByLabelText('Title character count');
    expect(counter.textContent).toBe('81/100');
    expect(counter.className).toMatch(/text-red/);
  });

  it('renders without crashing when onTaskCreated is a no-op', () => {
    render(<TaskForm onTaskCreated={noop} />);
    expect(screen.getByRole('button', { name: /add new task/i })).toBeTruthy();
  });

  it('counter displays format X/100 matching current input length', async () => {
    const user = userEvent.setup();
    render(<TaskForm onTaskCreated={noop} />);
    const input = screen.getByRole('textbox', { name: /title/i });
    await user.type(input, 'abc');
    const counter = screen.getByLabelText('Title character count');
    expect(counter.textContent).toBe('3/100');
  });

  it('does not crash when no title is entered and form is submitted', async () => {
    const user = userEvent.setup();
    render(<TaskForm onTaskCreated={noop} />);
    const submitButton = screen.getByRole('button', { name: /add new task/i });
    await user.click(submitButton);
    expect(screen.getByText('Title is required.')).toBeTruthy();
  });
})
