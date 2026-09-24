// Standardized Settings Layout - Thin Tab Router
import {
  Sliders,
  Globe,
  Printer,
  Shield,
  Database,
  ChevronLeft,
  Cloud,
  Smartphone,
  Lock,
  BookOpen
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { ReceiptPrint } from '../pos/ReceiptPrint';
import { Button, RealIcon, ScrollableTabBar, type RealIconName } from '../../shared/ui';
import { SETTINGS_TABS } from '../../shared/navigation/tabRegistry';
import { StickyFormFooter } from '../../shared/ui/StickyFormFooter';

import { GeneralSettings } from './tabs/GeneralSettings';
import { ReceiptSettings } from './tabs/ReceiptSettings';
import { SecuritySettings } from './tabs/SecuritySettings';
import { SystemSettings } from './tabs/SystemSettings';
import { HowToUse } from './tabs/HowToUse';
import { DeviceMeshTab } from './tabs/DeviceMeshTab';
import type { SettingsTabProps } from './tabs/types';
import { useSettingsForm } from './useSettingsForm';

type TabType = 'general' | 'receipt' | 'mesh' | 'backup' | 'security' | 'how-to';

export function Settings() {
  const navigate = useNavigate();
  const { subTab } = useParams();
  
  const form = useSettingsForm();
  const {
    formData, setFormData, setFormDataDirect, handleChange, handleInstantUpdate, handleSubmit,
    handleDiscard, handleRepairCounter, handleResetCalibration, appSettings, profile,
    canEditSettings, isOnline, play, isSaving, showReceipt, setShowReceipt,
    completedSale, setCompletedSale, syncStatus,
  } = form;

  const activeTab = (subTab as TabType) || 'general';

  const tabProps: SettingsTabProps = {
    formData, setFormData, setFormDataDirect, handleChange, handleInstantUpdate, handleRepairCounter,
    handleResetCalibration, appSettings, profile, canEditSettings, isOnline, play,
    setCompletedSale, setShowReceipt,
  };

  return (
    <div className="main-content-scroll p-1 sm:p-4 lg:p-6 space-y-4 bg-gray-50/50 dark:bg-app max-w-[1400px] mx-auto">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-1 border-b border-neutral-200 dark:border-white/[0.08]">
        <div className="flex items-center justify-between lg:justify-start gap-3 w-full lg:w-auto">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'pos' }))}
              icon={<ChevronLeft className="h-4 w-4" />}
              className="h-8 px-2.5 rounded text-neutral-500 hover:text-neutral-900 dark:hover:text-white border border-transparent hover:border-neutral-200 dark:hover:border-white/[0.08]"
            >
              <span className="hidden sm:inline text-[12px] font-medium">POS</span>
            </Button>

            <div className="h-4 w-px bg-neutral-200 dark:bg-white/[0.08] hidden sm:block" />

            <div className="flex items-center gap-2.5">
              <RealIcon name="settings" size="sm" />
              <div>
                <h1 className="text-base font-semibold text-neutral-900 dark:text-white tracking-[-0.01em] leading-tight">
                  Settings & Preferences
                </h1>
                <p className="text-[11px] text-neutral-500 font-mono tracking-tight">
                  System configuration • {formData.storeName?.trim() || 'POS'}
                </p>
              </div>
            </div>
          </div>

          {/* Quick Save Button on Mobile - only for general and receipt tabs */}
          {(activeTab === 'general' || activeTab === 'receipt') && (
            <button
              form="settings-form"
              type="submit"
              disabled={isSaving || !canEditSettings}
              className="lg:hidden h-7.5 px-3 rounded-full bg-primary text-white text-[11.5px] font-semibold flex items-center gap-1.5 shadow-xs hover:bg-primary/90 active:scale-95 transition-all shrink-0 cursor-pointer"
            >
              <span>{isSaving ? 'Saving...' : 'Update'}</span>
            </button>
          )}
        </div>

        {/* Tactile Apple Segmented Pills for Settings Tabs */}
        <ScrollableTabBar>
          {SETTINGS_TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => navigate('/settings/' + tab.id)}
                className={`relative whitespace-nowrap transition-all duration-150 flex-shrink-0 flex items-center gap-2 px-3 h-8 rounded-full text-[12.5px] tracking-tight active:scale-95 border cursor-pointer select-none ${
                  isActive
                    ? 'bg-primary text-white font-bold border-primary shadow-xs'
                    : 'bg-white dark:bg-white/[0.05] text-neutral-900 dark:text-neutral-100 font-semibold border-neutral-200/80 dark:border-white/[0.08] hover:border-neutral-300 dark:hover:border-white/20 hover:bg-neutral-50 dark:hover:bg-white/[0.08]'
                }`}
              >
                <div className="shrink-0 flex items-center justify-center transition-transform duration-150 group-hover:scale-105">
                  <RealIcon name={tab.realIcon} size={20} />
                </div>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </ScrollableTabBar>
      </div>

      {!canEditSettings && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-md flex items-center space-x-3 max-w-md">
          <Lock className="h-4 w-4 text-amber-500" />
          <p className="text-amber-600 dark:text-amber-400 text-[11px] font-medium leading-tight">
            Access Restricted: Admin or Manager only
          </p>
        </div>
      )}

      <div className="w-full bg-white dark:bg-surface rounded-md border border-neutral-200 dark:border-white/[0.08] shadow-none transition-colors relative z-10">
        <form id="settings-form" onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6">
          {activeTab === 'general' && <GeneralSettings {...tabProps} />}
          {activeTab === 'mesh' && <DeviceMeshTab />}
          {activeTab === 'backup' && <SystemSettings />}
          {activeTab === 'receipt' && <ReceiptSettings {...tabProps} />}
          {activeTab === 'security' && <SecuritySettings />}
          {activeTab === 'how-to' && <HowToUse />}
        </form>
      </div>

      {(activeTab === 'general' || activeTab === 'receipt') && (
        <StickyFormFooter
          isSaving={isSaving}
          onDiscard={handleDiscard}
          saveLabel={"Update System"}
          formId="settings-form"
          disabled={!canEditSettings}
          statusBadge={
            <div className="hidden sm:flex items-center gap-2 font-mono">
              {syncStatus === 'saving' && (
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-500/10 rounded border border-blue-500/20">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                  <span className="text-[11px] font-medium text-blue-600 dark:text-blue-400">Saving...</span>
                </div>
              )}
              {syncStatus === 'syncing' && (
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-primary/10 rounded border border-primary/20">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
                  <span className="text-[11px] font-medium text-primary">Cloud Syncing...</span>
                </div>
              )}
              {syncStatus === 'idle' && (
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-neutral-100 dark:bg-white/[0.04] rounded border border-neutral-200 dark:border-white/[0.08]">
                  <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-primary' : 'bg-neutral-400'}`} />
                  <span className="text-[11px] font-medium text-neutral-600 dark:text-neutral-400 uppercase">{isOnline ? 'Online' : 'Offline'}</span>
                </div>
              )}
            </div>
          }
        />
      )}

      <div className="mt-12 pb-32 text-center space-y-4">
        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 sm:gap-8">
          {formData.storeWebsite?.trim() && (
            <Button variant="ghost" onClick={() => window.open(formData.storeWebsite, '_blank')} className="!min-h-0 !p-0 !rounded-none !gap-2 !text-primary hover:!text-emerald-700 !font-bold underline underline-offset-4 decoration-2 decoration-emerald-100 !shadow-none !hover:bg-transparent dark:!hover:bg-transparent">
              <Globe className="w-4 h-4" />
              <span className="text-xs uppercase tracking-widest whitespace-nowrap">{formData.storeWebsite}</span>
            </Button>
          )}
          {formData.storeEmail?.trim() && (
            <Button variant="ghost" onClick={() => window.location.href = `mailto:${formData.storeEmail}`} className="!min-h-0 !p-0 !rounded-none !gap-2 !text-blue-600 hover:!text-blue-700 !font-bold underline underline-offset-4 decoration-2 decoration-blue-100 !shadow-none !hover:bg-transparent dark:!hover:bg-transparent">
              <Smartphone className="w-4 h-4" />
              <span className="text-xs uppercase tracking-widest whitespace-nowrap">{formData.storeEmail}</span>
            </Button>
          )}
        </div>
        <p className="text-[10px] text-gray-600 font-bold uppercase tracking-[0.2em]">Crafted for peak performance & enterprise reliability</p>
      </div>
      {showReceipt && completedSale && (
        <ReceiptPrint sale={completedSale} onClose={() => setShowReceipt(false)} />
      )}
    </div>
  );
}
