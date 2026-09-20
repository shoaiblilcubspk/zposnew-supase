import { Modal } from '../../shared/ui/Modal';
import { Loader2, AlertTriangle } from 'lucide-react';
import { useQrScanner } from './useQrScanner';
import { CameraScannerFooter } from './CameraScannerFooter';

interface CameraScannerProps {
  onScan: (decodedText: string) => void;
  onClose: () => void;
  title?: string;
  isContinuous?: boolean;
}

export function CameraScanner({
  onScan,
  onClose,
  title = "Scan Barcode / IMEI",
  isContinuous: initialContinuous = false
}: CameraScannerProps) {
  const {
    isInitializing,
    error,
    isMobile,
    containerRef,
    CONTAINER_ID,
    handleRetry,
    switchCamera,
    toggleTorch,
    isTorchOn,
    hasTorch,
    continuousMode,
    setContinuousMode,
    availableCameras,
    currentCameraIndex,
  } = useQrScanner({ onScan, onClose, isContinuous: initialContinuous });

  const footer = (
    <CameraScannerFooter
      handleRetry={handleRetry}
      switchCamera={switchCamera}
      availableCameras={availableCameras}
      currentCameraIndex={currentCameraIndex}
      hasTorch={hasTorch}
      toggleTorch={toggleTorch}
      isTorchOn={isTorchOn}
      continuousMode={continuousMode}
      setContinuousMode={setContinuousMode}
      isInitializing={isInitializing}
    />
  );

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={title}
      maxWidth="sm"
      footer={footer}
    >
      <style>{`
        #${CONTAINER_ID} canvas { display: none !important; }
        #${CONTAINER_ID} video { object-fit: cover !important; width: 100% !important; height: 100% !important; min-height: 380px !important; }
        #${CONTAINER_ID} { overflow: hidden !important; border-radius: 6px !important; min-height: 380px !important; }
      `}</style>

      <div className="relative bg-[#000] overflow-hidden flex-1 min-h-[380px] sm:min-h-[420px] flex items-center justify-center rounded-md border border-neutral-800">
        {isInitializing && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-20 bg-[#000]">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-[12px] font-medium text-neutral-400">Initializing Scanner...</p>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 gap-4 z-20 bg-[#000]">
            <div className="w-10 h-10 bg-rose-500/10 rounded-md flex items-center justify-center border border-rose-500/20">
              <AlertTriangle className="w-5 h-5 text-rose-500" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-white font-medium text-[13px]">Access Restricted</p>
              <p className="text-neutral-400 text-[12px] max-w-[240px] mx-auto">{error}</p>
            </div>
            <button
              onClick={handleRetry}
              className="h-8 px-3.5 bg-primary hover:bg-primary-hover text-white text-[13px] font-medium rounded-md transition-colors"
            >
              Restart Camera
            </button>
          </div>
        )}

        <div id={CONTAINER_ID} ref={containerRef} className="w-full h-full absolute inset-0 z-0" style={{ visibility: (isInitializing || error) ? 'hidden' : 'visible' }} />

        {!isInitializing && !error && (
          <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center">
            <div className="relative" style={{ width: isMobile ? '90%' : '300px', height: isMobile ? '140px' : '180px', maxWidth: '340px' }}>
              <div className="absolute -top-1 -left-1 w-8 h-8 border-t-2 border-l-2 border-primary rounded-tl-md" />
              <div className="absolute -top-1 -right-1 w-8 h-8 border-t-2 border-r-2 border-primary rounded-tr-md" />
              <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-2 border-l-2 border-primary rounded-bl-md" />
              <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-2 border-r-2 border-primary rounded-br-md" />
              <div className="absolute inset-x-0 h-[1.5px] bg-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.8)] animate-scan opacity-90" />
              <div className="absolute inset-0 bg-primary/5 rounded-md ring-1 ring-emerald-500/30" />
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
