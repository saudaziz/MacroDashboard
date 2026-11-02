import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { getRefreshQuota } from '../api';
import { RefreshCodeModal, formatRetry } from './RefreshCodeModal';

vi.mock('../api', () => ({ getRefreshQuota: vi.fn().mockResolvedValue({ limit: 2, used: 1, resets_at: null }) }));

describe('RefreshCodeModal', () => {
  it('renders nothing when closed', () => {
    render(<RefreshCodeModal isOpen={false} submitting={false} error={null} onSubmit={vi.fn()} onClose={vi.fn()} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('does not submit an empty code', () => {
    const onSubmit = vi.fn();
    render(<RefreshCodeModal isOpen submitting={false} error={null} onSubmit={onSubmit} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits the trimmed code', () => {
    const onSubmit = vi.fn();
    render(<RefreshCodeModal isOpen submitting={false} error={null} onSubmit={onSubmit} onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Refresh code'), { target: { value: '  abc12345 ' } });
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    expect(onSubmit).toHaveBeenCalledWith('abc12345');
  });

  it('shows the server error and reset time', () => {
    const retryAt = Date.now() / 1000 + 2 * 86400 + 3600;
    render(<RefreshCodeModal isOpen submitting={false} error={{ code: 'quota_exhausted', message: 'Refresh limit reached.', retryAt }} onSubmit={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByRole('alert').textContent).toContain('Refresh limit reached.');
    expect(screen.getByRole('alert').textContent).toContain('2d');
  });

  it('tells the user which setting is missing and blocks submit', async () => {
    vi.mocked(getRefreshQuota).mockResolvedValueOnce({ limit: 2, used: 0, resets_at: null, missing: ['REFRESH_ACCESS_CODES'] });
    render(<RefreshCodeModal isOpen submitting={false} error={null} onSubmit={vi.fn()} onClose={vi.fn()} />);
    expect((await screen.findByRole('alert')).textContent).toContain('REFRESH_ACCESS_CODES');
    expect((screen.getByRole('button', { name: /continue/i }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('toggles code visibility with the eye button', () => {
    render(<RefreshCodeModal isOpen submitting={false} error={null} onSubmit={vi.fn()} onClose={vi.fn()} />);
    const input = screen.getByLabelText('Refresh code') as HTMLInputElement;
    expect(input.type).toBe('password');
    fireEvent.click(screen.getByRole('button', { name: /show code/i }));
    expect(input.type).toBe('text');
    fireEvent.click(screen.getByRole('button', { name: /hide code/i }));
    expect(input.type).toBe('password');
  });

  it('formats retry durations', () => {
    expect(formatRetry(null)).toBe('');
    expect(formatRetry(1000 + 90 * 60, 1_000_000)).toBe('1h 30m');
  });
});
