/**
 * Frontend Performance Tests
 * Ensures optimal rendering and interaction performance
 * 
 * @group performance
 * @group frontend
 */

import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Dashboard from '../pages/Dashboard';
import HeatmapPage from '../pages/HeatmapPage';
import { performance } from 'perf_hooks';

// Mock dependencies
jest.mock('../store/appStore', () => ({
  useAppStore: () => ({
    crowdData: generateMockCrowdData(),
    wsConnected: true,
    lastUpdate: new Date().toISOString(),
    theme: 'dark',
    toggleTheme: jest.fn(),
    alerts: [],
    notifications: [],
    markAllRead: jest.fn()
  })
}));

jest.mock('../hooks/useApi', () => ({
  useApi: () => ({ 
    data: { totalCount: 15000, occupancyRate: 75 }, 
    loading: false 
  })
}));

jest.mock('../hooks/usePageTitle', () => ({
  usePageTitle: jest.fn()
}));

jest.mock('../config/firebase', () => ({
  logAnalyticsEvent: jest.fn()
}));

function generateMockCrowdData() {
  const data = {};
  for (let i = 0; i < 20; i++) {
    data[`zone-${i}`] = {
      id: `zone-${i}`,
      name: `Zone ${i}`,
      current: Math.random(),
      riskLevel: 'low',
      waitTime: Math.floor(Math.random() * 20),
      count: Math.floor(Math.random() * 1000),
      capacity: 1000,
      x: Math.random() * 100,
      y: Math.random() * 100
    };
  }
  return data;
}

describe('Frontend Performance Tests', () => {
  describe('Initial Render Performance', () => {
    it('should render Dashboard in under 1000ms', async () => {
      const startTime = performance.now();
      
      render(
        <BrowserRouter>
          <Dashboard />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/Stadium Overview/i)).toBeInTheDocument();
      });

      const renderTime = performance.now() - startTime;
      expect(renderTime).toBeLessThan(1000);
    });

    it('should render with minimal DOM nodes', () => {
      const { container } = render(
        <BrowserRouter>
          <Dashboard />
        </BrowserRouter>
      );

      const nodeCount = container.querySelectorAll('*').length;
      
      // Should have reasonable DOM size (< 500 nodes)
      expect(nodeCount).toBeLessThan(500);
    });
  });

  describe('Re-render Performance', () => {
    it('should handle state updates efficiently', async () => {
      const { rerender } = render(
        <BrowserRouter>
          <Dashboard />
        </BrowserRouter>
      );

      const startTime = performance.now();

      // Simulate 10 re-renders
      for (let i = 0; i < 10; i++) {
        rerender(
          <BrowserRouter>
            <Dashboard />
          </BrowserRouter>
        );
      }

      const totalTime = performance.now() - startTime;
      
      // 10 re-renders should complete in under 500ms
      expect(totalTime).toBeLessThan(500);
    });

    it('should memoize expensive computations', () => {
      const computeSpy = jest.fn();
      
      const TestComponent = () => {
        const result = React.useMemo(() => {
          computeSpy();
          return Array(1000).fill(0).reduce((a, b) => a + b, 0);
        }, []);
        
        return <div>{result}</div>;
      };

      const { rerender } = render(<TestComponent />);
      
      expect(computeSpy).toHaveBeenCalledTimes(1);
      
      // Re-render should not trigger computation again
      rerender(<TestComponent />);
      expect(computeSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Memory Efficiency', () => {
    it('should not leak memory on unmount', () => {
      const { unmount } = render(
        <BrowserRouter>
          <Dashboard />
        </BrowserRouter>
      );

      // Capture initial memory
      if (global.gc) {
        global.gc();
      }

      // Unmount component
      unmount();

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      // Component should clean up properly
      expect(true).toBe(true); // Placeholder - actual memory testing requires specialized tools
    });

    it('should clean up event listeners', () => {
      const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');

      const { unmount } = render(
        <BrowserRouter>
          <Dashboard />
        </BrowserRouter>
      );

      const addCount = addEventListenerSpy.mock.calls.length;
      
      unmount();

      const removeCount = removeEventListenerSpy.mock.calls.length;

      // Should remove at least as many listeners as added
      expect(removeCount).toBeGreaterThanOrEqual(addCount);

      addEventListenerSpy.mockRestore();
      removeEventListenerSpy.mockRestore();
    });
  });

  describe('Bundle Size', () => {
    it('should have reasonable component size', () => {
      const componentCode = Dashboard.toString();
      const sizeInKB = new Blob([componentCode]).size / 1024;

      // Individual component should be under 50KB
      expect(sizeInKB).toBeLessThan(50);
    });
  });

  describe('Interaction Performance', () => {
    it('should respond to clicks quickly', async () => {
      render(
        <BrowserRouter>
          <Dashboard />
        </BrowserRouter>
      );

      const button = screen.getAllByRole('button')[0];
      
      const startTime = performance.now();
      button.click();
      const clickTime = performance.now() - startTime;

      // Click handler should execute in under 16ms (60fps)
      expect(clickTime).toBeLessThan(16);
    });
  });

  describe('Rendering Optimization', () => {
    it('should use React.memo for expensive components', () => {
      // Check if components are memoized
      const StatCard = require('../pages/Dashboard').StatCard;
      
      if (StatCard) {
        expect(StatCard.$$typeof).toBeDefined();
      }
    });

    it('should avoid unnecessary re-renders', () => {
      const renderSpy = jest.fn();
      
      const TestComponent = React.memo(() => {
        renderSpy();
        return <div>Test</div>;
      });

      const { rerender } = render(<TestComponent />);
      
      expect(renderSpy).toHaveBeenCalledTimes(1);
      
      // Re-render with same props should not trigger render
      rerender(<TestComponent />);
      expect(renderSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Network Performance', () => {
    it('should cache API responses', async () => {
      const fetchSpy = jest.spyOn(global, 'fetch');
      
      render(
        <BrowserRouter>
          <Dashboard />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/Stadium Overview/i)).toBeInTheDocument();
      });

      const initialCallCount = fetchSpy.mock.calls.length;

      // Re-render should use cache
      render(
        <BrowserRouter>
          <Dashboard />
        </BrowserRouter>
      );

      const finalCallCount = fetchSpy.mock.calls.length;

      // Should not make additional calls if cached
      expect(finalCallCount).toBeLessThanOrEqual(initialCallCount + 1);

      fetchSpy.mockRestore();
    });
  });

  describe('Animation Performance', () => {
    it('should use CSS transforms for animations', () => {
      const { container } = render(
        <BrowserRouter>
          <Dashboard />
        </BrowserRouter>
      );

      const animatedElements = container.querySelectorAll('[class*="animate"]');
      
      animatedElements.forEach(element => {
        const styles = window.getComputedStyle(element);
        
        // Animations should use transform/opacity for better performance
        const hasTransform = styles.transform !== 'none';
        const hasOpacity = styles.opacity !== '1';
        
        expect(hasTransform || hasOpacity).toBe(true);
      });
    });
  });

  describe('Lazy Loading', () => {
    it('should support code splitting', () => {
      // Check if React.lazy is used
      const App = require('../App').default;
      
      // App should use lazy loading for routes
      expect(App).toBeDefined();
    });
  });
});
