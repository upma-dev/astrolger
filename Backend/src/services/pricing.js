import { Setting } from '../models/index.js';

/* All money rules in one place. Admin edits them in Price Management (Setting key "pricing").

   Recharge    : wallet gets `amount`; user pays amount + GST + gateway fee.
   Services    : chat / audio call / video call each have their own price rule (Price Management > Service Pricing):
                 - billing block: 1 = per minute, 60 = hourly (a full hour is charged at the start of each hour), or 5/15/30 min packs
                 - astrologer rate limits (₹ per minute) and a default rate for new astrologers
                 - admin commission from the astrologer: percent of the rate, or a fixed ₹ per minute
                 - platform fee from the customer: fixed ₹ once per consultation, or percent added to every charge
                 - GST on the consultation (optional; GST is normally collected on wallet recharge)
   Payout      : astrologer requests X; TDS% and a flat payout fee are deducted; net goes to the bank.
   All rates are stored per minute; the apps show them per minute or per hour depending on the billing block. */

export const SERVICE_TYPES = ['chat', 'audio', 'video'];
export const BLOCKS = [1, 2, 5, 10, 15, 30, 60];
const SERVICE_DEFAULTS = {
  chat: { label: 'Chat', enabled: true, block: 1, maxMinutes: 0, autoCut: false, defaultRate: 20, minRate: 5, maxRate: 500, minMinutes: 2, commissionType: 'percent', commission: 30, feeType: 'fixed', fee: 0, gstPct: 0 },
  audio: { label: 'Audio call', enabled: true, block: 1, maxMinutes: 0, autoCut: false, defaultRate: 25, minRate: 5, maxRate: 600, minMinutes: 3, commissionType: 'percent', commission: 30, feeType: 'fixed', fee: 0, gstPct: 0 },
  video: { label: 'Video call', enabled: true, block: 1, maxMinutes: 0, autoCut: false, defaultRate: 35, minRate: 10, maxRate: 800, minMinutes: 5, commissionType: 'percent', commission: 30, feeType: 'fixed', fee: 0, gstPct: 0 },
};

export const DEFAULT_PRICING = {
  recharge: { min: 50, max: 50000, gstPct: 18, feePct: 0 },
  services: SERVICE_DEFAULTS,
  payout: { minWithdraw: 500, tdsPct: 1, feeFlat: 0 },
  plans: { astrologerGstPct: 18 },
  // allowEdit = astrologers can change their own rates (always inside each service's limits).
  astrologerRate: { allowEdit: true },
  // How customers can pay. online = wallet recharge through the gateway; cod = cash on delivery for remedy/puja orders.
  payments: { online: true, upi: true, card: true, netbanking: true, cod: false, codMax: 5000, codFee: 0 },
};

export const r2 = (n) => Math.round((+n || 0) * 100) / 100;
// Rates keep 4 decimals so hourly prices survive the per-minute conversion (₹1000/hr = ₹16.6667/min).
const r4 = (n) => Math.round((+n || 0) * 10000) / 10000;
const clamp = (v, lo, hi, d) => { const n = +v; return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d; };
const bool = (x, def) => (typeof x === 'boolean' ? x : def);

function normalizeService(g = {}, def, legacy = {}) {
  const minRate = r4(clamp(g.minRate ?? legacy.min, 0.1, 10000, def.minRate));
  const maxRate = Math.max(minRate, r4(clamp(g.maxRate ?? legacy.max, 0.1, 10000, def.maxRate)));
  const commissionType = ['percent', 'fixed'].includes(g.commissionType) ? g.commissionType : def.commissionType;
  const feeType = ['fixed', 'percent'].includes(g.feeType) ? g.feeType : def.feeType;
  return {
    label: def.label,
    enabled: bool(g.enabled, def.enabled),
    block: Math.round(clamp(g.block, 1, 240, def.block)),
    maxMinutes: Math.round(clamp(g.maxMinutes, 0, 240, def.maxMinutes)),
    autoCut: bool(g.autoCut, def.autoCut),
    defaultRate: Math.min(maxRate, Math.max(minRate, r4(clamp(g.defaultRate, 0.1, 10000, def.defaultRate)))),
    minRate,
    maxRate,
    minMinutes: Math.round(clamp(g.minMinutes ?? legacy.minMinutes, 1, 120, def.minMinutes)),
    commissionType,
    commission: commissionType === 'percent' ? r2(clamp(g.commission ?? legacy.commission, 0, 90, def.commission)) : r2(clamp(g.commission, 0, 10000, 0)),
    feeType,
    fee: feeType === 'percent' ? r2(clamp(g.fee, 0, 50, 0)) : r2(clamp(g.fee ?? legacy.fee, 0, 5000, def.fee)),
    gstPct: r2(clamp(g.gstPct, 0, 28, def.gstPct)),
  };
}

export function normalizePricing(v = {}, legacy = {}) {
  const d = DEFAULT_PRICING;
  const rc = v.recharge || {}, cs = v.consultation || {}, po = v.payout || {}, pl = v.plans || {}, ar = v.astrologerRate || {}, pm = v.payments || {};
  const min = Math.round(clamp(rc.min ?? legacy.minRecharge, 1, 100000, d.recharge.min));
  // Older saves had one rate range / commission / fee for everything: carry them into each service.
  const old = { min: ar.min, max: ar.max, minMinutes: cs.minMinutes, commission: cs.defaultCommission ?? legacy.defaultCommission, fee: cs.sessionFee };
  const services = Object.fromEntries(SERVICE_TYPES.map((k) => [k, normalizeService(v.services?.[k], SERVICE_DEFAULTS[k], v.services ? {} : old)]));
  const chat = services.chat;
  return {
    recharge: {
      min,
      max: Math.max(min, Math.round(clamp(rc.max, 1, 500000, d.recharge.max))),
      gstPct: r2(clamp(rc.gstPct, 0, 28, d.recharge.gstPct)),
      feePct: r2(clamp(rc.feePct, 0, 10, d.recharge.feePct)),
    },
    services,
    // Read-only summary for older screens (derived from the chat rule).
    consultation: { defaultCommission: chat.commissionType === 'percent' ? chat.commission : 30, minMinutes: chat.minMinutes, sessionFee: chat.feeType === 'fixed' ? chat.fee : 0 },
    payout: {
      minWithdraw: Math.round(clamp(po.minWithdraw, 1, 100000, d.payout.minWithdraw)),
      tdsPct: r2(clamp(po.tdsPct, 0, 30, d.payout.tdsPct)),
      feeFlat: r2(clamp(po.feeFlat, 0, 1000, d.payout.feeFlat)),
    },
    plans: { astrologerGstPct: r2(clamp(pl.astrologerGstPct, 0, 28, d.plans.astrologerGstPct)) },
    astrologerRate: { allowEdit: bool(ar.allowEdit, d.astrologerRate.allowEdit) },
    payments: {
      online: bool(pm.online, d.payments.online),
      upi: bool(pm.upi, d.payments.upi),
      card: bool(pm.card, d.payments.card),
      netbanking: bool(pm.netbanking, d.payments.netbanking),
      cod: bool(pm.cod, d.payments.cod),
      codMax: Math.round(clamp(pm.codMax, 0, 100000, d.payments.codMax)),
      codFee: r2(clamp(pm.codFee, 0, 1000, d.payments.codFee)),
    },
  };
}

export async function getPricing() {
  const rows = await Setting.find({ key: { $in: ['pricing', 'minRecharge', 'defaultCommission'] } });
  const by = Object.fromEntries(rows.map((x) => [x.key, x.value]));
  return normalizePricing(by.pricing, { minRecharge: by.minRecharge, defaultCommission: by.defaultCommission });
}

export async function savePricing(input) {
  const p = normalizePricing(input);
  await Setting.findOneAndUpdate({ key: 'pricing' }, { value: p }, { upsert: true });
  // Keep the older single keys in step for screens that still read them.
  await Setting.findOneAndUpdate({ key: 'minRecharge' }, { value: p.recharge.min }, { upsert: true });
  await Setting.findOneAndUpdate({ key: 'defaultCommission' }, { value: p.consultation.defaultCommission }, { upsert: true });
  return p;
}

export function quoteRecharge(amount, p) {
  const a = r2(amount);
  const gst = r2(a * p.recharge.gstPct / 100);
  const fee = r2(a * p.recharge.feePct / 100);
  return { amount: a, gstPct: p.recharge.gstPct, gst, feePct: p.recharge.feePct, fee, total: r2(a + gst + fee), walletCredit: a };
}

export function quoteWithdraw(amount, p) {
  const a = r2(amount);
  const tds = r2(a * p.payout.tdsPct / 100);
  const fee = r2(Math.min(p.payout.feeFlat, a - tds));
  return { amount: a, tdsPct: p.payout.tdsPct, tds, fee, net: r2(a - tds - fee) };
}

// Recharge methods the customer can pick right now (empty when online payments are off).
export const onlineMethods = (p) => (p.payments.online ? [['UPI', 'upi'], ['Card', 'card'], ['Net Banking', 'netbanking']].filter(([, k]) => p.payments[k]).map(([l]) => l) : []);

// Keeps an astrologer's per-minute rate for one service inside the admin's limits.
export const clampRate = (v, p, type = 'chat') => {
  const s = p.services[type];
  return r4(Math.min(s.maxRate, Math.max(s.minRate, +v || s.defaultRate)));
};

// Effective billing duration (minutes) and auto-cut flag for an astrologer + service.
export const durationOf = (astro, type, p) => {
  const v = Math.round(+astro?.durations?.[type] || 0);
  if (v >= 1 && v <= 240) return v;
  return p.services[type]?.block || 1;
};

export const autoCutOf = (astro, type, p) => {
  if (typeof astro?.autoCut?.[type] === 'boolean') return astro.autoCut[type];
  return !!p.services[type]?.autoCut;
};

// An astrologer's per-minute rate for a service. Older profiles only have pricePerMin (used for every service).
export const rateOf = (astro, type, p) => {
  const v = +astro?.rates?.[type];
  if (v > 0) return v;
  if (+astro?.pricePerMin > 0) return +astro.pricePerMin;
  return p.services[type].defaultRate;
};

// Fills in the per-service rates for a new astrologer: the chat rate they asked for (kept inside the limits) and defaults for the rest.
export const initialRates = (askedChat, p) => Object.fromEntries(SERVICE_TYPES.map((k) => [k, k === 'chat' && +askedChat > 0 ? clampRate(askedChat, p, k) : p.services[k].defaultRate]));

export const isActive = (sub) => !!sub?.until && new Date(sub.until) > new Date();

/* Numbers frozen onto a new session. The premium discount comes out of the platform's share,
   so the astrologer always earns on their listed rate.
   Charges happen once per block (1 min, 2 min pack, or 60 min for hourly, …):
     user pays   = blockPrice (after discount) + platform fee % + GST
     astrologer  = listed blockPrice − commission (percent, or fixed ₹/min × block)
     platform    = what the user paid (without GST) − astrologer share
   A fixed platform fee (+ GST) is charged once when the session starts. */
export function sessionRates(astro, user, p, type = 'chat') {
  const svc = p.services[type] || p.services.chat;
  const perMin = rateOf(astro, type, p);
  const block = durationOf(astro, type, p);
  const autoCut = autoCutOf(astro, type, p);
  const svcMax = svc.maxMinutes || 0;
  const rawMax = autoCut ? block : svcMax;
  const maxMinutes = svcMax > 0 && rawMax > 0 ? Math.min(rawMax, svcMax) : (rawMax || 0);
  const discountPct = isActive(user?.premium) ? r2(user.premium.discountPct || 0) : 0;
  const cut = isActive(astro?.plan) ? r2(astro.plan.commissionCut || 0) : 0;
  const listedBlock = r2(perMin * block);
  const userBlock = r2(listedBlock * (1 - discountPct / 100));
  // Admin commission from the astrologer. A custom % set on the astrologer replaces a percent rule.
  let commissionType = svc.commissionType, commission = svc.commission;
  if (astro?.commissionCustom && Number.isFinite(+astro.commissionPct)) { commissionType = 'percent'; commission = +astro.commissionPct; }
  let astroBlock;
  if (commissionType === 'percent') {
    commission = r2(Math.max(0, commission - cut));
    astroBlock = r2(listedBlock * (1 - commission / 100));
  } else {
    astroBlock = r2(Math.max(0, listedBlock - commission * block));
  }
  const feePct = svc.feeType === 'percent' ? svc.fee : 0;
  const fixedFee = svc.feeType === 'fixed' ? svc.fee : 0;
  const feeOnBlock = r2(userBlock * feePct / 100);
  const gstOnBlock = r2((userBlock + feeOnBlock) * svc.gstPct / 100);
  const chargePerBlock = r2(userBlock + feeOnBlock + gstOnBlock);
  const sessionFeeTotal = r2(fixedFee * (1 + svc.gstPct / 100));
  const effectiveMin = maxMinutes > 0 ? Math.min(svc.minMinutes, maxMinutes) : svc.minMinutes;
  const blocksNeeded = Math.max(1, Math.ceil(effectiveMin / block));
  const effectivePct = listedBlock > 0 ? r2((1 - astroBlock / listedBlock) * 100) : 0;
  return {
    type, block, autoCut, maxMinutes, perMin,
    pricePerMin: perMin, userPricePerMin: r2(userBlock / block),
    listedBlock, userBlock, astroBlock, chargePerBlock, feeOnBlock, gstOnBlock,
    discountPct, commissionType, commission, commissionPct: effectivePct,
    feePct, sessionFee: fixedFee, sessionFeeTotal, gstPct: svc.gstPct,
    astroPerMin: r2(astroBlock / block), platformPerMin: r2((userBlock + feeOnBlock - astroBlock) / block),
    minMinutes: effectiveMin,
    minBalance: r2(chargePerBlock * blocksNeeded + sessionFeeTotal),
  };
}

// What the apps need to show prices (no internals like commission).
export const publicServices = (p) => Object.fromEntries(SERVICE_TYPES.map((k) => {
  const s = p.services[k];
  return [k, { label: s.label, enabled: s.enabled, block: s.block, maxMinutes: s.maxMinutes, autoCut: s.autoCut, minRate: s.minRate, maxRate: s.maxRate, defaultRate: s.defaultRate, minMinutes: s.minMinutes, feeType: s.feeType, fee: s.fee, gstPct: s.gstPct }];
}));

/* Builds an update for an astrologer's rates, durations and autoCut flags.
   strict = reject values outside the service limits (astrologer editing); otherwise just round (admin). */
export function ratesPatch(body, astro, p, strict) {
  const given = { ...(body.rates || {}) };
  if (body.pricePerMin !== undefined && given.chat === undefined) given.chat = body.pricePerMin;
  const givenDur = body.durations || {};
  const givenCut = body.autoCut || {};
  const hasRates = SERVICE_TYPES.some((k) => given[k] !== undefined && given[k] !== '');
  const hasDur = SERVICE_TYPES.some((k) => givenDur[k] !== undefined && givenDur[k] !== '');
  const hasCut = SERVICE_TYPES.some((k) => typeof givenCut[k] === 'boolean');
  if (!hasRates && !hasDur && !hasCut) return { patch: null };

  const rates = Object.fromEntries(SERVICE_TYPES.map((k) => [k, rateOf(astro, k, p)]));
  const durations = Object.fromEntries(SERVICE_TYPES.map((k) => [k, durationOf(astro, k, p)]));
  const autoCut = Object.fromEntries(SERVICE_TYPES.map((k) => [k, autoCutOf(astro, k, p)]));

  for (const k of SERVICE_TYPES) {
    const s = p.services[k];
    if (givenDur[k] !== undefined && givenDur[k] !== '') {
      const d = Math.round(+givenDur[k]);
      if (!Number.isFinite(d) || d < 1 || d > 240) return { error: `${s.label} duration must be between 1 and 240 minutes` };
      durations[k] = d;
    }
    if (typeof givenCut[k] === 'boolean') autoCut[k] = givenCut[k];
    if (given[k] !== undefined && given[k] !== '') {
      const v = r4(+given[k]);
      if (!(v > 0)) return { error: `Enter a valid ${s.label.toLowerCase()} rate` };
      const d = durations[k];
      const unit = d === 60 ? 'hour' : d === 1 ? 'minute' : `${d} min`;
      if (strict && (v < s.minRate - 1e-6 || v > s.maxRate + 1e-6)) return { error: `${s.label} rate must be between ₹${r2(s.minRate * d)} and ₹${r2(s.maxRate * d)} per ${unit}` };
      rates[k] = Math.min(10000, v);
    }
  }
  return { patch: { rates, durations, autoCut, pricePerMin: rates.chat } };
}
