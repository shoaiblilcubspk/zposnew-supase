import React, { useState } from 'react';
import { Printer, DollarSign, Check, Wifi } from 'lucide-react';
import { Button } from '../../../shared/ui/Button';
import { Card } from '../../../shared/ui/Card';
import { ToggleSwitch } from '../../../shared/ui/ToggleSwitch';
import { PrinterConfig } from '../../../lib/hardware/types';
import { testPrinter, kickCashDrawer } from '../../../lib/hardware/printerService';
import { sonner } from '../../../lib/sonner';

import { useSettingsStore } from '../../../stores';

const DEFAULT_CONFIG: PrinterConfig = {
  transport: 'network',
  address: '192.168.1.200:9100',
  paperSize: '80mm',
  autoCut: true,
  kickCashDrawer: true,
  beepOnPrint: false,
};

function getSavedPrinterConfig(): PrinterConfig {
  if (typeof window === 'undefined') return DEFAULT_CONFIG;
  try {
    const raw = localStorage.getItem('pos_hardware_printer_config');
    const storeSize = useSettingsStore.getState().settings.receiptPaperSize;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (storeSize && (storeSize === '80mm' || storeSize === '58mm')) {
        parsed.paperSize = storeSize;
      }
      return { ...DEFAULT_CONFIG, ...parsed };
    }
    if (storeSize && (storeSize === '80mm' || storeSize === '58mm')) {
      return { ...DEFAULT_CONFIG, paperSize: storeSize };
    }
  } catch {}
  return DEFAULT_CONFIG;
}

export function PrinterHardwareTab() {
  const [config, setConfig] = useState<PrinterConfig>(getSavedPrinterConfig);
  const [testing, setTesting] = useState(false);

  const updateConfig = (updates: Partial<PrinterConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...updates };
      try {
        localStorage.setItem('pos_hardware_printer_config', JSON.stringify(next));
      } catch {}
      if (updates.paperSize) {
        useSettingsStore.getState().setSettings({ receiptPaperSize: updates.paperSize });
      }
      return next;
    });
  };

  const handleTestPrint = async () => {
    setTesting(true);
    try {
      await testPrinter(config);
      sonner.success('Test print sent to printer');
    } catch (err: any) {
      sonner.error(err.message || 'Printer test failed');
    } finally {
      setTesting(false);
    }
  };

  const handleKickDrawer = async () => {
    try {
      await kickCashDrawer(config);
      sonner.success('Cash drawer pulse sent');
    } catch (err: any) {
      sonner.error(err.message || 'Drawer kick failed');
    }
  };

  return (
    <div className="space-y-6 text-[13px] tracking-[-0.01em]">
      <Card className="p-5 border border-neutral-200 dark:border-white/[0.08] bg-white dark:bg-surface shadow-none rounded-md">
        <div className="flex items-center gap-2 mb-3">
          <Printer className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-neutral-900 dark:text-white text-[14px]">Hardware Thermal Printer</h3>
        </div>
        <p className="text-neutral-500 dark:text-neutral-400 mb-4 leading-relaxed">
          Configure direct ESC/POS hardware thermal receipt and kitchen printers over LAN, USB, or Bluetooth.
        </p>

        <div className="max-w-md space-y-4">
          {/* Transport Selector */}
          <div>
            <label className="block text-[12px] font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Printer Transport
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['network', 'usb', 'bluetooth'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => updateConfig({ transport: t })}
                  className={`h-8 px-3 rounded text-[12px] font-medium transition-colors border ${
                    config.transport === t
                      ? 'bg-primary/10 border-primary text-primary'
                      : 'bg-neutral-50 dark:bg-app border-neutral-200 dark:border-white/[0.08] text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  {t === 'network' ? 'LAN (TCP/IP)' : t === 'usb' ? 'USB Port' : 'Bluetooth'}
                </button>
              ))}
            </div>
          </div>

          {/* Paper Size */}
          <div>
            <label className="block text-[12px] font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Thermal Paper Width
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['80mm', '58mm'] as const).map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => updateConfig({ paperSize: size })}
                  className={`h-8 px-3 rounded text-[12px] font-medium transition-colors border ${
                    config.paperSize === size
                      ? 'bg-primary/10 border-primary text-primary'
                      : 'bg-neutral-50 dark:bg-app border-neutral-200 dark:border-white/[0.08] text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  {size === '80mm' ? '80mm (Standard)' : '58mm (Compact)'}
                </button>
              ))}
            </div>
          </div>

          {/* Address */}
          {config.transport === 'network' && (
            <div>
              <label className="block text-[12px] font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Printer IP Address & Port
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="192.168.1.200:9100"
                  value={config.address || ''}
                  onChange={(e) => updateConfig({ address: e.target.value })}
                  className="w-full h-8 pl-8 pr-3 rounded bg-neutral-50 dark:bg-app border border-neutral-200 dark:border-white/[0.08] text-[13px] text-neutral-900 dark:text-white font-mono focus:outline-none focus:border-primary"
                />
                <Wifi className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-2.5" />
              </div>
            </div>
          )}

          {/* Toggles */}
          <div className="pt-2 border-t border-neutral-200 dark:border-white/[0.08] space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[13px] text-neutral-900 dark:text-white font-medium block">Auto-Cut Paper</span>
                <span className="text-[11px] text-neutral-500 dark:text-neutral-400">Sends cut pulse after receipt footer</span>
              </div>
              <ToggleSwitch
                checked={config.autoCut}
                onChange={(checked) => updateConfig({ autoCut: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <span className="text-[13px] text-neutral-900 dark:text-white font-medium block">Kick Cash Drawer</span>
                <span className="text-[11px] text-neutral-500 dark:text-neutral-400">Sends electrical pulse to drawer solenoid</span>
              </div>
              <ToggleSwitch
                checked={config.kickCashDrawer}
                onChange={(checked) => updateConfig({ kickCashDrawer: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <span className="text-[13px] text-neutral-900 dark:text-white font-medium block">Audible Beep</span>
                <span className="text-[11px] text-neutral-500 dark:text-neutral-400">Alert cashier when ticket finishes</span>
              </div>
              <ToggleSwitch
                checked={config.beepOnPrint}
                onChange={(checked) => updateConfig({ beepOnPrint: checked })}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-3">
            <Button
              size="md"
              variant="secondary"
              disabled={testing}
              onClick={handleTestPrint}
              className="flex-1 flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              {testing ? 'Printing...' : 'Test Print'}
            </Button>

            <Button
              size="md"
              variant="ghost"
              onClick={handleKickDrawer}
              className="flex items-center gap-2 border border-neutral-200 dark:border-white/[0.08]"
            >
              <DollarSign className="w-4 h-4" />
              Open Drawer
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
