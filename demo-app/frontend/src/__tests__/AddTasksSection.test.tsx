import { render, screen, fireEvent } from '@testing-library/react';
import { AddTasksSection } from '../components/AddTasksSection';
import {
  LABEL_ADD_TASKS_SECTION_HEADING,
  LABEL_ADD_TASKS_CHEVRON_COLLAPSE_ARIA,
  LABEL_ADD_TASKS_CHEVRON_EXPAND_ARIA,
} from '../utils/strings';

const LABEL_ADD_TASK = 'Add Task';

const mockOnTaskCreated = jest.fn();

describe('AddTasksSection', () => {
  beforeEach(() => {
    mockOnTaskCreated.mockClear();
  });

  it('renders the section heading', () => {
    render(<AddTasksSection onTaskCreated={mockOnTaskCreated} />);
    expect(screen.getByText(LABEL_ADD_TASKS_SECTION_HEADING)).toBeInTheDocument();
  });

  it('renders the chevron button with collapse aria-label when expanded', () => {
    render(<AddTasksSection onTaskCreated={mockOnTaskCreated} />);
    expect(
      screen.getByRole('button', { name: LABEL_ADD_TASKS_CHEVRON_COLLAPSE_ARIA })
    ).toBeInTheDocument();
  });

  it('is expanded by default and shows child elements', () => {
    render(<AddTasksSection onTaskCreated={mockOnTaskCreated} />);
    expect(screen.getByRole('button', { name: /add new task/i })).toBeInTheDocument();
  });

  it('collapses and hides child elements when chevron is clicked', () => {
    render(<AddTasksSection onTaskCreated={mockOnTaskCreated} />);
    const chevron = screen.getByRole('button', { name: LABEL_ADD_TASKS_CHEVRON_COLLAPSE_ARIA });
    fireEvent.click(chevron);
    expect(screen.queryByText(LABEL_ADD_TASK)).not.toBeInTheDocument();
  });

  it('shows expand aria-label on chevron when collapsed', () => {
    render(<AddTasksSection onTaskCreated={mockOnTaskCreated} />);
    const chevron = screen.getByRole('button', { name: LABEL_ADD_TASKS_CHEVRON_COLLAPSE_ARIA });
    fireEvent.click(chevron);
    expect(
      screen.getByRole('button', { name: LABEL_ADD_TASKS_CHEVRON_EXPAND_ARIA })
    ).toBeInTheDocument();
  });

  it('re-expands and shows child elements when chevron is clicked again', () => {
    render(<AddTasksSection onTaskCreated={mockOnTaskCreated} />);
    const chevron = screen.getByRole('button', { name: LABEL_ADD_TASKS_CHEVRON_COLLAPSE_ARIA });
    fireEvent.click(chevron);
    const expandChevron = screen.getByRole('button', { name: LABEL_ADD_TASKS_CHEVRON_EXPAND_ARIA });
    fireEvent.click(expandChevron);
    expect(screen.getByRole('button', { name: /add new task/i })).toBeInTheDocument();
  });

  it('clicking the title text does not toggle the section', () => {
    render(<AddTasksSection onTaskCreated={mockOnTaskCreated} />);
    const title = screen.getByText(LABEL_ADD_TASKS_SECTION_HEADING);
    fireEvent.click(title);
    expect(screen.getByRole('button', { name: /add new task/i })).toBeInTheDocument();
  });
});
