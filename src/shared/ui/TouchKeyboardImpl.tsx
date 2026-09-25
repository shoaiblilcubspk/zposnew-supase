import React from 'react';
import { X, Globe, GripHorizontal, Keyboard as KeyboardIcon, Minimize2 } from 'lucide-react';
import { LAYOUTS, CALC_LAYOUT } from './KeyboardLayouts';
import { useKeyboardLogic } from './useKeyboardLogic';
import { KeyboardKey, CalculatorKey } from './keyboardKeys';

interface TouchKeyboardProps {
  isOpen: boolean;
  onClose: () => void;
  onInput: (char: string) => void;
  onBackspace: () => void;
  onEnter: () => void;
  inputElement: HTMLInputElement | HTMLTextAreaElement | null;
}

export const TouchKeyboard = React.memo(function TouchKeyboard(props: TouchKeyboardProps) {
  const {
    layout, isCaps,
    calcExpr, calcResult, calcHistoryExpr,
    position, scale, widthScale, setWidthScale,
    isFolded, forceOpen, setForceOpen,
    keyboardRef, innerRef, calcInputRef,
    handlePointerDown, handleKeyPointerDown, handleKeyPointerUp,
    handleCalcInputChange, handleCalcInputKeyDown, handleCalcInputClick, toggleFold
  } = useKeyboardLogic(props);

  if (!props.isOpen && !forceOpen && !isFolded) return null;

  if (isFolded) {
    return (
      <div
        ref={keyboardRef}
        style={{ transform: `translate3d(calc(-50% + ${position.x}px), ${position.y}px, 0)` }}
        className="fixed bottom-0 left-1/2 z-[9999] touch-none select-none p-4 pb-[24px]"
      >
        <div className="flex gap-2">
          <button
            onPointerDown={(e) => handlePointerDown(e, 'drag')}
            className="w-10 h-10 bg-neutral-900 dark:bg-neutral-800 rounded-md border border-neutral-700 shadow-md flex items-center justify-center text-white hover:bg-neutral-800 transition-all cursor-move"
          >
            <GripHorizontal className="w-4 h-4 opacity-70" />
          </button>
           
          <button
            onClick={toggleFold}
            className="w-10 h-10 bg-emerald-600 text-white rounded-md shadow-md flex items-center justify-center hover:bg-emerald-500 transition-all"
          >
            <KeyboardIcon className="w-4 h-4" />
          </button>

          <button
            onClick={props.onClose}
            className="w-10 h-10 bg-rose-600 text-white rounded-md shadow-md flex items-center justify-center hover:bg-rose-500 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={keyboardRef}
      style={{
        transform: `translate3d(calc(-50% + ${position.x}px), ${position.y}px, 0)`,
        willChange: 'transform'
      }}
      className={`fixed bottom-0 left-1/2 z-[9999] touch-none select-none`}
    >
      <div 
        ref={innerRef}
        className="relative bg-neutral-100 dark:bg-neutral-950 rounded-t-lg shadow-2xl border border-neutral-300 dark:border-white/[0.08] overflow-hidden flex flex-col"
        style={{
          transformOrigin: 'bottom center',
          transform: `scale(${scale})`,
          width: layout === 'calculator' ? '400px' : `${widthScale * 100}%`,
          minWidth: layout === 'calculator' ? '400px' : '700px',
          maxWidth: layout === 'calculator' ? '400px' : '1200px',
        }}
      >
        <div 
          className="h-9 bg-neutral-100 dark:bg-neutral-900 border-b border-neutral-200 dark:border-white/[0.08] flex items-center justify-between px-3 cursor-move rounded-t-lg active:bg-neutral-200/50 dark:active:bg-neutral-800 transition-colors"
          onPointerDown={(e) => handlePointerDown(e, 'drag')}
        >
          <div className="flex items-center gap-2 pointer-events-none opacity-60">
            <GripHorizontal className="w-3.5 h-3.5" />
            <span className="text-[11px] font-medium uppercase tracking-wider text-neutral-600 dark:text-neutral-400">
              {layout === 'calculator' ? 'Calculator' : 'Virtual Keyboard'}
            </span>
          </div>
           
          <div className="flex items-center gap-1.5 pointer-events-auto">
            <button
              onClick={() => setForceOpen(!forceOpen)}
              className={`p-1.5 rounded transition-colors ${forceOpen ? 'bg-emerald-500/10 text-emerald-500' : 'hover:bg-neutral-200 dark:hover:bg-white/10 text-neutral-400'}`}
              title="Pin Keyboard"
            >
              <Globe className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={toggleFold}
              className="p-1.5 rounded hover:bg-neutral-200 dark:hover:bg-white/10 text-neutral-400 transition-colors"
              title="Fold Keyboard"
            >
              <Minimize2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={props.onClose}
              className="p-1.5 rounded hover:bg-rose-500/10 text-rose-500 transition-colors"
              title="Close Keyboard"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="p-2 sm:p-4 pb-4 sm:pb-6 flex-1 flex flex-col justify-end">
          {layout === 'calculator' ? (
            <div className="flex flex-col gap-2.5">
              <div className="bg-white dark:bg-neutral-900 p-3 rounded-md border border-neutral-200 dark:border-white/[0.08] shadow-none space-y-1.5">
                <div className="text-xs text-neutral-500 font-mono text-right min-h-[16px]">
                  {calcHistoryExpr || '\u00A0'}
                </div>
                
                <input
                  ref={calcInputRef}
                  type="text"
                  value={calcExpr}
                  onChange={handleCalcInputChange}
                  onKeyDown={handleCalcInputKeyDown}
                  className={`w-full text-right bg-transparent border-none outline-none font-mono ${calcResult ? 'text-xl text-neutral-400' : 'text-2xl font-bold text-neutral-900 dark:text-white'}`}
                  placeholder="0"
                />

                {calcResult && (
                  <div 
                    className="text-right text-2xl font-bold text-emerald-500 font-mono cursor-pointer active:scale-98 transition-transform"
                    onClick={handleCalcInputClick}
                  >
                    = {calcResult}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-4 gap-2">
                {CALC_LAYOUT.map((row, rowIndex) => (
                  <React.Fragment key={rowIndex}>
                    {row.map((key, keyIndex) => (
                      <CalculatorKey
                        key={`${rowIndex}-${keyIndex}`}
                        k={key}
                        onPointerDown={(e) => handleKeyPointerDown(e, key)}
                        onPointerUp={(e) => handleKeyPointerUp(e, key)}
                      />
                    ))}
                  </React.Fragment>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {LAYOUTS[layout].map((row, rowIndex) => (
                <div key={rowIndex} className="flex justify-center gap-1 sm:gap-2">
                  {row.map((key, keyIndex) => (
                    <KeyboardKey
                      key={`${rowIndex}-${keyIndex}`}
                      k={key}
                      isCaps={isCaps}
                      onPointerDown={(e) => handleKeyPointerDown(e, key)}
                      onPointerUp={(e) => handleKeyPointerUp(e, key)}
                    />
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        <div 
          className="absolute -top-3 -left-3 w-8 h-8 cursor-nwse-resize z-50 bg-primary/20 rounded-full opacity-0 hover:opacity-100"
          onPointerDown={(e) => handlePointerDown(e, 'resize')}
        />
        <div 
          className="absolute -top-3 -right-3 w-8 h-8 cursor-nesw-resize z-50 bg-primary/20 rounded-full opacity-0 hover:opacity-100"
          onPointerDown={(e) => handlePointerDown(e, 'resize')}
        />
        
        {layout !== 'calculator' && (
          <>
            <div 
              className="absolute top-1/2 -left-3 w-6 h-12 -translate-y-1/2 cursor-ew-resize z-50 bg-primary/20 rounded-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
              onPointerDown={(e) => {
                const startX = e.clientX;
                const startWidthScale = widthScale;
                const handleMove = (e2: PointerEvent) => {
                  const dx = startX - e2.clientX;
                  const newScale = Math.max(0.5, Math.min(2.0, startWidthScale + (dx / 500)));
                  setWidthScale(newScale);
                  localStorage.setItem('keyboard_width_scale', String(newScale));
                };
                const handleUp = () => {
                  window.removeEventListener('pointermove', handleMove);
                  window.removeEventListener('pointerup', handleUp);
                };
                window.addEventListener('pointermove', handleMove);
                window.addEventListener('pointerup', handleUp);
              }}
            >
              <div className="w-1 h-6 bg-primary rounded-full"></div>
            </div>
            
            <div 
              className="absolute top-1/2 -right-3 w-6 h-12 -translate-y-1/2 cursor-ew-resize z-50 bg-primary/20 rounded-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
              onPointerDown={(e) => {
                const startX = e.clientX;
                const startWidthScale = widthScale;
                const handleMove = (e2: PointerEvent) => {
                  const dx = e2.clientX - startX;
                  const newScale = Math.max(0.5, Math.min(2.0, startWidthScale + (dx / 500)));
                  setWidthScale(newScale);
                  localStorage.setItem('keyboard_width_scale', String(newScale));
                };
                const handleUp = () => {
                  window.removeEventListener('pointermove', handleMove);
                  window.removeEventListener('pointerup', handleUp);
                };
                window.addEventListener('pointermove', handleMove);
                window.addEventListener('pointerup', handleUp);
              }}
            >
              <div className="w-1 h-6 bg-primary rounded-full"></div>
            </div>
          </>
        )}
      </div>
    </div>
  );
});
