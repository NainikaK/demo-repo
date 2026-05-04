import { render, screen, fireEvent } from '@testing-library/react';
import { TaskSearchBar } from '../components/TaskSearchBar';

describe('TaskSearchBar', () => {
  it('renders the search input with correct aria-label', () => {
    render(<TaskSearchBar value="" onChange={() => {}} />);
    expect(
      screen.getByRole('searchbox', { name: 'Search upcoming tasks by title' })
    ).toBeInTheDocument();
  });

  it('displays the current value', () => {
    render(<TaskSearchBar value="hello" onChange={() => {}} />);
    const input = screen.getByRole('searchbox') as HTMLInputElement;
    expect(input.value).toBe('hello');
  });

  it('calls onChange with the new value on every keystroke', () => {
    const handleChange = jest.fn();
    render(<TaskSearchBar value="" onChange={handleChange} />);
    const input = screen.getByRole('searchbox');
    fireEvent.change(input, { target: { value: 'a' } });
    expect(handleChange).toHaveBeenCalledWith('a');
  });

  it('calls onChange with empty string when input is cleared', () => {
    const handleChange = jest.fn();
    render(<TaskSearchBar value="abc" onChange={handleChange} />);
    const input = screen.getByRole('searchbox');
    fireEvent.change(input, { target: { value: '' } });
    expect(handleChange).toHaveBeenCalledWith('');
  });
});
