import React, { useState, useEffect } from 'react';
import { Edit3, GraduationCap, Sparkles, User } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { getInitials } from '../lib/profileUtils';

export function UserProfileBadge({ onEditProfile, onViewProfile }) {
  const { profile, user } = useAuth();
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [profile?.avatar_url, user?.user_metadata?.avatar_url]);

  const displayName =
    profile?.display_name ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split('@')[0] ||
    'Student';

  const course = profile?.course || '';
  const academicYear = profile?.academic_year || '';
  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url || null;
  const initials = getInitials(displayName);

  const academicSubtitle = course
    ? `${course}${academicYear ? ` · ${academicYear}` : ' Student'}`
    : academicYear
    ? `${academicYear} · StudyPilot`
    : 'College Student · StudyPilot';

  return (
    <div className="compact-profile-badge">
      <div
        className="badge-avatar-wrap"
        onClick={onViewProfile || onEditProfile}
        title="View profile & weekly report"
        style={{ cursor: 'pointer' }}
      >
        {avatarUrl && !imgError ? (
          <img
            src={avatarUrl}
            alt={displayName}
            className="badge-avatar-img"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="badge-avatar">{initials}</div>
        )}
      </div>

      <div className="badge-info">
        <div className="badge-name-row">
          <b
            onClick={onViewProfile}
            style={{ cursor: onViewProfile ? 'pointer' : 'default' }}
            title="View profile"
          >
            {displayName}
          </b>
          <button
            type="button"
            className="badge-edit-btn"
            onClick={onEditProfile}
            title="Edit profile & photo"
            aria-label="Edit profile"
          >
            <Edit3 size={12} />
            <span>Edit</span>
          </button>
        </div>
        <small className="badge-subtitle">{academicSubtitle}</small>
      </div>
    </div>
  );
}
