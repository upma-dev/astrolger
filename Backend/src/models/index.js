import mongoose from 'mongoose';
const { Schema, model } = mongoose;
const opts = { timestamps: true };

export const User = model('User', new Schema({
  name: { type: String, default: '' },
  phone: { type: String, index: true, sparse: true },
  email: { type: String, index: true, sparse: true },
  gender: String,
  dob: String, tob: String, pob: String, lat: Number, lon: Number, tz: String,
  zodiac: String, nakshatra: String, sunSign: String, lagna: String,
  rashiCertain: { type: Boolean, default: true },
  walletBalance: { type: Number, default: 0 },
  isPremium: { type: Boolean, default: false },
  // Active premium subscription (snapshot of the plan's benefits at purchase time).
  premium: { plan: { type: Schema.Types.ObjectId, ref: 'Plan' }, name: String, discountPct: Number, until: Date },
  blocked: { type: Boolean, default: false },
  fcmToken: String,
  fcmTokens: { type: [String], default: [], index: true }, // Firebase push tokens (one per device/browser)
}, opts));

export const Astrologer = model('Astrologer', new Schema({
  name: { type: String, required: true },
  phone: { type: String, index: true, unique: true },
  email: String,
  password: String,
  avatar: String,
  bio: String,
  experience: { type: Number, default: 0 },
  expertise: [String],
  languages: [String],
  pricePerMin: { type: Number, default: 20 }, // kept equal to rates.chat for lists and older screens
  // Per-service rates in ₹ per minute (Price Management > Astrologer pricing).
  rates: { chat: Number, audio: Number, video: Number },
  // Optional per-service session/pack duration in minutes (e.g. 2 min) & whether chat ends automatically at that time.
  durations: { chat: Number, audio: Number, video: Number },
  autoCut: { chat: Boolean, audio: Boolean, video: Boolean },
  kyc: { panNumber: String, aadhaarLast4: String, bankAccount: String, ifsc: String, status: { type: String, default: 'pending' } },
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'blocked'], default: 'pending' },
  online: { type: Boolean, default: false },
  busy: { type: Boolean, default: false },
  featured: { type: Boolean, default: false },
  // Sponsored listing (set by admin): shown before others in astrologer lists until sponsoredUntil (empty = no end).
  sponsored: { type: Boolean, default: false },
  sponsoredUntil: Date,
  sponsorRank: { type: Number, default: 0 }, // higher = earlier among sponsored
  fcmTokens: { type: [String], default: [], index: true },
  commissionPct: { type: Number, default: 30 },
  commissionCustom: { type: Boolean, default: false }, // true = commissionPct replaces the service rule's commission
  rating: { type: Number, default: 0 },
  ratingCount: { type: Number, default: 0 },
  totalMinutes: { type: Number, default: 0 },
  walletBalance: { type: Number, default: 0 },
  slots: [{ day: String, from: String, to: String }],
  // Active astrologer plan: lower commission and/or featured listing until `until`.
  plan: { plan: { type: Schema.Types.ObjectId, ref: 'Plan' }, name: String, commissionCut: Number, featured: Boolean, until: Date },
}, opts));

export const Session = model('Session', new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  astrologer: { type: Schema.Types.ObjectId, ref: 'Astrologer', index: true },
  type: { type: String, enum: ['chat', 'audio', 'video'], default: 'chat' },
  status: { type: String, enum: ['requested', 'active', 'completed', 'rejected', 'cancelled', 'missed'], default: 'requested' },
  pricePerMin: Number, // astrologer's listed rate
  userPricePerMin: Number, // what the user pays per minute (after premium discount)
  discountPct: { type: Number, default: 0 },
  sessionFee: { type: Number, default: 0 },
  commissionPct: Number,
  // Frozen price rule (Price Management > Service pricing). Charged once per `block` minutes.
  block: { type: Number, default: 1 },
  maxMinutes: { type: Number, default: 0 }, // >0 means session automatically ends when this duration (in min) is reached
  endReason: String,
  listedBlock: Number, userBlock: Number, astroBlock: Number, chargePerBlock: Number,
  feePct: { type: Number, default: 0 }, gstPct: { type: Number, default: 0 }, sessionFeeTotal: { type: Number, default: 0 },
  commissionType: String, commission: Number,
  startedAt: Date, endedAt: Date,
  minutes: { type: Number, default: 0 },
  amount: { type: Number, default: 0 },
  astrologerEarning: { type: Number, default: 0 },
  platformEarning: { type: Number, default: 0 },
  rated: { type: Boolean, default: false },
}, opts));

export const Message = model('Message', new Schema({
  session: { type: Schema.Types.ObjectId, ref: 'Session', index: true },
  senderRole: { type: String, enum: ['user', 'astrologer', 'system'] },
  text: String,
}, opts));

export const Review = model('Review', new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User' },
  astrologer: { type: Schema.Types.ObjectId, ref: 'Astrologer', index: true },
  session: { type: Schema.Types.ObjectId, ref: 'Session' },
  rating: { type: Number, min: 1, max: 5 },
  comment: String,
}, opts));

export const Transaction = model('Transaction', new Schema({
  ownerType: { type: String, enum: ['user', 'astrologer', 'platform'] },
  owner: { type: Schema.Types.ObjectId, index: true },
  kind: { type: String, enum: ['recharge', 'consultation', 'report', 'remedy', 'subscription', 'earning', 'withdrawal', 'refund', 'bonus', 'adjustment', 'gst', 'fee', 'tds', 'platform_fee'] },
  direction: { type: String, enum: ['credit', 'debit'] },
  amount: Number,
  balanceAfter: Number,
  ref: String,
  note: String,
  meta: Schema.Types.Mixed, // price breakdown (GST, fees, TDS ...)
}, opts));

export const Withdrawal = model('Withdrawal', new Schema({
  astrologer: { type: Schema.Types.ObjectId, ref: 'Astrologer', index: true },
  amount: Number,
  tds: { type: Number, default: 0 },
  fee: { type: Number, default: 0 },
  net: Number, // amount - tds - fee, what reaches the bank
  status: { type: String, enum: ['pending', 'paid', 'rejected'], default: 'pending' },
  note: String,
}, opts));

// Home-screen poster. Everything shown on the poster comes from the admin panel (App Management -> Posters).
export const Banner = model('Banner', new Schema({
  title: String, subtitle: String, eyebrow: String, cta: String, link: String,
  imageUrl: String,
  color: { type: String, default: 'terracotta' },
  order: { type: Number, default: 0 },
  active: { type: Boolean, default: true },
}, opts));

// Service shortcuts on the home screen (Chat, Call, Kundli ...). Managed in App Management -> Services.
export const Category = model('Category', new Schema({
  label: { type: String, required: true },
  icon: { type: String, default: 'chat' },
  imageUrl: String,
  link: { type: String, default: '/user/astrologers' },
  tag: String,
  order: { type: Number, default: 0 },
  active: { type: Boolean, default: true },
}, opts));

export const Horoscope = model('Horoscope', new Schema({
  sign: String,
  period: { type: String, enum: ['daily', 'weekly', 'monthly'] },
  text: String,
  lucky: { color: String, number: Number },
  scores: { love: Number, career: Number, health: Number, money: Number },
}, opts));
Horoscope.schema.index({ sign: 1, period: 1 }, { unique: true });

export const Report = model('Report', new Schema({
  title: String, category: String, description: String, price: Number, imageUrl: String, active: { type: Boolean, default: true },
}, opts));

export const Remedy = model('Remedy', new Schema({
  title: String, category: String, description: String, price: Number, imageUrl: String, active: { type: Boolean, default: true },
}, opts));

export const Purchase = model('Purchase', new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  itemType: { type: String, enum: ['report', 'remedy'] },
  item: Schema.Types.ObjectId, title: String, price: Number,
  // wallet = paid from the wallet; cod = cash on delivery (collected later).
  payment: { type: String, enum: ['wallet', 'cod'], default: 'wallet' },
  codFee: { type: Number, default: 0 },
  address: String, contactPhone: String,
  status: { type: String, default: 'paid' }, // paid | cod_pending | cod_collected | cancelled
}, opts));

// Support queries. app = which app it came from (customer or astrologer); shown in that admin section.
// From the login screen (not logged in) only `guest` contact details are known; it is linked to the account if the number matches.
export const Ticket = model('Ticket', new Schema({
  app: { type: String, enum: ['user', 'astrologer'], default: 'user', index: true },
  user: { type: Schema.Types.ObjectId, ref: 'User' },
  astrologer: { type: Schema.Types.ObjectId, ref: 'Astrologer' },
  guest: { name: String, phone: String },
  source: { type: String, enum: ['app', 'login'], default: 'app' },
  subject: String, message: String,
  messages: [{ from: { type: String, enum: ['customer', 'admin'] }, text: String, at: { type: Date, default: Date.now } }],
  status: { type: String, enum: ['open', 'resolved'], default: 'open' },
  unreadAdmin: { type: Boolean, default: true },
  unreadOwner: { type: Boolean, default: false },
  reply: String, // older single reply (kept for old tickets)
}, opts));

export const Admin = model('Admin', new Schema({
  name: String, email: { type: String, unique: true }, password: String,
  fcmTokens: { type: [String], default: [], index: true },
}, opts));

export const Setting = model('Setting', new Schema({
  key: { type: String, unique: true }, value: Schema.Types.Mixed,
}, opts));

export const Otp = model('Otp', new Schema({
  key: String, code: String, expiresAt: Date,
}, opts));

export const Notification = model('Notification', new Schema({
  title: { type: String, required: true },
  message: { type: String, required: true },
  target: { type: String, enum: ['all', 'user', 'astrologer'], default: 'all' },
  type: { type: String, enum: ['broadcast', 'system', 'offer', 'alert'], default: 'broadcast' },
  link: String,
  sentBy: { type: Schema.Types.ObjectId, ref: 'Admin' },
  readBy: [{ type: Schema.Types.ObjectId }],
}, opts));


// Subscription plans for users (premium) and astrologers (pro/featured). Managed in Global > Subscriptions.
export const Plan = model('Plan', new Schema({
  audience: { type: String, enum: ['user', 'astrologer'], required: true, index: true },
  name: { type: String, required: true },
  description: String,
  price: { type: Number, required: true },
  durationDays: { type: Number, default: 30 },
  discountPct: { type: Number, default: 0 }, // user: off every consultation
  commissionCut: { type: Number, default: 0 }, // astrologer: commission points removed
  featured: { type: Boolean, default: false }, // astrologer: shown first in lists
  perks: [String],
  active: { type: Boolean, default: true },
  order: { type: Number, default: 0 },
}, opts));

export const Subscription = model('Subscription', new Schema({
  ownerType: { type: String, enum: ['user', 'astrologer'], index: true },
  owner: { type: Schema.Types.ObjectId, index: true },
  plan: { type: Schema.Types.ObjectId, ref: 'Plan' },
  name: String,
  price: Number, gst: { type: Number, default: 0 }, total: Number,
  startsAt: Date, endsAt: Date,
}, opts));
