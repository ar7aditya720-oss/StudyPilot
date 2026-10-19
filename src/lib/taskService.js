import { supabase } from './supabase';

/**
 * Transforms a PostgreSQL row to the frontend Task representation
 */
export function toCamelTask(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title || 'Untitled task',
    type: row.type || 'Assignment',
    dueDate: row.due_date ? String(row.due_date).slice(0, 10) : '',
    priority: row.priority || 'Medium',
    totalUnits: Number(row.total_units) || 1,
    completedUnits: Number(row.completed_units) || 0,
    unitLabel: row.unit_label || 'questions',
    estimatedHours: Number(row.estimated_hours) || 1,
    recurring: Boolean(row.recurring),
    notes: row.notes || '',
    completedAt: row.completed_at || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Transforms frontend Task to a PostgreSQL payload
 */
export function toSnakeTask(task, userId) {
  const total = Math.max(1, parseInt(task.totalUnits, 10) || 1);
  const completed = Math.min(total, Math.max(0, parseInt(task.completedUnits, 10) || 0));
  const hours = Math.max(0.25, parseFloat(task.estimatedHours) || 1);
  const cleanDate = task.dueDate && String(task.dueDate).trim() !== '' ? String(task.dueDate).trim().slice(0, 10) : null;
  const completedAt = task.completedAt || (completed >= total ? new Date().toISOString() : null);

  return {
    user_id: userId,
    title: String(task.title || '').trim(),
    type: task.type || 'Assignment',
    due_date: cleanDate,
    priority: ['High', 'Medium', 'Low'].includes(task.priority) ? task.priority : 'Medium',
    total_units: total,
    completed_units: completed,
    unit_label: String(task.unitLabel || 'questions').trim(),
    estimated_hours: hours,
    recurring: Boolean(task.recurring),
    notes: String(task.notes || '').trim(),
    completed_at: completedAt,
  };
}

/**
 * Fetch all tasks owned by the current authenticated user
 */
export async function fetchTasks(userId) {
  if (!supabase || !userId) return [];
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .order('due_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching tasks:', error);
    throw new Error(error.message || 'Failed to fetch tasks.');
  }

  return (data || []).map(toCamelTask);
}

/**
 * Create a new task in Supabase
 */
export async function createTask(task, userId) {
  if (!supabase || !userId) throw new Error('Not authenticated.');
  const payload = toSnakeTask(task, userId);

  const { data, error } = await supabase
    .from('tasks')
    .insert([payload])
    .select()
    .single();

  if (error) {
    console.error('Error creating task:', error);
    throw new Error(error.message || 'Failed to create task.');
  }

  return toCamelTask(data);
}

/**
 * Update an existing task in Supabase
 */
export async function updateTask(taskId, updates) {
  if (!supabase || !taskId) throw new Error('Task ID required.');

  const payload = {};
  if (updates.title !== undefined) payload.title = String(updates.title).trim();
  if (updates.type !== undefined) payload.type = updates.type;
  if (updates.dueDate !== undefined) payload.due_date = updates.dueDate ? String(updates.dueDate).slice(0, 10) : null;
  if (updates.priority !== undefined) payload.priority = updates.priority;
  if (updates.totalUnits !== undefined) payload.total_units = Math.max(1, parseInt(updates.totalUnits, 10) || 1);
  if (updates.completedUnits !== undefined) {
    payload.completed_units = Math.max(0, parseInt(updates.completedUnits, 10) || 0);
  }
  if (updates.unitLabel !== undefined) payload.unit_label = updates.unitLabel;
  if (updates.estimatedHours !== undefined) payload.estimated_hours = Math.max(0.25, parseFloat(updates.estimatedHours) || 1);
  if (updates.recurring !== undefined) payload.recurring = Boolean(updates.recurring);
  if (updates.notes !== undefined) payload.notes = updates.notes;
  if (updates.completedAt !== undefined) payload.completed_at = updates.completedAt;

  const { data, error } = await supabase
    .from('tasks')
    .update(payload)
    .eq('id', taskId)
    .select()
    .single();

  if (error) {
    console.error('Error updating task:', error);
    throw new Error(error.message || 'Failed to update task.');
  }

  return toCamelTask(data);
}

/**
 * Toggle task completion between 0 and totalUnits
 */
export async function toggleTaskComplete(task) {
  const isDone = task.completedUnits >= task.totalUnits;
  const newUnits = isDone ? 0 : task.totalUnits;
  const completedAt = !isDone ? new Date().toISOString() : null;

  return updateTask(task.id, {
    completedUnits: newUnits,
    completedAt: completedAt,
  });
}

/**
 * Delete a task in Supabase
 */
export async function deleteTask(taskId) {
  if (!supabase || !taskId) throw new Error('Task ID required.');
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId);

  if (error) {
    console.error('Error deleting task:', error);
    throw new Error(error.message || 'Failed to delete task.');
  }

  return true;
}

/**
 * Bulk create tasks (for migrating user's local tasks with explicit user confirmation)
 */
export async function bulkCreateTasks(taskList, userId) {
  if (!supabase || !userId) throw new Error('Not authenticated.');
  if (!taskList || !taskList.length) return [];

  const payloads = taskList.map((t) => toSnakeTask(t, userId));
  const { data, error } = await supabase
    .from('tasks')
    .insert(payloads)
    .select();

  if (error) {
    console.error('Error bulk importing tasks:', error);
    throw new Error(error.message || 'Failed to import local tasks.');
  }

  return (data || []).map(toCamelTask);
}
