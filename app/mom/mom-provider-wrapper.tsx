'use client';

import { MOMProvider } from '@/contexts/mom/MOMContext';

interface User {
  id: string;
  email: string;
  role: string;
}

export default function MOMProviderWrapper({
  children,
  user,
}: {
  children: React.ReactNode;
  user: User | null;
}) {
  return (
    <MOMProvider user={user}>
      {children}
    </MOMProvider>
  );
}