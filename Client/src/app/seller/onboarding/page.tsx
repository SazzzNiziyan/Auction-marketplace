import { redirect } from 'next/navigation';

// Onboarding status lives on the application page.
export default function SellerOnboardingPage() {
  redirect('/seller/apply');
}
