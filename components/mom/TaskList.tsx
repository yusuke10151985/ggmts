'use client';

import React, { useState, useEffect } from 'react';
import { Task } from '@/types/mom';

export default function TaskList() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'closed'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/tasks');
      const result = await response.json();
      
      if (result.success && result.data) {
        setTasks(result.data);
      }
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  // **TASK FILTERING**: Filter tasks by status and search term
  const filteredTasks = tasks.filter(task => {
    // Apply status filter
    if (statusFilter !== 'all' && task.status !== statusFilter) {
      return false;
    }

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        task.title.toLowerCase().includes(searchLower) ||
        task.momId.toLowerCase().includes(searchLower) ||
        task.actionId.toLowerCase().includes(searchLower)
      );
    }

    return true;
  });

  const updateTaskStatus = async (actionId: string, newStatus: 'open' | 'closed') => {
    const task = tasks.find(t => t.actionId === actionId);
    if (!task) return;

    const updatedTask = { ...task, status: newStatus, lastModified: new Date().toISOString() };
    
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks: [updatedTask] }),
      });

      if (response.ok) {
        setTasks(tasks.map(t => t.actionId === actionId ? updatedTask : t));
      }
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading tasks...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-6">Task Management</h2>

      {/* **TASK FILTERS**: Filter by status and search */}
      <div className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block mb-2 font-semibold">Search Tasks:</label>
            <input
              type="text"
              className="form-control"
              placeholder="Search by title, MOM ID, Action ID, or details..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div>
            <label className="block mb-2 font-semibold">Filter by Status:</label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="statusFilter"
                  value="all"
                  checked={statusFilter === 'all'}
                  onChange={() => setStatusFilter('all')}
                  className="mr-2"
                />
                All ({tasks.length})
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="statusFilter"
                  value="open"
                  checked={statusFilter === 'open'}
                  onChange={() => setStatusFilter('open')}
                  className="mr-2"
                />
                Open ({tasks.filter(t => t.status === 'open').length})
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="statusFilter"
                  value="closed"
                  checked={statusFilter === 'closed'}
                  onChange={() => setStatusFilter('closed')}
                  className="mr-2"
                />
                Closed ({tasks.filter(t => t.status === 'closed').length})
              </label>
            </div>
          </div>
        </div>

        <div className="text-sm text-gray-600">
          Showing {filteredTasks.length} tasks
        </div>
      </div>

      {/* **TASK LIST**: Display all tasks with MOM linkage */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Action ID
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                MOM ID
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Title
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Responsible
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Due Date
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredTasks.map(task => (
              <tr key={task.actionId} className="hover:bg-gray-50">
                <td className="px-4 py-3 whitespace-nowrap text-sm">
                  <span className="font-bold text-blue-600 font-mono text-base">{task.actionId}</span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm">
                  <span className="text-blue-600 font-mono">
                    {task.momId} Rev.{task.revision}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm">
                  <div>
                    <div className="font-bold text-blue-600 text-base">{task.title}</div>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className={`px-2 py-1 rounded-full text-sm font-bold ${
                    task.status === 'open' 
                      ? 'bg-red-100 text-red-600' 
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {task.status.toUpperCase()}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm">
                  {task.responsibleParties?.join(', ') || '-'}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm">
                  {task.dueDate || '-'}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm">
                  <button
                    className={`btn btn-sm ${
                      task.status === 'open' ? 'btn-secondary' : 'btn-success'
                    }`}
                    onClick={() => updateTaskStatus(
                      task.actionId, 
                      task.status === 'open' ? 'closed' : 'open'
                    )}
                  >
                    {task.status === 'open' ? 'Close' : 'Reopen'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredTasks.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No tasks found matching your criteria
          </div>
        )}
      </div>
    </div>
  );
}