
import LandingPage from './landing-page';

export default function RootPage() {
  // This page now only renders the landing page for unauthenticated users.
  // The redirection logic is handled by RedirectHandler in the root layout.
  return <LandingPage />;
}
