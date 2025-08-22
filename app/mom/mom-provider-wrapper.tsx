'use client';

import { MOMProvider } from '@/contexts/mom/MOMContext';
import '@/styles/mom-buttons.css';

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