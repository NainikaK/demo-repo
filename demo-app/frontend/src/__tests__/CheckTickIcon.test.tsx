import { render } from '@testing-library/react';
import { CheckTickIcon } from '../components/CheckTickIcon';

describe('CheckTickIcon', () => {
  it('renders an svg element', () => {
    const { container } = render(<CheckTickIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('has aria-hidden set to true', () => {
    const { container } = render(<CheckTickIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
  });

  it('has focusable set to false', () => {
    const { container } = render(<CheckTickIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('focusable', 'false');
  });

  it('applies a custom className', () => {
    const { container } = render(<CheckTickIcon className="custom-class" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('custom-class');
  });

  it('renders without a className when none is provided', () => {
    const { container } = render(<CheckTickIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });
});
