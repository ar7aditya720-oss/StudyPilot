import React, { useState, useRef } from 'react';
import {
  X,
  User,
  Check,
  AlertCircle,
  Loader2,
  Sparkles,
  Upload,
  Trash2,
  Camera,
  Image as ImageIcon,
  CalendarDays,
  Clock,
  Target,
  Flame,
  CheckCircle2,
  Play,
  Layers,
} from 'lucide-react';
import { useAuth } from '../lib/auth';
import {
  getInitials,
  compressImage,
  getCurrentCalendarWeek,
  calculateWeeklyMetrics,
} from '../lib/profileUtils';
import studyPilotLogo from '../assets/studypilot-logo.jpg';

const AVATAR_PRESETS = [
  {
    id: 'preset-mascot',
    label: 'StudyPilot Mascot',
    url: studyPilotLogo,
  },
  {
    id: 'preset-scholar',
    label: 'Scholar',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'preset-student-m',
    label: 'Student',
    url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'preset-reader',
    label: 'Reader',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'preset-creative',
    label: 'Creative',
    url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'preset-bot',
    label: 'Pilot Bot',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=StudyPilot1',
  },
  {
    id: 'preset-minimal',
    label: 'Minimal',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=ScholarPro',
  },
];

export function EditProfileModal({
  isOpen,
  onClose,
  notify,
  tasks = [],
  sessions = [],
  onOpenTimer,
}) {
  const { profile, user, updateProfile } = useAuth();

  const currentName =
    profile?.display_name ||
    user?.user_metadata?.full_name ||
    user?.email?.split('@')[0] ||
    '';
  const currentCourse = profile?.course || '';
  const currentYear = profile?.academic_year || '';
  const currentAvatar = profile?.avatar_url || user?.user_metadata?.avatar_url || null;

  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'report'
  const [displayName, setDisplayName] = useState(currentName);
  const [course, setCourse] = useState(currentCourse);
  const [academicYear, setAcademicYear] = useState(currentYear);
  const [avatarUrl, setAvatarUrl] = useState(currentAvatar);
  const [customUrlInput, setCustomUrlInput] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [isProcessingImg, setIsProcessingImg] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const previewInitials = getInitials(displayName || 'Student');
  const weekInfo = getCurrentCalendarWeek();
  const weeklyMetrics = calculateWeeklyMetrics({
    tasks,
    sessions,
    weekRange: weekInfo,
  });

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (PNG, JPG, WebP, etc.).');
      return;
    }

    try {
      setIsProcessingImg(true);
      setError('');
      const compressedDataUrl = await compressImage(file, 256);
      setAvatarUrl(compressedDataUrl);
      setShowUrlInput(false);
    } catch (err) {
      console.error('Failed to process image:', err);
      setError(err.message || 'Could not process selected image.');
    } finally {
      setIsProcessingImg(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleApplyCustomUrl = (e) => {
    e.preventDefault();
    const cleanUrl = customUrlInput.trim();
    if (!cleanUrl) return;
    setAvatarUrl(cleanUrl);
    setShowUrlInput(false);
    setCustomUrlInput('');
  };

  const handleRemoveAvatar = () => {
    setAvatarUrl(null);
    setShowUrlInput(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanName = displayName.trim();

    if (!cleanName) {
      setError('Display name is required and cannot be empty.');
      return;
    }

    try {
      setSaving(true);
      setError('');
      await updateProfile({
        displayName: cleanName,
        course: course.trim(),
        academicYear: academicYear.trim(),
        avatarUrl: avatarUrl || null,
      });
      if (notify) {
        notify('Profile and photo updated successfully.');
      }
      onClose();
    } catch (err) {
      console.error('Failed to save profile:', err);
      setError(err.message || 'Could not save profile changes. Please try again.');
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
      <div className="modal profile-edit-modal">
        <div className="modal-head">
          <div>
            <div className="kicker">STUDENT PROFILE</div>
            <h3>User Profile & Weekly Report</h3>
            <p>Customize your profile photo, academic identity and review your weekly report.</p>
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

        {/* Modal Navigation Tabs */}
        <div className="timer-tab-bar" style={{ marginBottom: '16px' }}>
          <button
            type="button"
            className={`timer-tab ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <User size={14} /> Profile & Photo
          </button>
          <button
            type="button"
            className={`timer-tab ${activeTab === 'report' ? 'active' : ''}`}
            onClick={() => setActiveTab('report')}
          >
            <CalendarDays size={14} /> Report of the Week
          </button>
        </div>

        {error && (
          <div className="auth-error-alert" style={{ marginBottom: '14px' }}>
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}

        {/* TAB 1: Profile & Photo */}
        {activeTab === 'profile' && (
          <>
            {/* Live Profile & PFP Preview Card */}
            <div className="profile-preview-card">
              <div className="profile-preview-avatar-wrap" style={{ position: 'relative' }}>
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    className="profile-preview-avatar-img"
                    onError={() => setAvatarUrl(null)}
                  />
                ) : (
                  <div className="profile-preview-avatar">{previewInitials}</div>
                )}
                {isProcessingImg && (
                  <div className="avatar-loading-overlay">
                    <Loader2 size={16} className="spin-icon" />
                  </div>
                )}
              </div>

              <div className="profile-preview-info" style={{ flex: 1 }}>
                <b>{displayName.trim() || 'Your Name'}</b>
                <small>
                  {course.trim() || 'Student'}
                  {academicYear.trim() ? ` · ${academicYear.trim()}` : ' · StudyPilot'}
                </small>
                <div style={{ marginTop: '5px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="pfp-action-btn primary-pfp"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isProcessingImg || saving}
                  >
                    <Upload size={12} />
                    <span>Upload PFP</span>
                  </button>

                  <button
                    type="button"
                    className="pfp-action-btn"
                    onClick={() => setShowUrlInput(!showUrlInput)}
                    disabled={saving}
                  >
                    <ImageIcon size={12} />
                    <span>Image link</span>
                  </button>

                  {avatarUrl && (
                    <button
                      type="button"
                      className="pfp-action-btn danger-pfp"
                      onClick={handleRemoveAvatar}
                      disabled={saving}
                      title="Remove custom photo and use initials"
                    >
                      <Trash2 size={12} />
                      <span>Remove</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Hidden file input for device photo upload */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
            </div>

            {/* Custom URL Input Accordion */}
            {showUrlInput && (
              <div className="pfp-url-box">
                <input
                  type="url"
                  placeholder="Paste direct image URL (https://...)"
                  value={customUrlInput}
                  onChange={(e) => setCustomUrlInput(e.target.value)}
                />
                <button
                  type="button"
                  className="primary btn-sm"
                  onClick={handleApplyCustomUrl}
                  disabled={!customUrlInput.trim()}
                >
                  Set Photo
                </button>
              </div>
            )}

            {/* Avatar Preset Chips */}
            <div className="avatar-preset-section">
              <label className="pfp-presets-label">
                <Sparkles size={12} /> Or choose a student avatar preset:
              </label>
              <div className="avatar-presets-grid">
                {AVATAR_PRESETS.map((p) => {
                  const isSelected = avatarUrl === p.url;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      className={`avatar-preset-btn ${isSelected ? 'selected' : ''}`}
                      onClick={() => setAvatarUrl(p.url)}
                      title={p.label}
                    >
                      <img src={p.url} alt={p.label} />
                      {isSelected && (
                        <div className="preset-selected-check">
                          <Check size={10} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <form onSubmit={handleSubmit} style={{ marginTop: '14px' }}>
              <label>
                Display Name <span style={{ color: '#d85d70' }}>*</span>
                <input
                  type="text"
                  required
                  placeholder="e.g. Aditya"
                  value={displayName}
                  onChange={(e) => {
                    setDisplayName(e.target.value);
                    if (error) setError('');
                  }}
                  disabled={saving}
                />
              </label>

              <div className="form2">
                <label>
                  Course / Major (Optional)
                  <input
                    type="text"
                    placeholder="e.g. BCA, B.Tech CS, Economics"
                    value={course}
                    onChange={(e) => setCourse(e.target.value)}
                    disabled={saving}
                  />
                </label>

                <label>
                  Academic Year (Optional)
                  <input
                    type="text"
                    placeholder="e.g. 2nd Year, Semester 4"
                    value={academicYear}
                    onChange={(e) => setAcademicYear(e.target.value)}
                    disabled={saving}
                  />
                </label>
              </div>

              <div className="modal-actions" style={{ marginTop: '12px' }}>
                <button
                  type="button"
                  className="secondary"
                  onClick={onClose}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary"
                  disabled={saving || !displayName.trim()}
                >
                  {saving ? (
                    <>
                      <Loader2 size={14} className="spin-icon" /> Saving...
                    </>
                  ) : (
                    <>
                      <Check size={14} /> Save Profile & Photo
                    </>
                  )}
                </button>
              </div>
            </form>
          </>
        )}

        {/* TAB 2: Report of the Week */}
        {activeTab === 'report' && (
          <div className="modal-weekly-report-view">
            <div className="modal-report-header">
              <span className="week-range-chip">
                <CalendarDays size={13} /> {weekInfo.label}
              </span>
              {onOpenTimer && (
                <button
                  type="button"
                  className="primary btn-sm"
                  onClick={() => {
                    onClose();
                    onOpenTimer();
                  }}
                >
                  <Play size={12} /> Track Study Time
                </button>
              )}
            </div>

            {/* 4 Core Weekly Metrics in Modal */}
            <div className="report-metrics-grid" style={{ marginTop: '10px' }}>
              <div className="report-metric-card">
                <div className="report-metric-top">
                  <div className="mini-icon green">
                    <CheckCircle2 size={14} />
                  </div>
                  <span className="report-metric-title">Tasks completed</span>
                </div>
                <div className="report-metric-value">{weeklyMetrics.tasksCompletedCount}</div>
                <small className="report-metric-sub">
                  {weeklyMetrics.tasksCompletedCount === 1
                    ? '1 task completed this week'
                    : `${weeklyMetrics.tasksCompletedCount} tasks completed`}
                </small>
              </div>

              <div className="report-metric-card">
                <div className="report-metric-top">
                  <div className="mini-icon blue">
                    <Clock size={14} />
                  </div>
                  <span className="report-metric-title">Study time</span>
                </div>
                <div className="report-metric-value">
                  {weeklyMetrics.studyHours}
                  <small style={{ fontSize: '11px', color: '#8a90a3', marginLeft: '2px' }}>h</small>
                </div>
                <small className="report-metric-sub">
                  {weeklyMetrics.sessionsCount > 0
                    ? `${weeklyMetrics.sessionsCount} session${weeklyMetrics.sessionsCount > 1 ? 's' : ''}`
                    : 'No sessions logged yet'}
                </small>
              </div>

              <div className="report-metric-card">
                <div className="report-metric-top">
                  <div className="mini-icon violet">
                    <Target size={14} />
                  </div>
                  <span className="report-metric-title">Weekly goal %</span>
                </div>
                <div className="report-metric-value">
                  {weeklyMetrics.weeklyGoalPct}
                  <small style={{ fontSize: '11px', color: '#8a90a3', marginLeft: '2px' }}>%</small>
                </div>
                <div className="track" style={{ marginTop: '4px', height: '3px' }}>
                  <i style={{ width: `${Math.min(100, weeklyMetrics.weeklyGoalPct)}%` }} />
                </div>
              </div>

              <div className="report-metric-card">
                <div className="report-metric-top">
                  <div className="mini-icon orange">
                    <Flame size={14} />
                  </div>
                  <span className="report-metric-title">Active study days</span>
                </div>
                <div className="report-metric-value">
                  {weeklyMetrics.activeDaysCount}
                  <small style={{ fontSize: '11px', color: '#8a90a3', marginLeft: '2px' }}>/ 7d</small>
                </div>
                <small className="report-metric-sub">
                  {weeklyMetrics.activeDaysCount > 0 ? 'Consistent study' : 'Start studying today'}
                </small>
              </div>
            </div>

            {/* Activity Summary Lists */}
            <div className="modal-report-details" style={{ marginTop: '16px' }}>
              <div className="report-detail-column">
                <div className="report-subheading">
                  <CheckCircle2 size={13} style={{ color: '#289d6e' }} />
                  <b>Completed This Week ({weeklyMetrics.tasksCompletedCount})</b>
                </div>
                {weeklyMetrics.completedTasks && weeklyMetrics.completedTasks.length > 0 ? (
                  <ul className="modal-tasks-list">
                    {weeklyMetrics.completedTasks.map((t) => (
                      <li key={t.id} className="modal-task-item">
                        <span className="modal-task-title">{t.title}</span>
                        <span className="modal-task-badge">{t.type}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="modal-empty-hint">
                    No tasks marked completed yet this week.
                  </div>
                )}
              </div>

              <div className="report-detail-column" style={{ marginTop: '12px' }}>
                <div className="report-subheading">
                  <Clock size={13} style={{ color: '#2d7cd1' }} />
                  <b>Study Sessions Logged ({weeklyMetrics.sessionsCount})</b>
                </div>
                {weeklyMetrics.sessionsThisWeek && weeklyMetrics.sessionsThisWeek.length > 0 ? (
                  <ul className="modal-tasks-list">
                    {weeklyMetrics.sessionsThisWeek.map((s) => (
                      <li key={s.id} className="modal-task-item">
                        <span className="modal-task-title">{s.title || 'Focus Session'}</span>
                        <span className="modal-session-duration">
                          {s.durationMinutes} min
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="modal-empty-hint">
                    No focus sessions recorded yet this week.
                  </div>
                )}
              </div>
            </div>

            <div className="modal-actions" style={{ marginTop: '16px' }}>
              <button type="button" className="secondary" onClick={onClose}>
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
