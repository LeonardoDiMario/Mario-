import { getTelegramUser } from './telegramSdk';
import { getSupabaseClient } from '../lib/supabase';
import type { Character, UserPreferences } from '../types';

const DEFAULT_PREFERENCES: UserPreferences = {
  language: 'auto',
  botLanguage: 'auto',
  theme: 'telegram-dark',
  userPersona: {
    name: 'Traveler',
    pronouns: 'They/Them',
    bio: 'An adventurous explorer journeying through the Telegram multiverse.',
    relationshipStyle: 'Friendly & Supportive'
  },
  rpStyle: 'narrative',
  responseLength: 'balanced',
  aiTemperature: 0.85,
  speechEnabled: true,
  autoExtractMemories: true,
  customDirectives: ''
};

function getWebUserIdentity() {
  const tgUser = getTelegramUser();
  if (tgUser?.id) {
    return {
      id: `tg_${tgUser.id}`,
      telegramId: tgUser.id,
      firstName: tgUser.first_name || 'Telegram User',
      lastName: tgUser.last_name || '',
      username: tgUser.username || `tg_${tgUser.id}`,
      photoUrl: tgUser.photo_url || ''
    };
  }

  let userId = localStorage.getItem('rubychan_web_uuid');
  if (!userId) {
    userId = crypto.randomUUID();
    localStorage.setItem('rubychan_web_uuid', userId);
  }

  let webUserName = localStorage.getItem('rubychan_web_user_name');
  if (!webUserName) {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    webUserName = `Web Visitor #${randomSuffix}`;
    localStorage.setItem('rubychan_web_user_name', webUserName);
  }

  return {
    id: userId,
    telegramId: undefined,
    firstName: webUserName,
    lastName: '(Web App)',
    username: webUserName,
    photoUrl: ''
  };
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

function mapCharacter(row: any): Character {
  return {
    id: row.id,
    name: row.name,
    title: row.title || row.description || '',
    avatar: row.avatar || row.image_url || '',
    category: (row.category || 'Custom') as Character['category'],
    personality: row.personality || '',
    background: row.background || row.backstory || row.description || '',
    about: row.description || '',
    backstory: row.backstory || row.background || '',
    greeting: row.greeting || '',
    systemPrompt: row.system_prompt || '',
    voiceTone: row.voice_tone || row.speaking_style || '',
    voiceName: row.voice_name || undefined,
    defaultScenarios: Array.isArray(row.default_scenarios) ? row.default_scenarios : [],
    burmeseScenarios: Array.isArray(row.burmese_scenarios) ? row.burmese_scenarios : [],
    isCustom: !!row.is_custom,
    isPremium: !!row.is_premium,
    sortOrder: row.sort_order ?? 0,
    isActive: row.is_active !== false
  };
}

async function supabaseFetch(url: string, options: RequestInit = {}): Promise<Response | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const user = getWebUserIdentity();
  const method = (options.method || 'GET').toUpperCase();
  const body = options.body && typeof options.body === 'string' ? JSON.parse(options.body) : undefined;

  try {
    if (url === '/api/characters' && method === 'GET') {
      const { data, error } = await supabase
        .from('characters')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (error) return jsonResponse({ characters: [], error: error.message }, 200);
      return jsonResponse({ characters: (data || []).map(mapCharacter) });
    }

    if (url === '/api/characters' && method === 'POST') {
      const payload = body || {};
      const { data, error } = await supabase
        .from('characters')
        .insert({
          name: payload.name,
          title: payload.title || payload.name,
          avatar: payload.avatar || payload.image_url || '',
          category: payload.category || 'Custom',
          personality: payload.personality || '',
          background: payload.background || '',
          backstory: payload.backstory || '',
          greeting: payload.greeting || '',
          system_prompt: payload.systemPrompt || payload.system_prompt || '',
          voice_tone: payload.voiceTone || payload.voice_tone || '',
          default_scenarios: payload.defaultScenarios || payload.default_scenarios || [],
          burmese_scenarios: payload.burmeseScenarios || payload.burmese_scenarios || [],
          is_custom: true,
          is_premium: !!payload.isPremium,
          is_active: true,
          sort_order: payload.sortOrder || 999
        })
        .select('*')
        .single();
      if (error) return jsonResponse({ success: false, error: error.message }, 400);
      return jsonResponse({ success: true, character: mapCharacter(data) });
    }

    if (url.startsWith('/api/characters/') && method === 'DELETE') {
      const characterId = url.split('/').pop();
      if (!characterId) return jsonResponse({ success: false }, 400);
      const { error } = await supabase.from('characters').update({ is_active: false }).eq('id', characterId);
      return jsonResponse({ success: !error, error: error?.message });
    }

    if (url === '/api/user/profile' && method === 'GET') {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      let current = profile;
      if (!current && user.id) {
        const { data: created } = await supabase
          .from('profiles')
          .upsert({
            id: user.id,
            telegram_id: user.telegramId,
            first_name: user.firstName,
            last_name: user.lastName,
            username: user.username,
            photo_url: user.photoUrl,
            energy: 50,
            gems: 0,
            premium_plan: 'Free'
          }, { onConflict: 'id' })
          .select('*')
          .single();
        current = created || null;
      }

      const { data: entitlement } = await supabase
        .from('user_entitlements')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('expiration_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) return jsonResponse({ profile: current, entitlement }, 200);
      return jsonResponse({ profile: current, entitlement });
    }

    if (url === '/api/user/consent' && method === 'POST') {
      const payload = body || {};
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          age_verified: !!payload.ageVerified,
          terms_accepted: !!payload.termsAccepted,
          privacy_policy_accepted: !!payload.privacyPolicyAccepted,
          consent_version: payload.consentVersion || '1.0'
        })
        .eq('id', user.id);

      const { error: consentError } = await supabase.from('user_consent').insert({
        user_id: user.id,
        age_verified: !!payload.ageVerified,
        terms_accepted: !!payload.termsAccepted,
        privacy_policy_accepted: !!payload.privacyPolicyAccepted,
        consent_version: payload.consentVersion || '1.0'
      });

      return jsonResponse({ success: !profileError && !consentError, error: profileError?.message || consentError?.message });
    }

    if (url === '/api/preferences' && method === 'GET') {
      const { data } = await supabase.from('user_preferences').select('*').eq('user_id', user.id).maybeSingle();
      if (!data) return jsonResponse({ preferences: DEFAULT_PREFERENCES });
      return jsonResponse({
        preferences: {
          ...DEFAULT_PREFERENCES,
          ...data,
          userPersona: data.user_persona || DEFAULT_PREFERENCES.userPersona,
          aiTemperature: Number(data.ai_temperature ?? DEFAULT_PREFERENCES.aiTemperature),
          speechEnabled: data.speech_enabled ?? DEFAULT_PREFERENCES.speechEnabled,
          autoExtractMemories: data.auto_extract_memories ?? DEFAULT_PREFERENCES.autoExtractMemories,
          customDirectives: data.custom_directives || ''
        }
      });
    }

    if (url === '/api/preferences' && method === 'POST') {
      const payload = body || {};
      const { data, error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          language: payload.language || 'auto',
          bot_language: payload.botLanguage || 'auto',
          theme: payload.theme || 'telegram-dark',
          user_persona: payload.userPersona || DEFAULT_PREFERENCES.userPersona,
          rp_style: payload.rpStyle || 'narrative',
          response_length: payload.responseLength || 'balanced',
          ai_temperature: Number(payload.aiTemperature ?? 0.85),
          speech_enabled: payload.speechEnabled !== false,
          auto_extract_memories: payload.autoExtractMemories !== false,
          custom_directives: payload.customDirectives || null
        }, { onConflict: 'user_id' })
        .select('*')
        .single();
      if (error) return jsonResponse({ preferences: DEFAULT_PREFERENCES, error: error.message }, 400);
      return jsonResponse({ preferences: { ...payload, userPreferencesId: data?.user_id } });
    }

    if (url === '/api/conversations/init' && method === 'POST') {
      const payload = body || {};
      const { data: existing } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', user.id)
        .eq('character_id', payload.characterId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existing) return jsonResponse({ success: true, conversation: existing });
      const { data, error } = await supabase
        .from('conversations')
        .insert({ user_id: user.id, character_id: payload.characterId, source: 'web', title: payload.title || null })
        .select('*')
        .single();
      return jsonResponse({ success: !error, conversation: data, error: error?.message });
    }

    const chatMatch = url.match(/^\/api\/chat\/([^/]+)$/);
    if (chatMatch && method === 'GET') {
      const characterId = decodeURIComponent(chatMatch[1]);
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('user_id', user.id)
        .eq('character_id', characterId)
        .order('created_at', { ascending: true });
      if (error) return jsonResponse({ messages: [], error: error.message }, 200);
      return jsonResponse({ messages: (data || []).map((m: any) => ({
        id: m.id,
        characterId: m.character_id,
        sender: m.sender,
        text: m.text || m.message || '',
        timestamp: m.created_at,
        emotion: m.emotion || undefined,
        imageUrl: m.image_url || undefined
      })) });
    }

    if (chatMatch && method === 'DELETE') {
      const characterId = decodeURIComponent(chatMatch[1]);
      const { error } = await supabase.from('chat_messages').delete().eq('user_id', user.id).eq('character_id', characterId);
      return jsonResponse({ messages: [], success: !error, error: error?.message });
    }

    const memoryMatch = url.match(/^\/api\/memory\/([^/]+)$/);
    if (memoryMatch && method === 'GET') {
      const characterId = decodeURIComponent(memoryMatch[1]);
      const { data, error } = await supabase.from('memories').select('*').eq('user_id', user.id).eq('character_id', characterId).order('created_at', { ascending: false });
      return jsonResponse({ memories: error ? [] : (data || []).map((m: any) => ({
        id: m.id,
        characterId: m.character_id,
        category: m.category,
        content: m.content,
        createdAt: m.created_at,
        isAutoExtracted: !!m.is_auto_extracted
      })) });
    }

    if (url === '/api/memory' && method === 'POST') {
      const payload = body || {};
      if (payload.action === 'clear') {
        await supabase.from('memories').delete().eq('user_id', user.id).eq('character_id', payload.characterId);
      } else if (payload.action === 'delete' && payload.factId) {
        await supabase.from('memories').delete().eq('id', payload.factId).eq('user_id', user.id);
      } else if (payload.action === 'add') {
        await supabase.from('memories').insert({
          user_id: user.id,
          character_id: payload.characterId,
          category: payload.category || 'user_preference',
          content: payload.content,
          is_auto_extracted: false
        });
      }
      const { data } = await supabase.from('memories').select('*').eq('user_id', user.id).eq('character_id', payload.characterId).order('created_at', { ascending: false });
      return jsonResponse({ memories: (data || []).map((m: any) => ({ id: m.id, characterId: m.character_id, category: m.category, content: m.content, createdAt: m.created_at, isAutoExtracted: !!m.is_auto_extracted })) });
    }

    // Gemini chat must stay server-side. On GitHub Pages, show an explicit backend message instead of a 404.
    if (url === '/api/chat/send' && method === 'POST') {
      return jsonResponse({
        success: false,
        code: 'AI_BACKEND_REQUIRED',
        error: 'AI chat is not connected to a server-side Gemini endpoint yet.'
      }, 503);
    }
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Supabase request failed' }, 500);
  }

  return null;
}

/**
 * API wrapper. GitHub Pages has no Express backend, so supported endpoints are
 * fulfilled directly through RubyChan Supabase. Other URLs fall through to fetch.
 */
export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const direct = await supabaseFetch(url, options);
  if (direct) return direct;

  const tgUser = getTelegramUser();
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }

  if (tgUser && tgUser.id) {
    headers.set('x-telegram-user-id', String(tgUser.id));
    headers.set('x-telegram-user-info', JSON.stringify({
      id: tgUser.id,
      first_name: tgUser.first_name || '',
      last_name: tgUser.last_name || '',
      username: tgUser.username || `tg_${tgUser.id}`,
      photo_url: tgUser.photo_url || ''
    }));
  }

  return fetch(url, { ...options, headers });
}
