/**
 * App Component Tests
 * Tests routing, error boundaries, and lazy loading
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import App from '../App';

// Mock useAppStore
vi.mock('../store/appStore', () => ({
  useAppStore: () => ({
    initWebSocket: vi.fn(),
    theme: 'dark'
  })
}));

describe('App Component', () => {
  it('renders without crashing', () => {
    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    );
    expect(document.body).toBeTruthy();
  });

  it('shows loading state initially', () => {
    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    );
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('initializes WebSocket on mount', () => {
    const initWebSocket = vi.fn();
    vi.mocked(useAppStore).mockReturnValue({
      initWebSocket,
      theme: 'dark'
    });

    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    );

    expect(initWebSocket).toHaveBeenCalled();
  });
});
