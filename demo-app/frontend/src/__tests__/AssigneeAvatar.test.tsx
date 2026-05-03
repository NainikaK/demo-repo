import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AssigneeAvatar } from '../components/AssigneeAvatar';

describe('AssigneeAvatar', () => {
  it('render test - renders the initials of the given name inside the avatar', () => {
    render(<AssigneeAvatar name="Nainika K" />);

    expect(screen.getByText('NK')).toBeInTheDocument();
  });

  it('interaction test - renders a tooltip element containing the full name', () => {
    render(<AssigneeAvatar name="Sam D" />);

    const tooltip = screen.getByRole('tooltip');
    expect(tooltip).toBeInTheDocument();
    expect(tooltip).toHaveTextContent('Sam D');
  });

  it('edge case - renders a single initial when name has only one word', () => {
    render(<AssigneeAvatar name="Anna" />);

    expect(screen.getByText('A')).toBeInTheDocument();
  });
});
