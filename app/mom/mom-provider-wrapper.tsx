'use client';

import { MOMProvider } from '@/contexts/mom/MOMContext';

export default function MOMProviderWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MOMProvider>
      {children}
    </MOMProvider>
  );
}