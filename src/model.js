export const TYPES = [
  'Assignment',
  'Homework',
  'Report',
  'Project',
  'DSA',
  'Exam',
  'Other',
];

export const PRIORITIES = ['High', 'Medium', 'Low'];

export const uid = () => crypto.randomUUID();

// Clean dashboard start - no demo or seeded study records
export const seedTasks = [];

export function normalizeTask(t) {
  const total = Math.max(1, Number(t.totalUnits) || 1);
  return {
    ...t,
    id: t.id || uid(),
    title: String(t.title || 'Untitled task').trim(),
    type: t.type || 'Assignment',
    dueDate: t.dueDate || '',
    priority: ['High', 'Medium', 'Low'].includes(t.priority) ? t.priority : 'Medium',
    totalUnits: total,
    completedUnits: Math.min(total, Math.max(0, Number(t.completedUnits) || 0)),
    unitLabel: t.unitLabel || 'questions',
    estimatedHours: Math.max(0.25, Number(t.estimatedHours) || 1),
    recurring: !!t.recurring,
    notes: t.notes || '',
  };
}
