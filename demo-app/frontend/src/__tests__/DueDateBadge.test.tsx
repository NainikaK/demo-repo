import { render, screen } from '@testing-library/react';
import { DueDateBadge } from '../components/DueDateBadge';
import { LABEL_DUE_TODAY, LABEL_OVERDUE } from '../utils/strings';

function toDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

describe('DueDateBadge', () => {
  it('renders the Due Today badge when dueDate matches today', () => {
    const today = toDateString(new Date());
    render(<DueDateBadge dueDate={today} />);
    expect(screen.getByText(LABEL_DUE_TODAY)).toBeInTheDocument();
  });

  it('renders the Overdue badge when dueDate is before today', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    render(<DueDateBadge dueDate={toDateString(yesterday)} />);
    expect(screen.getByText(LABEL_OVERDUE)).toBeInTheDocument();
  });

  it('renders nothing when dueDate is undefined', () => {
    const { container } = render(<DueDateBadge dueDate={undefined} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when dueDate is in the future', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const { container } = render(<DueDateBadge dueDate={toDateString(tomorrow)} />);
    expect(container.firstChild).toBeNull();
  });

  it('does not render an interactive element for Due Today badge', () => {
    const today = toDateString(new Date());
    render(<DueDateBadge dueDate={today} />);
    const badge = screen.getByText(LABEL_DUE_TODAY);
    expect(badge.tagName).toBe('SPAN');
    expect(badge).not.toHaveAttribute('onClick');
  });

  it('does not render an interactive element for Overdue badge', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    render(<DueDateBadge dueDate={toDateString(yesterday)} />);
    const badge = screen.getByText(LABEL_OVERDUE);
    expect(badge.tagName).toBe('SPAN');
    expect(badge).not.toHaveAttribute('onClick');
  });
});
