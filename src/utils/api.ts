import { getTelegramUser } from './telegramSdk';

const RUBYCHAN_API_URL = 'https://rmmanieytszkfzdyrjvt.supabase.co/functions/v1/rubychan-api';
const RUBYCHAN_SETTINGS_URL = 'https://rmmanieytszkfzdyrjvt.supabase.co/functions/v1/rubychan-settings-v2';
const RUBYCHAN_REWARDS_URL = 'https://rmmanieytszkfzdyrjvt.supabase.co/functions/v1/rubychan-rewards-v2';
const RUBYCHAN_BALANCE_URL = 'https://rmmanieytszkfzdyrjvt.supabase.co/functions/v1/rubychan-api-balance';
const RUBYCHAN_CHAT_URL = 'https://rmmanieytszkfzdyrjvt.supabase.co/functions/v1/rubychan-web-chat-lite';
const RUBYCHAN_SPEND_URL = 'https://rmmanieytszkfzdyrjvt.supabase.co/functions/v1/rubychan-spend-energy';

function getWebUserIdentity() {
  const tgUser = getTelegramUser();
  if (tgUser?.id) {
    return {
      id: String(tgUser.id),
      info: {
        id: tgUser.id,
        first_name: tgUser.first_name || 'Telegram User',
        last_name: tgUser.last_name || '',
        username: tgUser.username || `tg_${tgUser.id}`,
        photo_url: tgUser.photo_url || '',
        language_code: tgUser.language_code || ''
      }
    };
  }

  let webUserId = localStorage.getItem('rubychan_web_user_id');
  let webUserName = localStorage.getItem('rubychan_web_user_name');
  if (!webUserId) {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    webUserId = `web_usr_${Date.now().toString(36)}_${randomSuffix}`;
    webUserName = `Web Visitor #${randomSuffix}`;
    localStorage.setItem('rubychan_web_user_id', webUserId);
    localStorage.setItem('rubychan_web_user_name', webUserName);
  }

  return {
    id: webUserId,
    info: {
      id: webUserId,
      first_name: webUserName || 'Web Visitor',
      last_name: '(Web App)',
      username: webUserName || `Web_${webUserId.slice(-4)}`,
      photo_url: '',
      language_code: ''
    }
  };
}

export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const user = getWebUserIdentity();
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }
  headers.set('x-telegram-user-id', user.id);
  headers.set('x-telegram-user-info', JSON.stringify(user.info));

  const method = (options.method || 'GET').toUpperCase();
  const isSettingsRoute = url === '/api/preferences';
  const isDailyClaim = url === '/api/user/claim-daily' && method === 'POST';
  const isDailyStatus = url === '/api/user/profile' && method === 'GET';
  const isChatSend = url === '/api/chat/send' && method === 'POST';

  const target = isSettingsRoute
    ? RUBYCHAN_SETTINGS_URL
    : isDailyClaim
      ? `${RUBYCHAN_REWARDS_URL}?route=claim-daily`
      : isDailyStatus
        ? `${RUBYCHAN_BALANCE_URL}?route=status`
        : isChatSend
          ? RUBYCHAN_CHAT_URL
          : `${RUBYCHAN_API_URL}?path=${encodeURIComponent(url)}`;

  const response = await fetch(target, { ...options, headers });

  if (isChatSend && response.ok) {
    try {
      const spend = await fetch(RUBYCHAN_SPEND_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-telegram-user-id': user.id,
          'x-telegram-user-info': JSON.stringify(user.info)
        }
      });
      if (!spend.ok) console.warn('Energy spend failed after successful chat:', await spend.text());
    } catch (err) {
      console.warn('Energy spend request failed:', err);
    }
  }

  return response;
}

export async function claimDailyBonus(): Promise<Response> {
  return apiFetch('/api/user/claim-daily', { method: 'POST' });
}
