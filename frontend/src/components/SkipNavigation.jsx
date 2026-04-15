/**
 * Skip Navigation Component
 * Provides keyboard users ability to skip to main content
 * WCAG 2.4.1 - Bypass Blocks (Level A)
 */

import React from 'react';

export default function SkipNavigation() {
  return (
    <a
      href="#main-content"
      className="skip-navigation"
      style={{
        position: 'absolute',
        left: '-9999px',
        zIndex: 999,
        padding: '1rem',
        backgroundColor: '#1e293b',
        color: '#fff',
        textDecoration: 'none',
        borderRadius: '0.25rem',
        ':focus': {
          left: '1rem',
          top: '1rem'
        }
      }}
      onFocus={(e) => {
        e.target.style.left = '1rem';
        e.target.style.top = '1rem';
      }}
      onBlur={(e) => {
        e.target.style.left = '-9999px';
      }}
    >
      Skip to main content
    </a>
  );
}
