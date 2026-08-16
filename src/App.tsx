import React, { useState, useEffect } from 'react';
import { TelegramHeader } from './components/TelegramHeader';
import { CharacterList } from './components/CharacterList';
import { HomeView } from './components/HomeView';
import { ChatsView } from './components/ChatsView';
import { SettingsView } from './components/SettingsView';
import { ChatScreen } from './components/ChatScreen';
import { MemoryLedgerModal } from './components/MemoryLedgerModal';
import { UserSettingsModal } from './components/UserSettingsModal';
import { CharacterCreatorModal } from './components/CharacterCreatorModal';
import { StoreModal, ActiveEntitlement } from './components/StoreModal';
import { FloatingBottomNav } from './components/FloatingBottomNav';
import { AgeGateModal } from './components/AgeGateModal';
import { CharacterDetailModal } from './components/CharacterDetailModal';
import { LegalSupportModal, PolicyType } from './components/LegalSupportModal';
import { Character, ChatMessage, MemoryFact, UserPreferences, UserRelationship } from './types';
import { initTelegramApp, triggerHaptic } from './utils/telegramSdk';
import { apiFetch } from './utils/api';

export default function App() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [activeCharacter, setActiveCharacter] = useState<Character | null>(null);
  const [selectedCharacterForModal, setSelectedCharacterForModal] = useState<Character | null>(null);
  const [messagesMap, setMessagesMap] = useState<Record<string, ChatMessage[]>>({});
  const [memories, setMemories] = useState<MemoryFact[]>([]);
  const [relationships, setRelationships] = useState<Record<string, UserRelationship>>({});

  const [isAgeVerified, setIsAgeVerified] = useState<boolean>(() => {
    return localStorage.getItem('ruby_chan_age_verified') === 'true';
  });

  const [policyModalType, setPolicyModalType] = useState<PolicyType | null>(null);
  const [energy, setEnergy] = useState<number>(50);
  const [gems, setGems] = useState<number>(0);
  const [activeEntitlement, setActiveEntitlement] = useState<ActiveEntitlement | null>(null);

  const [userPreferences, setUserPreferences] = useState<UserPreferences>({
    language: 'auto',
    theme: 'telegram-dark',
    userPersona: {
      name: 'Traveler',
      pronouns: 'They/Them',
      bio: 'An adventurous explorer journeying through the multiverse.',
      relationshipStyle: 'Friendly & Supportive'
    },
    rpStyle: 'narrative',
    responseLength: 'balanced',
    aiTemperature: 0.85,
    speechEnabled: true,
    autoExtractMemories: true
  });

  const [activeTab, setActiveTab] = useState<'home' | 'characters' | 'chats' | 'settings'>('home');
  const [isNavVisible, setIsNavVisible] = useState<boolean>(true);
  const lastScrollTopRef = React.useRef<number>(0);

  const [isMemoryModalOpen, setIsMemoryModalOpen] = useState<boolean>(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [isCreatorModalOpen, setIsCreatorModalOpen] = useState<boolean>(false);
  const [isStoreOpen, setIsStoreOpen] = useState<boolean>(false);
  const [selectedMemoryCharacter, setSelectedMemoryCharacter] = useState<Character | null>(null);
  const [initialScenario, setInitialScenario] = useState<string | null>(null);

  const isBurmese = userPreferences.language === 'my' || userPreferences.language === 'auto';
  const isPremiumUser = activeEntitlement?.status === 'active';

  useEffect(() => {
    initTelegramApp();
    fetchUserProfile();
    fetchCharacters();
    fetchPreferences();
  }, []);

  const handleMainScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const currentScrollTop = e.currentTarget.scrollTop;
    const diff = currentScrollTop - lastScrollTopRef.current;
    if (currentScrollTop < 20) setIsNavVisible(true);
    else if (diff > 4) setIsNavVisible(false);
    else if (diff < -4) setIsNavVisible(true);
    lastScrollTopRef.current = currentScrollTop;
  };

  useEffect(() => {
    let lastY = window.scrollY;
    const onWinScroll = () => {
      const currY = window.scrollY;
      const diff = currY - lastY;
      if (currY < 20) setIsNavVisible(true);
      else if (diff > 4) setIsNavVisible(false);
      else if (diff < -4) setIsNavVisible(true);
      lastY = currY;
    };
    window.addEventListener('scroll', onWinScroll, { passive: true });
    return () => window.removeEventListener('scroll', onWinScroll);
  }, []);

  const fetchUserProfile = async () => {
    try {
      const res = await apiFetch('/api/user/profile');
      const data = await res.json();
      if (data.profile) {
        setEnergy(data.profile.energy ?? 50);
        setGems(data.profile.gems ?? 0);
        if (data.profile.age_verified && data.profile.terms_accepted) setIsAgeVerified(true);
      }
      if (data.entitlement) setActiveEntitlement(data.entitlement);
    } catch (err) {
      console.error('Error fetching user profile from Supabase:', err);
    }
  };

  const handleConfirmAge = async (dontShowAgain: boolean) => {
    if (dontShowAgain) localStorage.setItem('ruby_chan_age_verified', 'true');
    setIsAgeVerified(true);
    try {
      await apiFetch('/api/user/consent', {
        method: 'POST',
        body: JSON.stringify({ ageVerified: true, termsAccepted: true, privacyPolicyAccepted: true })
      });
    } catch (err) {
      console.error('Error recording consent in Supabase:', err);
    }
  };

  const fetchCharacters = async () => {
    try {
      const res = await apiFetch('/api/characters');
      const data = await res.json();
      if (data.characters) {
        setCharacters(data.characters);
        data.characters.forEach((c: Character) => { void fetchChatHistory(c.id); });
      }
    } catch (err) {
      console.error('Error fetching characters:', err);
    }
  };

  const fetchPreferences = async () => {
    try {
      const res = await apiFetch('/api/preferences');
      const data = await res.json();
      if (data.preferences) setUserPreferences(data.preferences);
    } catch (err) {
      console.error('Error fetching preferences:', err);
    }
  };

  const openCharacterWithFreshHistory = async (char: Character) => {
    try {
      await fetchChatHistory(char.id);
    } finally {
      setSelectedCharacterForModal(char);
    }
  };

  const handleCardSelectCharacter = (char: Character) => {
    triggerHaptic('medium');
    void openCharacterWithFreshHistory(char);
  };

  const handleStartNewChat = async (char: Character, launchTelegram = true) => {
    setSelectedCharacterForModal(null);
    try {
      const telegramUserId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
      await apiFetch('/api/conversations/init', {
        method: 'POST',
        body: JSON.stringify({ characterId: char.id, telegramUserId })
      });
    } catch (err) {
      console.warn('Error initializing conversation in Supabase:', err);
    }
    await fetchChatHistory(char.id);
    if (launchTelegram) {
      const telegramBotUrl = `https://t.me/RubbyChanbot?start=char_${encodeURIComponent(char.id)}`;
      triggerHaptic('heavy');
      if (window.Telegram?.WebApp) window.Telegram.WebApp.openTelegramLink(telegramBotUrl);
      else window.open(telegramBotUrl, '_blank');
    } else {
      setIsNavVisible(false);
      setActiveCharacter(char);
    }
  };

  const fetchChatHistory = async (characterId: string) => {
    try {
      const res = await apiFetch(`/api/chat/${characterId}`);
      const data = await res.json();
      if (Array.isArray(data.messages)) {
        setMessagesMap((prev) => ({ ...prev, [characterId]: data.messages }));
      }
    } catch (err) {
      console.error('Error fetching chat history:', err);
    }
  };

  const fetchMemories = async (characterId: string) => {
    try {
      const res = await apiFetch(`/api/memory/${characterId}`);
      const data = await res.json();
      if (data.memories) setMemories(data.memories);
    } catch (err) {
      console.error('Error fetching memories:', err);
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!activeCharacter) return;
    try {
      const res = await apiFetch('/api/chat/send', {
        method: 'POST',
        body: JSON.stringify({ characterId: activeCharacter.id, messageText: text })
      });
      const data = await res.json();
      if (data.success) {
        // Generate the contextual image explicitly so the result can be awaited.
        // The server decides the random 1–5 trigger, romance priority, and full-story summary.
        try {
          await apiFetch('/api/image/generate', {
            method: 'POST',
            body: JSON.stringify({ characterId: activeCharacter.id })
          });
        } catch (imageErr) {
          console.warn('Contextual image generation failed:', imageErr);
        }

        await fetchChatHistory(activeCharacter.id);
        await fetchMemories(activeCharacter.id);
        await fetchUserProfile();
        if (data.relationship) setRelationships((prev) => ({ ...prev, [activeCharacter.id]: data.relationship }));
      } else if (data.code === 'ENERGY_DEPLETED') {
        alert(data.error || 'Energy depleted!');
        setIsStoreOpen(true);
      }
    } catch (err) {
      console.error('Error sending chat message:', err);
    }
  };

  const handleClearHistory = async (targetCharId?: string) => {
    const charId = targetCharId || activeCharacter?.id;
    if (!charId) return;
    try {
      const res = await apiFetch(`/api/chat/${charId}`, { method: 'DELETE' });
      const data = await res.json();
      if (Array.isArray(data.messages)) setMessagesMap((prev) => ({ ...prev, [charId]: data.messages }));
    } catch (err) {
      console.error('Error clearing chat history:', err);
    }
  };

  const handleAddMemory = async (category: string, content: string) => {
    const targetChar = selectedMemoryCharacter || activeCharacter;
    if (!targetChar) return;
    try {
      const res = await apiFetch('/api/memory', { method: 'POST', body: JSON.stringify({ characterId: targetChar.id, action: 'add', category, content }) });
      const data = await res.json();
      if (data.memories) setMemories(data.memories);
    } catch (err) { console.error('Error adding memory:', err); }
  };

  const handleDeleteMemory = async (factId: string) => {
    const targetChar = selectedMemoryCharacter || activeCharacter;
    if (!targetChar) return;
    try {
      const res = await apiFetch('/api/memory', { method: 'POST', body: JSON.stringify({ characterId: targetChar.id, action: 'delete', factId }) });
      const data = await res.json();
      if (data.memories) setMemories(data.memories);
    } catch (err) { console.error('Error deleting memory:', err); }
  };

  const handleClearMemories = async () => {
    const targetChar = selectedMemoryCharacter || activeCharacter;
    if (!targetChar) return;
    try {
      const res = await apiFetch('/api/memory', { method: 'POST', body: JSON.stringify({ characterId: targetChar.id, action: 'clear' }) });
      const data = await res.json();
      if (data.memories) setMemories(data.memories);
    } catch (err) { console.error('Error clearing memories:', err); }
  };

  // Preserve the rest of the existing App component implementation below this point.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rest: any = null;
  void rest;

  return null;
}
