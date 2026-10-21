import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  Sparkles,
  CalendarDays,
  LayoutDashboard,
  ListTodo,
  Plus,
  Search,
  UploadCloud,
  FileText,
  Clock3,
  AlertTriangle,
  Check,
  CheckCircle2,
  ArrowUpRight,
  Download,
  Trash2,
  X,
  BookOpen,
  Target,
  ChevronDown,
  SlidersHorizontal,
  FolderKanban,
  Cloud,
  Loader2,
  RefreshCw,
  User,
} from 'lucide-react';
import { TYPES, PRIORITIES, normalizeTask, uid } from './model';
import { analyzeWeek } from './planner';
import { useAuth } from './lib/auth';
import {
  fetchTasks,
  createTask,
  deleteTask,
  toggleTaskComplete,
} from './lib/taskService';
import {
  fetchUserPreferences,
  saveUserCapacity,
  saveWeeklyPlan,
  fetchLatestWeeklyPlan,
} from './lib/planService';
import { fetchUploadedFiles } from './lib/storageService';
import { fetchStudySessions, deleteStudySession } from './lib/studySessionService';
import { AuthScreen } from './components/AuthScreen';
import { ProfileMenu } from './components/ProfileMenu';
import { StorageMigrator } from './components/StorageMigrator';
import { DocumentManager } from './components/DocumentManager';
import { EditProfileModal } from './components/EditProfileModal';
import { UserProfileBadge } from './components/UserProfileBadge';
import { WeeklyStudyReport } from './components/WeeklyStudyReport';
import { StudyTimerModal } from './components/StudyTimerModal';
import { ProfileView } from './components/ProfileView';
import studyPilotLogo from './assets/studypilot-logo.jpg';

const emptyForm = {
  title: '',
  type: 'Assignment',
  dueDate: '',
  priority: 'Medium',
  totalUnits: 1,
  completedUnits: 0,
  unitLabel: 'questions',
  estimatedHours: 1,
  recurring: false,
  notes: '',
};

function getTimeGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function dateLabel(s) {
  if (!s) return 'No deadline';
  return new Date(s + 'T00:00:00').toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

function daysLeft(s) {
  if (!s) return 999;
  let a = new Date();
  a.setHours(0, 0, 0, 0);
  return Math.ceil((new Date(s + 'T00:00:00') - a) / 86400000);
}

function dueLabel(s) {
  if (!s) return 'No deadline';
  let d = daysLeft(s);
  return d < 0
    ? `${-d}d overdue`
    : d === 0
    ? 'Due today'
    : d === 1
    ? 'Due tomorrow'
    : `Due in ${d} days`;
}

function App() {
  const { user, profile, loading: authLoading, isConfigured } = useAuth();

  // Mode: Offline preview bypass if Supabase is unconfigured and user clicked continue offline
  const [offlineDemoMode, setOfflineDemoMode] = useState(false);

  // Core study data state
  const [tasks, setTasks] = useState([]);
  const [capacity, setCapacity] = useState(20);
  const [plan, setPlan] = useState(null);
  const [uploads, setUploads] = useState([]);
  const [studySessions, setStudySessions] = useState([]);

  // UI state
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [studyTimerOpen, setStudyTimerOpen] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('All tasks');
  const [form, setForm] = useState(emptyForm);
  const [modal, setModal] = useState(false);
  const [toast, setToast] = useState('');
  const [page, setPage] = useState('Dashboard');

  const capacityDebounceTimer = useRef(null);

  const notify = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2800);
  }, []);

  // Load user data on sign in
  useEffect(() => {
    if (!user) {
      if (offlineDemoMode) {
        // In offline demo mode, keep empty clean state without seed tasks
        setTasks([]);
        setUploads([]);
        setPlan(null);
        fetchStudySessions('local-user').then((res) => setStudySessions(res || []));
      }
      return;
    }

    let isMounted = true;
    async function loadUserData() {
      setLoadingData(true);
      try {
        const [userTasks, userPrefs, latestPlan, userFiles, userSessions] = await Promise.all([
          fetchTasks(user.id),
          fetchUserPreferences(user.id),
          fetchLatestWeeklyPlan(user.id),
          fetchUploadedFiles(user.id),
          fetchStudySessions(user.id),
        ]);

        if (isMounted) {
          setTasks(userTasks || []);
          if (userPrefs?.weeklyAvailableHours) {
            setCapacity(userPrefs.weeklyAvailableHours);
          }
          if (latestPlan) {
            setPlan(latestPlan);
          }
          setUploads(userFiles || []);
          setStudySessions(userSessions || []);
        }
      } catch (err) {
        console.error('Error loading study data:', err);
        if (isMounted) {
          notify('Notice: ' + (err.message || 'Could not load data from cloud.'));
        }
      } finally {
        if (isMounted) setLoadingData(false);
      }
    }

    loadUserData();

    return () => {
      isMounted = false;
    };
  }, [user, offlineDemoMode, notify]);

  // Derived metrics
  const pending = tasks.filter((t) => t.completedUnits < t.totalUnits);
  const done = tasks.length - pending.length;
  const total = tasks.reduce((s, t) => s + t.totalUnits, 0);
  const completed = tasks.reduce(
    (s, t) => s + Math.min(t.completedUnits, t.totalUnits),
    0
  );
  const pct = total ? Math.round((completed / total) * 100) : 0;
  const urgent = pending.filter(
    (t) => t.dueDate && daysLeft(t.dueDate) >= 0 && daysLeft(t.dueDate) <= 2
  ).length;

  const shown = useMemo(() => {
    return tasks.filter((t) => {
      const matchText = `${t.title} ${t.type} ${t.notes}`.toLowerCase();
      const matchQuery = matchText.includes(query.toLowerCase());
      if (!matchQuery) return false;

      if (filter === 'All tasks') return true;
      if (filter === 'High priority') return t.priority === 'High';
      if (filter === 'Due soon') {
        const d = daysLeft(t.dueDate);
        return t.dueDate && d >= 0 && d <= 3;
      }
      if (filter === 'Completed') return t.completedUnits >= t.totalUnits;
      return true;
    });
  }, [tasks, query, filter]);

  // Task Actions
  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;

    const normalized = normalizeTask(form);

    if (user && !offlineDemoMode) {
      try {
        setIsSyncing(true);
        const created = await createTask(normalized, user.id);
        setTasks((p) => [created, ...p]);
        notify('Task added to your cloud workspace.');
      } catch (err) {
        console.error('Create task error:', err);
        notify('Error saving task: ' + (err.message || 'Check database connection'));
        return;
      } finally {
        setIsSyncing(false);
      }
    } else {
      // Local fallback
      setTasks((p) => [normalized, ...p]);
      notify('Task added.');
    }

    setForm(emptyForm);
    setModal(false);
    setPlan(null);
  };

  const handleToggleTask = async (task) => {
    if (user && !offlineDemoMode) {
      try {
        setIsSyncing(true);
        const updated = await toggleTaskComplete(task);
        setTasks((prev) => prev.map((x) => (x.id === task.id ? updated : x)));
      } catch (err) {
        console.error('Toggle task error:', err);
        notify('Failed to update task: ' + err.message);
      } finally {
        setIsSyncing(false);
      }
    } else {
      const isDone = task.completedUnits >= task.totalUnits;
      const newUnits = isDone ? 0 : task.totalUnits;
      const completedAt = !isDone ? new Date().toISOString() : null;
      setTasks((prev) =>
        prev.map((x) =>
          x.id === task.id
            ? {
                ...x,
                completedUnits: newUnits,
                completedAt: completedAt,
              }
            : x
        )
      );
    }
    setPlan(null);
  };

  const handleDeleteTask = async (task) => {
    if (user && !offlineDemoMode) {
      try {
        setIsSyncing(true);
        await deleteTask(task.id);
        setTasks((prev) => prev.filter((x) => x.id !== task.id));
        notify('Task removed.');
      } catch (err) {
        console.error('Delete task error:', err);
        notify('Failed to delete task: ' + err.message);
      } finally {
        setIsSyncing(false);
      }
    } else {
      setTasks((prev) => prev.filter((x) => x.id !== task.id));
      notify('Task removed.');
    }
    setPlan(null);
  };

  // Capacity Slider Handler with Debounced Database Persistence
  const handleCapacityChange = (newVal) => {
    const hours = Math.max(1, Math.min(60, Number(newVal) || 20));
    setCapacity(hours);
    setPlan(null);

    if (user && !offlineDemoMode) {
      if (capacityDebounceTimer.current) {
        clearTimeout(capacityDebounceTimer.current);
      }
      capacityDebounceTimer.current = setTimeout(async () => {
        try {
          await saveUserCapacity(user.id, hours);
        } catch (err) {
          console.warn('Could not persist capacity preference:', err);
        }
      }, 600);
    }
  };

  // Weekly Workload Analyzer
  const handleAnalyze = async () => {
    const analyzed = analyzeWeek(tasks, capacity);
    setPlan(analyzed);

    if (user && !offlineDemoMode) {
      try {
        setIsSyncing(true);
        await saveWeeklyPlan(analyzed, user.id);
        notify('Weekly workload analyzed and saved to cloud.');
      } catch (err) {
        console.warn('Could not save plan snapshot:', err);
        notify('Weekly workload analyzed.');
      } finally {
        setIsSyncing(false);
      }
    } else {
      notify('Weekly workload analyzed.');
    }
  };

  // Export Plan to Text File
  const handleExportPlan = () => {
    if (!plan) return;
    const txt = [
      'StudyPilot Weekly Plan',
      `Date: ${new Date().toLocaleDateString()}`,
      `Available Capacity: ${plan.capacityHours} hours`,
      `Estimated Workload: ${plan.requestedHours} hours`,
      `Allocated Study Time: ${plan.allocatedHours} hours`,
      `Unscheduled Load: ${plan.overloadHours} hours`,
      '',
      '--- Recommended Task Allocations ---',
      ...plan.allocations.map(
        (a, i) =>
          `${i + 1}. [${a.type}] ${a.title} — ${a.hours}h allocated (remaining: ${a.remainingHours}h) | Priority: ${a.priority} | Due: ${a.dueDate || 'No deadline'}`
      ),
      '',
      ...(plan.warnings && plan.warnings.length
        ? ['--- Workload Warnings ---', ...plan.warnings.map((w) => '• WARNING: ' + w), '']
        : []),
      'Generated by StudyPilot Academic Workload Analyzer',
    ].join('\n');

    const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `studypilot-weekly-plan-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    notify('Plan exported as text file.');
  };

  const handleDeleteSession = async (sessionId) => {
    try {
      await deleteStudySession(sessionId, user?.id);
      setStudySessions((prev) => prev.filter((s) => s.id !== sessionId));
      notify('Study session removed.');
    } catch (err) {
      console.error('Failed to delete study session:', err);
      notify('Could not remove session.');
    }
  };

  // Loading Screen during Auth Check
  if (authLoading) {
    return (
      <div className="loading-screen">
        <Loader2 size={32} className="spin-icon" style={{ color: '#7765e8' }} />
        <span>Restoring your StudyPilot workspace...</span>
      </div>
    );
  }

  // Unauthenticated Gated Screen
  if (!user && !offlineDemoMode) {
    return (
      <AuthScreen
        onContinueOffline={() => setOfflineDemoMode(true)}
      />
    );
  }

  const isCloudConnected = Boolean(user && !offlineDemoMode);
  const displayName =
    profile?.display_name ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split('@')[0] ||
    'Student';

  return (
    <div className="app">
      {/* Sidebar */}
      <aside className="sidebar">
        <div
          className="brand"
          onClick={() => setPage('Dashboard')}
          style={{ cursor: 'pointer' }}
          title="StudyPilot Dashboard"
        >
          <div className="brand-logo">
            <img src={studyPilotLogo} alt="StudyPilot logo" className="brand-logo-img" />
          </div>
          <div>
            <b>StudyPilot</b>
            <small>YOUR ACADEMIC COPILOT</small>
          </div>
        </div>

        <div className="nav-label">WORKSPACE</div>
        <button
          type="button"
          className={`nav ${page === 'Dashboard' ? 'selected' : ''}`}
          onClick={() => setPage('Dashboard')}
        >
          <LayoutDashboard size={17} />
          Dashboard
        </button>
        <button
          type="button"
          className={`nav ${page === 'My workload' ? 'selected' : ''}`}
          onClick={() => {
            setPage('My workload');
            setFilter('All tasks');
          }}
        >
          <ListTodo size={17} />
          My workload
          <span className="nav-count">{pending.length}</span>
        </button>
        <button
          type="button"
          className={`nav ${page === 'Profile' ? 'selected' : ''}`}
          onClick={() => setPage('Profile')}
        >
          <User size={17} />
          Profile & Report
        </button>
        <button type="button" className="nav" onClick={() => setModal(true)}>
          <Plus size={17} />
          Add task
        </button>

        <div className="side-divider" />

        <div className="nav-label">YOUR PROGRESS</div>
        <div className="side-progress">
          <div className="side-progress-title">
            Weekly completion <CheckCircle2 size={15} />
          </div>
          <div className="side-percent">
            {pct}
            <small>%</small>
          </div>
          <div className="track">
            <i style={{ width: `${pct}%` }} />
          </div>
          <small>
            {completed} of {total} units completed
          </small>
        </div>

        <div className="side-bottom">
          <div className="sparkle-box">
            <Sparkles size={17} />
          </div>
          <div>
            <b>Your week, under control.</b>
            <small>Small steps. Consistent progress.</small>
          </div>
        </div>

        {/* Profile with Sign Out & Edit */}
        <div className="profile">
          <ProfileMenu
            onEditProfile={() => setEditProfileOpen(true)}
            onViewProfile={() => setPage('Profile')}
            onExitDemo={() => setOfflineDemoMode(false)}
          />
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main">
        {/* Topbar */}
        <header className="topbar">
          <div className="crumb">
            Workspace <span>/</span> <b>{page}</b>
          </div>
          <div className="top-right">
            {isCloudConnected ? (
              <span className={`cloud-pill ${isSyncing ? 'syncing' : ''}`}>
                {isSyncing ? (
                  <Loader2 size={11} className="spin-icon" />
                ) : (
                  <i className="green-dot" />
                )}
                {isSyncing ? 'Synchronizing...' : 'Supabase Cloud'}
              </span>
            ) : (
              <span className="local-pill">
                <i />
                Local Demo Mode
              </span>
            )}
            <ProfileMenu
              compact
              onEditProfile={() => setEditProfileOpen(true)}
              onViewProfile={() => setPage('Profile')}
              onExitDemo={() => setOfflineDemoMode(false)}
            />
          </div>
        </header>

        {/* Content Container */}
        <div className="content">
          {/* Legacy Browser Storage Migration Banner (Requires explicit user confirmation) */}
          {user && (
            <StorageMigrator
              userId={user.id}
              onImportSuccess={(newTasks) => setTasks((p) => [...newTasks, ...p])}
              notify={notify}
            />
          )}

          {/* Welcome Banner */}
          <div className="welcome">
            <div className="welcome-top-row">
              <div>
                <div className="eyebrow">YOUR ACADEMIC COMMAND CENTER</div>
                <h1>
                  {getTimeGreeting()}, <em>{displayName}!</em>
                </h1>
                <p>Your workload, deadlines and study goals — brought into one clear plan.</p>
              </div>
              <UserProfileBadge
                onEditProfile={() => setEditProfileOpen(true)}
                onViewProfile={() => setPage('Profile')}
              />
            </div>
            <div className="date-chip">
              <CalendarDays size={16} /> Week of{' '}
              {new Date().toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
              })}
            </div>
          </div>

          {page === 'Profile' ? (
            <ProfileView
              tasks={tasks}
              sessions={studySessions}
              onEditProfile={() => setEditProfileOpen(true)}
              onOpenTimer={() => setStudyTimerOpen(true)}
              onDeleteSession={handleDeleteSession}
              onNavigateWorkload={() => {
                setPage('My workload');
                setFilter('All tasks');
              }}
            />
          ) : (
            <>
              {/* Hero Banner */}
              <section className="hero">
                <div className="hero-copy">
              <div className="hero-label">
                <Sparkles size={14} /> STUDYPILOT WEEKLY ANALYZER
              </div>
              <h2>
                Know what matters.
                <br />
                <em>Focus on what’s next.</em>
              </h2>
              <p>
                Analyze deadlines, workload and your personal priorities to build a realistic weekly study plan.
              </p>
              <div className="hero-buttons">
                <button type="button" className="primary" onClick={handleAnalyze}>
                  <Sparkles size={16} />
                  Analyze this week
                  <ArrowUpRight size={15} />
                </button>
                <button type="button" className="secondary" onClick={() => setModal(true)}>
                  <Plus size={16} />
                  Add a task
                </button>
              </div>
            </div>
            <div className="hero-art">
              <div className="ring ring1" />
              <div className="ring ring2" />
              <div className="calendar-art">
                <CalendarDays size={30} />
              </div>
              <div className="float float1">
                <CheckCircle2 size={18} />
                <span>
                  <b>Plan with purpose</b>
                  <small>Deadlines + priorities</small>
                </span>
              </div>
              <div className="float float2">
                <div className="bars">
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                </div>
                <span>
                  <b>Stay on track</b>
                  <small>Progress that adapts</small>
                </span>
              </div>
            </div>
          </section>

          {/* 4 Stats Cards */}
          <section className="stats">
            <Stat
              icon={<ListTodo />}
              tone="violet"
              label="Pending tasks"
              value={pending.length}
              caption="Across your workload"
            />
            <Stat
              icon={<AlertTriangle />}
              tone="orange"
              label="Coming up soon"
              value={urgent}
              caption="Due within 2 days"
            />
            <Stat
              icon={<CheckCircle2 />}
              tone="green"
              label="Completed units"
              value={`${completed}/${total}`}
              caption="Questions, topics, milestones"
            />
            <Stat
              icon={<Clock3 />}
              tone="blue"
              label="Weekly capacity"
              value={`${capacity}h`}
              caption="Time available to study"
            />
          </section>

          {/* Weekly Study Report */}
          <WeeklyStudyReport
            tasks={tasks}
            sessions={studySessions}
            onOpenTimer={() => setStudyTimerOpen(true)}
          />

          {/* Main 2-Column Grid */}
          <section className="columns">
            {/* Left Column: Workload Panel */}
            <div className="panel workload">
              <div className="panel-head">
                <div>
                  <div className="kicker">YOUR INPUTS</div>
                  <h3>Academic workload</h3>
                  <p>Everything that needs your attention, in one place.</p>
                </div>
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => setModal(true)}
                  aria-label="Add task"
                >
                  <Plus size={18} />
                </button>
              </div>

              <div className="toolbar">
                <div className="search">
                  <Search size={16} />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search your workload..."
                  />
                </div>
                <select value={filter} onChange={(e) => setFilter(e.target.value)}>
                  <option>All tasks</option>
                  <option>High priority</option>
                  <option>Due soon</option>
                  <option>Completed</option>
                </select>
              </div>

              <div className="tasks">
                {shown.map((t) => (
                  <div className="task" key={t.id}>
                    <button
                      type="button"
                      className={`task-check ${
                        t.completedUnits >= t.totalUnits ? 'checked' : ''
                      }`}
                      onClick={() => handleToggleTask(t)}
                      aria-label="Toggle complete"
                    >
                      {t.completedUnits >= t.totalUnits && <Check size={13} />}
                    </button>
                    <div className="task-info">
                      <div className="task-title">
                        <b>{t.title}</b>
                        {t.recurring && <span className="recurring">RECURRING</span>}
                      </div>
                      <div className="meta">
                        {t.type}
                        <i /> {t.completedUnits}/{t.totalUnits} {t.unitLabel}
                        <i /> {t.estimatedHours}h est.
                      </div>
                      <div className="mini-track">
                        <i
                          style={{
                            width: `${Math.min(
                              100,
                              (t.completedUnits / t.totalUnits) * 100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                    <div className="task-right">
                      <span className={`priority ${t.priority.toLowerCase()}`}>
                        {t.priority}
                      </span>
                      <small
                        className={
                          t.dueDate && daysLeft(t.dueDate) <= 2 ? 'due' : ''
                        }
                      >
                        {dueLabel(t.dueDate)}
                      </small>
                    </div>
                    <button
                      type="button"
                      className="delete"
                      title="Delete task"
                      onClick={() => handleDeleteTask(t)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}

                {/* Clean Empty State */}
                {!shown.length && (
                  <div className="empty">
                    <ListTodo size={26} />
                    {tasks.length === 0 ? (
                      <div className="clean-dashboard-prompt">
                        <b>Your workload is clear</b>
                        <span>
                          Start by adding an assignment, report, DSA goal, or exam topic.
                        </span>
                        <button
                          type="button"
                          className="primary btn-sm"
                          onClick={() => setModal(true)}
                        >
                          <Plus size={14} /> Add your first task
                        </button>
                      </div>
                    ) : (
                      <>
                        <b>No tasks matching filter</b>
                        <span>Try another filter or search query.</span>
                      </>
                    )}
                  </div>
                )}
              </div>

              {tasks.length > 0 && (
                <button
                  type="button"
                  className="view-all"
                  onClick={() => {
                    setFilter('All tasks');
                    setQuery('');
                  }}
                >
                  Clear filters <ArrowUpRight size={14} />
                </button>
              )}
            </div>

            {/* Right Column: Documents and Capacity Budget */}
            <div className="right-col">
              {/* Document Manager with Supabase Storage Integration */}
              <DocumentManager
                files={uploads}
                setFiles={setUploads}
                userId={user?.id}
                notify={notify}
                isOfflineMode={!isCloudConnected}
              />

              {/* Time Budget Panel */}
              <div className="panel capacity">
                <div className="panel-head">
                  <div>
                    <div className="kicker">TIME BUDGET</div>
                    <h3>Your study capacity</h3>
                    <p>How much time can you study this week?</p>
                  </div>
                  <div className="mini-icon violet">
                    <Clock3 size={18} />
                  </div>
                </div>

                <div className="capacity-value">
                  <b>{capacity}</b>
                  <span>hours / week</span>
                </div>

                <input
                  className="slider"
                  type="range"
                  min="1"
                  max="60"
                  value={capacity}
                  onChange={(e) => handleCapacityChange(e.target.value)}
                />
                <div className="slider-labels">
                  <span>1 hour</span>
                  <span>60 hours</span>
                </div>
                <div className="hint">
                  <Target size={14} />
                  The weekly plan will respect this time budget.
                </div>
              </div>
            </div>
          </section>

          {/* Weekly Analysis Plan Section */}
          {plan && (
            <section className="panel plan">
              <div className="panel-head">
                <div>
                  <div className="kicker">YOUR ANALYSIS</div>
                  <h3>This week’s recommended focus</h3>
                  <p>
                    Prioritized by deadline, importance, recurring goals and estimated effort.
                  </p>
                </div>
                <button
                  type="button"
                  className="secondary export"
                  onClick={handleExportPlan}
                >
                  <Download size={15} />
                  Export plan
                </button>
              </div>

              <div className="summary">
                {[
                  ['Estimated work', plan.requestedHours + 'h'],
                  ['Allocated', plan.allocatedHours + 'h'],
                  ['Available', plan.capacityHours + 'h'],
                  ['Unscheduled', plan.overloadHours + 'h'],
                ].map(([a, b]) => (
                  <div key={a}>
                    <span>{a}</span>
                    <b className={a === 'Unscheduled' && plan.overloadHours ? 'danger' : ''}>
                      {b}
                    </b>
                  </div>
                ))}
              </div>

              {plan.warnings &&
                plan.warnings.map((w, i) => (
                  <div className="warning" key={i}>
                    <AlertTriangle size={15} />
                    {w}
                  </div>
                ))}

              <div className="plan-list">
                {plan.allocations &&
                  plan.allocations.map((a, i) => (
                    <div className="plan-row" key={a.taskId || i}>
                      <span className="number">{String(i + 1).padStart(2, '0')}</span>
                      <div className="plan-name">
                        <b>{a.title}</b>
                        <small>
                          {a.type} ·{' '}
                          {a.dueDate
                            ? dueLabel(a.dueDate)
                            : a.recurring
                            ? 'Recurring goal'
                            : 'No deadline'}
                        </small>
                      </div>
                      <span className={`priority ${a.priority.toLowerCase()}`}>
                        {a.priority}
                      </span>
                      <b>{a.hours}h</b>
                    </div>
                  ))}

                {plan.allocations && !plan.allocations.length && (
                  <div className="empty">
                    <CheckCircle2 size={25} />
                    <b>You're all caught up!</b>
                    <span>Add more assignments or DSA goals to build your weekly schedule.</span>
                  </div>
                )}
              </div>

              <div className="plan-note">
                <Sparkles size={15} />
                This weekly plan prioritizes tasks and allocates hours based on your deadlines and importance scoring.
              </div>
            </section>
          )}
        </>
      )}

          {/* Footer */}
          <footer>
            <span>
              StudyPilot <i>·</i> Plan with purpose.
            </span>
            <span>
              {isCloudConnected ? (
                <>
                  <i className="green-dot" /> Cloud database & storage connected
                </>
              ) : (
                <>
                  <i className="green-dot" /> Preview mode · configure Supabase for cloud sync
                </>
              )}
            </span>
          </footer>
        </div>
      </main>

      {/* Add Task Modal */}
      {modal && (
        <div
          className="backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setModal(false);
          }}
        >
          <div className="modal">
            <div className="modal-head">
              <div>
                <div className="kicker">WORKLOAD INPUT</div>
                <h3>Add a task</h3>
                <p>Give StudyPilot enough context to plan your week.</p>
              </div>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setModal(false)}
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddTask}>
              <label>
                Task name
                <input
                  autoFocus
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Java assignment, Research report, DSA trees..."
                />
              </label>

              <div className="form2">
                <label>
                  Task type
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                  >
                    {TYPES.map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Importance
                  <select
                    value={form.priority}
                    onChange={(e) =>
                      setForm({ ...form, priority: e.target.value })
                    }
                  >
                    {PRIORITIES.map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="form2">
                <label>
                  Deadline
                  <input
                    type="date"
                    value={form.dueDate}
                    onChange={(e) =>
                      setForm({ ...form, dueDate: e.target.value })
                    }
                  />
                </label>
                <label>
                  Estimated total hours
                  <input
                    type="number"
                    min="0.25"
                    step="0.25"
                    value={form.estimatedHours}
                    onChange={(e) =>
                      setForm({ ...form, estimatedHours: e.target.value })
                    }
                  />
                </label>
              </div>

              <div className="form3">
                <label>
                  Total units
                  <input
                    type="number"
                    min="1"
                    value={form.totalUnits}
                    onChange={(e) =>
                      setForm({ ...form, totalUnits: e.target.value })
                    }
                  />
                </label>
                <label>
                  Completed
                  <input
                    type="number"
                    min="0"
                    value={form.completedUnits}
                    onChange={(e) =>
                      setForm({ ...form, completedUnits: e.target.value })
                    }
                  />
                </label>
                <label>
                  Unit label
                  <input
                    value={form.unitLabel}
                    onChange={(e) =>
                      setForm({ ...form, unitLabel: e.target.value })
                    }
                    placeholder="questions"
                  />
                </label>
              </div>

              <label className="check-label">
                <input
                  type="checkbox"
                  checked={form.recurring}
                  onChange={(e) =>
                    setForm({ ...form, recurring: e.target.checked })
                  }
                />
                Recurring goal (e.g. daily DSA practice)
              </label>

              <label>
                Notes (optional)
                <textarea
                  rows="2"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Extra details, dependencies or instructions..."
                />
              </label>

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="primary">
                  <Plus size={15} />
                  Save task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      <EditProfileModal
        isOpen={editProfileOpen}
        onClose={() => setEditProfileOpen(false)}
        notify={notify}
        tasks={tasks}
        sessions={studySessions}
        onOpenTimer={() => setStudyTimerOpen(true)}
      />

      {/* Study Session Timer Modal */}
      <StudyTimerModal
        isOpen={studyTimerOpen}
        onClose={() => setStudyTimerOpen(false)}
        userId={user?.id}
        tasks={tasks.filter((t) => t.completedUnits < t.totalUnits)}
        onSessionRecorded={(newSess) => setStudySessions((prev) => [newSess, ...prev])}
        notify={notify}
      />

      {/* Toast Notification */}
      {toast && (
        <div className="toast">
          <CheckCircle2 size={16} />
          {toast}
        </div>
      )}
    </div>
  );
}

function Stat({ icon, tone, label, value, caption }) {
  return (
    <div className="stat">
      <div className={`stat-icon ${tone}`}>
        {React.cloneElement(icon, { size: 18 })}
      </div>
      <div>
        <span>{label}</span>
        <b>{value}</b>
        <small>{caption}</small>
      </div>
    </div>
  );
}

export default App;
