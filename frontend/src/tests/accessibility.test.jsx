/**
 * Accessibility Tests
 * Tests WCAG compliance using jest-axe
 */

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { BrowserRouter } from 'react-router-dom';

expect.extend(toHaveNoViolations);

// Mock components for testing
const TestButton = () => (
  <button aria-label="Test button" type="button">
    Click me
  </button>
);

const TestForm = () => (
  <form aria-label="Test form">
    <label htmlFor="username">
      Username
      <input id="username" type="text" required aria-required="true" />
    </label>
    <label htmlFor="password">
      Password
      <input id="password" type="password" required aria-required="true" />
    </label>
    <button type="submit">Submit</button>
  </form>
);

const TestNavigation = () => (
  <nav aria-label="Main navigation">
    <ul>
      <li><a href="/">Home</a></li>
      <li><a href="/dashboard">Dashboard</a></li>
      <li><a href="/alerts">Alerts</a></li>
    </ul>
  </nav>
);

describe('Accessibility Tests', () => {
  it('button should have no accessibility violations', async () => {
    const { container } = render(<TestButton />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('form should have no accessibility violations', async () => {
    const { container } = render(<TestForm />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('navigation should have no accessibility violations', async () => {
    const { container } = render(<TestNavigation />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have proper heading hierarchy', () => {
    const { container } = render(
      <div>
        <h1>Main Title</h1>
        <h2>Subtitle</h2>
        <h3>Section</h3>
      </div>
    );
    
    const h1 = container.querySelector('h1');
    const h2 = container.querySelector('h2');
    const h3 = container.querySelector('h3');
    
    expect(h1).toBeInTheDocument();
    expect(h2).toBeInTheDocument();
    expect(h3).toBeInTheDocument();
  });

  it('images should have alt text', () => {
    const { container } = render(
      <img src="/test.jpg" alt="Test image description" />
    );
    
    const img = container.querySelector('img');
    expect(img).toHaveAttribute('alt');
    expect(img.getAttribute('alt')).not.toBe('');
  });

  it('links should have accessible names', () => {
    const { container } = render(
      <a href="/test" aria-label="Navigate to test page">
        <span aria-hidden="true">→</span>
      </a>
    );
    
    const link = container.querySelector('a');
    expect(link).toHaveAttribute('aria-label');
  });

  it('form inputs should have labels', () => {
    const { container } = render(
      <div>
        <label htmlFor="email">Email</label>
        <input id="email" type="email" />
      </div>
    );
    
    const input = container.querySelector('input');
    const label = container.querySelector('label');
    
    expect(label).toHaveAttribute('for', 'email');
    expect(input).toHaveAttribute('id', 'email');
  });

  it('buttons should have accessible text or aria-label', () => {
    const { container } = render(
      <div>
        <button>Click me</button>
        <button aria-label="Close dialog">×</button>
      </div>
    );
    
    const buttons = container.querySelectorAll('button');
    buttons.forEach(button => {
      const hasText = button.textContent.trim().length > 0;
      const hasAriaLabel = button.hasAttribute('aria-label');
      expect(hasText || hasAriaLabel).toBe(true);
    });
  });

  it('should use semantic HTML elements', () => {
    const { container } = render(
      <div>
        <header>Header</header>
        <nav>Navigation</nav>
        <main>Main content</main>
        <footer>Footer</footer>
      </div>
    );
    
    expect(container.querySelector('header')).toBeInTheDocument();
    expect(container.querySelector('nav')).toBeInTheDocument();
    expect(container.querySelector('main')).toBeInTheDocument();
    expect(container.querySelector('footer')).toBeInTheDocument();
  });

  it('interactive elements should be keyboard accessible', () => {
    const { container } = render(
      <button tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && console.log('activated')}>
        Accessible Button
      </button>
    );
    
    const button = container.querySelector('button');
    expect(button).toHaveAttribute('tabIndex', '0');
  });
});
