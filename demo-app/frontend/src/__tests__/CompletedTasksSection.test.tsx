import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CompletedTasksSection } from '../components/CompletedTasksSection';
import type { Task } from '../types';

const mocks = vi.hoisted(() => ({
  onChange: vi.fn(),
}));

vi.mock('../components/TaskCard', () => ({
  TaskCard: ({ task }: { task: { title: string } }) => (
    <div data-testid="task-card">{task.title}</div>
  ),
}));

vi.mock('../components/PriorityFilter', () => ({
  PriorityFilter: ({ onChange }: { selectedPriority: unknown; onChange: (p: unknown) => void }) => (
    <button data-testid="priority-filter" onClick={() => onChange(null)}>Filter</button>
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
  it('render test - renders the Completed Tasks heading with a decorative checkmark svg', () => {
    render(
      <CompletedTasksSection
        completedTasks={[]}
        onComplete={vi.fn()}
        selectedPriority={null}
        onPriorityChange={vi.fn()}
      />
    );

    expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();

    // The decorative SVG checkmark should be present and aria-hidden
    const svgs = document.querySelectorAll('svg');
    const checkmarkSvg = Array.from(svgs).find(
      (svg) => svg.getAttribute('aria-hidden') === 'true' && svg.querySelector('polyline[points="20 6 9 17 4 12"]')
    );
    expect(checkmarkSvg).toBeTruthy();
    expect(checkmarkSvg).toHaveAttribute('aria-hidden', 'true');
  });

  it('interaction test - clicking the chevron toggle button collapses and hides task content', async () => {
    const tasks = [makeTask('1'), makeTask('2')];
    render(
      <CompletedTasksSection
        completedTasks={tasks}
        onComplete={vi.fn()}
        selectedPriority={null}
        onPriorityChange={vi.fn()}
      />
    );

    expect(screen.getAllByTestId('task-card')).toHaveLength(2);

    const toggleButton = screen.getByRole('button', { name: /collapse/i });
    await userEvent.click(toggleButton);

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

    expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();

    // The checkmark svg should have pointer-events-none class
    const svgs = document.querySelectorAll('svg');
    const checkmarkSvg = Array.from(svgs).find(
      (svg) => svg.getAttribute('aria-hidden') === 'true' && svg.querySelector('polyline[points="20 6 9 17 4 12"]')
    );
    expect(checkmarkSvg).toBeTruthy();
    expect(checkmarkSvg).toHaveClass('pointer-events-none');
    expect(checkmarkSvg).toHaveAttribute('focusable', 'false');
  });
});
