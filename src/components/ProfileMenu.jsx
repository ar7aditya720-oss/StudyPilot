import React, { useState, useRef, useEffect } from 'react';
import { LogOut, User, ChevronDown, CheckCircle2, Cloud, Edit3, CalendarDays } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { getInitials } from '../lib/profileUtils';

export function ProfileMenu({ compact = false, onEditProfile, onViewProfile }) {
  const { user, profile, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [imgError, setImgError] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setImgError(false);
  }, [profile?.avatar_url, user?.user_metadata?.avatar_url]);

  if (!user && !profile) return null;

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

  const subLabel = course
    ? `${course}${academicYear ? ` · ${academicYear}` : ''}`
    : email || 'Personal planner';

  return (
    <div className="profile-container" ref={menuRef} style={{ position: 'relative' }}>
      <button
        type="button"
        className={`profile-trigger ${compact ? 'compact' : ''}`}
        onClick={() => setOpen(!open)}
        aria-label="User profile options"
      >
        {avatarUrl && !imgError ? (
          <img
            src={avatarUrl}
            alt={displayName}
            className="profile-avatar-img"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="profile-avatar">{initials}</div>
        )}
        {!compact && (
          <div className="profile-details">
            <b>{displayName}</b>
            <small title={subLabel}>{subLabel}</small>
          </div>
        )}
        {!compact && <ChevronDown size={14} className="profile-chevron" />}
      </button>

      {open && (
        <div className="profile-dropdown-menu">
          <div className="dropdown-header">
            <b>{displayName}</b>
            {course && (
              <small style={{ display: 'block', color: '#6a7187', fontSize: '9px', marginTop: '2px' }}>
                {course} {academicYear ? `· ${academicYear}` : ''}
              </small>
            )}
            {email && <span>{email}</span>}
            <div className="account-tag">
              <Cloud size={11} /> Cloud Synchronized
            </div>
          </div>
          <div className="dropdown-divider" />
          {onViewProfile && (
            <button
              type="button"
              className="dropdown-item"
              onClick={() => {
                setOpen(false);
                onViewProfile();
              }}
            >
              <CalendarDays size={14} />
              Profile & Weekly Report
            </button>
          )}
          {onEditProfile && (
            <button
              type="button"
              className="dropdown-item"
              onClick={() => {
                setOpen(false);
                onEditProfile();
              }}
            >
              <Edit3 size={14} />
              Edit Profile & PFP
            </button>
          )}
          <button
            type="button"
            className="dropdown-item danger"
            onClick={async () => {
              setOpen(false);
              await signOut();
            }}
          >
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
