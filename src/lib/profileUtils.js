/**
 * Utility functions for user profile, greetings, and weekly date ranges
 */

export function getInitials(name) {
  if (!name || typeof name !== 'string') return 'S';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'S';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function getTimeGreeting(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function getCurrentCalendarWeek(now = new Date()) {
  const day = now.getDay(); // 0 is Sunday, 1 is Monday ...
  const diffToMonday = day === 0 ? -6 : 1 - day;

  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const startLabel = monday.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
  const endLabel = sunday.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });

  return {
    monday,
    sunday,
    label: `${startLabel} – ${endLabel}`,
    mondayIso: monday.toISOString(),
    sundayIso: sunday.toISOString(),
  };
}

export function calculateWeeklyMetrics({ tasks = [], sessions = [], weekRange = getCurrentCalendarWeek() }) {
  const { monday, sunday } = weekRange;

  // 1. Tasks completed this week
  const completedThisWeek = tasks.filter((t) => {
    if (t.completedUnits < t.totalUnits) return false;
    if (t.completedAt) {
      const cDate = new Date(t.completedAt);
      return cDate >= monday && cDate <= sunday;
    }
    if (t.updatedAt) {
      const uDate = new Date(t.updatedAt);
      return uDate >= monday && uDate <= sunday;
    }
    if (t.dueDate) {
      const dDate = new Date(t.dueDate + 'T00:00:00');
      return dDate >= monday && dDate <= sunday;
    }
    return false;
  });

  // 2. Study time in minutes and hours
  const sessionsThisWeek = sessions.filter((s) => {
    const sDate = new Date(s.startedAt);
    return sDate >= monday && sDate <= sunday;
  });
  const totalMinutes = sessionsThisWeek.reduce(
    (acc, curr) => acc + (Number(curr.durationMinutes) || 0),
    0
  );
  const studyHours = (totalMinutes / 60).toFixed(1);

  // 3. Weekly goals completion percentage
  const weeklyGoals = tasks.filter((t) => {
    if (t.recurring) return true;
    if (t.dueDate) {
      const d = new Date(t.dueDate + 'T00:00:00');
      return d >= monday && d <= sunday;
    }
    return false;
  });

  const completedGoals = weeklyGoals.filter((t) => t.completedUnits >= t.totalUnits);
  let weeklyGoalPct = 0;
  if (weeklyGoals.length > 0) {
    weeklyGoalPct = Math.round((completedGoals.length / weeklyGoals.length) * 100);
  } else if (tasks.length > 0) {
    weeklyGoalPct = Math.round((completedThisWeek.length / tasks.length) * 100);
  }

  // 4. Active study days (distinct dates YYYY-MM-DD)
  const activeDates = new Set();
  completedThisWeek.forEach((t) => {
    const d = new Date(t.completedAt || t.updatedAt || t.dueDate);
    if (!isNaN(d.getTime())) {
      activeDates.add(d.toLocaleDateString('en-CA'));
    }
  });

  sessionsThisWeek.forEach((s) => {
    const d = new Date(s.startedAt);
    if (!isNaN(d.getTime())) {
      activeDates.add(d.toLocaleDateString('en-CA'));
    }
  });

  return {
    tasksCompletedCount: completedThisWeek.length,
    completedTasks: completedThisWeek,
    studyHours,
    totalMinutes,
    sessionsCount: sessionsThisWeek.length,
    sessionsThisWeek,
    weeklyGoalPct,
    weeklyGoalsCount: weeklyGoals.length,
    completedGoalsCount: completedGoals.length,
    activeDaysCount: activeDates.size,
    weekLabel: weekRange.label,
  };
}

/**
 * Resizes and compresses an image file to a lightweight data URL
 * Suitable for instant profile picture storage without external storage setup
 */
export function compressImage(file, maxSize = 256) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      return reject(new Error('Selected file must be an image.'));
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxSize) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        // Generates compact JPEG data URI
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error('Failed to load image.'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsDataURL(file);
  });
}

