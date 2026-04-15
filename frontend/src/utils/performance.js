/**
 * Performance Monitoring Utilities
 * Tracks and reports application performance metrics
 * 
 * @module utils/performance
 */

/**
 * Measure component render time
 * 
 * @param {string} componentName - Name of the component
 * @param {Function} callback - Function to measure
 * @returns {*} Result of callback
 */
export function measureRenderTime(componentName, callback) {
  const startTime = performance.now();
  const result = callback();
  const endTime = performance.now();
  
  const renderTime = endTime - startTime;
  
  if (renderTime > 16) { // Slower than 60fps
    console.warn(`[Performance] ${componentName} render took ${renderTime.toFixed(2)}ms`);
  }
  
  return result;
}

/**
 * Track API call performance
 * 
 * @param {string} endpoint - API endpoint
 * @param {Function} apiCall - Async function making the API call
 * @returns {Promise<*>} API response
 */
export async function trackAPIPerformance(endpoint, apiCall) {
  const startTime = performance.now();
  
  try {
    const result = await apiCall();
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    // Log slow API calls
    if (duration > 1000) {
      console.warn(`[Performance] Slow API call to ${endpoint}: ${duration.toFixed(2)}ms`);
    }
    
    // Track in analytics if available
    if (window.gtag) {
      window.gtag('event', 'api_performance', {
        endpoint,
        duration: Math.round(duration),
        status: 'success'
      });
    }
    
    return result;
  } catch (error) {
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    if (window.gtag) {
      window.gtag('event', 'api_performance', {
        endpoint,
        duration: Math.round(duration),
        status: 'error'
      });
    }
    
    throw error;
  }
}

/**
 * Monitor Core Web Vitals
 * Tracks LCP, FID, CLS metrics
 */
export function monitorWebVitals() {
  if (typeof window === 'undefined') return;
  
  // Largest Contentful Paint (LCP)
  if ('PerformanceObserver' in window) {
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        
        const lcp = lastEntry.renderTime || lastEntry.loadTime;
        
        if (lcp > 2500) {
          console.warn(`[Performance] LCP is ${lcp.toFixed(2)}ms (target: <2500ms)`);
        }
        
        if (window.gtag) {
          window.gtag('event', 'web_vitals', {
            metric: 'LCP',
            value: Math.round(lcp)
          });
        }
      });
      
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
    } catch (e) {
      // Observer not supported
    }
    
    // First Input Delay (FID)
    try {
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          const fid = entry.processingStart - entry.startTime;
          
          if (fid > 100) {
            console.warn(`[Performance] FID is ${fid.toFixed(2)}ms (target: <100ms)`);
          }
          
          if (window.gtag) {
            window.gtag('event', 'web_vitals', {
              metric: 'FID',
              value: Math.round(fid)
            });
          }
        });
      });
      
      fidObserver.observe({ entryTypes: ['first-input'] });
    } catch (e) {
      // Observer not supported
    }
    
    // Cumulative Layout Shift (CLS)
    try {
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        }
        
        if (clsValue > 0.1) {
          console.warn(`[Performance] CLS is ${clsValue.toFixed(3)} (target: <0.1)`);
        }
      });
      
      clsObserver.observe({ entryTypes: ['layout-shift'] });
      
      // Report CLS on page unload
      window.addEventListener('beforeunload', () => {
        if (window.gtag) {
          window.gtag('event', 'web_vitals', {
            metric: 'CLS',
            value: Math.round(clsValue * 1000) / 1000
          });
        }
      });
    } catch (e) {
      // Observer not supported
    }
  }
}

/**
 * Track memory usage
 * 
 * @returns {Object} Memory usage stats
 */
export function trackMemoryUsage() {
  if (!performance.memory) {
    return null;
  }
  
  const memory = {
    usedJSHeapSize: performance.memory.usedJSHeapSize,
    totalJSHeapSize: performance.memory.totalJSHeapSize,
    jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
    usagePercent: (performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit) * 100
  };
  
  // Warn if memory usage is high
  if (memory.usagePercent > 90) {
    console.warn(`[Performance] High memory usage: ${memory.usagePercent.toFixed(2)}%`);
  }
  
  return memory;
}

/**
 * Debounce function for performance optimization
 * 
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(func, wait) {
  let timeout;
  
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function for performance optimization
 * 
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function} Throttled function
 */
export function throttle(func, limit) {
  let inThrottle;
  
  return function executedFunction(...args) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Lazy load images for better performance
 * 
 * @param {HTMLImageElement} img - Image element
 */
export function lazyLoadImage(img) {
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const image = entry.target;
          image.src = image.dataset.src;
          image.classList.remove('lazy');
          observer.unobserve(image);
        }
      });
    });
    
    observer.observe(img);
  } else {
    // Fallback for browsers without IntersectionObserver
    img.src = img.dataset.src;
  }
}

/**
 * Prefetch resources for better performance
 * 
 * @param {string} url - URL to prefetch
 * @param {string} type - Resource type (script, style, fetch)
 */
export function prefetchResource(url, type = 'fetch') {
  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.as = type;
  link.href = url;
  document.head.appendChild(link);
}

/**
 * Report performance metrics to analytics
 */
export function reportPerformanceMetrics() {
  if (typeof window === 'undefined' || !window.performance) return;
  
  // Wait for page load
  window.addEventListener('load', () => {
    setTimeout(() => {
      const perfData = window.performance.timing;
      const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
      const connectTime = perfData.responseEnd - perfData.requestStart;
      const renderTime = perfData.domComplete - perfData.domLoading;
      
      console.log('[Performance Metrics]', {
        pageLoadTime: `${pageLoadTime}ms`,
        connectTime: `${connectTime}ms`,
        renderTime: `${renderTime}ms`
      });
      
      if (window.gtag) {
        window.gtag('event', 'page_performance', {
          page_load_time: pageLoadTime,
          connect_time: connectTime,
          render_time: renderTime
        });
      }
    }, 0);
  });
}

// Initialize performance monitoring
if (typeof window !== 'undefined') {
  monitorWebVitals();
  reportPerformanceMetrics();
  
  // Track memory usage every 30 seconds
  setInterval(() => {
    const memory = trackMemoryUsage();
    if (memory && memory.usagePercent > 80) {
      console.warn('[Performance] Memory usage:', memory);
    }
  }, 30000);
}
