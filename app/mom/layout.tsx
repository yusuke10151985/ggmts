import { checkAdminAccess } from './middleware';
import MOMProviderWrapper from './mom-provider-wrapper';
import { redirect } from 'next/navigation';

export default async function MOMLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { authorized, error, user } = await checkAdminAccess();
  
  if (!authorized) {
    // Redirect to home page with error message
    redirect('/?error=' + encodeURIComponent(error || 'Unauthorized'));
  }

  return (
    <MOMProviderWrapper user={user}>
      {children}
    </MOMProviderWrapper>
  );
}