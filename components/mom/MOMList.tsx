'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useMOM } from '@/contexts/mom/MOMContext';
import { loadMOM, deleteMOM, getMOMList } from '@/services/mom/api';
import { useClientLogger } from '@/hooks/mom/useClientLogger';
import { MOMListItem, MOM } from '@/types/mom';
import { 
  List, 
  RefreshCw, 
  Search, 
  Edit, 
  Copy, 
  Trash2,
  FileText,
  Calendar,
  Filter
} from 'lucide-react';

export default function MOMList() {
  const { state, dispatch } = useMOM();
  const { momList, loading, user } = state;
  const [isRefreshing, setIsRefreshing] = useState(false);
  const logger = useClientLogger('MOMList');
  
  // **GENERATE NEW MOM ID**: Create a unique MOM ID based on current date and time
  const generateNewMOMId = (): string => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    return `MOM-${year}-${month}${day}-${hours}${minutes}${seconds}`;
  };
  
  // **MOM LIST FILTERING**: State for search and filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    momId: '',
    revision: 'latest', // **DEFAULT TO LATEST**: Set Latest Revision as default
    title: '',
    date: '',
    status: 'all',
    createdBy: 'all', // **USER FILTER**: Filter by creator (admin only)
  });
  
  // **REFRESH MOM LIST**: Function to reload latest data from spreadsheet with retry logic
  const refreshMOMList = async (force = false, retryCount = 0) => {
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 1000; // 1 second
    
    try {
      // **リフレッシュ修正**: エラーハンドリングを改善し、確実にデータを取得
      setIsRefreshing(true);
      if (retryCount === 0) {
        dispatch({ type: 'SET_LOADING', payload: true });
      }
      
      // Force cache bypass by adding timestamp to request
      const timestamp = `?t=${Date.now()}&retry=${retryCount}`;
      const response = await fetch(`/api/mom/list${timestamp}`, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      const result = await response.json();
      
      if (result.success && result.data) {
        // **削除フィルタリング**: APIで既にフィルタリングされているが、念のため再度フィルタリング
        const filteredData = result.data.filter((item: any) => !item.status.includes('Deleted'));
        
        // **データ整合性チェック**: 前回のデータと比較して変更があるか確認
        const previousDataStr = JSON.stringify(momList.map(m => ({ id: m.momId, rev: m.revision, status: m.status })));
        const newDataStr = JSON.stringify(filteredData.map((m: any) => ({ id: m.momId, rev: m.revision, status: m.status })));
        
        // データが変わっていない場合、リトライ
        if (force && previousDataStr === newDataStr && retryCount < MAX_RETRIES) {
          console.log(`Data unchanged, retrying... (${retryCount + 1}/${MAX_RETRIES})`);
          setTimeout(() => {
            refreshMOMList(true, retryCount + 1);
          }, RETRY_DELAY);
          return;
        }
        
        dispatch({ type: 'SET_MOM_LIST', payload: filteredData });
        // **デバッグ用**: リフレッシュ成功をコンソールに出力
        console.log('[MOMList] Refreshed successfully:', filteredData.length, 'items', `(retry: ${retryCount})`);
      } else {
        if (retryCount < MAX_RETRIES) {
          console.log(`API error, retrying... (${retryCount + 1}/${MAX_RETRIES})`);
          setTimeout(() => {
            refreshMOMList(force, retryCount + 1);
          }, RETRY_DELAY);
          return;
        }
        dispatch({ type: 'SET_ERROR', payload: result.error || 'Failed to refresh MOM list' });
        console.error('Failed to refresh MOM list after retries:', result.error);
      }
    } catch (error) {
      if (retryCount < MAX_RETRIES) {
        console.log(`Network error, retrying... (${retryCount + 1}/${MAX_RETRIES})`);
        setTimeout(() => {
          refreshMOMList(force, retryCount + 1);
        }, RETRY_DELAY);
        return;
      }
      console.error('Error in refreshMOMList after retries:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Network error while refreshing MOM list' });
    } finally {
      if (retryCount === 0 || retryCount >= MAX_RETRIES) {
        dispatch({ type: 'SET_LOADING', payload: false });
        setIsRefreshing(false);
      }
    }
  };
  
  // **REAL-TIME UPDATE**: Load MOM list on component mount
  // Fetch latest data from spreadsheet when MOMList is displayed
  useEffect(() => {
    // **最新データ取得の改善**: コンポーネントが表示される度に必ず最新データを取得
    // これにより、他の画面から戻ってきた時も常に最新の状態が表示される
    console.log('MOMList mounted - fetching latest data');
    refreshMOMList(true); // Force fresh fetch on mount
    
    // **自動リフレッシュ**: 30秒ごとに自動的に最新データを取得
    const intervalId = setInterval(() => {
      refreshMOMList(true);
    }, 60000); // 60秒に変更（頻繁すぎるのを防ぐ）
    
    // クリーンアップ: コンポーネントがアンマウントされたら自動更新を停止
    return () => {
      clearInterval(intervalId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array means this runs once on mount

  // **MOM LIST FILTERING**: Filter MOMs based on search and filters
  const filteredMOMList = useMemo(() => {
    let filtered = [...momList];

    // Apply individual filters
    if (filters.momId) {
      filtered = filtered.filter(mom => 
        mom.momId.toLowerCase().includes(filters.momId.toLowerCase())
      );
    }
    
    // **REVISION FILTER LOGIC**: Handle 'latest' option
    if (filters.revision === 'latest') {
      // Group by MOM ID and keep only the highest revision
      const latestMOMs = new Map<string, MOMListItem>();
      filtered.forEach(mom => {
        const existing = latestMOMs.get(mom.momId);
        if (!existing || mom.revision > existing.revision) {
          latestMOMs.set(mom.momId, mom);
        }
      });
      filtered = Array.from(latestMOMs.values());
    }
    
    if (filters.title) {
      filtered = filtered.filter(mom => {
        const title = mom.title || '';
        const enTitle = mom.titleTranslations?.en || '';
        const jaTitle = mom.titleTranslations?.ja || '';
        const thTitle = mom.titleTranslations?.th || '';
        const searchLower = filters.title.toLowerCase();
        return title.toLowerCase().includes(searchLower) ||
               enTitle.toLowerCase().includes(searchLower) ||
               jaTitle.toLowerCase().includes(searchLower) ||
               thTitle.toLowerCase().includes(searchLower);
      });
    }
    
    if (filters.date) {
      filtered = filtered.filter(mom => mom.date === filters.date);
    }
    
    if (filters.status !== 'all') {
      filtered = filtered.filter(mom => mom.status === filters.status);
    }
    
    // **USER FILTER**: Filter by creator (admin only)
    if (filters.createdBy !== 'all' && user?.role === 'admin') {
      filtered = filtered.filter(mom => mom.createdBy === filters.createdBy);
    }

    // Apply global search
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(mom => {
        const title = mom.title || '';
        const enTitle = mom.titleTranslations?.en || '';
        const jaTitle = mom.titleTranslations?.ja || '';
        const thTitle = mom.titleTranslations?.th || '';
        return mom.momId.toLowerCase().includes(searchLower) ||
               mom.revision.toString().includes(searchLower) ||
               title.toLowerCase().includes(searchLower) ||
               enTitle.toLowerCase().includes(searchLower) ||
               jaTitle.toLowerCase().includes(searchLower) ||
               thTitle.toLowerCase().includes(searchLower) ||
               (mom.date || '').includes(searchLower) ||
               mom.status.toLowerCase().includes(searchLower);
      });
    }

    // Sort by MOM ID (desc) and revision (desc)
    filtered.sort((a, b) => {
      const idCompare = b.momId.localeCompare(a.momId);
      if (idCompare !== 0) return idCompare;
      return b.revision - a.revision;
    });

    return filtered;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [momList, searchTerm, filters]);

  const handleEdit = async (momId: string, revision: number) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    const response = await loadMOM(momId, revision);
    
    if (response.success && response.data) {
      dispatch({ type: 'SET_CURRENT_MOM', payload: response.data });
    } else {
      dispatch({ type: 'SET_ERROR', payload: response.error || 'Failed to load MOM' });
    }
    
    dispatch({ type: 'SET_LOADING', payload: false });
  };
  
  // **COPY NEW MOM**: Duplicate MOM as a new entry with new ID
  const handleCopyNewMOM = async (momId: string, revision: number) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    const response = await loadMOM(momId, revision);
    
    if (response.success && response.data) {
      const originalMOM = response.data;
      
      // Generate a unique new MOM ID
      const newMOMId = generateNewMOMId();
      
      // Store the new ID temporarily for use during save
      (window as any).__newMOMId = newMOMId;
      
      // Create a new MOM with Rev.0 and Draft status
      const newMOM: MOM = {
        ...originalMOM,
        momId: 'New MOM', // Display as "New MOM" in UI
        revision: 0,
        status: 'Draft',
        // Keep all other data from the original
      };
      
      // Set as current MOM for editing
      dispatch({ type: 'SET_CURRENT_MOM', payload: newMOM });
      
      // Mark as having unsaved changes
      dispatch({ type: 'SET_UNSAVED_CHANGES', payload: true });
      
      alert(`Copied from ${momId} Rev.${revision}. This will be saved as a new MOM when you click "Save Draft".`);
    } else {
      dispatch({ type: 'SET_ERROR', payload: response.error || 'Failed to copy MOM' });
    }
    
    dispatch({ type: 'SET_LOADING', payload: false });
  };

  const handleDelete = async (momId: string, revision: number) => {
    if (!confirm(`Are you sure you want to delete ${momId} Rev.${revision}?\n\nThis will mark it as deleted in the spreadsheet.`)) {
      return;
    }
    
    setIsRefreshing(true);
    const response = await deleteMOM(momId, revision);
    
    if (response.success) {
      alert(`Successfully deleted ${momId} Rev.${revision}`);
      
      // **即座にローカル状態を更新**: UIをすぐに更新するため、削除されたアイテムをフィルタ
      const updatedList = momList.filter(item => 
        !(item.momId === momId && item.revision === revision)
      );
      dispatch({ type: 'SET_MOM_LIST', payload: updatedList });
      
      // **バックグラウンドで同期**: サーバーの最新データと同期
      // 少し待ってからサーバーと同期（Google Sheetsの更新を待つため）
      setTimeout(async () => {
        try {
          await refreshMOMList(true);
          console.log('MOM list synced with server after deletion');
        } catch (error) {
          console.error('Error syncing after delete:', error);
          // エラーが発生してもUIは既に更新済みなので問題なし
        } finally {
          setIsRefreshing(false);
        }
      }, 2000); // 2秒後に同期
      
    } else {
      alert(response.error || 'Failed to delete MOM');
      setIsRefreshing(false);
    }
  };

  // **FIX FLICKERING**: Show loading only during refresh operations
  // Not during initial load since data is already loaded from parent
  // This prevents the UI from jumping between loading and content states

  if (!loading && momList.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400 mb-4">No MOMs found. Click &quot;New MOM&quot; to start.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Title and Refresh Button */}
      <div className="flex justify-between items-center">
        <h2 className="flex items-center gap-3 text-2xl font-bold text-gray-800 dark:text-gray-200">
          <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
            <List className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          MOM List
        </h2>
        
        <button 
          className={`flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border-2 border-blue-500 dark:border-blue-400 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-gray-700 transition-all duration-200 shadow-sm hover:shadow-md font-medium ${
            isRefreshing ? 'opacity-50 cursor-not-allowed' : ''
          }`}
          onClick={() => refreshMOMList(true)}
          disabled={isRefreshing}
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
        </button>
      </div>
      
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
          placeholder="Search all fields..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Filters */}
      <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filters</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <input
            type="text"
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Filter MOM ID"
            value={filters.momId}
            onChange={(e) => setFilters({...filters, momId: e.target.value})}
          />
          <select
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={filters.revision}
            onChange={(e) => setFilters({...filters, revision: e.target.value})}
          >
            <option value="">All Revisions</option>
            <option value="latest">Latest Revision</option>
          </select>
          <input
            type="text"
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Filter Title"
            value={filters.title}
            onChange={(e) => setFilters({...filters, title: e.target.value})}
          />
          <input
            type="date"
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={filters.date}
            onChange={(e) => setFilters({...filters, date: e.target.value})}
          />
          <select
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={filters.status}
            onChange={(e) => setFilters({...filters, status: e.target.value})}
          >
            <option value="all">All Status</option>
            <option value="Draft">Draft</option>
            <option value="Officially Issued">Officially Issued</option>
          </select>
          {/* Account Filter - Admin only */}
          {user?.role === 'admin' && (
            <select
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filters.createdBy}
              onChange={(e) => setFilters({...filters, createdBy: e.target.value})}
            >
              <option value="all">All Accounts</option>
              {/* Get unique creators from momList */}
              {Array.from(new Set(momList.map(m => m.createdBy).filter(Boolean))).map(email => (
                <option key={email} value={email}>{email}</option>
              ))}
            </select>
          )}
          <button
            className="px-3 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
            onClick={() => {
              setFilters({
                momId: '',
                revision: 'latest',
                title: '',
                date: '',
                status: 'all',
                createdBy: 'all',
              });
              setSearchTerm('');
            }}
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* MOM Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  MOM ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Rev
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                {user?.role === 'admin' && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Created By
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredMOMList.map((mom) => {
                // Check if this is the latest revision
                const latestRevision = Math.max(
                  ...momList
                    .filter(m => m.momId === mom.momId)
                    .map(m => m.revision)
                );
                const isLatestRevision = mom.revision === latestRevision;
                
                return (
                <tr key={`${mom.momId}-${mom.revision}`} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-blue-600 dark:text-blue-400 font-mono">
                      {mom.momId}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {mom.revision}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 dark:text-gray-100">
                      {mom.titleTranslations ? (
                        <div className="space-y-1">
                          <div><span className="font-semibold text-blue-600 dark:text-blue-400">EN:</span> {mom.titleTranslations.en || mom.title || 'Untitled'}</div>
                          <div><span className="font-semibold text-green-600 dark:text-green-400">JA:</span> {mom.titleTranslations.ja || '-'}</div>
                          <div><span className="font-semibold text-purple-600 dark:text-purple-400">TH:</span> {mom.titleTranslations.th || '-'}</div>
                        </div>
                      ) : (
                        mom.title || 'Untitled'
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 font-mono">
                      <Calendar className="w-4 h-4" />
                      {mom.date || 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      mom.status === 'Draft' 
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' 
                        : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    }`}>
                      {mom.status}
                    </span>
                  </td>
                  {user?.role === 'admin' && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {mom.createdBy || '-'}
                      </span>
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex gap-2">
                      <button
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                          isLatestRevision 
                            ? 'bg-blue-500 text-white hover:bg-blue-600 shadow-sm hover:shadow-md' 
                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        }`}
                        onClick={() => isLatestRevision && handleEdit(mom.momId, mom.revision)}
                        disabled={!isLatestRevision}
                        title={!isLatestRevision ? 'Only the latest revision can be edited' : 'Edit this MOM'}
                      >
                        <Edit className="w-3 h-3" />
                        Edit
                      </button>
                      
                      <button
                        className="flex items-center gap-1 px-3 py-1.5 bg-purple-500 text-white rounded-lg hover:bg-purple-600 text-sm font-medium transition-all duration-200 shadow-sm hover:shadow-md"
                        onClick={() => handleCopyNewMOM(mom.momId, mom.revision)}
                        title="Copy as new MOM"
                      >
                        <Copy className="w-3 h-3" />
                        Copy
                      </button>
                      
                      <button
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                          isLatestRevision 
                            ? 'bg-red-500 text-white hover:bg-red-600 shadow-sm hover:shadow-md' 
                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        }`}
                        onClick={() => isLatestRevision && handleDelete(mom.momId, mom.revision)}
                        disabled={!isLatestRevision}
                        title={!isLatestRevision ? 'Only the latest revision can be deleted' : 'Delete this MOM'}
                      >
                        <Trash2 className="w-3 h-3" />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {filteredMOMList.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No MOMs found matching your filters
          </div>
        )}
      </div>
    </div>
  );
}