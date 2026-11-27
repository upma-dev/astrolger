const CACHE_KEY = 'astro_public_app_v1';

// Mirrors Backend DEFAULT_APP_CONFIG so the landing page & login screen never hang on a skeleton
// if the backend is waking up on cold start or temporarily unreachable on mobile networks.
export const FALLBACK_PUBLIC_APP = {
  config: {
    brand: { name: 'AstroVani', tagline: 'Trusted Vedic Astrologers', logoUrl: '' },
    theme: { accent: '#B9542C', brand: '#7A2618', background: '#FBF4EE', darkAccent: '#E0784B' },
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
      newUser: {
        title: 'Welcome to {app}',
        text: 'Talk to verified Vedic astrologers, get your free Kundli and daily guidance, all in one app.',
        points: [
          { icon: 'chat', text: 'Chat & call experts' },
          { icon: 'kundli', text: 'Free Kundli' },
          { icon: 'sun', text: 'Daily horoscope' },
        ],
      },
      returning: { title: 'Welcome back to {app}', text: 'Log in with your mobile number to continue.' },
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
    landing: {
      sections: { features: true, horoscope: true, astrologers: true, how: true, cta: true, faq: true, final: true },
      hero: {
        badge: 'First chat free · Pay per minute',
        title: 'Ask the stars. Get answers',
        highlight: 'in minutes.',
        subtitle: 'Chat or call verified Vedic astrologers. Pay per minute, no subscriptions.',
        primaryCta: 'Ask now',
        secondaryCta: 'Generate free Kundli',
        imageUrl: '',
        headlines: [
          { title: 'Ask the stars. Get answers', highlight: 'in minutes.' },
          { title: 'Marriage questions? Get', highlight: 'clear answers.' },
          { title: 'Career confusion? Find', highlight: 'your next move.' },
          { title: 'Your Kundli, decoded', highlight: 'for free.' },
        ],
        prompts: [
          'Meri shaadi kab hogi?',
          'Is this the right time to change jobs?',
          'Will my business grow this year?',
          'Kya hamari kundli milti hai?',
        ],
        topics: [
          { icon: 'career', label: 'Career', q: 'Is this the right time to change jobs?' },
          { icon: 'love', label: 'Love', q: 'Will my relationship last?' },
          { icon: 'marriage', label: 'Marriage', q: 'Meri shaadi kab hogi?' },
          { icon: 'finance', label: 'Finance', q: 'Will my business grow this year?' },
          { icon: 'health', label: 'Health', q: 'How will my health be this year?' },
          { icon: 'kundli', label: 'Kundli', q: 'Kya hamari kundli milti hai?' },
        ],
        trust: {
          showAstrologers: true,
          showRating: true,
          languages: 'Hindi, English & more',
          languagesNote: 'Consult in your language',
          privacy: '100% private chats',
          privacyNote: 'Safe & confidential',
        },
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
    signup: {
      customer: {
        allowSkip: true,
        fields: {
          name: { show: true, required: true },
          email: { show: false, required: false },
          gender: { show: true, required: true },
          dob: { show: true, required: true },
          tob: { show: true, required: true },
          pob: { show: true, required: true },
        },
      },
    },
    announcement: {},
  },
  system: {
    user: { enabled: true },
    astrologer: { enabled: true },
    website: { enabled: true },
  },
};

export function isValidPublicApp(data) {
  return !!(data && data.config && data.config.landing && data.config.login);
}

export function readCachedApp() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return isValidPublicApp(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function writeCachedApp(data) {
  if (!isValidPublicApp(data)) return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    /* storage unavailable */
  }
}
