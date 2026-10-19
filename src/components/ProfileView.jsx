import React, { useMemo } from 'react';
import {
  User,
  GraduationCap,
  Calendar,
  Cloud,
  Edit3,
  Upload,
  Play,
  CheckCircle2,
  Clock,
  Sparkles,
  Award,
  ArrowRight,
  Trash2,
  BookOpen,
} from 'lucide-react';
import { useAuth } from '../lib/auth';
import {
  getInitials,
  getCurrentCalendarWeek,
  calculateWeeklyMetrics,
} from '../lib/profileUtils';
import { WeeklyStudyReport } from './WeeklyStudyReport';

export function ProfileView({
  tasks = [],
  sessions = [],
  onEditProfile,
  onOpenTimer,
  onDeleteSession,
  onNavigateWorkload,
}) {
  const { user, profile } = useAuth();

  const displayName =
    profile?.display_name ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split('@')[0] ||
    'Student';

  const course = profile?.course || '';
  const academicYear = profile?.academic_year || '';
  const email = user?.email || '';
  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url || null;
  const initials = getInitials(displayName);

  const weekInfo = useMemo(() => getCurrentCalendarWeek(), []);
  const weeklyMetrics = useMemo(() => {
    return calculateWeeklyMetrics({
      tasks,
      sessions,
      weekRange: weekInfo,
    });
  }, [tasks, sessions, weekInfo]);

  return (
    <div className="profile-view-wrapper">
      {/* 1. Profile Hero Section */}
      <section className="profile-hero-card">
        <div className="profile-hero-left">
          <div className="profile-hero-avatar-wrap">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayName}
                className="profile-hero-avatar-img"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <div className="profile-hero-avatar">{initials}</div>
            )}
            <button
              type="button"
              className="profile-avatar-edit-badge"
              onClick={onEditProfile}
              title="Change profile picture"
              aria-label="Change profile picture"
            >
              <Upload size={12} />
            </button>
          </div>

          <div className="profile-hero-main-info">
            <div className="profile-hero-title-row">
              <h2>{displayName}</h2>
              <span className="profile-status-badge">
                <Cloud size={11} /> Cloud Connected
              </span>
            </div>

            <div className="profile-hero-meta-grid">
              <div className="profile-meta-item">
                <GraduationCap size={14} />
                <span>
                  <b>Course:</b> {course || 'Not specified'}
                </span>
              </div>
              <div className="profile-meta-item">
                <BookOpen size={14} />
                <span>
                  <b>Academic Year:</b> {academicYear || 'Not specified'}
                </span>
              </div>
              <div className="profile-meta-item">
                <User size={14} />
                <span>
                  <b>Email:</b> {email || 'Local Student'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="profile-hero-actions">
          <button
            type="button"
            className="primary"
            onClick={onEditProfile}
          >
            <Edit3 size={15} /> Edit Profile & Photo
          </button>
        </div>
      </section>

      {/* 2. Personalized Weekly Study Report */}
      <section className="profile-weekly-report-section" style={{ marginTop: '24px' }}>
        <WeeklyStudyReport
          tasks={tasks}
          sessions={sessions}
          onOpenTimer={onOpenTimer}
        />
      </section>

      {/* 3. Detailed Weekly Activity Logs (Study Sessions & Completed Tasks) */}
      <section className="columns" style={{ marginTop: '20px' }}>
        {/* Left Column: Recorded Study Sessions This Week */}
        <div className="panel" style={{ flex: 1 }}>
          <div className="panel-head">
            <div>
              <div className="kicker">TIME TRACKING</div>
              <h3>This Week’s Study Sessions</h3>
              <p>Logged focus stopwatch and study sessions ({weeklyMetrics.sessionsCount} total).</p>
            </div>
            {onOpenTimer && (
              <button
                type="button"
                className="secondary btn-sm"
                onClick={onOpenTimer}
              >
                <Play size={13} /> Log Session
              </button>
            )}
          </div>

          <div className="profile-sessions-list">
            {weeklyMetrics.sessionsThisWeek && weeklyMetrics.sessionsThisWeek.length > 0 ? (
              weeklyMetrics.sessionsThisWeek.map((s) => {
                const sDate = new Date(s.startedAt);
                const timeString = !isNaN(sDate.getTime())
                  ? sDate.toLocaleDateString(undefined, {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'Recent session';

                return (
                  <div className="profile-session-item" key={s.id}>
                    <div className="profile-session-left">
                      <div className="mini-icon blue">
                        <Clock size={15} />
                      </div>
                      <div>
                        <b>{s.title || 'Focus Session'}</b>
                        <small>{timeString}</small>
                      </div>
                    </div>
                    <div className="profile-session-right">
                      <span className="session-duration-pill">
                        {s.durationMinutes} min
                      </span>
                      {onDeleteSession && (
                        <button
                          type="button"
                          className="delete"
                          title="Delete session"
                          onClick={() => onDeleteSession(s.id)}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="empty" style={{ padding: '24px 16px' }}>
                <Clock size={24} />
                <b>No study sessions logged this week</b>
                <span>Use the focus stopwatch or manual logger to record study hours.</span>
                {onOpenTimer && (
                  <button
                    type="button"
                    className="primary btn-sm"
                    style={{ marginTop: '8px' }}
                    onClick={onOpenTimer}
                  >
                    <Play size={13} /> Start First Study Session
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Tasks Completed This Week */}
        <div className="panel" style={{ flex: 1 }}>
          <div className="panel-head">
            <div>
              <div className="kicker">COMPLETED MILESTONES</div>
              <h3>Tasks Completed This Week</h3>
              <p>Assignments and goals checked off ({weeklyMetrics.tasksCompletedCount} finished).</p>
            </div>
            {onNavigateWorkload && (
              <button
                type="button"
                className="secondary btn-sm"
                onClick={onNavigateWorkload}
              >
                Workload <ArrowRight size={13} />
              </button>
            )}
          </div>

          <div className="profile-completed-tasks-list">
            {weeklyMetrics.completedTasks && weeklyMetrics.completedTasks.length > 0 ? (
              weeklyMetrics.completedTasks.map((t) => (
                <div className="profile-task-done-item" key={t.id}>
                  <div className="profile-task-left">
                    <div className="mini-icon green">
                      <CheckCircle2 size={15} />
                    </div>
                    <div>
                      <b>{t.title}</b>
                      <small>
                        {t.type} · {t.completedUnits}/{t.totalUnits} {t.unitLabel}
                        {t.estimatedHours ? ` · ${t.estimatedHours}h est.` : ''}
                      </small>
                    </div>
                  </div>
                  <span className={`priority ${t.priority.toLowerCase()}`}>
                    {t.priority}
                  </span>
                </div>
              ))
            ) : (
              <div className="empty" style={{ padding: '24px 16px' }}>
                <CheckCircle2 size={24} />
                <b>No tasks completed this week yet</b>
                <span>Complete assignments and milestones in your workload to see them here.</span>
                {onNavigateWorkload && (
                  <button
                    type="button"
                    className="secondary btn-sm"
                    style={{ marginTop: '8px' }}
                    onClick={onNavigateWorkload}
                  >
                    Go to My Workload
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
