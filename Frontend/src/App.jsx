import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { PageLoader } from './shared/ui.jsx';
import { RouteSkeleton } from './shared/Skeleton.jsx';
import Landing from './modules/landing/Landing.jsx';

const UserApp = lazy(() => import('./modules/user/UserApp.jsx'));
const VendorApp = lazy(() => import('./modules/vendor/VendorApp.jsx'));
const AdminApp = lazy(() => import('./modules/admin/AdminApp.jsx'));
const PolicyPage = lazy(() => import('./modules/landing/PolicyPage.jsx'));

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
    <Suspense fallback={<RouteSkeleton />}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/terms" element={<PolicyPage initialKey="terms_of_service" />} />
        <Route path="/privacy" element={<PolicyPage initialKey="privacy_policy" />} />
        <Route path="/refund" element={<PolicyPage initialKey="refund_policy" />} />
        <Route path="/policy/:key" element={<PolicyPage />} />
        <Route path="/user/*" element={<UserApp />} />
        <Route path="/vendor/*" element={<VendorApp />} />
        <Route path="/admin/*" element={<AdminApp />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
