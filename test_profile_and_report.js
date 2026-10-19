import { getInitials, getTimeGreeting, getCurrentCalendarWeek, calculateWeeklyMetrics } from './src/lib/profileUtils.js';

console.log('--- Testing Profile & Weekly Report Logic ---');

// 1. Initials tests
console.assert(getInitials('Aditya') === 'AD', 'Failed: Aditya should give AD');
console.assert(getInitials('Aditya Sharma') === 'AS', 'Failed: Aditya Sharma should give AS');
console.assert(getInitials('Aditya Kumar Sharma') === 'AS', 'Failed: 3-word name should give AS');
console.assert(getInitials('S') === 'S', 'Failed: S should give S');
console.assert(getInitials('') === 'S', 'Failed: Empty should fallback to S');
console.assert(getInitials(null) === 'S', 'Failed: null should fallback to S');
console.log('✓ getInitials passed all cases.');

// 2. Greeting tests
const morning = new Date('2026-10-19T09:00:00');
const afternoon = new Date('2026-10-19T14:00:00');
const evening = new Date('2026-10-19T20:00:00');
console.assert(getTimeGreeting(morning) === 'Good morning', 'Failed morning greeting');
console.assert(getTimeGreeting(afternoon) === 'Good afternoon', 'Failed afternoon greeting');
console.assert(getTimeGreeting(evening) === 'Good evening', 'Failed evening greeting');
console.log('✓ getTimeGreeting passed all cases.');

// 3. Calendar week range tests
const mondayTest = new Date('2026-10-19T12:00:00'); // Monday Oct 19, 2026
const week = getCurrentCalendarWeek(mondayTest);
console.assert(week.monday.getDay() === 1, 'Monday must be day 1');
console.assert(week.sunday.getDay() === 0, 'Sunday must be day 0');
const daysSpan = Math.round((week.sunday - week.monday) / (1000 * 60 * 60 * 24));
console.assert(daysSpan === 7, 'Week must span 7 calendar days from Monday 00:00 to Sunday 23:59');
console.log('✓ getCurrentCalendarWeek passed Monday-Sunday boundary check.');

// 4. Weekly metrics tests
// Case A: Clean Zero State
const emptyMetrics = calculateWeeklyMetrics({ tasks: [], sessions: [], weekRange: week });
console.assert(emptyMetrics.tasksCompletedCount === 0, 'Empty tasks count should be 0');
console.assert(emptyMetrics.studyHours === '0.0', 'Empty study hours should be 0.0');
console.assert(emptyMetrics.weeklyGoalPct === 0, 'Empty goal pct should be 0');
console.assert(emptyMetrics.activeDaysCount === 0, 'Empty active days should be 0');
console.log('✓ Zero state verified correctly.');

// Case B: Activity within current week
const sampleTasks = [
  {
    id: 't1',
    title: 'Completed DSA practice',
    completedUnits: 10,
    totalUnits: 10,
    completedAt: '2026-10-19T15:30:00.000Z',
    recurring: true,
  },
  {
    id: 't2',
    title: 'Pending assignment',
    completedUnits: 2,
    totalUnits: 5,
    dueDate: '2026-10-22',
  },
  {
    id: 't3',
    title: 'Past completed task from last month',
    completedUnits: 5,
    totalUnits: 5,
    completedAt: '2026-09-10T10:00:00.000Z',
  },
];

const sampleSessions = [
  {
    id: 's1',
    durationMinutes: 45,
    startedAt: '2026-10-19T14:00:00.000Z',
  },
  {
    id: 's2',
    durationMinutes: 60,
    startedAt: '2026-10-20T16:00:00.000Z',
  },
];

const activeMetrics = calculateWeeklyMetrics({ tasks: sampleTasks, sessions: sampleSessions, weekRange: week });
console.assert(activeMetrics.tasksCompletedCount === 1, 'Only t1 should be counted as completed this week');
console.assert(activeMetrics.totalMinutes === 105, 'Total minutes should be 45 + 60 = 105');
console.assert(activeMetrics.studyHours === '1.8', 'Study hours should be (105/60) = 1.8h');
console.assert(activeMetrics.activeDaysCount === 2, 'Active days should be 2 distinct dates (Oct 19, Oct 20)');
console.assert(activeMetrics.weeklyGoalsCount === 2, 'Weekly goals: t1 (recurring) + t2 (due Oct 22)');
console.assert(activeMetrics.completedGoalsCount === 1, '1 weekly goal completed (t1)');
console.assert(activeMetrics.weeklyGoalPct === 50, 'Goal progress should be 50%');
console.log('✓ Real weekly metrics calculation passed all test cases.');

console.log('=== All Profile & Weekly Report Tests Succeeded! ===');
