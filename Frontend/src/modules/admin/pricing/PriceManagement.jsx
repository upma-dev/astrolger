import ServicePricing from './ServicePricing.jsx';
import CustomerPricing from './CustomerPricing.jsx';
import AstrologerPricing from './AstrologerPricing.jsx';
import PaymentModes from './PaymentModes.jsx';

/* Price Management pages. They live in the Users and Astrologers sections (each has its own sidebar entry):
   Users       → Wallet Recharge & GST, Consultation Charges, Payment Modes, Subscription Plans
   Astrologers → Astrologer Rates, Chat / Call / Video Rules, Payout & TDS Settings, Subscription Plans */
const PAGES = {
  services: ServicePricing,
  customer: CustomerPricing,
  payments: PaymentModes,
  'astro-rates': () => <AstrologerPricing part="rates" />,
  payouts: () => <AstrologerPricing part="payouts" />,
};

export default function PriceManagement({ section }) {
  const Page = PAGES[section] || CustomerPricing;
  return <Page key={section} />;
}
