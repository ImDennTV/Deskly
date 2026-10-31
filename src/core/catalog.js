// Catalogo di siti noti: serve a riconoscere un sito dal nome ("github"), a proporre la cartella giusta e a
// ordinare in automatico i siti importati. [dominio, nome, categoria, url facoltativo].

export const CATEGORIES = {
  ai: { it: 'AI', en: 'AI', icon: 'sparkles', color: '#8b7cf6' },
  dev: { it: 'Sviluppo', en: 'Development', icon: 'code', color: '#3b9cf5' },
  hosting: { it: 'Domini e hosting', en: 'Domains & hosting', icon: 'server', color: '#14b8a6' },
  work: { it: 'Lavoro', en: 'Work', icon: 'briefcase', color: '#6366f1' },
  google: { it: 'Google', en: 'Google', icon: 'google', color: '#4285f4' },
  social: { it: 'Social', en: 'Social', icon: 'users', color: '#ec4899' },
  media: { it: 'Video e musica', en: 'Video & music', icon: 'film', color: '#f43f5e' },
  games: { it: 'Giochi', en: 'Games', icon: 'gamepad-2', color: '#22c55e' },
  shop: { it: 'Shopping', en: 'Shopping', icon: 'shopping-cart', color: '#f59e0b' },
  finance: { it: 'Soldi', en: 'Money', icon: 'wallet', color: '#10b981' },
  news: { it: 'Notizie', en: 'News', icon: 'newspaper', color: '#64748b' },
  learn: { it: 'Studio', en: 'Learning', icon: 'graduation-cap', color: '#0ea5e9' },
  tools: { it: 'Strumenti', en: 'Tools', icon: 'wrench', color: '#a855f7' },
  other: { it: 'Altri siti', en: 'Other sites', icon: 'globe', color: '#94a3b8' },
};

const SITES = [
  ['claude.ai', 'Claude', 'ai', 'https://claude.ai/new'], ['chatgpt.com', 'ChatGPT', 'ai'], ['openai.com', 'OpenAI', 'ai'],
  ['gemini.google.com', 'Gemini', 'ai'], ['perplexity.ai', 'Perplexity', 'ai'], ['anthropic.com', 'Anthropic', 'ai'],
  ['huggingface.co', 'Hugging Face', 'ai'], ['midjourney.com', 'Midjourney', 'ai'], ['higgsfield.ai', 'Higgsfield', 'ai'],
  ['github.com', 'GitHub', 'dev'], ['gitlab.com', 'GitLab', 'dev'], ['stackoverflow.com', 'Stack Overflow', 'dev'],
  ['npmjs.com', 'npm', 'dev'], ['developer.mozilla.org', 'MDN', 'dev'], ['codepen.io', 'CodePen', 'dev'],
  ['replit.com', 'Replit', 'dev'], ['vercel.com', 'Vercel', 'dev'], ['netlify.com', 'Netlify', 'dev'],
  ['supabase.com', 'Supabase', 'dev'], ['firebase.google.com', 'Firebase', 'dev'], ['docker.com', 'Docker', 'dev'],
  ['create.roblox.com', 'Roblox Creator Hub', 'games', 'https://create.roblox.com/dashboard/creations'],
  ['roblox.com', 'Roblox', 'games'],
  ['namecheap.com', 'Namecheap', 'hosting'], ['godaddy.com', 'GoDaddy', 'hosting'], ['cloudflare.com', 'Cloudflare', 'hosting'],
  ['hostinger.com', 'Hostinger', 'hosting'], ['aruba.it', 'Aruba', 'hosting'], ['ovh.com', 'OVH', 'hosting'],
  ['digitalocean.com', 'DigitalOcean', 'hosting'], ['hetzner.com', 'Hetzner', 'hosting'], ['porkbun.com', 'Porkbun', 'hosting'],
  ['notion.so', 'Notion', 'work'], ['slack.com', 'Slack', 'work'], ['trello.com', 'Trello', 'work'], ['linear.app', 'Linear', 'work'],
  ['asana.com', 'Asana', 'work'], ['airtable.com', 'Airtable', 'work'], ['figma.com', 'Figma', 'work'], ['canva.com', 'Canva', 'work'],
  ['zoom.us', 'Zoom', 'work'], ['linkedin.com', 'LinkedIn', 'work'], ['atlassian.net', 'Jira', 'work'],
  ['panel.enjoyingteam.it', 'Enjoying Studio', 'work'],
  ['mail.google.com', 'Gmail', 'google'], ['drive.google.com', 'Drive', 'google'], ['docs.google.com', 'Documenti Google', 'google'],
  ['calendar.google.com', 'Calendar', 'google'], ['meet.google.com', 'Meet', 'google'], ['photos.google.com', 'Foto', 'google'],
  ['maps.google.com', 'Maps', 'google'], ['translate.google.com', 'Traduttore', 'google'], ['outlook.live.com', 'Outlook', 'google'],
  ['instagram.com', 'Instagram', 'social'], ['facebook.com', 'Facebook', 'social'], ['x.com', 'X', 'social'], ['twitter.com', 'X', 'social'],
  ['tiktok.com', 'TikTok', 'social'], ['reddit.com', 'Reddit', 'social'], ['discord.com', 'Discord', 'social'],
  ['telegram.org', 'Telegram', 'social'], ['web.telegram.org', 'Telegram', 'social'], ['whatsapp.com', 'WhatsApp', 'social'],
  ['web.whatsapp.com', 'WhatsApp Web', 'social'], ['pinterest.com', 'Pinterest', 'social'], ['threads.net', 'Threads', 'social'],
  ['youtube.com', 'YouTube', 'media'], ['twitch.tv', 'Twitch', 'media'], ['spotify.com', 'Spotify', 'media'], ['netflix.com', 'Netflix', 'media'],
  ['primevideo.com', 'Prime Video', 'media'], ['disneyplus.com', 'Disney+', 'media'], ['soundcloud.com', 'SoundCloud', 'media'],
  ['kick.com', 'Kick', 'media'],
  ['steampowered.com', 'Steam', 'games'], ['steamcommunity.com', 'Steam', 'games'], ['epicgames.com', 'Epic Games', 'games'],
  ['unity.com', 'Unity', 'games'], ['unrealengine.com', 'Unreal Engine', 'games'], ['itch.io', 'itch.io', 'games'], ['blender.org', 'Blender', 'games'],
  ['amazon.it', 'Amazon', 'shop'], ['amazon.com', 'Amazon', 'shop'], ['ebay.it', 'eBay', 'shop'], ['ebay.com', 'eBay', 'shop'],
  ['aliexpress.com', 'AliExpress', 'shop'], ['subito.it', 'Subito', 'shop'], ['vinted.it', 'Vinted', 'shop'], ['shein.com', 'Shein', 'shop'],
  ['paypal.com', 'PayPal', 'finance'], ['stripe.com', 'Stripe', 'finance'], ['revolut.com', 'Revolut', 'finance'],
  ['binance.com', 'Binance', 'finance'], ['coinbase.com', 'Coinbase', 'finance'], ['patreon.com', 'Patreon', 'finance'],
  ['repubblica.it', 'la Repubblica', 'news'], ['corriere.it', 'Corriere', 'news'], ['ansa.it', 'ANSA', 'news'], ['ilpost.it', 'Il Post', 'news'],
  ['bbc.com', 'BBC', 'news'], ['theverge.com', 'The Verge', 'news'], ['news.ycombinator.com', 'Hacker News', 'news'],
  ['wikipedia.org', 'Wikipedia', 'learn'], ['coursera.org', 'Coursera', 'learn'], ['udemy.com', 'Udemy', 'learn'],
  ['duolingo.com', 'Duolingo', 'learn'], ['khanacademy.org', 'Khan Academy', 'learn'],
  ['speedtest.net', 'Speedtest', 'tools'], ['deepl.com', 'DeepL', 'tools'], ['wetransfer.com', 'WeTransfer', 'tools'],
  ['dropbox.com', 'Dropbox', 'tools'], ['obsidian.md', 'Obsidian', 'tools'], ['virustotal.com', 'VirusTotal', 'tools'],
];

const BY_HOST = new Map(SITES.map((s) => [s[0], s]));
export const CATALOG = SITES.map(([host, name, cat, url]) => ({ host, name, cat, url: url || `https://${host}/` }));

export const bareHost = (url) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
};

// Cerca il sito nel catalogo provando dall'host completo fino al dominio principale.
export function findSite(url) {
  const host = bareHost(url);
  if (!host) return null;
  const parts = host.split('.');
  for (let i = 0; i < parts.length - 1; i++) {
    const hit = BY_HOST.get(parts.slice(i).join('.'));
    if (hit) return hit;
  }
  return null;
}

export function categoryOf(url) {
  const hit = findSite(url);
  if (hit) return hit[2];
  const h = bareHost(url);
  if (/news|giornale|tg24|quotidiano/.test(h)) return 'news';
  if (/shop|store|market/.test(h)) return 'shop';
  if (/bank|banca/.test(h)) return 'finance';
  return 'other';
}

export const categoryName = (id, lang) => (CATEGORIES[id] || CATEGORIES.other)[lang === 'en' ? 'en' : 'it'];
