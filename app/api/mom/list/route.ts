import { NextRequest, NextResponse } from 'next/server';
import { getSheetData, isGoogleSheetsConfigured } from '@/lib/mom/google-sheets';
import { getMOMUser } from '@/lib/mom/auth-check';

export async function GET(request: Request) {
  console.log('[MOM List API] Request received');
  
  // Check authorization and get user info
  const userResult = await getMOMUser();
  console.log('[MOM List API] User result:', {
    hasError: !!userResult.error,
    userId: userResult.user?.id,
    userEmail: userResult.user?.email,
    userRole: userResult.user?.role
  });
  
  if (userResult.error) return userResult.error;
  const currentUser = userResult.user;
  
  try {
    // Check if Google Sheets is configured
    if (!isGoogleSheetsConfigured()) {
      console.log('[MOM List API] Google Sheets not configured, returning mock data');
      // Return mock data for demo
      return NextResponse.json({
        success: true,
        data: [
          {
            momId: 'MOM-2024-001',
            revision: 1,
            title: 'Sample Meeting Minutes',
            date: '2024-01-15',
            status: 'Draft',
            timestamp: new Date().toISOString(),
          },
        ],
      });
    }
    
    // **Google Sheets Eventual Consistency Handling**
    // Parse URL to check for retry parameter
    const url = new URL(request.url);
    const retryParam = url.searchParams.get('retry');
    const retryCount = retryParam ? parseInt(retryParam) : 0;
    
    // Add a small delay for retries to allow Google Sheets to propagate changes
    if (retryCount > 0) {
      await new Promise(resolve => setTimeout(resolve, 500 * retryCount));
    }

    // Get MOM list from Sheet1 (Status is in column E, CreatedBy in column G, Visibility in column H)
    console.log('[MOM List API] Fetching data from Google Sheets');
    const rows = await getSheetData('Sheet1!A2:H');
    console.log('[MOM List API] Sheet1 rows count:', rows?.length || 0);
    
    // Get detailed data from Sheet2 for translations
    const detailRows = await getSheetData('Sheet2!A:B');
    console.log('[MOM List API] Sheet2 rows count:', detailRows?.length || 0);
    
    // **DELETE BY STATUS FILTERING & USER FILTERING**: 
    // Filter out deleted MOMs and apply user-based filtering
    const momList = rows
      .filter((row: any[]) => {
        // Statusカラム（E列、インデックス4）に "Deleted" が含まれているものを除外
        const status = row[4] || 'Draft';
        if (status.includes('Deleted')) return false;
        
        // **VISIBILITY FILTERING**: 
        const createdBy = row[6] || ''; // G列（インデックス6）
        const visibility = row[7] || 'shared'; // H列（インデックス7）, default to shared
        
        // Adminユーザーは全て表示
        if (currentUser?.role === 'admin') {
          return true;
        }
        
        // Shared MOMs are visible to everyone
        if (visibility === 'shared') {
          return true;
        }
        
        // Private MOMs are only visible to creator
        if (visibility === 'private' && currentUser?.email === createdBy) {
          return true;
        }
        
        return false;
      })
      .map((row: any[]) => {
        const momId = row[0] || '';
        const revision = parseInt(row[1]) || 0;
        const momKey = `${momId}-${revision}`;
        
        // Find titleTranslations from Sheet2
        let titleTranslations;
        const detailRow = detailRows.find((dRow: any[]) => dRow[0] === momKey);
        if (detailRow && detailRow[1]) {
          try {
            const momData = JSON.parse(detailRow[1]);
            // Check if it's chunked data
            if (!momData._chunked && momData.titleTranslations) {
              titleTranslations = momData.titleTranslations;
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
        
        return {
          momId,
          revision,
          title: row[2] || '',
          titleTranslations,
          date: row[3] || '',
          status: row[4] || 'Draft',
          timestamp: row[5] || '',
          createdBy: row[6] || '', // Include createdBy field
          visibility: row[7] || 'shared', // Include visibility field
        };
      });

    console.log('[MOM List API] Returning MOM list:', {
      totalCount: momList.length,
      userRole: currentUser?.role,
      userEmail: currentUser?.email
    });
    
    const response = NextResponse.json({ success: true, data: momList });
    
    // Set cache headers to prevent caching
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    return response;
  } catch (error) {
    console.error('[MOM List API] Error fetching MOM list:', error);
    console.error('[MOM List API] Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      { success: false, error: 'Failed to fetch MOM list', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}