import React, { useMemo } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  Target,
  Flame,
  ArrowUpRight,
  Sparkles,
  Play,
  TrendingUp,
} from 'lucide-react';
import { getCurrentCalendarWeek, calculateWeeklyMetrics } from '../lib/profileUtils';

export function WeeklyStudyReport({
  tasks = [],
  sessions = [],
  onOpenTimer,
}) {
  const weekInfo = useMemo(() => getCurrentCalendarWeek(), []);

  const metrics = useMemo(() => {
    return calculateWeeklyMetrics({
      tasks,
      sessions,
      weekRange: weekInfo,
    });
  }, [tasks, sessions, weekInfo]);

  const {
    tasksCompletedCount,
    studyHours,
    sessionsCount,
    weeklyGoalPct,
    weeklyGoalsCount,
    completedGoalsCount,
    activeDaysCount,
  } = metrics;

  const hasAnyActivity =
    tasksCompletedCount > 0 ||
    parseFloat(studyHours) > 0 ||
    weeklyGoalPct > 0 ||
    activeDaysCount > 0;

  return (
    <div className="panel weekly-report-panel">
      <div className="panel-head">
        <div>
          <div className="kicker">WEEKLY PERFORMANCE</div>
          <h3>Weekly Study Report</h3>
          <p>Verified study progress and habit metrics for the current calendar week.</p>
        </div>
        <div className="weekly-report-head-right">
          <span className="week-range-chip">
            <CalendarDays size={13} /> {weekInfo.label}
          </span>
          {onOpenTimer && (
            <button
              type="button"
              className="primary btn-sm btn-record-study"
              onClick={onOpenTimer}
            >
              <Play size={13} />
              Track Study Time
            </button>
          )}
        </div>
      </div>

      <div className="report-metrics-grid">
        {/* Metric 1: Tasks Completed */}
        <div className="report-metric-card">
          <div className="report-metric-top">
            <div className="mini-icon green">
              <CheckCircle2 size={16} />
            </div>
            <span className="report-metric-title">Tasks completed</span>
          </div>
          <div className="report-metric-value">{tasksCompletedCount}</div>
          <small className="report-metric-sub">
            {tasksCompletedCount === 1
              ? '1 task completed this week'
              : `${tasksCompletedCount} tasks completed this week`}
          </small>
        </div>

        {/* Metric 2: Study Time */}
        <div className="report-metric-card">
          <div className="report-metric-top">
            <div className="mini-icon blue">
              <Clock size={16} />
            </div>
            <span className="report-metric-title">Study time</span>
          </div>
          <div className="report-metric-value">
            {studyHours}
            <small style={{ fontSize: '12px', fontWeight: 600, color: '#8a90a3', marginLeft: '3px' }}>
              hours
            </small>
          </div>
          <small className="report-metric-sub">
            {sessionsCount > 0
              ? `${sessionsCount} recorded session${sessionsCount > 1 ? 's' : ''}`
              : 'No study sessions logged yet'}
          </small>
        </div>

        {/* Metric 3: Weekly Goal Progress */}
        <div className="report-metric-card">
          <div className="report-metric-top">
            <div className="mini-icon violet">
              <Target size={16} />
            </div>
            <span className="report-metric-title">Weekly goal progress</span>
          </div>
          <div className="report-metric-value">
            {weeklyGoalPct}
            <small style={{ fontSize: '13px', fontWeight: 600, color: '#8a90a3', marginLeft: '2px' }}>
              %
            </small>
          </div>
          <div className="track" style={{ marginTop: '6px', height: '4px' }}>
            <i style={{ width: `${Math.min(100, weeklyGoalPct)}%` }} />
          </div>
          <small className="report-metric-sub" style={{ marginTop: '6px' }}>
            {weeklyGoalsCount > 0
              ? `${completedGoalsCount} of ${weeklyGoalsCount} weekly goals finished`
              : tasks.length > 0
              ? 'Based on all active tasks'
              : 'No goals set for this week'}
          </small>
        </div>

        {/* Metric 4: Active Study Days */}
        <div className="report-metric-card">
          <div className="report-metric-top">
            <div className="mini-icon orange">
              <Flame size={16} />
            </div>
            <span className="report-metric-title">Active study days</span>
          </div>
          <div className="report-metric-value">
            {activeDaysCount}
            <small style={{ fontSize: '12px', fontWeight: 600, color: '#8a90a3', marginLeft: '3px' }}>
              / 7 days
            </small>
          </div>
          <small className="report-metric-sub">
            {activeDaysCount > 0
              ? `${activeDaysCount} distinct day${activeDaysCount > 1 ? 's' : ''} with study activity`
              : 'No activity logged this week yet'}
          </small>
        </div>
      </div>

      {!hasAnyActivity && (
        <div className="report-empty-banner">
          <Sparkles size={16} />
          <span>
            No activity recorded this week yet. Complete a task or start a study timer to track your weekly progress!
          </span>
        </div>
      )}
    </div>
  );
}
