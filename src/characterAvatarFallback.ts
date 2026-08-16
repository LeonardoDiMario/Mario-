// Resolve character avatar API endpoints to real image URLs and recover broken remote images.
// Nekos.best documents waifu/husbando image endpoints with direct image URLs in the JSON response.

const WAIFU_API = 'https://nekos.best/api/v2/waifu';
const HUSBANDO_API = 'https://nekos.best/api/v2/husbando';

async function fetchAnimeUrl(kind: 'waifu' | 'husbando'): Promise<string | null> {
  try {
    const response = await fetch(kind === 'husbando' ? HUSBANDO_API : WAIFU_API, {
      headers: { Accept: 'application/json' },
      cache: 'no-store'
    });
    if (!response.ok) return null;
    const data = await response.json();
    const url = data?.results?.[0]?.url;
    return typeof url === 'string' && url.startsWith('http') ? url : null;
  } catch {
    return null;
  }
}

function avatarKindFromSrc(src: string): 'waifu' | 'husbando' {
  return src.includes('/husbando') ? 'husbando' : 'waifu';
}

function isCharacterAvatarImage(img: HTMLImageElement): boolean {
  const src = img.currentSrc || img.src || '';
  const alt = (img.alt || '').toLowerCase();
  return (
    src.includes('nekos.best') ||
    src.includes('image.cdn2.seaart') ||
    src.includes('images-ng.pixai') ||
    src.includes('pbs.twimg.com/media/') ||
    alt.includes('ruby') ||
    alt.includes('hana') ||
    alt.includes('yuna') ||
    alt.includes('akari') ||
    alt.includes('sakura') ||
    alt.includes('reina') ||
    alt.includes('velvet') ||
    alt.includes('celeste') ||
    alt.includes('seraphine') ||
    alt.includes('scarlett') ||
    alt.includes('aria') ||
    alt.includes('may lin') ||
    alt.includes('dante') ||
    alt.includes('kaelen') ||
    alt.includes('julian') ||
    alt.includes('zack')
  );
}

async function recoverBrokenAvatar(img: HTMLImageElement) {
  if (img.dataset.rubyAvatarFallback === '1') return;
  img.dataset.rubyAvatarFallback = '1';

  const kind = avatarKindFromSrc(img.currentSrc || img.src || '');
  const fallbackUrl = await fetchAnimeUrl(kind);
  if (fallbackUrl) {
    img.dataset.rubyAvatarResolved = '1';
    img.src = fallbackUrl;
  }
}

// Capture image failures before component-level onError handlers replace the source.
document.addEventListener('error', (event) => {
  const target = event.target;
  if (!(target instanceof HTMLImageElement)) return;
  if (!isCharacterAvatarImage(target)) return;
  event.stopPropagation();
  event.stopImmediatePropagation();
  void recoverBrokenAvatar(target);
}, true);

// Convert our API-style character avatar values into actual image URLs.
async function resolveApiAvatar(img: HTMLImageElement) {
  const src = img.getAttribute('src') || '';
  if (!src.startsWith('https://nekos.best/api/v2/')) return;
  if (img.dataset.rubyAvatarResolved === '1') return;

  img.dataset.rubyAvatarResolved = '1';
  const kind = avatarKindFromSrc(src);
  const url = await fetchAnimeUrl(kind);
  if (url) img.src = url;
}

function scanCharacterImages() {
  document.querySelectorAll<HTMLImageElement>('img').forEach((img) => {
    void resolveApiAvatar(img);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', scanCharacterImages, { once: true });
} else {
  scanCharacterImages();
}

const observer = new MutationObserver(scanCharacterImages);
observer.observe(document.documentElement, { childList: true, subtree: true });
