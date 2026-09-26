import { useState, useEffect, useCallback, useRef } from 'react';
import { useSoundFeedback } from '../../hooks/useSoundFeedback';
import { useKeyboardCalculator } from './useKeyboardCalculator';

interface UseKeyboardLogicProps {
  isOpen: boolean;
  onInput: (char: string) => void;
  onBackspace: () => void;
  onEnter: () => void;
  onClear: () => void;
  inputElement: HTMLInputElement | HTMLTextAreaElement | null;
}

// Outward-diagonal sign per corner: dragging a corner AWAY from the keyboard
// centre grows it, dragging inward shrinks it — natural for all four corners.
export type ResizeCorner = 'tl' | 'tr' | 'bl' | 'br';
const RESIZE_SIGN: Record<ResizeCorner, { sx: number; sy: number }> = {
  tl: { sx: -1, sy: -1 },
  tr: { sx: 1, sy: -1 },
  bl: { sx: -1, sy: 1 },
  br: { sx: 1, sy: 1 },
};
const RESIZE_MIN = 0.6;
const RESIZE_MAX = 1.4;
const RESIZE_SENSITIVITY = 300; // px of outward drag per 1.0 scale step

export function useKeyboardLogic({ isOpen, onInput, onBackspace, onEnter, onClear, inputElement }: UseKeyboardLogicProps) {
  const [layout, setLayout] = useState<'qwerty' | 'numeric' | 'calculator' | 'symbols'>('qwerty');
  const [isCaps, setIsCaps] = useState(false);
  const { play } = useSoundFeedback();

  // Dragging state
  const [position, setPosition] = useState(() => {
    const saved = localStorage.getItem('keyboard_position');
    return saved ? JSON.parse(saved) : { x: 0, y: 0 };
  });
  const [scale, setScale] = useState(() => {
    const saved = localStorage.getItem('keyboard_scale');
    return saved ? parseFloat(saved) : 1.0;
  });
  const [widthScale, setWidthScale] = useState(() => {
    const saved = localStorage.getItem('keyboard_width_scale');
    return saved ? parseFloat(saved) : 1.0;
  });

  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isFolded, setIsFolded] = useState(false);
  const [forceOpen, setForceOpen] = useState(false);

  const keyboardRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({ startX: 0, startY: 0, initialX: 0, initialY: 0, currentX: 0, currentY: 0, initialScale: 1.0, corner: 'br' as ResizeCorner });

  const {
    calcExpr, calcInputRef, handleCalcClick,
    ...calcFields
  } = useKeyboardCalculator({ onInput, play, setLayout });

  // Auto-repeat state for BKSP
  const autoRepeatTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const autoRepeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasAutoRepeated = useRef(false);

  const clampPosition = useCallback((x: number, y: number, currentScale = scale, currentWidthScale = widthScale) => {
    const winW = window.innerWidth;
    const winH = window.innerHeight;

    let actualWidth = 56;
    let actualHeight = 56;

    if (!isFolded) {
      const kW = innerRef.current?.offsetWidth || 700;
      const kH = innerRef.current?.offsetHeight || 380;
      actualWidth = kW * currentWidthScale * currentScale;
      actualHeight = kH * currentScale;
    }

    const minX = -Math.max(0, (winW / 2 - actualWidth / 2 - 8));
    const maxX = Math.max(0, (winW / 2 - actualWidth / 2 - 8));

    const minY = -Math.max(0, (winH - actualHeight - 24));
    const maxY = 0;

    return {
      x: Math.max(minX, Math.min(maxX, x)),
      y: Math.max(minY, Math.min(maxY, y))
    };
  }, [scale, widthScale, isFolded]);

  const clearAutoRepeat = useCallback(() => {
    if (autoRepeatTimeoutRef.current) clearTimeout(autoRepeatTimeoutRef.current);
    if (autoRepeatIntervalRef.current) clearInterval(autoRepeatIntervalRef.current);
  }, []);

  useEffect(() => {
    return clearAutoRepeat;
  }, [clearAutoRepeat]);

  useEffect(() => {
    const clamped = clampPosition(position.x, position.y);
    if (clamped.x !== position.x || clamped.y !== position.y) {
      setPosition(clamped);
      localStorage.setItem('keyboard_position', JSON.stringify(clamped));
    }
  }, [scale, widthScale, clampPosition, position.x, position.y]);

  // Pointer event handlers for dragging and resizing
  useEffect(() => {
    if (!isDragging && !isResizing) return;

    const handlePointerMove = (e: PointerEvent) => {
      e.preventDefault();

      if (isDragging) {
        const dx = e.clientX - dragRef.current.startX;
        const dy = e.clientY - dragRef.current.startY;

        const rawX = dragRef.current.initialX + dx;
        const rawY = dragRef.current.initialY + dy;

        const clamped = clampPosition(rawX, rawY, dragRef.current.initialScale, widthScale);
        dragRef.current.currentX = clamped.x;
        dragRef.current.currentY = clamped.y;

        if (keyboardRef.current) {
          keyboardRef.current.style.transform = `translate3d(calc(-50% + ${clamped.x}px), ${clamped.y}px, 0)`;
        }
      } else if (isResizing) {
        // Four-corner resize: project the drag onto the corner's outward
        // diagonal so dragging outward always grows and inward always shrinks.
        const { sx, sy } = RESIZE_SIGN[dragRef.current.corner];
        const dx = e.clientX - dragRef.current.startX;
        const dy = e.clientY - dragRef.current.startY;
        const outward = sx * dx + sy * dy;
        const newScale = Math.max(RESIZE_MIN, Math.min(RESIZE_MAX, dragRef.current.initialScale + (outward / RESIZE_SENSITIVITY)));
        setScale(newScale);
        localStorage.setItem('keyboard_scale', String(newScale));
      }
    };

    const handlePointerUp = () => {
      setIsDragging(false);
      setIsResizing(false);
      if (dragRef.current.currentX !== dragRef.current.initialX || dragRef.current.currentY !== dragRef.current.initialY) {
        const newPos = { x: dragRef.current.currentX, y: dragRef.current.currentY };
        setPosition(newPos);
        localStorage.setItem('keyboard_position', JSON.stringify(newPos));
      }
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: false });
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [isDragging, isResizing, clampPosition, widthScale]);

  const handlePointerDown = (e: React.PointerEvent, type: 'drag' | 'resize', corner: ResizeCorner = 'br') => {
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: position.x,
      initialY: position.y,
      currentX: position.x,
      currentY: position.y,
      initialScale: scale,
      corner
    };
    if (type === 'drag') setIsDragging(true);
    else setIsResizing(true);
  };

  const prevInputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  useEffect(() => {
    if (inputElement) {
      const isNewInput = inputElement !== prevInputRef.current;
      prevInputRef.current = inputElement;

      if (isNewInput && layout !== 'calculator') {
        if (inputElement.type === 'number' || inputElement.inputMode === 'numeric' || inputElement.inputMode === 'decimal') {
          setLayout('numeric');
        } else {
          setLayout('qwerty');
        }
      }
    }
  }, [inputElement, isOpen, layout]);

  useEffect(() => {
    if (layout === 'calculator' && isOpen && !isFolded) {
      setTimeout(() => {
        if (calcInputRef.current) {
          calcInputRef.current.focus();
          const len = calcExpr.length;
          calcInputRef.current.setSelectionRange(len, len);
        }
      }, 100);
    }
  }, [layout, isOpen, isFolded]);

  const handleKeyClick = (key: string) => {
    if (layout === 'calculator') {
      handleCalcClick(key);
      return;
    }

    if (key === 'SHIFT') {
      setIsCaps(!isCaps);
      play('keypress');
    } else if (key === 'BKSP') {
      onBackspace();
      play('delete');
    } else if (key === 'ENTER') {
      onEnter();
      play('enter');
    } else if (key === 'SPACE') {
      onInput(' ');
      play('keypress');
    } else if (key === 'CLEAR') {
      onClear();
      play('delete');
    } else if (key === 'HIDE') {
      play('keypress');
    } else if (key === '123' || key === '?123') {
      setLayout('numeric');
      play('keypress');
    } else if (key === 'ABC') {
      setLayout('qwerty');
      play('keypress');
    } else if (key === '=\\<') {
      setLayout('symbols');
      play('keypress');
    } else if (key === 'CALC') {
      setLayout('calculator');
      play('keypress');
    } else {
      const charToInput = isCaps ? key.toUpperCase() : key.toLowerCase();
      onInput(charToInput);
      play('keypress');
    }
  };

  const handleKeyPointerDown = (e: React.PointerEvent, key: string) => {
    if (key === 'BKSP') {
      e.preventDefault();
      hasAutoRepeated.current = false;
      handleKeyClick('BKSP');

      autoRepeatTimeoutRef.current = setTimeout(() => {
        autoRepeatIntervalRef.current = setInterval(() => {
          hasAutoRepeated.current = true;
          onBackspace();
          play('delete');
        }, 50);
      }, 500);
    }
  };

  const handleKeyPointerUp = (e: React.PointerEvent, key: string) => {
    if (key === 'BKSP') {
      e.preventDefault();
      clearAutoRepeat();
    } else {
      handleKeyClick(key);
    }
  };

  const toggleFold = () => {
    setIsFolded(prev => !prev);
    play('keypress');
  };

  return {
    layout, setLayout,
    isCaps, setIsCaps,
    calcExpr,
    ...calcFields,
    position, scale, widthScale, setWidthScale,
    isDragging, isResizing, isFolded, forceOpen, setForceOpen,
    keyboardRef, innerRef, calcInputRef,
    handlePointerDown, handleKeyPointerDown, handleKeyPointerUp,
    toggleFold
  };
}
