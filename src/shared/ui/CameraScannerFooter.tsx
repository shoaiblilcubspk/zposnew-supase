import { Zap, ZapOff, RefreshCw, Smartphone } from 'lucide-react';

interface CameraScannerFooterProps {
  handleRetry: () => void;
  switchCamera: () => void;
  availableCameras: any[];
  currentCameraIndex: number;
  hasTorch: boolean;
  toggleTorch: () => void;
  isTorchOn: boolean;
  continuousMode: boolean;
  setContinuousMode: (v: boolean) => void;
  isInitializing: boolean;
}

export function CameraScannerFooter({ handleRetry, switchCamera, availableCameras, currentCameraIndex, hasTorch, toggleTorch, isTorchOn, continuousMode, setContinuousMode, isInitializing }: CameraScannerFooterProps) {
  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={handleRetry}
            className="h-8 w-8 bg-white/5 hover:bg-white/10 rounded-md transition-colors border border-white/10 flex items-center justify-center"
            title="Refresh Engine"
          >
            <RefreshCw className={`w-4 h-4 text-neutral-400 ${isInitializing ? 'animate-spin' : ''}`} />
          </button>

          {availableCameras.length > 1 && (
            <button
              onClick={switchCamera}
              className="h-8 px-2.5 bg-white/5 hover:bg-white/10 rounded-md transition-colors border border-white/10 flex items-center gap-1.5"
            >
              <Smartphone className="w-4 h-4 text-neutral-400" />
              <span className="text-[11px] font-mono text-neutral-400">{currentCameraIndex + 1}/{availableCameras.length}</span>
            </button>
          )}

          {hasTorch && (
            <button
              onClick={toggleTorch}
              className={`h-8 w-8 rounded-md transition-colors border flex items-center justify-center ${isTorchOn ? 'bg-amber-500 border-amber-600 text-white' : 'bg-white/5 border-white/10 text-neutral-400'}`}
            >
              {isTorchOn ? <ZapOff className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
            </button>
          )}
        </div>

        <button
          onClick={() => setContinuousMode(!continuousMode)}
          className={`h-8 px-3 rounded-md flex items-center gap-2 transition-colors border ${continuousMode ? 'bg-primary/10 border-primary/30 text-emerald-400' : 'bg-white/5 border-white/10 text-neutral-400'}`}
        >
          <div className={`w-1.5 h-1.5 rounded-full ${continuousMode ? 'bg-primary animate-pulse' : 'bg-neutral-600'}`} />
          <span className="text-[12px] font-medium">
            {continuousMode ? 'Continuous' : 'Single Scan'}
          </span>
        </button>
      </div>
    </div>
  );
}
