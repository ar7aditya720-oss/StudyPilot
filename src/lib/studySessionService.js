import { supabase } from './supabase';

const LOCAL_SESSIONS_KEY = 'studypilot.study_sessions.v1';

/**
 * Validates and transforms a study session row from Postgres to camelCase
 */
export function toCamelSession(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    taskId: row.task_id,
    title: row.title || 'Study Session',
    durationMinutes: Number(row.duration_minutes) || 0,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    createdAt: row.created_at,
  };
}

/**
 * Fetch study sessions for a given user, optionally filtered by a date window
 */
export async function fetchStudySessions(userId, startIso, endIso) {
  if (!userId) return [];

  if (supabase) {
    try {
      let query = supabase
        .from('study_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('started_at', { ascending: false });

      if (startIso) {
        query = query.gte('started_at', startIso);
      }
      if (endIso) {
        query = query.lte('started_at', endIso);
      }

      const { data, error } = await query;
      if (!error && data) {
        return data.map(toCamelSession);
      }
      if (error) {
        console.warn('Study sessions query returned error (table might need migration):', error.message);
      }
    } catch (err) {
      console.warn('Could not query study sessions from Supabase:', err);
    }
  }

  // Fallback to local browser storage
  try {
    const raw = JSON.parse(localStorage.getItem(LOCAL_SESSIONS_KEY) || '[]');
    let list = Array.isArray(raw) ? raw : [];
    if (startIso || endIso) {
      const s = startIso ? new Date(startIso).getTime() : 0;
      const e = endIso ? new Date(endIso).getTime() : Infinity;
      list = list.filter((sess) => {
        const time = new Date(sess.startedAt).getTime();
        return time >= s && time <= e;
      });
    }
    return list;
  } catch (e) {
    return [];
  }
}

/**
 * Record a new completed study session
 */
export async function recordStudySession({
  userId,
  taskId = null,
  title = 'Study Session',
  durationMinutes,
  startedAt = new Date().toISOString(),
  endedAt = new Date().toISOString(),
}) {
  const duration = Math.max(1, Math.round(Number(durationMinutes) || 1));
  const sessionPayload = {
    user_id: userId || 'local-user',
    task_id: taskId || null,
    title: String(title || 'Study Session').trim(),
    duration_minutes: duration,
    started_at: startedAt,
    ended_at: endedAt,
  };

  if (supabase && userId && userId !== 'demo-student') {
    try {
      const { data, error } = await supabase
        .from('study_sessions')
        .insert([sessionPayload])
        .select()
        .single();

      if (!error && data) {
        return toCamelSession(data);
      }
      if (error) {
        console.warn('Supabase session record failed, falling back to local storage:', error.message);
      }
    } catch (err) {
      console.warn('Study session insert threw error:', err);
    }
  }

  // Local storage fallback
  const localSession = {
    id: crypto.randomUUID(),
    userId: userId || 'local-user',
    taskId: taskId || null,
    title: String(title || 'Study Session').trim(),
    durationMinutes: duration,
    startedAt,
    endedAt,
    createdAt: new Date().toISOString(),
  };

  try {
    const existing = JSON.parse(localStorage.getItem(LOCAL_SESSIONS_KEY) || '[]');
    const updated = [localSession, ...existing];
    localStorage.setItem(LOCAL_SESSIONS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Could not save local study session:', e);
  }

  return localSession;
}

/**
 * Delete a study session by ID
 */
export async function deleteStudySession(sessionId, userId) {
  if (!sessionId) return false;

  if (supabase && userId && userId !== 'demo-student') {
    try {
      const { error } = await supabase
        .from('study_sessions')
        .delete()
        .eq('id', sessionId);
      if (error) {
        console.warn('Could not delete study session from Supabase:', error.message);
      }
    } catch (err) {
      console.warn('Study session delete threw error:', err);
    }
  }

  try {
    const existing = JSON.parse(localStorage.getItem(LOCAL_SESSIONS_KEY) || '[]');
    const updated = existing.filter((s) => s.id !== sessionId);
    localStorage.setItem(LOCAL_SESSIONS_KEY, JSON.stringify(updated));
  } catch (e) {}

  return true;
}

