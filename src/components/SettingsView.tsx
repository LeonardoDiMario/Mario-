import React, { useState } from 'react';
import { ChevronRight, Zap, Crown, Globe, BookOpen, LifeBuoy } from 'lucide-react';
import { triggerHaptic } from '../utils/telegramSdk';
import { UserPreferences } from '../types';
import { PolicyType } from './LegalSupportModal';
import { ActiveEntitlement } from './StoreModal';
import { LanguageModal } from './LanguageModal';
import { t, SupportedLanguage, getLanguageName } from '../utils/i18n';

interface SettingsViewProps {
  userPreferences?: UserPreferences;
  activeEntitlement?: ActiveEntitlement | null;
  onSavePreferences?: (prefs: UserPreferences) => void;
  onOpenStore: () => void;
  onOpenSettingsModal?: () => void;
  onOpenMemoryLedger?: () => void;
  onOpenPolicyModal: (type: PolicyType) => void;
  isBurmese?: boolean;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  userPreferences,
  activeEntitlement,
  onSavePreferences,
  onOpenStore,
  onOpenMemoryLedger,
  onOpenPolicyModal
}) => {
  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false);
  const currentLang = userPreferences?.language || 'auto';
  const currentBotLang = userPreferences?.botLanguage || 'auto';
  const isVip = activeEntitlement?.status === 'active';

  const saveLanguage = (appLang: SupportedLanguage, botLang: SupportedLanguage) => {
    if (!userPreferences || !onSavePreferences) return;
    onSavePreferences({ ...userPreferences, language: appLang, botLanguage: botLang });
  };

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-5 pb-28">
      <h1 className="text-2xl font-black text-white tracking-tight">{t('nav_settings', currentLang)}</h1>

      <div className="bg-[#140a1f] border border-rose-900/40 rounded-3xl p-4.5 space-y-3 shadow-xl">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('vip_status', currentLang)}</p>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black text-white flex items-center gap-1.5">
            {isVip ? <><Crown className="w-5 h-5 text-amber-400" /><span>{activeEntitlement?.planName || t('empress_vip', currentLang)}</span></> : <span>{t('free_plan', currentLang)}</span>}
          </h2>
          <span className="text-xs bg-rose-950 text-rose-300 border border-rose-800/50 px-2.5 py-1 rounded-full font-bold">
            {isVip ? `${activeEntitlement?.daysRemaining || 0} ${t('days_left', currentLang)}` : t('standard_mana', currentLang)}
          </span>
        </div>
        <button
          onClick={() => { triggerHaptic('medium'); onOpenStore(); }}
          className="w-full py-2.5 bg-gradient-to-r from-rose-600 via-purple-600 to-indigo-600 text-white rounded-2xl font-black text-xs shadow-lg active:scale-95 transition-all flex items-center justify-center gap-1.5"
        >
          <Zap className="w-4 h-4 fill-white" />
          <span>{isVip ? t('manage_vip_btn', currentLang) : t('upgrade_vip_btn', currentLang)}</span>
        </button>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-extrabold text-rose-300 tracking-wider uppercase px-1 flex items-center gap-1.5">
          <Globe className="w-3.5 h-3.5 text-rose-400" />
          <span>{t('lang_settings_title', currentLang)}</span>
        </p>
        <button
          onClick={() => { triggerHaptic('medium'); setIsLanguageModalOpen(true); }}
          className="w-full bg-gradient-to-r from-[#170a25] via-[#210e35] to-[#140822] border border-rose-600/50 hover:border-rose-400 rounded-3xl p-4 text-left shadow-xl"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="font-black text-sm text-white">{t('lang_settings_title', currentLang)}</p>
              <div className="flex flex-wrap gap-2 mt-2 text-[11px]">
                <span className="bg-rose-950/70 border border-rose-800/60 px-2 py-0.5 rounded-lg text-rose-200 font-bold">UI: {getLanguageName(currentLang)}</span>
                <span className="bg-purple-950/70 border border-purple-800/60 px-2 py-0.5 rounded-lg text-purple-200 font-bold">Bot: {getLanguageName(currentBotLang)}</span>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-rose-300 shrink-0" />
          </div>
        </button>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-extrabold text-rose-300 tracking-wider uppercase px-1">Tools</p>
        <div className="bg-[#140a1f] border border-rose-900/50 rounded-3xl overflow-hidden">
          {onOpenMemoryLedger && (
            <button onClick={() => { triggerHaptic('medium'); onOpenMemoryLedger(); }} className="w-full p-4 flex items-center justify-between text-left hover:bg-rose-950/30">
              <div className="flex items-center gap-3"><BookOpen className="w-5 h-5 text-amber-400" /><div><p className="font-bold text-sm text-white">Memory Ledger</p><p className="text-xs text-slate-400">View saved memories and notes</p></div></div>
              <ChevronRight className="w-5 h-5 text-slate-500" />
            </button>
          )}
          <button onClick={() => { triggerHaptic('light'); onOpenPolicyModal('support'); }} className="w-full p-4 flex items-center justify-between text-left hover:bg-rose-950/30 border-t border-rose-900/40">
            <div className="flex items-center gap-3"><LifeBuoy className="w-5 h-5 text-rose-400" /><div><p className="font-bold text-sm text-white">{t('support_feedback', currentLang)}</p><p className="text-xs text-slate-400">{t('support_feedback_desc', currentLang)}</p></div></div>
            <ChevronRight className="w-5 h-5 text-slate-500" />
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-extrabold text-rose-300 tracking-wider uppercase px-1">{t('terms_conditions', currentLang)}</p>
        <div className="bg-[#140a1f] border border-rose-900/50 rounded-3xl overflow-hidden">
          <button onClick={() => { triggerHaptic('light'); onOpenPolicyModal('terms'); }} className="w-full p-4 flex items-center justify-between text-left hover:bg-rose-950/30">
            <div><p className="font-bold text-sm text-white">{t('terms_conditions', currentLang)}</p><p className="text-xs text-slate-400">View terms and conditions</p></div>
            <ChevronRight className="w-5 h-5 text-slate-500" />
          </button>
          <button onClick={() => { triggerHaptic('light'); onOpenPolicyModal('privacy'); }} className="w-full p-4 flex items-center justify-between text-left hover:bg-rose-950/30 border-t border-rose-900/40">
            <div><p className="font-bold text-sm text-white">Privacy Policy</p><p className="text-xs text-slate-400">How your data is handled</p></div>
            <ChevronRight className="w-5 h-5 text-slate-500" />
          </button>
        </div>
      </div>

      <LanguageModal
        isOpen={isLanguageModalOpen}
        currentLanguage={currentLang}
        currentBotLanguage={currentBotLang}
        onClose={() => setIsLanguageModalOpen(false)}
        onSave={saveLanguage}
      />
    </div>
  );
};