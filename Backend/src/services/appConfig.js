import { Setting } from '../models/index.js';

// Home-screen sections the user app knows how to render. Admin controls order, visibility, titles and data source.
export const SECTION_KEYS = ['posters', 'services', 'astrologers', 'horoscope', 'promo', 'panchang', 'reports', 'remedies'];
export const ASTRO_SOURCES = ['featured', 'rating', 'online', 'manual'];
// Login trust badges: live numbers from the database, or text the admin types.
export const TRUST_SOURCES = ['astrologers', 'online', 'consultations', 'rating', 'reviews', 'custom'];
const HEX = /^#[0-9a-f]{6}$/i;

export const DEFAULT_APP_CONFIG = {
  brand: { name: 'AstroVani', tagline: 'Trusted Vedic Astrologers', logoUrl: '' },
  searchPlaceholder: 'Search astrologers, kundli, puja…',
  sections: [
    { key: 'posters', title: '', visible: true },
    { key: 'services', title: '', visible: true },
    { key: 'astrologers', title: 'Top Astrologers', visible: true, source: 'featured', limit: 6, astrologerIds: [] },
    { key: 'horoscope', title: "Today's Horoscope", visible: true },
    { key: 'promo', title: '', visible: true },
    { key: 'panchang', title: "Today's Panchang", visible: true },
    { key: 'reports', title: 'Popular Reports', visible: true, limit: 6 },
    { key: 'remedies', title: 'Remedies & Puja', visible: true, limit: 6 },
  ],
  // Login screen: background slideshow + texts. Default slides are built-in illustrations shipped with the frontend.
  login: {
    slides: [
      { imageUrl: '/login/zodiac.svg', title: 'Your stars, decoded', subtitle: 'Talk to verified Vedic astrologers in minutes.' },
      { imageUrl: '/login/moon.svg', title: 'Guidance every night', subtitle: 'Daily horoscope, Panchang and moon phases.' },
      { imageUrl: '/login/kundli.svg', title: 'Free Kundli, instantly', subtitle: 'Birth chart, dashas and doshas in seconds.' },
      { imageUrl: '/login/diya.svg', title: 'Remedies that matter', subtitle: 'Puja, gemstones and personal remedies.' },
    ],
    intervalSec: 4,
    overlay: 35,
    showLogo: true,
    heading: 'Enter your mobile number',
    subheading: "We'll send a 6-digit OTP to verify it.",
    // First visit on this device vs. someone who has logged in here before. {app} = app name.
    newUser: {
      title: 'Welcome to {app}',
      text: 'Talk to verified Vedic astrologers, get your free Kundli and daily guidance, all in one app.',
      points: [{ icon: 'chat', text: 'Chat & call experts' }, { icon: 'kundli', text: 'Free Kundli' }, { icon: 'sun', text: 'Daily horoscope' }],
    },
    returning: { title: 'Welcome back to {app}', text: 'Log in with your mobile number to continue.' },
    // {bonus} is replaced with the sign-up bonus from Settings > Platform. The badge hides itself if the bonus is 0.
    showOffer: true,
    offerLabel: 'NEW USER OFFER',
    offerText: 'Get {bonus} free in your wallet on sign-up',
    colors: { accent: '#B9542C', hero: '#7A2A18', offerBg: '#FFD27A', offerText: '#6B3A08' },
    showTrust: true,
    trust: [
      { icon: 'user', source: 'astrologers', value: '', label: 'Verified astrologers' },
      { icon: 'chat', source: 'online', value: '', label: 'Online now' },
      { icon: 'star', source: 'rating', value: '', label: 'Average rating' },
    ],
    terms: 'By continuing you agree to our Terms & Privacy Policy.',
  },
  // App-wide colours for the user app (Global > Theme & colours).
  theme: { accent: '#B9542C', brand: '#7A2618', background: '#FBF4EE', darkAccent: '#E0784B' },
  // Public landing page (Global > Landing page). Every text block and section is editable.
  landing: {
    sections: { features: true, horoscope: true, astrologers: true, how: true, cta: true, faq: true, final: true },
    hero: {
      badge: 'First chat free · Pay per minute',
      title: 'Ask the stars. Get answers',
      highlight: 'in minutes.',
      subtitle: 'Chat or call verified Vedic astrologers. Pay per minute, no subscriptions.',
      primaryCta: 'Ask now', secondaryCta: 'Generate free Kundli', imageUrl: '',
      // Hero headlines; they rotate automatically. The peach part follows the white part.
      headlines: [
        { title: 'Ask the stars. Get answers', highlight: 'in minutes.' },
        { title: 'Marriage questions? Get', highlight: 'clear answers.' },
        { title: 'Career confusion? Find', highlight: 'your next move.' },
        { title: 'Your Kundli, decoded', highlight: 'for free.' },
      ],
      // Questions the ask box types out one after another.
      prompts: ['Meri shaadi kab hogi?', 'Is this the right time to change jobs?', 'Will my business grow this year?', 'Kya hamari kundli milti hai?'],
      // Chips under the ask box; clicking one fills in its question.
      topics: [
        { icon: 'career', label: 'Career', q: 'Is this the right time to change jobs?' },
        { icon: 'love', label: 'Love', q: 'Will my relationship last?' },
        { icon: 'marriage', label: 'Marriage', q: 'Meri shaadi kab hogi?' },
        { icon: 'finance', label: 'Finance', q: 'Will my business grow this year?' },
        { icon: 'health', label: 'Health', q: 'How will my health be this year?' },
        { icon: 'kundli', label: 'Kundli', q: 'Kya hamari kundli milti hai?' },
      ],
      // Trust strip. Counts and rating come live from the database; only these toggles and texts are set here.
      trust: { showAstrologers: true, showRating: true, languages: 'Hindi, English & more', languagesNote: 'Consult in your language', privacy: '100% private chats', privacyNote: 'Safe & confidential' },
      showLive: true,
    },
    featuresTag: 'Our services',
    featuresTitle: 'Your complete astrology companion',
    featuresSubtitle: 'Everything you need for Vedic guidance, from your birth chart to a live conversation with an expert.',
    features: [
      { icon: 'chat', title: 'Chat or call', text: 'Talk to verified astrologers in real time. Pay only per minute; billing stops the second you end.' },
      { icon: 'kundli', title: 'Free Kundli', text: 'North Indian chart, planetary positions, Vimshottari dasha and dosha analysis from your exact birth details.' },
      { icon: 'match', title: 'Kundli Milan', text: 'Ashtakoota 36-guna matching for marriage compatibility with a clear score breakdown.' },
      { icon: 'calendar', title: 'Horoscope & Panchang', text: 'Daily, weekly and monthly predictions plus tithi, nakshatra, sunrise and Rahu Kaal for your city.' },
      { icon: 'report', title: 'Reports & remedies', text: 'Career, marriage and health reports, plus pujas and gemstone guidance from experts.' },
      { icon: 'star', title: 'Verified experts', text: 'Every astrologer is approved by our team and rated by users after each session.' },
    ],
    howTag: 'Simple steps',
    howTitle: 'How it works',
    howSubtitle: 'From sign-up to your first consultation in under two minutes.',
    howBadges: [
      { icon: 'wallet', label: 'Secure wallet' },
      { icon: 'chat', label: 'Hindi, English & more' },
      { icon: 'shield', label: 'Private chats' },
      { icon: 'clock', label: 'Available 24×7' },
    ],
    steps: [
      { title: 'Sign up with OTP', text: 'Log in with your mobile number and add your birth details.' },
      { title: 'Add money to wallet', text: 'Recharge once; your balance is used per minute.' },
      { title: 'Pick an astrologer', text: 'Filter by language, expertise, rating and price.' },
      { title: 'Start consulting', text: 'Chat or call with per-minute billing and a saved transcript.' },
    ],
    cta: {
      badge: 'EARN WITH US',
      title: 'Are you an astrologer? Earn with AstroVani',
      text: 'Join India’s trusted Vedic network. Consult via chat or call, set your own per-minute rates, and receive guaranteed instant payouts directly to your bank account.',
      earningsHighlight: 'Earn ₹50,000 to ₹1,50,000+ monthly · Flexible hours · 0 Joining Fee',
      button: 'Download Astrologer App',
      stepsTitle: 'Start earning in 3 steps',
      freeLabel: 'Free to join',
      footnote: 'Guaranteed payouts with transparent earnings',
      steps: [
        { title: 'Download the Astrologer App', text: 'Sign up with your mobile number and build your profile.' },
        { title: 'Complete KYC', text: 'Upload ID and bank details. Approval usually within 24 hours.' },
        { title: 'Go online and earn', text: 'Set your per-minute rate, take chats and calls, get paid to your bank.' },
      ],
      playStoreUrl: '',
      perks: [
        { icon: 'wallet', title: 'Set Your Own Rate', text: 'Charge ₹20 to ₹100+ per minute. You decide your consultation price.' },
        { icon: 'clock', title: 'Flexible Working Hours', text: 'Go online whenever you want. Work from home or on the go.' },
        { icon: 'shield', title: 'Guaranteed Payouts', text: 'Instant automated bank transfers with complete transparency.' },
        { icon: 'users', title: 'Genuine Seekers', text: 'Instant access to thousands of authentic users across India.' },
      ],
    },
    faqTag: 'Got questions?',
    faqTitle: 'Frequently asked questions',
    faqSubtitle: "Can't find your answer? Our support team is happy to help.",
    finalCta: {
      title: 'Your stars are speaking.',
      highlight: 'Are you listening?',
      text: 'Download the app to get your free Kundli and talk to a verified astrologer. Pay only for the minutes you use.',
    },
    faq: [
      { q: 'How is billing calculated?', a: "You are charged per minute at the astrologer's listed rate, only after they accept your request. The session ends automatically if your balance runs out." },
      { q: 'Are the astrologers verified?', a: 'Yes. Astrologers submit KYC and are approved by our admin team before they can go online.' },
      { q: 'How is my Kundli calculated?', a: 'We use the Vedic sidereal zodiac (Lahiri ayanamsa) with your exact birth time, place and timezone.' },
      { q: 'Is my data private?', a: 'Your birth details are only visible to the astrologer you consult.' },
    ],
    // Optional per-section background colours ('' = design default).
    colors: { features: '', how: '', cta: '', faq: '', final: '', footer: '' },
    footer: {
      about: '',
      showBadges: true,
      socials: { instagram: '', facebook: '', youtube: '', twitter: '', whatsapp: '' },
      disclaimer: 'Astrology is offered for guidance and is not a substitute for professional medical, legal, or financial advice.',
      supportEmail: 'support@astrovani.com',
      supportPhone: '+91 98765 43210',
      customerPlayStoreUrl: '',
      customerAppStoreUrl: '',
      vendorPlayStoreUrl: '',
      copyrightText: 'All rights reserved.',
    },
  },
  // What the apps ask for at sign-up. show = field appears, required = cannot continue without it.
  signup: {
    customer: {
      allowSkip: true,
      // One screen per detail, each with its own background photo, heading and help text (Admin > Sign-up Details).
      steps: {
        name: { imageUrl: '/signup/name.jpg', title: 'What should we call you?', help: 'Astrologers will see this name in chats.' },
        email: { imageUrl: '/signup/email.jpg', title: 'Your email', help: 'For receipts and important account updates.' },
        gender: { imageUrl: '/signup/gender.jpg', title: 'Your gender', help: 'Some readings, like Kundli Milan, depend on it.' },
        dob: { imageUrl: '/signup/dob.jpg', title: 'Date of birth', help: 'Needed to calculate your Moon sign and Kundli.' },
        tob: { imageUrl: '/signup/tob.jpg', title: 'Time of birth', help: 'Check your birth certificate. An exact time gives your Lagna and an accurate chart.' },
        pob: { imageUrl: '/signup/pob.jpg', title: 'Place of birth', help: 'We use its exact location and timezone for your chart.' },
      },
      fields: {
        name: { show: true, required: true },
        email: { show: false, required: false },
        gender: { show: true, required: true },
        dob: { show: true, required: true },
        tob: { show: true, required: true },
        pob: { show: true, required: true },
      },
    },
    astrologer: {
      title: 'AstroVani Pro',
      subtitle: 'Astrologer partner panel',
      // Login / sign-up screen of the astrologer app (Admin > Astrologer App > Login Screen).
      screen: {
        slides: [
          { imageUrl: '/store/navagraha-puja.jpg', title: 'Your wisdom, their answers', subtitle: 'Consult seekers across India by chat, call and video.' },
          { imageUrl: '/store/kundli-report.jpg', title: 'Set your own price', subtitle: 'Per minute or hourly, you decide what you charge.' },
          { imageUrl: '/store/deep-daan.jpg', title: 'Weekly payouts', subtitle: 'Earnings go straight to your bank account.' },
        ],
        intervalSec: 4,
        welcomeTitle: 'Welcome, Acharya',
        welcomeText: 'Log in with your registered mobile number.',
        signupTitle: 'Join as an astrologer',
        signupText: 'Create your partner account in 2 minutes. Our team verifies every profile.',
        points: [{ icon: 'wallet', text: 'Weekly payouts' }, { icon: 'clock', text: 'Flexible hours' }, { icon: 'shield', text: 'Verified seekers' }],
        accent: '#B9542C',
      },
      fields: {
        email: { show: true, required: false },
        experience: { show: true, required: true },
        expertise: { show: true, required: false },
        languages: { show: true, required: false },
        bio: { show: true, required: false },
        pricePerMin: { show: true, required: false },
        kyc: { show: true, required: true },
      },
    },
  },
  // Thin message strip at the top of each app / the website (Global > Customization > Announcement bar).
  announcement: {
    user: { show: false, mode: 'scroll', speed: 3, bg: '#7A2618', color: '#FFFFFF', dismissible: true, messages: [{ text: '⚡ Superfast connect: talk to a verified astrologer in under 60 seconds', link: '/user/astrologers' }] },
    astrologer: { show: false, mode: 'static', speed: 3, bg: '#14254F', color: '#FFFFFF', dismissible: false, messages: [{ text: 'Payouts are processed every Monday. Keep your KYC up to date.', link: '' }] },
    website: { show: false, mode: 'scroll', speed: 3, bg: '#7A2618', color: '#FFFFFF', dismissible: true, messages: [{ text: '⚡ Superfast consultations · First chat offer for new users · Download the app', link: '' }] },
  },
  promo: { eyebrow: 'FREE TOOL', title: 'Your complete Kundli, free', subtitle: 'Planets, dashas and doshas from your exact birth details.', cta: 'Open', link: '/user/kundli', icon: 'kundli' },
};

export const HERO_TOPIC_ICONS = ['career', 'love', 'marriage', 'finance', 'health', 'kundli', 'family', 'education', 'travel', 'property'];

const str = (v, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const safeLink = (v) => { const s = str(v, 300); return s.startsWith('/') || /^https?:\/\//.test(s) ? s : ''; };
const clampInt = (v, lo, hi, d) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d; };

function normalizeLanding(l = {}) {
  const d = DEFAULT_APP_CONFIG.landing;
  const h = l.hero || {};
  const list = (arr, def, max, map) => (Array.isArray(arr) ? arr : def).slice(0, max).map(map).filter(Boolean);
  return {
    sections: Object.fromEntries(Object.keys(d.sections).map((k) => [k, l.sections?.[k] !== false])),
    hero: {
      badge: str(h.badge ?? d.hero.badge, 60), title: str(h.title ?? d.hero.title, 60), highlight: str(h.highlight ?? d.hero.highlight, 60),
      subtitle: str(h.subtitle ?? d.hero.subtitle, 240), primaryCta: str(h.primaryCta ?? d.hero.primaryCta, 30), secondaryCta: str(h.secondaryCta ?? d.hero.secondaryCta, 30),
      imageUrl: safeLink(h.imageUrl),
      headlines: (Array.isArray(h.headlines) ? h.headlines : d.hero.headlines)
        .map((x) => ({ title: str(x?.title, 60), highlight: str(x?.highlight, 40) }))
        .filter((x) => x.title || x.highlight).slice(0, 6),
      prompts: (Array.isArray(h.prompts) ? h.prompts : d.hero.prompts).map((x) => str(x, 80)).filter(Boolean).slice(0, 8),
      topics: (Array.isArray(h.topics) ? h.topics : d.hero.topics)
        .map((x) => (x?.label ? { icon: HERO_TOPIC_ICONS.includes(x.icon) ? x.icon : 'kundli', label: str(x.label, 20), q: str(x.q, 100) } : null))
        .filter(Boolean).slice(0, 8),
      trust: {
        showAstrologers: h.trust?.showAstrologers !== false,
        showRating: h.trust?.showRating !== false,
        languages: str(h.trust?.languages ?? d.hero.trust.languages, 40),
        privacy: str(h.trust?.privacy ?? d.hero.trust.privacy, 40),
        languagesNote: str(h.trust?.languagesNote ?? d.hero.trust.languagesNote, 40),
        privacyNote: str(h.trust?.privacyNote ?? d.hero.trust.privacyNote, 40),
      },
      showLive: h.showLive !== false,
    },
    featuresTag: str(l.featuresTag ?? d.featuresTag, 30),
    featuresTitle: str(l.featuresTitle ?? d.featuresTitle, 60),
    featuresSubtitle: str(l.featuresSubtitle ?? d.featuresSubtitle, 200),
    features: list(l.features, d.features, 9, (x) => (x?.title ? { icon: str(x.icon, 20) || 'star', title: str(x.title, 40), text: str(x.text, 200) } : null)),
    howTag: str(l.howTag ?? d.howTag, 30),
    howTitle: str(l.howTitle ?? d.howTitle, 60),
    howSubtitle: str(l.howSubtitle ?? d.howSubtitle, 200),
    howBadges: list(l.howBadges, d.howBadges, 6, (x) => (x?.label ? { icon: str(x.icon, 20) || 'star', label: str(x.label, 30) } : null)),
    steps: list(l.steps, d.steps, 6, (x) => (x?.title ? { title: str(x.title, 40), text: str(x.text, 160) } : null)),
    cta: {
      badge: str(l.cta?.badge ?? d.cta.badge, 40),
      title: str(l.cta?.title ?? d.cta.title, 80),
      text: str(l.cta?.text ?? d.cta.text, 300),
      earningsHighlight: str(l.cta?.earningsHighlight ?? d.cta.earningsHighlight, 120),
      button: str(l.cta?.button ?? d.cta.button, 40),
      stepsTitle: str(l.cta?.stepsTitle ?? d.cta.stepsTitle, 60),
      freeLabel: str(l.cta?.freeLabel ?? d.cta.freeLabel, 30),
      footnote: str(l.cta?.footnote ?? d.cta.footnote, 100),
      steps: list(l.cta?.steps, d.cta.steps, 4, (x) => (x?.title ? { title: str(x.title, 50), text: str(x.text, 160) } : null)),
      playStoreUrl: safeLink(l.cta?.playStoreUrl || ''),
      perks: Array.isArray(l.cta?.perks) && l.cta.perks.length
        ? l.cta.perks.slice(0, 4).map((p) => ({ icon: str(p?.icon, 20) || 'star', title: str(p?.title, 40), text: str(p?.text, 160) }))
        : d.cta.perks,
    },
    colors: Object.fromEntries(Object.keys(d.colors).map((k) => [k, HEX.test(l.colors?.[k] || '') ? l.colors[k] : ''])),
    faqTag: str(l.faqTag ?? d.faqTag, 30),
    faqTitle: str(l.faqTitle ?? d.faqTitle, 60),
    faqSubtitle: str(l.faqSubtitle ?? d.faqSubtitle, 200),
    finalCta: {
      title: str(l.finalCta?.title ?? d.finalCta.title, 60),
      highlight: str(l.finalCta?.highlight ?? d.finalCta.highlight, 60),
      text: str(l.finalCta?.text ?? d.finalCta.text, 200),
    },
    faq: list(l.faq, d.faq, 12, (x) => (x?.q ? { q: str(x.q, 120), a: str(x.a, 500) } : null)),
    footer: {
      about: str(l.footer?.about ?? d.footer.about, 240),
      showBadges: l.footer?.showBadges !== false,
      socials: Object.fromEntries(Object.keys(d.footer.socials).map((k) => [k, safeLink(l.footer?.socials?.[k] || '')])),
      disclaimer: str(l.footer?.disclaimer ?? d.footer.disclaimer, 500),
      supportEmail: str(l.footer?.supportEmail ?? d.footer.supportEmail, 80),
      supportPhone: str(l.footer?.supportPhone ?? d.footer.supportPhone, 40),
      customerPlayStoreUrl: safeLink(l.footer?.customerPlayStoreUrl || ''),
      customerAppStoreUrl: safeLink(l.footer?.customerAppStoreUrl || ''),
      vendorPlayStoreUrl: safeLink(l.footer?.vendorPlayStoreUrl || ''),
      copyrightText: str(l.footer?.copyrightText ?? d.footer.copyrightText, 100),
    },
  };
}

// Validates whatever the admin sends and fills gaps from the defaults, so the app never gets a broken config.
function normalizeFields(given = {}, defs = {}) {
  return Object.fromEntries(Object.entries(defs).map(([k, def]) => {
    const g = given[k] || {};
    const show = typeof g.show === 'boolean' ? g.show : def.show;
    return [k, { show, required: show && (typeof g.required === 'boolean' ? g.required : def.required) }];
  }));
}

function normalizeAstroScreen(v = {}) {
  const d = DEFAULT_APP_CONFIG.signup.astrologer.screen;
  return {
    slides: (Array.isArray(v.slides) ? v.slides : d.slides)
      .map((x) => ({ imageUrl: safeLink(x?.imageUrl), title: str(x?.title, 50), subtitle: str(x?.subtitle, 100) })).filter((x) => x.imageUrl).slice(0, 6),
    intervalSec: clampInt(v.intervalSec, 2, 15, d.intervalSec),
    welcomeTitle: str(v.welcomeTitle ?? d.welcomeTitle, 50),
    welcomeText: str(v.welcomeText ?? d.welcomeText, 140),
    signupTitle: str(v.signupTitle ?? d.signupTitle, 50),
    signupText: str(v.signupText ?? d.signupText, 160),
    points: (Array.isArray(v.points) ? v.points : d.points).slice(0, 3).map((x) => ({ icon: str(x?.icon, 20) || 'star', text: str(x?.text, 24) })).filter((x) => x.text),
    accent: HEX.test(v.accent || '') ? v.accent : d.accent,
  };
}

function normalizeSignup(sg = {}) {
  const d = DEFAULT_APP_CONFIG.signup;
  const fields = normalizeFields(sg.customer?.fields, d.customer.fields);
  fields.name = { show: true, required: true }; // a name is needed for chats
  const ds = d.customer.steps;
  const steps = Object.fromEntries(Object.keys(ds).map((k) => {
    const g = sg.customer?.steps?.[k] || {};
    return [k, { imageUrl: g.imageUrl === undefined ? ds[k].imageUrl : safeLink(g.imageUrl), title: str(g.title ?? ds[k].title, 60) || ds[k].title, help: str(g.help ?? ds[k].help, 160) }];
  }));
  return {
    customer: { allowSkip: sg.customer?.allowSkip !== false, steps, fields },
    astrologer: {
      title: str(sg.astrologer?.title ?? d.astrologer.title, 40) || d.astrologer.title,
      subtitle: str(sg.astrologer?.subtitle ?? d.astrologer.subtitle, 80),
      screen: normalizeAstroScreen(sg.astrologer?.screen),
      fields: normalizeFields(sg.astrologer?.fields, d.astrologer.fields),
    },
  };
}

export const ANNOUNCE_MODES = ['scroll', 'rotate', 'static'];
function normalizeAnnouncement(a = {}) {
  const d = DEFAULT_APP_CONFIG.announcement;
  return Object.fromEntries(Object.keys(d).map((k) => {
    const g = a[k] || {}, def = d[k];
    return [k, {
      show: typeof g.show === 'boolean' ? g.show : def.show,
      mode: ANNOUNCE_MODES.includes(g.mode) ? g.mode : def.mode,
      speed: clampInt(g.speed, 1, 5, def.speed),
      bg: HEX.test(g.bg || '') ? g.bg : def.bg,
      color: HEX.test(g.color || '') ? g.color : def.color,
      dismissible: typeof g.dismissible === 'boolean' ? g.dismissible : def.dismissible,
      messages: (Array.isArray(g.messages) ? g.messages : def.messages)
        .map((m) => ({ text: str(m?.text, 160), link: safeLink(m?.link) })).filter((m) => m.text).slice(0, 5),
    }];
  }));
}

export function normalizeAppConfig(input = {}) {
  const d = DEFAULT_APP_CONFIG;
  const b = input.brand || {};
  const p = input.promo || {};
  const l = input.login || {};
  const slides = (Array.isArray(l.slides) ? l.slides : d.login.slides)
    .map((x) => ({ imageUrl: safeLink(x?.imageUrl), title: str(x?.title, 50), subtitle: str(x?.subtitle, 100) }))
    .filter((x) => x.imageUrl).slice(0, 8);
  const given = Array.isArray(input.sections) ? input.sections : [];
  const seen = new Set();
  const sections = [];
  for (const s of given) {
    if (!s || !SECTION_KEYS.includes(s.key) || seen.has(s.key)) continue;
    seen.add(s.key);
    const def = d.sections.find((x) => x.key === s.key);
    const out = { key: s.key, title: str(s.title ?? def.title, 60), visible: s.visible !== false };
    if ('limit' in def) out.limit = clampInt(s.limit, 1, 20, def.limit);
    if (s.key === 'astrologers') {
      out.source = ASTRO_SOURCES.includes(s.source) ? s.source : def.source;
      out.astrologerIds = Array.isArray(s.astrologerIds) ? s.astrologerIds.filter((x) => /^[a-f\d]{24}$/i.test(x)).slice(0, 20) : [];
    }
    sections.push(out);
  }
  for (const def of d.sections) if (!seen.has(def.key)) sections.push({ ...def });
  return {
    brand: { name: str(b.name, 40) || d.brand.name, tagline: str(b.tagline, 80), logoUrl: safeLink(b.logoUrl) },
    searchPlaceholder: str(input.searchPlaceholder, 80) || d.searchPlaceholder,
    sections,
    login: {
      slides,
      intervalSec: clampInt(l.intervalSec, 2, 15, d.login.intervalSec),
      overlay: clampInt(l.overlay, 0, 80, d.login.overlay),
      showLogo: l.showLogo !== false,
      showOffer: l.showOffer !== false,
      offerLabel: str(l.offerLabel ?? d.login.offerLabel, 24),
      newUser: {
        title: str(l.newUser?.title ?? d.login.newUser.title, 50),
        text: str(l.newUser?.text ?? d.login.newUser.text, 160),
        points: (Array.isArray(l.newUser?.points) ? l.newUser.points : d.login.newUser.points).slice(0, 3)
          .map((x) => ({ icon: str(x?.icon, 20) || 'star', text: str(x?.text, 24) })).filter((x) => x.text),
      },
      returning: { title: str(l.returning?.title ?? d.login.returning.title, 50), text: str(l.returning?.text ?? d.login.returning.text, 120) },
      offerText: str(l.offerText ?? d.login.offerText, 100),
      colors: Object.fromEntries(Object.entries(d.login.colors).map(([k, def]) => [k, HEX.test(l.colors?.[k] || '') ? l.colors[k] : def])),
      showTrust: l.showTrust !== false,
      trust: (Array.isArray(l.trust) ? l.trust : d.login.trust).slice(0, 4).map((t) => ({
        icon: str(t?.icon, 20) || 'star',
        source: TRUST_SOURCES.includes(t?.source) ? t.source : 'custom',
        value: str(t?.value, 12),
        label: str(t?.label, 28),
      })).filter((t) => t.label || t.value),
      heading: str(l.heading ?? d.login.heading, 40) || d.login.heading,
      subheading: str(l.subheading ?? d.login.subheading, 100),
      terms: str(l.terms ?? d.login.terms, 140),
    },
    theme: Object.fromEntries(Object.entries(d.theme).map(([k, def]) => [k, HEX.test(input.theme?.[k] || '') ? input.theme[k] : def])),
    landing: normalizeLanding(input.landing),
    signup: normalizeSignup(input.signup),
    announcement: normalizeAnnouncement(input.announcement),
    promo: { eyebrow: str(p.eyebrow, 40), title: str(p.title, 80), subtitle: str(p.subtitle, 160), cta: str(p.cta, 30), link: safeLink(p.link), icon: str(p.icon, 20) || 'star' },
  };
}

export async function getAppConfig() {
  const row = await Setting.findOne({ key: 'app' });
  return normalizeAppConfig(row?.value || DEFAULT_APP_CONFIG);
}

export async function saveAppConfig(input) {
  const value = normalizeAppConfig(input);
  await Setting.findOneAndUpdate({ key: 'app' }, { value }, { upsert: true });
  return value;
}
