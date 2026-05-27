import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CompletedTasksSection } from '../components/CompletedTasksSection';
import type { Task } from '../types';

const mocks = vi.hoisted(() => ({
  onChange: vi.fn(),
}));

vi.mock('../components/TaskCard', () => ({
  TaskCard: ({ task }: { task: Task }) => <div data-testid="task-card">{task.title}</div>,
}));

vi.mock('../components/PriorityFilter', () => ({
  PriorityFilter: ({ onChange }: { selectedPriority: null; onChange: (p: null) => void }) => (
    <div data-testid="priority-filter" onClick={() => onChange(null)} />
  ),
}));

vi.mock('../components/ChevronIcon', () => ({
  ChevronIcon: () => <span data-testid="chevron-icon" />,
}));

function makeTask(id: string): Task {
  return {
    id,
    title: `Task ${id}`,
    completed: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    priority: 'medium',
  };
}

describe('CompletedTasksSection', () => {
  it('render test - renders the section heading and a checkmark svg icon next to the title', () => {
    render(
      <CompletedTasksSection
        completedTasks={[]}
        onComplete={vi.fn()}
        selectedPriority={null}
        onPriorityChange={vi.fn()}
      />
    );

    expect(screen.getByText('Completed Tasks')).toBeInTheDocument();

    // The checkmark SVG is rendered inline in the h2 with an aria-label
    const h2 = screen.getByRole('heading', { level: 2 });
    expect(h2).toBeInTheDocument();

    // Verify the checkmark SVG (with aria-label) is present inside the h2
    const svgWithLabel = h2.querySelector('svg[aria-label]');
    expect(svgWithLabel).toBeInTheDocument();
  });

  it('interaction test - clicking the chevron button collapses and hides the task list', async () => {
    const tasks = [makeTask('1'), makeTask('2')];
    render(
      <CompletedTasksSection
        completedTasks={tasks}
        onComplete={vi.fn()}
        selectedPriority={null}
        onPriorityChange={vi.fn()}
      />
    );

    // Initially expanded — task cards should be visible
    expect(screen.getAllByTestId('task-card')).toHaveLength(2);

    // Find and click the collapse/expand toggle button
    const toggleButton = screen.getByRole('button', { name: /collapse/i });
    await userEvent.click(toggleButton);

    // After collapse the task cards should be gone
    expect(screen.queryByTestId('task-card')).not.toBeInTheDocument();
  });

  it('edge case - renders without crashing when completedTasks is an empty array', () => {
    render(
      <CompletedTasksSection
        completedTasks={[]}
        onComplete={vi.fn()}
        selectedPriority={null}
        onPriorityChange={vi.fn()}
      />
    );

    expect(screen.getByText('Completed Tasks')).toBeInTheDocument();
    // The priority filter and empty message should be visible
    expect(screen.getByTestId('priority-filter')).toBeInTheDocument();
  });
});
