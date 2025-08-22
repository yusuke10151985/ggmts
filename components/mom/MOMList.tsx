'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useMOM } from '@/contexts/mom/MOMContext';
import { loadMOM, deleteMOM, getMOMList } from '@/services/mom/api';
import { MOMListItem, MOM } from '@/types/mom';
import { FaListAlt } from 'react-icons/fa';

export default function MOMList() {
  const { state, dispatch } = useMOM();
  const { momList, loading } = state;
  const [isRefreshing, setIsRefreshing] = useState(false);
  
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
        console.log('MOM List refreshed successfully:', filteredData.length, 'items', `(retry: ${retryCount})`);
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
        const searchLower = filters.title.toLowerCase();
        return (
          (mom.title || '').toLowerCase().includes(searchLower) ||
          (mom.titleTranslations?.en || '').toLowerCase().includes(searchLower) ||
          (mom.titleTranslations?.ja || '').toLowerCase().includes(searchLower) ||
          (mom.titleTranslations?.th || '').toLowerCase().includes(searchLower)
        );
      });
    }
    
    if (filters.date) {
      filtered = filtered.filter(mom => 
        (mom.date || '').includes(filters.date)
      );
    }
    
    if (filters.status !== 'all') {
      filtered = filtered.filter(mom => mom.status === filters.status);
    }

    // Apply global search
    if (searchTerm) {
      filtered = filtered.filter(mom => {
        const searchLower = searchTerm.toLowerCase();
        return (
          mom.momId.toLowerCase().includes(searchLower) ||
          mom.revision.toString().includes(searchLower) ||
          (mom.title || '').toLowerCase().includes(searchLower) ||
          (mom.titleTranslations?.en || '').toLowerCase().includes(searchLower) ||
          (mom.titleTranslations?.ja || '').toLowerCase().includes(searchLower) ||
          (mom.titleTranslations?.th || '').toLowerCase().includes(searchLower) ||
          (mom.date || '').toLowerCase().includes(searchLower) ||
          mom.status.toLowerCase().includes(searchLower)
        );
      });
    }

    return filtered;
  }, [momList, filters, searchTerm]);

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

  // **COPY NEW MOM**: Handle duplication of MOM as new entry
  const handleCopyNewMOM = async (momId: string, revision: number) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      // Load the source MOM
      const response = await loadMOM(momId, revision);
      
      if (response.success && response.data) {
        // Generate new MOM ID
        const newMomId = generateNewMOMId();
        
        // Create a copy with new ID, revision 0, and Draft status
        const copiedMOM: MOM = {
          ...response.data,
          momId: newMomId,
          revision: 0,
          status: 'Draft',
          previousRevisionData: undefined // Clear previous revision data
        };
        
        // Set as current MOM with "New MOM" marker
        const newMOM: MOM = {
          ...copiedMOM,
          momId: 'New MOM', // This triggers new MOM mode in MOMEditor
          revision: 0
        };
        
        // Store the intended new MOM ID for when it's saved
        (window as any).__newMOMId = newMomId;
        
        dispatch({ type: 'SET_CURRENT_MOM', payload: newMOM });
      } else {
        dispatch({ type: 'SET_ERROR', payload: response.error || 'Failed to load MOM for copying' });
      }
    } catch (error) {
      console.error('Error copying MOM:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to copy MOM' });
    }
    
    dispatch({ type: 'SET_LOADING', payload: false });
  };

  // **DELETE MOM**: Handle deletion of MOM records
  const handleDelete = async (momId: string, revision: number) => {
    if (!confirm(`Are you sure you want to delete ${momId} Rev.${revision}? This action cannot be undone.`)) {
      return;
    }

    setIsRefreshing(true);
    
    const response = await deleteMOM(momId, revision);
    
    if (response.success) {
      // **即座にUIを更新**: Google Sheetsの更新を待たずに、まずUIから削除
      const updatedList = momList.filter(m => !(m.momId === momId && m.revision === revision));
      dispatch({ type: 'SET_MOM_LIST', payload: updatedList });
      
      // Show success message immediately
      alert('MOM deleted successfully');
      
      // Add multiple retry attempts with increasing delays for Google Sheets propagation
      const refreshWithRetry = async () => {
        for (let i = 0; i < 5; i++) {
          await new Promise(resolve => setTimeout(resolve, 1500 * (i + 1))); // 1.5s, 3s, 4.5s, 6s, 7.5s
          
          const response = await fetch(`/api/mom/list?t=${Date.now()}&retry=${i}`, {
            method: 'GET',
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0'
            }
          });
          
          const result = await response.json();
          
          if (result.success && result.data) {
            const filteredData = result.data.filter((item: any) => !item.status.includes('Deleted'));
            
            // Check if the deleted item is actually gone
            const deletedItemStillExists = filteredData.some((item: any) => 
              item.momId === momId && item.revision === revision
            );
            
            if (!deletedItemStillExists) {
              // Successfully deleted, update the list
              dispatch({ type: 'SET_MOM_LIST', payload: filteredData });
              console.log(`MOM deleted and confirmed after ${i + 1} attempts`);
              break;
            }
          }
        }
      };
      
      // Run the refresh in the background
      refreshWithRetry().finally(() => {
        setIsRefreshing(false);
      });
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
        <p className="text-gray-500 mb-4">No MOMs found. Click &quot;Create MOM&quot; to start.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="flex items-center gap-2">
          <FaListAlt className="text-2xl text-blue-600" />
          MOM List
        </h2>
        {/* **REFRESH BUTTON**: Manually refresh MOM List data */}
        <button 
          className="btn btn-primary flex items-center gap-2"
          onClick={() => refreshMOMList(true)}
          disabled={isRefreshing}
        >
          <svg className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
        </button>
      </div>
      
      {/* **MOM LIST SEARCH**: Global search bar */}
      <div className="mb-4">
        <input
          type="text"
          className="form-control"
          placeholder="Search all fields..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>


      {/* **MOM LIST FILTERS**: Column-specific filters */}
      <div className="mb-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
        <input
          type="text"
          className="form-control text-sm"
          placeholder="Filter MOM ID"
          value={filters.momId}
          onChange={(e) => setFilters({...filters, momId: e.target.value})}
        />
        {/* **REVISION FILTER WITH LABELS**: Show "All Revision" and "Latest Revision" */}
        <select
          className="form-control text-sm"
          value={filters.revision}
          onChange={(e) => setFilters({...filters, revision: e.target.value})}
        >
          <option value="">All Revision</option>
          <option value="latest">Latest Revision</option>
        </select>
        <input
          type="text"
          className="form-control text-sm"
          placeholder="Filter Title"
          value={filters.title}
          onChange={(e) => setFilters({...filters, title: e.target.value})}
        />
        <input
          type="date"
          className="form-control text-sm"
          placeholder="Filter Date"
          value={filters.date}
          onChange={(e) => setFilters({...filters, date: e.target.value})}
        />
        <select
          className="form-control text-sm"
          value={filters.status}
          onChange={(e) => setFilters({...filters, status: e.target.value})}
        >
          <option value="all">All Status</option>
          <option value="Draft">Draft</option>
          <option value="Officially Issued">Officially Issued</option>
        </select>
        <button
          className="btn btn-sm btn-secondary"
          onClick={() => {
            setSearchTerm('');
            setFilters({
              momId: '',
              revision: 'latest', // **RESET TO DEFAULT**: Keep Latest as default when clearing
              title: '',
              date: '',
              status: 'all',
            });
          }}
        >
          Clear Filters
        </button>
      </div>

      {/* Results count */}
      <div className="mb-2 text-sm text-gray-600">
        Showing {filteredMOMList.length} of {momList.length} MOMs
      </div>
      
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                MOM ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rev
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Title
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredMOMList.map((mom: MOMListItem) => {
              // **DISABLE OLD REVISION ACTIONS**: Check if this is the latest revision
              const latestRevision = Math.max(
                ...momList
                  .filter(m => m.momId === mom.momId)
                  .map(m => m.revision)
              );
              const isLatestRevision = mom.revision === latestRevision;
              
              return (
              <tr key={`${mom.momId}-${mom.revision}`} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-blue-600 font-mono">
                    {mom.momId}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {mom.revision}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900">
                    {mom.titleTranslations ? (
                      <div>
                        <div><span className="font-semibold text-blue-600">EN:</span> {mom.titleTranslations.en || mom.title || 'Untitled'}</div>
                        <div><span className="font-semibold text-green-600">JA:</span> {mom.titleTranslations.ja || '-'}</div>
                        <div><span className="font-semibold text-purple-600">TH:</span> {mom.titleTranslations.th || '-'}</div>
                      </div>
                    ) : (
                      mom.title || 'Untitled'
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500 font-mono">
                    {mom.date || 'N/A'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={mom.status === 'Draft' ? 'status-draft' : 'status-official'}>
                    {mom.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex gap-2">
                    <button
                      className={`btn btn-sm ${isLatestRevision ? 'btn-primary' : 'btn-disabled'}`}
                      onClick={() => isLatestRevision && handleEdit(mom.momId, mom.revision)}
                      disabled={!isLatestRevision}
                      title={!isLatestRevision ? 'Only the latest revision can be edited' : ''}
                    >
                      Edit
                    </button>
                    {/* **COPY NEW MOM**: Button to duplicate MOM as new entry */}
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={() => handleCopyNewMOM(mom.momId, mom.revision)}
                      title="Copy as new MOM"
                    >
                      Copy MOM
                    </button>
                    {/* **DELETE ACTION**: Button to delete MOM records - only for latest revision */}
                    <button
                      className={`btn btn-sm ${isLatestRevision ? 'btn-danger' : 'btn-disabled'}`}
                      onClick={() => isLatestRevision && handleDelete(mom.momId, mom.revision)}
                      disabled={!isLatestRevision}
                      title={!isLatestRevision ? 'Only the latest revision can be deleted' : ''}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
        
        {filteredMOMList.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No MOMs found matching your filters
          </div>
        )}
      </div>
    </div>
  );
}