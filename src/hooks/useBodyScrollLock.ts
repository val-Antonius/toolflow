import { useEffect } from 'react';

/**
 * Custom hook to lock/unlock body scroll
 * @param isLocked - Boolean to determine if body scroll should be locked
 */
const useBodyScrollLock = (isLocked: boolean): void => {
  useEffect(() => {
    if (!isLocked) return;

    // Check if we're in browser environment
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    // Save current scroll position
    const scrollY: number = window.scrollY;
    const body: HTMLElement = document.body;

    // Save original styles for restoration
    const originalBodyStyle: {
      position: string;
      top: string;
      width: string;
      overflow: string;
    } = {
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
      overflow: body.style.overflow
    };

    // Apply lock styles
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.width = '100%';
    body.style.overflow = 'hidden';

    // Cleanup function
    return (): void => {
      // Restore original styles
      body.style.position = originalBodyStyle.position;
      body.style.top = originalBodyStyle.top;
      body.style.width = originalBodyStyle.width;
      body.style.overflow = originalBodyStyle.overflow;
      
      // Restore scroll position
      window.scrollTo(0, scrollY);
    };
  }, [isLocked]);
};

export {useBodyScrollLock} 