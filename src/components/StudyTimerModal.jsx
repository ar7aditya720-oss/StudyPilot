import React, { useState, useEffect, useRef } from 'react';
import { X, Play, Pause, RotateCcw, Check, Clock, BookOpen, AlertCircle, Loader2 } from 'lucide-react';
import { recordStudySession } from '../lib/studySessionService';

export function StudyTimerModal({ isOpen, onClose, userId, tasks = [], onSessionRecorded, notify }) {
  const [activeTab, setActiveTab] = useState('timer'); // 'timer' | 'manual'
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [sessionTitle, setSessionTitle] = useState('Focused Study Session');
  const [manualMinutes, setManualMinutes] = useState('30');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const timerRef = useRef(null);

  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning]);

  if (!isOpen) return null;

  const formatTimer = (totalSec) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleFinishTimer = async () => {
    if (seconds < 10) {
      setError('Please study for at least 10 seconds before recording a session.');
      return;
    }

    try {
      setSaving(true);
      setError('');
      setIsRunning(false);

      const durationMinutes = Math.max(1, Math.round(seconds / 60));
      const chosenTask = tasks.find((t) => t.id === selectedTaskId);
      const title = chosenTask ? chosenTask.title : sessionTitle;

      const ended = new Date();
      const started = new Date(ended.getTime() - seconds * 1000);

      const recorded = await recordStudySession({
        userId,
        taskId: selectedTaskId || null,
        title,
        durationMinutes,
        startedAt: started.toISOString(),
        endedAt: ended.toISOString(),
      });

      if (onSessionRecorded) {
        onSessionRecorded(recorded);
      }
      if (notify) {
        notify(`Logged ${durationMinutes} min study session!`);
      }
      setSeconds(0);
      onClose();
    } catch (err) {
      console.error('Failed to save study session:', err);
      setError(err.message || 'Could not save study session.');
    } finally {
      setSaving(false);
    }
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    const mins = parseFloat(manualMinutes);
    if (!mins || mins <= 0) {
      setError('Please enter a valid study duration in minutes.');
      return;
    }

    try {
      setSaving(true);
      setError('');
      const chosenTask = tasks.find((t) => t.id === selectedTaskId);
      const title = chosenTask ? chosenTask.title : sessionTitle;

      const ended = new Date();
      const started = new Date(ended.getTime() - mins * 60 * 1000);

      const recorded = await recordStudySession({
        userId,
        taskId: selectedTaskId || null,
        title,
        durationMinutes: mins,
        startedAt: started.toISOString(),
        endedAt: ended.toISOString(),
      });

      if (onSessionRecorded) {
        onSessionRecorded(recorded);
      }
      if (notify) {
        notify(`Logged ${mins} min study session!`);
      }
      onClose();
    } catch (err) {
      console.error('Failed to save manual study session:', err);
      setError(err.message || 'Could not save study session.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <div className="modal study-timer-modal">
        <div className="modal-head">
          <div>
            <div className="kicker">STUDY TIME TRACKER</div>
            <h3>Track Study Session</h3>
            <p>Record focused study hours for your weekly study report.</p>
          </div>
          <button
            type="button"
            className="icon-btn"
            onClick={onClose}
            disabled={saving}
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="timer-tab-bar">
          <button
            type="button"
            className={`timer-tab ${activeTab === 'timer' ? 'active' : ''}`}
            onClick={() => setActiveTab('timer')}
          >
            <Clock size={14} /> Live Focus Timer
          </button>
          <button
            type="button"
            className={`timer-tab ${activeTab === 'manual' ? 'active' : ''}`}
            onClick={() => setActiveTab('manual')}
          >
            <BookOpen size={14} /> Log Completed Time
          </button>
        </div>

        {error && (
          <div className="auth-error-alert" style={{ margin: '12px 0' }}>
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}

        {/* Task association dropdown */}
        <div style={{ margin: '14px 0' }}>
          <label style={{ fontSize: '10px', fontWeight: 600, color: '#565c70', display: 'grid', gap: '6px' }}>
            Select Task (Optional)
            <select
              value={selectedTaskId}
              onChange={(e) => setSelectedTaskId(e.target.value)}
              disabled={saving}
              style={{ width: '100%', padding: '9px 10px', fontSize: '10px', borderRadius: '7px', border: '1px solid #e4e5ef', background: '#fbfbfe' }}
            >
              <option value="">General Study (No specific task)</option>
              {tasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title} ({t.type})
                </option>
              ))}
            </select>
          </label>
        </div>

        {activeTab === 'timer' ? (
          <div className="timer-live-view">
            <div className="timer-display">
              <span className="timer-digits">{formatTimer(seconds)}</span>
              <small className="timer-status">
                {isRunning ? 'Focus in progress...' : seconds > 0 ? 'Timer paused' : 'Ready to start'}
              </small>
            </div>

            <div className="timer-controls">
              {!isRunning ? (
                <button
                  type="button"
                  className="primary btn-timer"
                  onClick={() => {
                    setIsRunning(true);
                    setError('');
                  }}
                  disabled={saving}
                >
                  <Play size={16} /> Start Focus
                </button>
              ) : (
                <button
                  type="button"
                  className="secondary btn-timer"
                  onClick={() => setIsRunning(false)}
                  disabled={saving}
                >
                  <Pause size={16} /> Pause
                </button>
              )}

              {seconds > 0 && (
                <>
                  <button
                    type="button"
                    className="primary btn-timer-finish"
                    onClick={handleFinishTimer}
                    disabled={saving}
                  >
                    {saving ? <Loader2 size={15} className="spin-icon" /> : <Check size={15} />}
                    Record Session
                  </button>
                  <button
                    type="button"
                    className="icon-btn"
                    title="Reset timer"
                    onClick={() => {
                      setIsRunning(false);
                      setSeconds(0);
                    }}
                    disabled={saving}
                  >
                    <RotateCcw size={15} />
                  </button>
                </>
              )}
            </div>
          </div>
        ) : (
          <form onSubmit={handleManualSubmit} style={{ marginTop: '10px' }}>
            <label style={{ fontSize: '10px', fontWeight: 600, color: '#565c70', display: 'grid', gap: '6px' }}>
              Study Time (Minutes)
              <input
                type="number"
                min="1"
                max="720"
                required
                value={manualMinutes}
                onChange={(e) => setManualMinutes(e.target.value)}
                disabled={saving}
                placeholder="e.g. 45"
                style={{ width: '100%', padding: '9px 10px', fontSize: '11px', borderRadius: '7px', border: '1px solid #e4e5ef', background: '#fbfbfe' }}
              />
            </label>

            <div className="modal-actions" style={{ marginTop: '16px' }}>
              <button type="button" className="secondary" onClick={onClose} disabled={saving}>
                Cancel
              </button>
              <button type="submit" className="primary" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 size={14} className="spin-icon" /> Saving...
                  </>
                ) : (
                  <>
                    <Check size={14} /> Log Study Session
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
