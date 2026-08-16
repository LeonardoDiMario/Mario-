import React, { useEffect, useState } from 'react';
import { Sparkles, Zap, Gift, Crown, MessageSquare, Plus, Flame, ChevronRight, User, ShieldCheck, Share2, Check } from 'lucide-react';
import { triggerHaptic, triggerHapticNotification, getTelegramUser } from '../utils/telegramSdk';
import { apiFetch } from '../utils/api';
import { Character, UserPreferences } from '../types';
import { t } from '../utils/i18n';

interface HomeViewProps {
  characters: Character[];
  userPreferences: UserPreferences;
  energy: number;
  gems: number;
  onSelectCharacter: (char: Character) => void;
  onOpenStore: () => void;
  onCreateCharacter: () => void;
  onOpenSettingsModal: () => void;
  onNavigateTab: (tab: 'characters' | 'home' | 'chats' | 'settings') => void;
  onAddGems: (amount: number) => void;
  onAddEnergy: (amount: number) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  characters,
  userPreferences,
  energy,
  gems,
  onSelectCharacter,
  onOpenStore,
  onCreateCharacter,
  onNavigateTab,
  onAddEnergy
}) => {
  const [nextClaimAt, setNextClaimAt] = useState<string | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [isClaiming, setIsClaiming] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);

  const lang = userPreferences.language || 'auto';
  const tgUser = getTelegramUser();
  const userName = tgUser?.first_name || (tgUser?.username ? `@${tgUser.username}` : '') || 'Traveler';

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch('/api/user/profile');
        const data = await res.json();
        setNextClaimAt(data?.profile?.nextClaimAt ?? data?.nextClaimAt ?? null);
      } catch (err) {
        console.error('Error fetching claim status:', err);
      }
    })();
  }, []);

  useEffect(() => {
    if (!nextClaimAt) {
      setCooldownSeconds(0);
      return;
    }
    const update = () => {
      const diff = Math.max(0, Math.floor((new Date(nextClaimAt).getTime() - Date.now()) / 1000));
      setCooldownSeconds(diff);
      if (diff === 0) setNextClaimAt(null);
    };
    update();
    const id = window.setInterval(update, 1000);
    return () => window.clearInterval(id);
  }, [nextClaimAt]);

  const handleClaimReward = async () => {
    if (isClaiming || cooldownSeconds > 0) return;
    setIsClaiming(true);
    triggerHaptic('heavy');
    const optimisticNext = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    setNextClaimAt(optimisticNext);
    setCooldownSeconds(24 * 60 * 60);
    try {
      const res = await apiFetch('/api/user/claim-daily', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        const next = data.nextClaimAt || optimisticNext;
        setNextClaimAt(next);
        setCooldownSeconds(Math.max(1, Math.ceil((new Date(next).getTime() - Date.now()) / 1000)));
        onAddEnergy(25);
      } else if (data.nextClaimAt) {
        setNextClaimAt(data.nextClaimAt);
      } else {
        setNextClaimAt(null);
        setCooldownSeconds(0);
      }
    } catch (err) {
      setNextClaimAt(null);
      setCooldownSeconds(0);
      console.error('Daily claim failed:', err);
    } finally {
      setIsClaiming(false);
    }
  };

  const handleInvite = () => {
    triggerHaptic('medium');
    const id = tgUser?.id || 'guest';
    const botUrl = `https://t.me/Rubby_Chan_Bot?start=ref_${id}`;
    const shareText = `Join RubyChan 2.0: ${botUrl}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(botUrl);
      setCopiedInvite(true);
      triggerHapticNotification('success');
      window.setTimeout(() => setCopiedInvite(false), 2500);
    }
    if ((window as any).Telegram?.WebApp?.openTelegramLink) {
      const url = `https://t.me/share/url?url=${encodeURIComponent(botUrl)}&text=${encodeURIComponent(shareText)}`;
      (window as any).Telegram.WebApp.openTelegramLink(url);
    }
  };

  const formatCooldown = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-5 pb-24">
      <div className="bg-gradient-to-r from-[#180b26] via-[#200d33] to-[#12081f] border border-rose-800/50 rounded-3xl p-4 shadow-2xl">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-600 to-purple-600 flex items-center justify-center text-white"><User className="w-5 h-5" /></div>
            <div>
              <h1 className="text-lg font-black text-white">{lang === 'my' ? `မင်္ဂလာပါ ${userName}!` : `${userName}! 👋`}</h1>
              <p className="text-[11px] text-rose-300/80">RubyChan <span className="font-black">2.0</span> <span className="font-black">18+</span></p>
            </div>
          </div>
          <span className="text-emerald-300 font-extrabold text-[10px] px-2.5 py-1 rounded-full bg-emerald-950/70 border border-emerald-700/50 flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> {t('verified_status', lang)}</span>
        </div>
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-rose-900/40 text-center">
          <div><p className="text-[10px] text-slate-400 font-bold">{t('energy', lang)}</p><p className="text-xs font-black text-amber-400 flex items-center justify-center gap-0.5"><Zap className="w-3 h-3 fill-amber-400" />{energy}</p></div>
          <div><p className="text-[10px] text-slate-400 font-bold">{t('gems', lang)}</p><p className="text-xs font-black text-rose-300">🔮 {gems}</p></div>
          <div><p className="text-[10px] text-slate-400 font-bold">{t('nav_characters', lang)}</p><p className="text-xs font-black text-purple-300">💖 {characters.length}</p></div>
        </div>
      </div>

      {cooldownSeconds <= 0 && !isClaiming ? (
        <div className="bg-gradient-to-r from-rose-950/60 via-purple-950/60 to-slate-950 border border-rose-600/40 rounded-3xl p-3.5 flex items-center justify-between shadow-xl">
          <div><p className="text-[9px] font-extrabold uppercase text-amber-300"><Gift className="w-3 h-3 inline mr-1" />{t('daily_blessing_title', lang)}</p><h3 className="font-extrabold text-xs text-white">{t('daily_claim_title', lang)}</h3><p className="text-[10px] text-slate-400">{t('daily_claim_desc', lang)}</p></div>
          <button onClick={handleClaimReward} disabled={isClaiming} className="px-3.5 py-2 rounded-2xl text-xs font-extrabold bg-gradient-to-r from-rose-600 via-purple-600 to-indigo-600 text-white active:scale-95">{t('daily_claim_title', lang)}</button>
        </div>
      ) : cooldownSeconds > 0 ? (
        <div className="bg-[#140a1f] border border-rose-900/40 rounded-3xl p-3 text-center text-xs text-slate-400">Daily available in <span className="font-black text-amber-300">{formatCooldown(cooldownSeconds)}</span></div>
      ) : null}

      <div className="bg-gradient-to-r from-indigo-950/60 via-purple-950/60 to-slate-950 border border-indigo-600/40 rounded-3xl p-3.5 flex items-center justify-between shadow-xl">
        <div className="max-w-[65%]"><p className="text-[9px] font-extrabold uppercase text-indigo-300"><Share2 className="w-3 h-3 inline mr-1" />{t('tasks', lang)}</p><h3 className="font-extrabold text-xs text-white">{t('task_invite_title', lang)}</h3><p className="text-[10px] text-slate-400">{t('task_invite_desc', lang)}</p></div>
        <button onClick={handleInvite} className="px-3.5 py-2 rounded-2xl text-xs font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 text-white active:scale-95 flex items-center gap-1.5">{copiedInvite ? <><Check className="w-3.5 h-3.5" />{t('invite_link_copied', lang)}</> : <><Share2 className="w-3.5 h-3.5" />{t('invite_now_btn', lang)}</>}</button>
      </div>

      <div className="space-y-2.5">
        <div className="flex items-center justify-between"><h2 className="text-sm font-black text-white flex items-center gap-1.5"><Flame className="w-4 h-4 text-rose-500" />{t('featured_characters', lang)}</h2><button onClick={() => onNavigateTab('characters')} className="text-xs font-bold text-rose-400 flex items-center gap-0.5">{t('all_characters', lang)} ({characters.length}) <ChevronRight className="w-3.5 h-3.5" /></button></div>
        <div className="grid grid-cols-2 gap-3">{characters.slice(0, 4).map(char => <div key={char.id} onClick={() => { triggerHaptic('medium'); onSelectCharacter(char); }} className="bg-[#140a1f] border border-rose-900/40 p-3 rounded-2xl cursor-pointer shadow-md flex items-center gap-2.5"><img src={char.avatar} alt={char.name} className="w-11 h-11 rounded-xl object-cover ring-1 ring-rose-500/40" /><div className="min-w-0 flex-1"><h3 className="font-extrabold text-xs text-white truncate">{char.name}</h3><p className="text-[10px] text-rose-400 truncate">{char.category}</p><span className="text-[9px] text-slate-400 mt-1 inline-flex items-center gap-0.5"><MessageSquare className="w-2.5 h-2.5" /> {t('start_chat', lang)}</span></div></div>)}</div>
      </div>

      <div className="space-y-2 pt-1">
        <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">{t('quick_actions', lang)}</p>
        <div className="grid grid-cols-2 gap-2.5">
          <button onClick={() => { triggerHaptic('heavy'); onCreateCharacter(); }} className="bg-[#140a1f] border border-rose-700/50 p-3 rounded-2xl flex items-center gap-2.5 text-left"><div className="p-2 bg-rose-950 text-rose-400 rounded-xl"><Plus className="w-4 h-4" /></div><div><p className="font-extrabold text-xs text-white">{t('create_custom_character', lang)}</p><p className="text-[10px] text-slate-400">{t('design_custom_ai', lang)}</p></div></button>
          <button onClick={() => { triggerHaptic('medium'); onOpenStore(); }} className="bg-[#140a1f] border border-amber-700/50 p-3 rounded-2xl flex items-center gap-2.5 text-left"><div className="p-2 bg-amber-950 text-amber-400 rounded-xl"><Sparkles className="w-4 h-4" /></div><div><p className="font-extrabold text-xs text-white">{t('gems_store', lang)}</p><p className="text-[10px] text-slate-400">{t('recharge_orbs', lang)}</p></div></button>
          <button onClick={() => { triggerHaptic('light'); onOpenStore(); }} className="bg-[#140a1f] border border-purple-700/50 p-3 rounded-2xl flex items-center gap-2.5 text-left"><div className="p-2 bg-purple-950 text-purple-400 rounded-xl"><Crown className="w-4 h-4" /></div><div><p className="font-extrabold text-xs text-white">{t('empress_vip', lang)}</p><p className="text-[10px] text-slate-400">{t('unlimited_pass', lang)}</p></div></button>
          <button onClick={() => { triggerHaptic('medium'); onNavigateTab('chats'); }} className="bg-[#140a1f] border border-indigo-700/50 p-3 rounded-2xl flex items-center gap-2.5 text-left"><div className="p-2 bg-indigo-950 text-indigo-300 rounded-xl"><MessageSquare className="w-4 h-4" /></div><div><p className="font-extrabold text-xs text-white">{t('nav_chats', lang)}</p><p className="text-[10px] text-slate-400">Chat History</p></div></button>
        </div>
      </div>
    </div>
  );
};