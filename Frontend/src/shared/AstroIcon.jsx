import {
  ArrowRight, Bell, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Clock, FileText, Flame, Gem, Gift, Hand, Heart, HeartHandshake,
  House, LayoutGrid, MessageCircleMore, Moon, Orbit, Palette, Phone, PhoneOff, Plus, ScrollText, Search, Send, Share2, ShieldCheck, Sparkles, Star, Sun,
  UserRound, Users, Video, Wallet, WandSparkles,
} from 'lucide-react';
import {
  TbZodiacAquarius, TbZodiacAries, TbZodiacCancer, TbZodiacCapricorn, TbZodiacGemini, TbZodiacLeo,
  TbZodiacLibra, TbZodiacPisces, TbZodiacSagittarius, TbZodiacScorpio, TbZodiacTaurus, TbZodiacVirgo,
} from 'react-icons/tb';

// Icon keys used across the apps and stored in admin settings (services row, promo card, login points…).
// Every key maps to a Lucide icon: no custom hand-drawn icons anywhere. Unknown keys fall back to Star.
const LUCIDE = {
  bell: Bell, chev: ChevronRight, down: ChevronDown, back: ChevronLeft, arrow: ArrowRight, share: Share2, home: House,
  kundli: ScrollText, wallet: Wallet, user: UserRound, chat: MessageCircleMore, phone: Phone, video: Video, match: HeartHandshake, report: FileText,
  diya: Flame, sun: Sun, moon: Moon, send: Send, end: PhoneOff, search: Search, star: Star, sparkles: Sparkles, plus: Plus, gem: Gem, heart: Heart,
  horoscope: Orbit, tarot: WandSparkles, palm: Hand, calendar: CalendarDays, gift: Gift, grid: LayoutGrid,
  clock: Clock, shield: ShieldCheck, users: Users,
  // poster colour themes (admin pickers)
  terracotta: Palette, maroon: Palette, saffron: Palette, sand: Palette,
};

const ZODIAC = [
  TbZodiacAries, TbZodiacTaurus, TbZodiacGemini, TbZodiacCancer, TbZodiacLeo, TbZodiacVirgo,
  TbZodiacLibra, TbZodiacScorpio, TbZodiacSagittarius, TbZodiacCapricorn, TbZodiacAquarius, TbZodiacPisces,
];
const SIGNS = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];

export function ZodiacIcon({ sign, index, size = 18, className, style }) {
  const idx = typeof index === 'number' ? index : SIGNS.indexOf(sign);
  const C = ZODIAC[idx] || Sparkles;
  return <C size={size} strokeWidth={1.9} className={className} style={style} aria-hidden="true" />;
}

export default function AstroIcon({ n, s = 20, size, style, className, strokeWidth = 1.9 }) {
  const C = LUCIDE[n] || Star;
  return <C size={size || s} strokeWidth={strokeWidth} style={style} className={className} aria-hidden="true" />;
}
