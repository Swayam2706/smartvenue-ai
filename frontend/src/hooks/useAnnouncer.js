/**
 * Screen Reader Announcer Hook
 * Provides live region announcements for dynamic content
 * WCAG 4.1.3 - Status Messages (Level AA)
 */

import { useEffect, useRef } from 'react';

/**
 * Creates a live region for screen reader announcements
 * 
 * @param {string} message - Message to announce
 * @param {string} politeness - 'polite' or 'assertive'
 * @param {number} timeout - Clear message after timeout (ms)
 */
export function useAnnouncer(message, politeness = 'polite', timeout = 5000) {
  const announcerRef = useRef(null);

  useEffect(() => {
    if (!announcerRef.current) {
      // Create live region if it doesn't exist
      const announcer = document.createElement('div');
      announcer.setAttribute('role', 'status');
      announcer.setAttribute('aria-live', politeness);
      announcer.setAttribute('aria-atomic', 'true');
      announcer.className = 'sr-only';
      announcer.style.position = 'absolute';
      announcer.style.left = '-10000px';
      announcer.style.width = '1px';
      announcer.style.height = '1px';
      announcer.style.overflow = 'hidden';
      document.body.appendChild(announcer);
      announcerRef.current = announcer;
    }

    if (message) {
      announcerRef.current.textContent = message;

      // Clear message after timeout
      const timer = setTimeout(() => {
        if (announcerRef.current) {
          announcerRef.current.textContent = '';
        }
      }, timeout);

      return () => clearTimeout(timer);
    }
  }, [message, politeness, timeout]);

  return announcerRef;
}

/**
 * Announce message to screen readers
 * 
 * @param {string} message - Message to announce
 * @param {string} politeness - 'polite' or 'assertive'
 */
export function announce(message, politeness = 'polite') {
  const announcer = document.querySelector('[role="status"]') || createAnnouncer(politeness);
  announcer.textContent = message;
  
  setTimeout(() => {
    announcer.textContent = '';
  }, 5000);
}

function createAnnouncer(politeness) {
  const announcer = document.createElement('div');
  announcer.setAttribute('role', 'status');
  announcer.setAttribute('aria-live', politeness);
  announcer.setAttribute('aria-atomic', 'true');
  announcer.className = 'sr-only';
  announcer.style.position = 'absolute';
  announcer.style.left = '-10000px';
  announcer.style.width = '1px';
  announcer.style.height = '1px';
  announcer.style.overflow = 'hidden';
  document.body.appendChild(announcer);
  return announcer;
}
