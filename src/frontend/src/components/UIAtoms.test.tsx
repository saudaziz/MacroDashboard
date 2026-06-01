import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MetricBig } from './UIAtoms';

describe('MetricBig', () => {
  it('renders an app-controlled section explanation tooltip', () => {
    render(<MetricBig label="Risk Sentiment" value={5} helpText="Overall market risk level." />);

    const button = screen.getByRole('button', { name: 'Risk Sentiment explanation' });
    const tooltip = screen.getByRole('tooltip');

    expect(tooltip).toHaveClass('hidden');
    expect(tooltip).toHaveTextContent('Overall market risk level.');
    expect(tooltip).toHaveClass('group-hover:block');
    expect(button).toHaveAttribute('aria-describedby', tooltip.id);
  });

  it('does not render a tooltip icon when no help text is provided', () => {
    render(<MetricBig label="PIK Issuance" value="N/A" />);

    expect(screen.queryByRole('button', { name: 'PIK Issuance explanation' })).not.toBeInTheDocument();
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });
});
