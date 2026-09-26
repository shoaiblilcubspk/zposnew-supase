import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Search, ChevronDown, Plus } from 'lucide-react';
import { ProductThumb } from './ProductThumb';

interface Option {
  id: string;
  label: string;
  image?: string;
  sublabel?: string;
}

export interface SearchableSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  onAddNew?: (search: string) => void;
  placeholder?: string;
  label?: string;
  icon?: any;
  iconColor?: string;
  required?: boolean;
  align?: 'left' | 'right';
  disabled?: boolean;
}

export function SearchableSelect({
  options,
  value,
  onChange,
  onAddNew,
  placeholder = 'Search...',
  label,
  icon: Icon,
  iconColor,
  required,
  align = 'left'
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedOption = useMemo(() => options.find(o => o.id === value), [options, value]);

  const filteredOptions = useMemo(() => {
    return options.filter(o => String(o.label || '').toLowerCase().includes(search.toLowerCase()) || String(o.sublabel || '').toLowerCase().includes(search.toLowerCase()));
  }, [options, search]);

  const positionDropdown = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const triggerWidth = rect.width;
    const gap = 4;
    const viewportHeight = window.innerHeight;
    const spaceBelow = viewportHeight - rect.bottom;
    const dropdownHeight = Math.min(filteredOptions.length * 44 + 60, 280);

    const style: React.CSSProperties = {
      position: 'fixed',
      minWidth: Math.max(triggerWidth, 200),
      maxWidth: Math.min(320, window.innerWidth - 32),
      zIndex: 9999,
    };

    if (align === 'right') {
      style.right = window.innerWidth - rect.right;
    } else {
      style.left = rect.left;
    }

    if (spaceBelow < dropdownHeight + gap) {
      style.bottom = window.innerHeight - rect.top + gap;
      style.maxHeight = Math.min(280, rect.top - gap);
    } else {
      style.top = rect.bottom + gap;
      style.maxHeight = Math.min(280, spaceBelow - gap);
    }

    setDropdownStyle(style);
  }, [filteredOptions.length, align]);

  const openDropdown = useCallback(() => {
    setIsOpen(true);
    positionDropdown();
  }, [positionDropdown]);

  const closeDropdown = useCallback(() => {
    setIsOpen(false);
    setSearch('');
  }, []);

  const handleClickOutside = useCallback((event: MouseEvent) => {
    if (
      containerRef.current && !containerRef.current.contains(event.target as Node) &&
      dropdownRef.current && !dropdownRef.current.contains(event.target as Node)
    ) {
      closeDropdown();
    }
  }, [closeDropdown]);

  const handleEscape = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') closeDropdown();
  }, [closeDropdown]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
      window.addEventListener('scroll', positionDropdown, true);
      window.addEventListener('resize', positionDropdown);
      document.body.style.overflow = 'hidden';
      setTimeout(() => searchInputRef.current?.focus(), 50);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
      window.removeEventListener('scroll', positionDropdown, true);
      window.removeEventListener('resize', positionDropdown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleClickOutside, handleEscape, positionDropdown]);

  return (
    <div className={`relative ${isOpen ? 'z-[300]' : 'z-30'}`} ref={containerRef}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => isOpen ? closeDropdown() : openDropdown()}
        className={`flex items-center gap-2 px-3 h-9 bg-white dark:bg-surface rounded-md border transition-colors w-full text-left shadow-none ${
          required && !value ? 'border-rose-500/50' : 'border-neutral-200 dark:border-white/[0.08] hover:border-neutral-300 dark:hover:border-white/20'
        }`}
      >
        {Icon && <Icon className={`h-4 w-4 ${iconColor || 'text-primary dark:text-emerald-400'} shrink-0`} />}
        <span className="flex-1 text-[13.5px] sm:text-[14px] tracking-[-0.01em] truncate text-neutral-900 dark:text-white flex items-center gap-1.5">
          {label ? <span className="text-neutral-700 dark:text-neutral-300 font-bold mr-0.5 text-[13px] sm:text-[13.5px]">{label}:</span> : ''}
          {selectedOption?.image && <span className="w-4.5 h-4.5 rounded overflow-hidden shrink-0 inline-flex"><ProductThumb image={selectedOption.image} alt="" imgClassName="w-full h-full object-cover" /></span>}
          <span className="font-bold text-neutral-900 dark:text-white truncate">
            {selectedOption?.label || value || 'Select...'}
          </span>
        </span>
        <ChevronDown className={`h-3.5 w-3.5 text-neutral-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && createPortal(
        <div
          ref={dropdownRef}
          style={dropdownStyle}
          className="bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] rounded-md shadow-lg flex flex-col overflow-hidden animate-in fade-in duration-100"
        >
          <div className="p-1.5 border-b border-neutral-200 dark:border-white/[0.08] flex-shrink-0">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={placeholder}
                className="w-full h-9 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-white/[0.08] rounded pl-8 pr-2.5 text-[13.5px] sm:text-[14px] font-medium text-neutral-900 dark:text-neutral-100 focus:border-primary focus:outline-none transition-colors"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-1 scrollbar-hide" style={{ maxHeight: dropdownStyle.maxHeight ? `calc(${typeof dropdownStyle.maxHeight === 'number' ? dropdownStyle.maxHeight + 'px' : dropdownStyle.maxHeight} - 60px)` : '220px' }}>
            {filteredOptions.length > 0 ? (
              <div className="flex flex-col gap-0.5">
                {filteredOptions.map((option, index) => (
                  <button
                    key={option.id || `opt-${index}`}
                    onClick={() => {
                      onChange(option.id);
                      closeDropdown();
                    }}
                    className={`w-full text-left px-3 h-9 rounded-md flex items-center gap-2 transition-colors text-[13.5px] sm:text-[14px] ${
                      value === option.id
                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-bold'
                        : 'text-neutral-900 dark:text-neutral-100 font-semibold hover:bg-neutral-100 dark:hover:bg-surface-hover'
                    }`}
                  >
                    {option.image && (
                      <span className="w-5 h-5 rounded overflow-hidden shrink-0 inline-flex"><ProductThumb image={option.image} alt="" imgClassName="w-full h-full object-cover" /></span>
                    )}
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="truncate">{option.label}</span>
                      {option.sublabel && (
                        <span className={`text-[12px] truncate font-mono ${value === option.id ? 'text-emerald-600 dark:text-emerald-300' : 'text-neutral-500'}`}>
                          {option.sublabel}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-3 text-center text-neutral-500 text-[13px] font-medium">No results found</div>
            )}
          </div>

          {onAddNew && search.trim() && !options.some(o => o.label.toLowerCase() === search.toLowerCase()) && (
            <div className="p-1 border-t border-neutral-200 dark:border-white/[0.08] bg-neutral-50/50 dark:bg-white/[0.02] flex-shrink-0">
              <button
                type="button"
                onClick={() => {
                  onAddNew(search);
                  closeDropdown();
                }}
                className="w-full text-left px-2.5 h-8 rounded text-[13px] font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 transition-colors flex items-center gap-2"
              >
                <div className="w-4 h-4 bg-emerald-500/10 rounded flex items-center justify-center">
                   <Plus className="h-3 w-3" />
                </div>
                Add New "{search}"
              </button>
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}
