import { supabase } from './supabase';

/**
 * Returns Monday and Sunday for the current week in YYYY-MM-DD
 */
export function getCurrentWeekRange() {
  const now = new Date();
  const day = now.getDay(); // 0 is Sunday
  const diffToMonday = now.getDate() - day + (day === 0 ? -6 : 1);

  const monday = new Date(now.setDate(diffToMonday));
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return {
    weekStart: monday.toISOString().slice(0, 10),
    weekEnd: sunday.toISOString().slice(0, 10),
  };
}

/**
 * Fetch user study preferences (weekly capacity, timezone, etc.)
 */
export async function fetchUserPreferences(userId) {
  if (!supabase || !userId) return { weeklyAvailableHours: 20, timezone: 'Asia/Kolkata' };

  const { data, error } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching preferences:', error);
    return { weeklyAvailableHours: 20, timezone: 'Asia/Kolkata' };
  }

  if (!data) {
    return { weeklyAvailableHours: 20, timezone: 'Asia/Kolkata' };
  }

  return {
    weeklyAvailableHours: Number(data.weekly_available_hours) || 20,
    timezone: data.timezone || 'Asia/Kolkata',
    plannerSettings: data.planner_settings || {},
  };
}

/**
 * Upsert weekly study hours capacity in user_preferences
 */
export async function saveUserCapacity(userId, hours) {
  if (!supabase || !userId) return;

  const validHours = Math.max(1, Math.min(60, Number(hours) || 20));

  const { error } = await supabase
    .from('user_preferences')
    .upsert({
      user_id: userId,
      weekly_available_hours: validHours,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

  if (error) {
    console.warn('Could not save user capacity:', error.message);
  }
}

/**
 * Save a generated weekly plan and its items
 */
export async function saveWeeklyPlan(plan, userId) {
  if (!supabase || !userId || !plan) return null;

  const { weekStart, weekEnd } = getCurrentWeekRange();

  // 1. Insert parent weekly_plans row
  const planPayload = {
    user_id: userId,
    week_start: weekStart,
    week_end: weekEnd,
    total_available_hours: plan.capacityHours,
    total_allocated_hours: plan.allocatedHours,
    warnings: plan.warnings || [],
  };

  const { data: planRecord, error: planError } = await supabase
    .from('weekly_plans')
    .insert([planPayload])
    .select()
    .single();

  if (planError) {
    console.error('Error saving weekly plan:', planError);
    throw new Error(planError.message || 'Failed to save weekly plan.');
  }

  // 2. Insert plan_items rows if any
  if (plan.allocations && plan.allocations.length > 0) {
    const itemsPayload = plan.allocations.map((a, idx) => {
      // Check if taskId is a valid UUID
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(a.taskId);
      return {
        plan_id: planRecord.id,
        user_id: userId,
        task_id: isUuid ? a.taskId : null,
        title: a.title,
        type: a.type || 'Assignment',
        priority: a.priority || 'Medium',
        due_date: a.dueDate && a.dueDate.trim() !== '' ? a.dueDate.slice(0, 10) : null,
        recurring: Boolean(a.recurring),
        allocated_hours: a.hours,
        remaining_hours: a.remainingHours,
        rank: idx + 1,
        rationale: a.rationale || '',
      };
    });

    const { error: itemsError } = await supabase
      .from('plan_items')
      .insert(itemsPayload);

    if (itemsError) {
      console.warn('Warning: Could not save individual plan items:', itemsError.message);
    }
  }

  return planRecord;
}

/**
 * Fetch the user's latest saved weekly plan and allocations
 */
export async function fetchLatestWeeklyPlan(userId) {
  if (!supabase || !userId) return null;

  const { data: planRow, error: planError } = await supabase
    .from('weekly_plans')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (planError || !planRow) {
    return null;
  }

  // Fetch plan items
  const { data: items, error: itemsError } = await supabase
    .from('plan_items')
    .select('*')
    .eq('plan_id', planRow.id)
    .order('rank', { ascending: true });

  if (itemsError) {
    console.warn('Could not fetch plan items:', itemsError.message);
  }

  const allocations = (items || []).map((it) => ({
    taskId: it.task_id || it.id,
    title: it.title,
    type: it.type,
    priority: it.priority,
    dueDate: it.due_date ? String(it.due_date).slice(0, 10) : '',
    recurring: Boolean(it.recurring),
    hours: Number(it.allocated_hours),
    remainingHours: Number(it.remaining_hours),
  }));

  const requestedHours = allocations.reduce((sum, a) => sum + (a.remainingHours || a.hours), 0);
  const allocatedHours = Number(planRow.total_allocated_hours);
  const capacityHours = Number(planRow.total_available_hours);
  const overloadHours = Math.max(0, Math.round((requestedHours - capacityHours) * 4) / 4);

  return {
    id: planRow.id,
    capacityHours,
    requestedHours: Math.round(requestedHours * 4) / 4,
    allocatedHours,
    overloadHours,
    allocations,
    warnings: Array.isArray(planRow.warnings) ? planRow.warnings : [],
    createdAt: planRow.created_at,
  };
}
