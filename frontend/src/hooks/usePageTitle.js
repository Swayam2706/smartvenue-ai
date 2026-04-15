/**
 * usePageTitle — sets document title on each page
 * Improves accessibility (screen readers announce page changes)
 */
import { useEffect } from 'react';

export function usePageTitle(title) {
  useEffect(() => {
    const prev = document.title;
    document.title = title ? `${title} — SmartVenue AI` : 'SmartVenue AI';
    return () => { document.title = prev; };
  }, [title]);
}
