// Fixed character avatars: each character gets ONE permanent image URL.
// No random API calls and no per-refresh image rotation.

const FIXED_AVATARS: Record<string, string> = {
  'Ruby Chan': 'https://i.waifu.pics/Lcq0Tx8.jpg',
  'Hana': 'https://i.waifu.pics/P817hp4.jpg',
  'Yuna': 'https://i.waifu.pics/Tj6Wzwo.png',
  'Akari': 'https://i.waifu.pics/8Ml_Y6V.jpg',
  'Sakura': 'https://i.waifu.pics/xMRH74e.png',
  'Reina': 'https://i.waifu.pics/DmrSW~9.jpg',
  'Ruby': 'https://i.waifu.pics/-j4qjGv.png',
  'Velvet': 'https://i.waifu.pics/cKe~bpZ.jpg',
  'Rin': 'https://i.waifu.pics/XcpL3nR.jpg',
  'Celeste': 'https://i.waifu.pics/Weau1RP.jpg',
  'Seraphine': 'https://i.waifu.pics/8TL6ycS.jpg',
  'Scarlett Rose': 'https://i.waifu.pics/DjgwmRf.jpg',
  'Dante Vane': 'https://i.waifu.pics/1y5O6HN.jpg',
  'Ren Kurosawa': 'https://i.waifu.pics/qUY7BBo.jpg',
  'Lady Victoria': 'https://i.waifu.pics/Lcq0Tx8.jpg',
  'Aria Vane': 'https://i.waifu.pics/P817hp4.jpg',
  'Lord Kaelen': 'https://i.waifu.pics/Tj6Wzwo.png',
  'Julian Mercer': 'https://i.waifu.pics/8Ml_Y6V.jpg',
  'May Lin': 'https://i.waifu.pics/xMRH74e.png',
  'Zack Sterling': 'https://i.waifu.pics/DmrSW~9.jpg',
};

function fixedAvatarForAlt(alt: string): string | null {
  const key = alt.trim().toLowerCase();
  const found = Object.entries(FIXED_AVATARS).find(([name]) => name.toLowerCase() === key);
  return found?.[1] || null;
}

function isCharacterAvatarImage(img: HTMLImageElement): boolean {
  const src = img.currentSrc || img.src || '';
  const alt = (img.alt || '').trim().toLowerCase();
  return (
    src.includes('nekos.best') ||
    src.includes('image.cdn2.seaart') ||
    src.includes('images-ng.pixai') ||
    src.includes('pbs.twimg.com/media/') ||
    src.includes('i.waifu.pics/') ||
    Object.keys(FIXED_AVATARS).some((name) => name.toLowerCase() === alt)
  );
}

function applyFixedAvatar(img: HTMLImageElement) {
  if (img.dataset.rubyFixedAvatar === '1') return;

  const fixed = fixedAvatarForAlt(img.alt || '');
  if (!fixed) return;

  img.dataset.rubyFixedAvatar = '1';
  img.src = fixed;
}

// Replace API-style/random avatar sources with their permanent character image.
function scanCharacterImages() {
  document.querySelectorAll<HTMLImageElement>('img').forEach(applyFixedAvatar);
}

// Only swap to the same permanent image on failure; never fetch a new random image.
document.addEventListener('error', (event) => {
  const target = event.target;
  if (!(target instanceof HTMLImageElement)) return;
  if (!isCharacterAvatarImage(target)) return;

  const fixed = fixedAvatarForAlt(target.alt || '');
  if (fixed && target.src !== fixed) {
    target.dataset.rubyFixedAvatar = '1';
    target.src = fixed;
  }
}, true);

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', scanCharacterImages, { once: true });
} else {
  scanCharacterImages();
}

const observer = new MutationObserver(scanCharacterImages);
observer.observe(document.documentElement, { childList: true, subtree: true });
