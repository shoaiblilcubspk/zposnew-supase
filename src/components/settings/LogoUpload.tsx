import React, { useState } from 'react';
import { X, Image as ImageIcon } from 'lucide-react';
import { MediaLibrary } from '../../shared/MediaLibrary';
import { Button } from '../../shared/ui';

interface LogoUploadProps {
  currentLogo?: string;
  onLogoChange: (logo: string | undefined) => void;
  disabled?: boolean;
}

export function LogoUpload({ currentLogo, onLogoChange, disabled = false }: LogoUploadProps) {
  const [showMediaLibrary, setShowMediaLibrary] = useState(false);

  const removeLogo = () => {
    if (disabled) return;
    onLogoChange(undefined);
  };

  return (
    <div className="space-y-4">
      <label className="block text-sm font-semibold text-gray-700">
        Store Logo
      </label>

      {currentLogo ? (
        <div className="relative inline-block">
          <img
            src={currentLogo}
            alt="Store Logo"
            className="h-20 w-20 object-contain border border-neutral-200 dark:border-white/[0.08] rounded-md bg-white dark:bg-surface p-2 shadow-none"
          />
          <button
            type="button"
            onClick={removeLogo}
            disabled={disabled}
            title="Remove logo"
            className={`absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center transition-colors shadow-sm border border-white/20 ${
              disabled
                ? 'bg-neutral-300 text-neutral-500 cursor-not-allowed'
                : 'bg-neutral-900/80 hover:bg-rose-600 text-white'
            }`}
          >
            <X className="w-3 h-3 stroke-[2.5]" />
          </button>
        </div>
      ) : (
        <div
          className={`border border-dashed rounded-md p-6 text-center transition-colors shadow-none ${disabled
            ? 'border-neutral-200 dark:border-white/5 bg-neutral-100 dark:bg-white/5 cursor-not-allowed'
            : 'border-neutral-300 dark:border-white/[0.08] hover:border-neutral-400 dark:hover:border-white/20 cursor-pointer'
            }`}
          onClick={() => !disabled && setShowMediaLibrary(true)}
        >
          <div className="flex flex-col items-center space-y-2.5">
            <div className="bg-neutral-100 dark:bg-neutral-800 p-2.5 rounded-md">
              <ImageIcon className="h-6 w-6 text-neutral-500" />
            </div>
            <div>
              <p className={`text-[13px] font-medium ${disabled ? 'text-neutral-400' : 'text-neutral-900 dark:text-white'}`}>
                {disabled ? 'Upload disabled' : 'Click to choose or upload from Media Library'}
              </p>
              <p className="text-[11px] text-neutral-500 mt-0.5">
                Supports WebP, PNG, JPG · Compressed & Reusable
              </p>
            </div>
          </div>
        </div>
      )}

      {showMediaLibrary && (
        <MediaLibrary
          isOpen={showMediaLibrary}
          onClose={() => setShowMediaLibrary(false)}
          onSelect={onLogoChange}
        />
      )}
    </div>
  );
}