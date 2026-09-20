import { useRef, useState, useEffect, useCallback, RefObject } from 'react';

export interface UseHorizontalScrollOptions {
  ref?: RefObject<HTMLElement | null>;
  step?: number;
  enableDrag?: boolean;
  enableWheel?: boolean;
  activeItemSelector?: string;
  activeDep?: unknown;
}

export function useHorizontalScroll<T extends HTMLElement = HTMLDivElement>(
  options: UseHorizontalScrollOptions = {}
) {
  const {
    ref: externalRef,
    step = 220,
    enableDrag = true,
    enableWheel = true,
    activeItemSelector = '[data-active="true"]',
    activeDep
  } = options;

  const internalRef = useRef<T>(null);
  const targetRef = (externalRef || internalRef) as RefObject<T>;

  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Check scroll bounds without layout thrashing
  const checkScroll = useCallback(() => {
    const el = targetRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 2);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 2);
  }, [targetRef]);

  // Programmatic smooth scroll for chevrons
  const scroll = useCallback((direction: 'left' | 'right', customStep?: number) => {
    const el = targetRef.current;
    if (!el) return;
    const amount = customStep ?? step;
    el.scrollBy({
      left: direction === 'left' ? -amount : amount,
      behavior: 'smooth'
    });
  }, [targetRef, step]);

  // Safe container-only active item alignment (ONLY if partially/fully hidden)
  const scrollToActive = useCallback((customSelector?: string) => {
    const el = targetRef.current;
    if (!el) return;
    const selector = customSelector || activeItemSelector;
    const activeEl = el.querySelector(selector) as HTMLElement | null;
    if (activeEl) {
      const elLeft = activeEl.offsetLeft;
      const elRight = elLeft + activeEl.offsetWidth;
      const scrollLeft = el.scrollLeft;
      const scrollRight = scrollLeft + el.clientWidth;

      // Only scroll if active element is outside current visible bounds
      if (elLeft < scrollLeft || elRight > scrollRight) {
        const targetScroll = elLeft - (el.clientWidth - activeEl.clientWidth) / 2;
        el.scrollTo({
          left: Math.max(0, targetScroll),
          behavior: 'smooth'
        });
      }
    }
  }, [activeItemSelector, targetRef]);

  useEffect(() => {
    const el = targetRef.current;
    if (!el) return;

    checkScroll();
    el.addEventListener('scroll', checkScroll, { passive: true });
    window.addEventListener('resize', checkScroll);

    const observer = new ResizeObserver(checkScroll);
    observer.observe(el);

    // Smart wheel handler:
    // 1. NEVER intercept if e.deltaX !== 0 (macOS native trackpad horizontal momentum is 120 FPS native)
    // 2. Only translate vertical wheel when user is holding Shift or using a physical stepped mouse wheel
    let onWheel: ((e: WheelEvent) => void) | undefined;
    if (enableWheel) {
      onWheel = (e: WheelEvent) => {
        // If native horizontal trackpad scroll is active, let the browser handle it
        if (e.deltaX !== 0) return;

        // Stepped mouse wheel (deltaMode 1) or Shift + vertical wheel
        const isSteppedWheel = e.deltaMode !== 0 || (Number.isInteger(e.deltaY) && Math.abs(e.deltaY) >= 40);
        if ((e.shiftKey || isSteppedWheel) && el.scrollWidth > el.clientWidth) {
          e.preventDefault();
          el.scrollLeft += e.deltaY;
        }
      };
      el.addEventListener('wheel', onWheel, { passive: false });
    }

    // Drag-to-scroll support without React re-render lag
    let cleanupDrag: (() => void) | undefined;
    if (enableDrag) {
      let isPointerDown = false;
      let startX = 0;
      let startScrollLeft = 0;
      let hasMoved = false;

      const onMouseDown = (e: MouseEvent) => {
        if (e.button !== 0) return;
        const target = e.target as HTMLElement;
        if (target.closest('input, textarea, select')) return;

        isPointerDown = true;
        startX = e.pageX;
        startScrollLeft = el.scrollLeft;
        hasMoved = false;
      };

      const onMouseMove = (e: MouseEvent) => {
        if (!isPointerDown) return;
        const dx = e.pageX - startX;
        if (!hasMoved && Math.abs(dx) > 6) {
          hasMoved = true;
          el.classList.add('cursor-grabbing', 'select-none');
        }
        if (hasMoved) {
          e.preventDefault();
          el.scrollLeft = startScrollLeft - dx;
        }
      };

      const onMouseUp = () => {
        if (!isPointerDown) return;
        isPointerDown = false;
        if (hasMoved) {
          el.classList.remove('cursor-grabbing', 'select-none');
          const captureClick = (clickEvent: MouseEvent) => {
            clickEvent.stopPropagation();
            clickEvent.preventDefault();
          };
          window.addEventListener('click', captureClick, { capture: true, once: true });
        }
      };

      el.addEventListener('mousedown', onMouseDown);
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);

      cleanupDrag = () => {
        el.removeEventListener('mousedown', onMouseDown);
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      };
    }

    return () => {
      el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
      observer.disconnect();
      if (onWheel) el.removeEventListener('wheel', onWheel);
      if (cleanupDrag) cleanupDrag();
    };
  }, [checkScroll, enableWheel, enableDrag, targetRef]);

  // When active item or dependency changes, smoothly reveal active element IF hidden
  useEffect(() => {
    if (activeDep !== undefined) {
      const timer = setTimeout(() => {
        scrollToActive();
        checkScroll();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [activeDep, scrollToActive, checkScroll]);

  return {
    containerRef: targetRef,
    canScrollLeft,
    canScrollRight,
    scroll,
    scrollToActive,
    checkScroll
  };
}
