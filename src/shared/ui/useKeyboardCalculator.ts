import { useState, useCallback, useRef } from 'react';

interface UseKeyboardCalculatorArgs {
  onInput: (char: string) => void;
  play: (sound: any) => void;
  setLayout: (layout: 'qwerty' | 'numeric' | 'calculator' | 'symbols') => void;
}

export function useKeyboardCalculator({ onInput, play, setLayout }: UseKeyboardCalculatorArgs) {
  const [calcExpr, setCalcExpr] = useState('');
  const [calcResult, setCalcResult] = useState('');
  const [calcHistoryExpr, setCalcHistoryExpr] = useState('');
  const calcInputRef = useRef<HTMLInputElement>(null);

  const insertAtCursor = useCallback((char: string) => {
    if (calcHistoryExpr) setCalcHistoryExpr('');
    const input = calcInputRef.current;
    if (!input) {
      setCalcExpr(prev => prev + char);
      return;
    }
    const start = input.selectionStart ?? calcExpr.length;
    const end = input.selectionEnd ?? calcExpr.length;
    const val = calcExpr;
    const newVal = val.substring(0, start) + char + val.substring(end);
    setCalcExpr(newVal);
    const newPos = start + char.length;
    setTimeout(() => {
      input.focus();
      input.setSelectionRange(newPos, newPos);
    }, 0);
  }, [calcExpr, calcHistoryExpr]);

  const deleteAtCursor = useCallback(() => {
    if (calcHistoryExpr) setCalcHistoryExpr('');
    const input = calcInputRef.current;
    if (!input) {
      setCalcExpr(prev => prev.slice(0, -1));
      return;
    }
    const start = input.selectionStart ?? calcExpr.length;
    const end = input.selectionEnd ?? calcExpr.length;
    const val = calcExpr;
    let newVal = '';
    let newPos = start;

    if (start !== end) {
      newVal = val.substring(0, start) + val.substring(end);
      newPos = start;
    } else if (start > 0) {
      newVal = val.substring(0, start - 1) + val.substring(start);
      newPos = start - 1;
    } else {
      return;
    }
    setCalcExpr(newVal);
    setTimeout(() => {
      input.focus();
      input.setSelectionRange(newPos, newPos);
    }, 0);
  }, [calcExpr, calcHistoryExpr]);

  const handleCalcClick = (key: string) => {
    play('keypress');
    if (calcResult && calcResult !== 'Error') {
      if (['/', '*', '-', '+'].includes(key)) {
        setCalcHistoryExpr('');
        setCalcExpr(calcResult + key);
        setCalcResult('');
        setTimeout(() => {
          if (calcInputRef.current) {
            calcInputRef.current.focus();
            const len = calcResult.length + key.length;
            calcInputRef.current.setSelectionRange(len, len);
          }
        }, 0);
        return;
      } else if (key === '=') {
        return;
      } else if (key === 'BKSP') {
        setCalcHistoryExpr('');
        setCalcExpr('');
        setCalcResult('');
        setTimeout(() => calcInputRef.current?.focus(), 0);
        return;
      } else if (key === 'INSERT') {
        return; // INSERT key: no calculator action (reserved)
      } else if (key !== 'C') {
        setCalcHistoryExpr('');
        setCalcExpr(key);
        setCalcResult('');
        setTimeout(() => {
          if (calcInputRef.current) {
            calcInputRef.current.focus();
            calcInputRef.current.setSelectionRange(1, 1);
          }
        }, 0);
        return;
      }
    }

    if (key === 'C') {
      setCalcExpr('');
      setCalcResult('');
      setCalcHistoryExpr('');
      setTimeout(() => calcInputRef.current?.focus(), 0);
    } else if (key === '=') {
      try {
        const sanitized = calcExpr.replace(/[^-()\d/*+.]/g, '');
        const res = new Function(`return ${sanitized || '0'}`)();
        setCalcHistoryExpr(calcExpr);
        setCalcResult(String(Number(res.toFixed(6))));
        play('enter');
      } catch {
        setCalcResult('Error');
      }
    } else if (key === 'BKSP') {
      play('delete');
      deleteAtCursor();
    } else if (key === 'INSERT') {
      play('enter');
      const textToInsert = calcResult || calcExpr;
      if (textToInsert) {
        for (const char of textToInsert) {
          onInput(char);
        }
        setLayout('numeric');
      }
    } else {
      insertAtCursor(key);
    }
  };

  const handleCalcInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (calcHistoryExpr) setCalcHistoryExpr('');
    if (calcResult) {
      const lastChar = val.slice(-1);
      if (['+', '-', '*', '/'].includes(lastChar)) {
        setCalcExpr(calcResult + lastChar);
      } else {
        setCalcExpr(lastChar);
      }
      setCalcResult('');
      return;
    }
    const cleaned = val
      .replace(/×/g, '*')
      .replace(/÷/g, '/')
      .replace(/−/g, '-')
      .replace(/[^0-9+\-*/().]/g, '');
    setCalcExpr(cleaned);
    setCalcResult('');
  };

  const handleCalcInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCalcClick('=');
    }
  };

  const handleCalcInputClick = () => {
    if (calcResult) {
      const input = calcInputRef.current;
      const pos = input ? (input.selectionStart ?? calcResult.length) : calcResult.length;
      setCalcExpr(calcResult);
      setCalcResult('');
      play('keypress');
      setTimeout(() => {
        if (calcInputRef.current) {
          calcInputRef.current.focus();
          calcInputRef.current.setSelectionRange(pos, pos);
        }
      }, 0);
    }
  };

  return {
    calcExpr,
    calcResult,
    calcHistoryExpr,
    calcInputRef,
    handleCalcClick,
    handleCalcInputChange,
    handleCalcInputKeyDown,
    handleCalcInputClick,
  };
}
