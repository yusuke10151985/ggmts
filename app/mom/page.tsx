'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { MOMProvider } from '@/contexts/mom/MOMContext';
import MOMClientPage from './client-page';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Lock } from 'lucide-react';

export default function MOMPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session?.user) {
      setAuthorized(false);
      return;
    }

    // Check user role
    const userRole = (session.user as any).role;
    if (userRole === 'admin' || userRole === 'special') {
      setAuthorized(true);
    } else {
      setAuthorized(false);
    }
  }, [session, status]);

  // Loading state
  if (status === 'loading' || authorized === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <Card className="p-8">
          <div className="flex flex-col items-center">
            <Loader2 className="w-12 h-12 animate-spin text-purple-600 mb-4" />
            <p className="text-lg text-gray-600">Loading MOM Manager...</p>
          </div>
        </Card>
      </div>
    );
  }

  // Not logged in
  if (!session?.user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <Card className="p-8 max-w-md w-full">
          <div className="text-center">
            <Lock className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h2 className="text-2xl font-bold mb-2">Authentication Required</h2>
            <p className="text-gray-600 mb-6">
              You must be logged in to access MOM Manager
            </p>
            <Button 
              onClick={() => router.push('/')}
              className="w-full"
            >
              Go to Home Page
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Not authorized
  if (!authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <Card className="p-8 max-w-md w-full">
          <div className="text-center">
            <Lock className="w-16 h-16 mx-auto mb-4 text-red-400" />
            <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
            <p className="text-gray-600 mb-6">
              You must have Admin or Special privileges to access MOM Manager
            </p>
            <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg mb-6">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Current role: <span className="font-semibold">{(session.user as any).role || 'Free'}</span>
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Required: Admin or Special
              </p>
            </div>
            <Button 
              onClick={() => router.push('/')}
              className="w-full"
            >
              Go to Home Page
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Authorized - render MOM Manager
  const user = {
    id: (session.user as any).id || '',
    email: session.user.email || null,
    role: (session.user as any).role
  };

  return (
    <MOMProvider user={user}>
      <MOMClientPage />
    </MOMProvider>
  );
}