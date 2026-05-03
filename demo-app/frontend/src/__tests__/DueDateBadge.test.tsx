import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest';
import { DueDateBadge } from '../components/DueDateBadge';

function getTodayString(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getYesterdayString(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const year = yesterday.getFullYear();
  const month = String(yesterday.getMonth() + 1).padStart(2, '0');
  const day = String(yesterday.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getTomorrowString(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const year = tomorrow.getFullYear();
  const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
  const day = String(tomorrow.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

describe('DueDateBadge', () => {
  it('render test - renders the Due Today badge when dueDate matches today', () => {
    const today = getTodayString();
    render(<DueDateBadge dueDate={today} />);

    expect(screen.getByText('Due Today')).toBeInTheDocument();
  });

  it('interaction test - renders the Overdue badge when dueDate is before today', () => {
    const yesterday = getYesterdayString();
    render(<DueDateBadge dueDate={yesterday} />);

    expect(screen.getByText('Overdue')).toBeInTheDocument();
  });

  it('edge case - renders nothing when dueDate is undefined', () => {
    const { container } = render(<DueDateBadge dueDate={undefined} />);

    expect(container.firstChild).toBeNull();
  });

  it('edge case - renders nothing when dueDate is in the future', () => {
    const tomorrow = getTomorrowString();
    const { container } = render(<DueDateBadge dueDate={tomorrow} />);

    expect(container.firstChild).toBeNull();
  });

  it('edge case - the badge is non-interactive and has no click handler', () => {
    const today = getTodayString();
    render(<DueDateBadge dueDate={today} />);

    const badge = screen.getByText('Due Today');
    expect(badge.tagName.toLowerCase()).toBe('span');
    expect(badge).not.toHaveAttribute('role', 'button');
    expect(badge.onclick).toBeNull();
  });
});
