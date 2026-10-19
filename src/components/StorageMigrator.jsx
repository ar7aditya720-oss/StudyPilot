import React, { useState, useEffect } from 'react';
import { Database, ArrowRight, X, Check } from 'lucide-react';
import { bulkCreateTasks } from '../lib/taskService';

export function StorageMigrator({ userId, onImportSuccess, notify }) {
  const [localTasks, setLocalTasks] = useState([]);
  const [dismissed, setDismissed] = useState(false);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    if (!userId) return;

    // Check if dismissed in this session
    if (sessionStorage.getItem('studypilot.migration_dismissed') === 'true') {
      setDismissed(true);
      return;
    }

    try {
      const v1 = JSON.parse(localStorage.getItem('studypilot.tasks.v1') || '[]');
      const v2 = JSON.parse(localStorage.getItem('studypilot.tasks.v2') || '[]');
      const raw = Array.isArray(v2) && v2.length ? v2 : Array.isArray(v1) && v1.length ? v1 : [];

      // Filter out seed/empty items
      const valid = raw.filter((t) => t && t.title && t.title.trim().length > 0);
      if (valid.length > 0) {
        setLocalTasks(valid);
      }
    } catch (e) {
      console.warn('Could not inspect local storage for migration:', e);
    }
  }, [userId]);

  if (dismissed || !localTasks.length || !userId) {
    return null;
  }

  const handleImport = async () => {
    try {
      setImporting(true);
      const imported = await bulkCreateTasks(localTasks, userId);
      // Clean old local keys safely
      localStorage.removeItem('studypilot.tasks.v1');
      localStorage.removeItem('studypilot.tasks.v2');
      sessionStorage.setItem('studypilot.migration_dismissed', 'true');
      setDismissed(true);
      if (onImportSuccess) {
        onImportSuccess(imported);
      }
      if (notify) {
        notify(`Successfully imported ${imported.length} tasks to your cloud account.`);
      }
    } catch (err) {
      console.error('Import failed:', err);
      if (notify) {
        notify('Failed to import tasks: ' + (err.message || 'Unknown error'));
      }
    } finally {
      setImporting(false);
    }
  };

  const handleDismiss = () => {
    sessionStorage.setItem('studypilot.migration_dismissed', 'true');
    setDismissed(true);
  };

  return (
    <div className="migration-banner">
      <div className="migration-content">
        <Database size={18} className="migration-icon" />
        <div className="migration-text">
          <b>Local tasks found</b>
          <span>
            We found {localTasks.length} task{localTasks.length > 1 ? 's' : ''} saved locally in this browser.
            Would you like to import them into your cloud account?
          </span>
        </div>
      </div>
      <div className="migration-actions">
        <button
          type="button"
          className="secondary btn-sm"
          onClick={handleDismiss}
          disabled={importing}
        >
          Keep Local
        </button>
        <button
          type="button"
          className="primary btn-sm"
          onClick={handleImport}
          disabled={importing}
        >
          {importing ? 'Importing...' : `Import ${localTasks.length} Tasks`}
        </button>
      </div>
    </div>
  );
}
