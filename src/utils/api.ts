import { getTelegramUser } from './telegramSdk';

const RUBYCHAN_API_URL = 'https://rmmanieytszkfzdyrjvt.supabase.co/functions/v1/rubychan-api';
const RUBYCHAN_SETTINGS_URL = 'https://rmmanieytszkfzdyrjvt.supabase.co/functions/v1/rubychan-settings';
const RUBYCHAN_REWARDS_URL = 'https://rmmanieytszkfzdyrjvt.supabase.co/functions/v1/rubychan-rewards';

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
  const isSettingsWrite = url === '/api/preferences' && method === 'POST';

  if (url === '/api/user/claim-daily') {
    return fetch(`${RUBYCHAN_REWARDS_URL}?route=claim-daily`, { ...options, method: 'POST', headers });
  }

  if (url === '/api/user/reward-status') {
    return fetch(`${RUBYCHAN_REWARDS_URL}?route=status`, { ...options, method: 'GET', headers });
  }

  if (url === '/api/user/referral-stats') {
    return fetch(`${RUBYCHAN_REWARDS_URL}?route=referral-stats`, { ...options, method: 'GET', headers });
  }

  const target = isSettingsWrite
    ? RUBYCHAN_SETTINGS_URL
    : `${RUBYCHAN_API_URL}?path=${encodeURIComponent(url)}`;

  return fetch(target, { ...options, headers });
}

export async function claimDailyBonus(): Promise<Response> {
  return apiFetch('/api/user/claim-daily', { method: 'POST' });
}
