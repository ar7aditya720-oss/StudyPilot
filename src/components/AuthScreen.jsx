import React, { useState } from 'react';
import { Sparkles, AlertCircle, Phone, Mail, ArrowRight, ShieldCheck, CheckCircle2, Key, Info, Lock, Loader2 } from 'lucide-react';
import { useAuth } from '../lib/auth';
import studyPilotLogo from '../assets/studypilot-logo.jpg';

export function AuthScreen({ onContinueOffline }) {
  const {
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    signInWithOtp,
    verifyOtp,
    authError,
    setAuthError,
    isPhoneAuthEnabled,
    isConfigured,
  } = useAuth();

  const [loading, setLoading] = useState(false);
  const [authMode, setAuthMode] = useState('google'); // 'google' | 'email' | 'phone'
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setAuthError(null);
      await signInWithGoogle();
    } catch (err) {
      console.error('Google Sign-in failed:', err);
      if (err.message && err.message.includes('provider is not enabled')) {
        setAuthError(
          'Google Provider is not yet enabled in your Supabase Dashboard. Go to Authentication -> Providers -> Google to enable it, or sign in with email below.'
        );
      } else {
        setAuthError(err.message || 'Google sign-in could not be initiated.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) return;

    try {
      setLoading(true);
      setAuthError(null);
      setStatusMessage('');

      if (isSignUp) {
        const res = await signUpWithEmail(email.trim(), password);
        if (res?.session) {
          setStatusMessage('Account created! Welcome to StudyPilot.');
        } else {
          setStatusMessage('Account created! Please check your email to confirm registration.');
        }
      } else {
        await signInWithEmail(email.trim(), password);
        setStatusMessage('Signing you in...');
      }
    } catch (err) {
      console.error('Email auth failed:', err);
      setAuthError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!phoneNumber.trim()) return;

    try {
      setLoading(true);
      setAuthError(null);
      await signInWithOtp(phoneNumber.trim());
      setOtpSent(true);
      setStatusMessage('Verification code sent to ' + phoneNumber);
    } catch (err) {
      console.error('Phone OTP send failed:', err);
      setAuthError(err.message || 'Failed to send verification SMS.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otpCode.trim()) return;

    try {
      setLoading(true);
      setAuthError(null);
      await verifyOtp(phoneNumber.trim(), otpCode.trim());
      setStatusMessage('Verified successfully! Logging in...');
    } catch (err) {
      console.error('Phone OTP verify failed:', err);
      setAuthError(err.message || 'Invalid or expired verification code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        {/* Brand Header */}
        <div className="auth-brand">
          <div className="brand-logo auth-brand-logo">
            <img src={studyPilotLogo} alt="StudyPilot" className="brand-logo-img" />
          </div>
          <div>
            <b>StudyPilot</b>
            <small>YOUR ACADEMIC COPILOT</small>
          </div>
        </div>

        <div className="auth-header-text">
          <h2>Academic Command Center</h2>
          <p>
            Sign in to access your private workload, deadlines, weekly study plans, and document library.
          </p>
        </div>

        {/* Configuration Notice if Supabase keys not set */}
        {!isConfigured && (
          <div className="config-banner">
            <div className="config-banner-title">
              <Key size={16} />
              <b>Supabase Setup Required</b>
            </div>
            <p>
              To enable cloud persistence, configure your Supabase project in <code>.env</code> using <code>.env.example</code> as a reference.
            </p>
            {onContinueOffline && (
              <button
                type="button"
                className="secondary btn-full"
                style={{ marginTop: '10px' }}
                onClick={onContinueOffline}
              >
                Continue in Local Demo Mode
              </button>
            )}
          </div>
        )}

        {/* Error notification */}
        {authError && (
          <div className="auth-error-alert">
            <AlertCircle size={16} />
            <span>{authError}</span>
          </div>
        )}

        {/* Status notification */}
        {statusMessage && (
          <div className="auth-status-alert">
            <CheckCircle2 size={16} />
            <span>{statusMessage}</span>
          </div>
        )}

        {isConfigured && (
          <div className="auth-methods">
            {authMode === 'google' && (
              <>
                {/* Google Sign-In Primary Button */}
                <button
                  type="button"
                  className="google-btn"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="spin-icon" />
                      <span>Connecting to Google...</span>
                    </>
                  ) : (
                    <>
                      <svg className="google-icon" viewBox="0 0 24 24" width="18" height="18">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        />
                      </svg>
                      <span>Continue with Google</span>
                    </>
                  )}
                </button>

                <div className="phone-auth-switch">
                  <span className="auth-divider-text">or</span>
                  <button
                    type="button"
                    className="text-link-btn"
                    onClick={() => {
                      setAuthMode('email');
                      setAuthError(null);
                    }}
                  >
                    <Mail size={14} /> Sign in with Email & Password
                  </button>

                  {isPhoneAuthEnabled && (
                    <button
                      type="button"
                      className="text-link-btn"
                      style={{ marginTop: '6px' }}
                      onClick={() => {
                        setAuthMode('phone');
                        setAuthError(null);
                      }}
                    >
                      <Phone size={14} /> Sign in with Phone SMS
                    </button>
                  )}
                </div>
              </>
            )}

            {authMode === 'email' && (
              <form onSubmit={handleEmailAuth} className="phone-form">
                <label>
                  Email Address
                  <input
                    type="email"
                    required
                    placeholder="student@university.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    autoFocus
                  />
                </label>
                <label>
                  Password
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                  />
                </label>
                <button type="submit" className="primary btn-full" disabled={loading}>
                  {loading
                    ? 'Processing...'
                    : isSignUp
                    ? 'Create Student Account'
                    : 'Sign In to Workspace'}
                </button>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                  <button
                    type="button"
                    className="text-link-btn"
                    onClick={() => setIsSignUp(!isSignUp)}
                  >
                    {isSignUp ? 'Already have an account? Sign in' : 'Need an account? Sign up'}
                  </button>
                  <button
                    type="button"
                    className="text-link-btn"
                    onClick={() => {
                      setAuthMode('google');
                      setAuthError(null);
                    }}
                  >
                    Back to Google
                  </button>
                </div>
              </form>
            )}

            {authMode === 'phone' && isPhoneAuthEnabled && (
              <div className="phone-auth-container">
                {!otpSent ? (
                  <form onSubmit={handleSendOtp} className="phone-form">
                    <label>
                      Phone Number (E.164 with country code)
                      <input
                        type="tel"
                        required
                        placeholder="+919876543210"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        disabled={loading}
                      />
                    </label>
                    <button type="submit" className="primary btn-full" disabled={loading}>
                      {loading ? 'Sending code...' : 'Send verification code'}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyOtp} className="phone-form">
                    <label>
                      6-Digit SMS Verification Code
                      <input
                        type="text"
                        required
                        maxLength={6}
                        placeholder="123456"
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value)}
                        disabled={loading}
                        autoFocus
                      />
                    </label>
                    <button type="submit" className="primary btn-full" disabled={loading}>
                      {loading ? 'Verifying...' : 'Verify and sign in'}
                    </button>
                  </form>
                )}

                <button
                  type="button"
                  className="text-link-btn back-btn"
                  onClick={() => {
                    setAuthMode('google');
                    setOtpSent(false);
                    setAuthError(null);
                  }}
                >
                  Back to Google sign in
                </button>
              </div>
            )}
          </div>
        )}

        {/* Local Demo Mode option for testing or offline use */}
        {isConfigured && onContinueOffline && (
          <div className="demo-mode-section">
            <div className="auth-divider-line">
              <span>or explore offline</span>
            </div>
            <button
              type="button"
              className="secondary btn-full demo-mode-btn"
              onClick={onContinueOffline}
            >
              Continue in Local Demo Mode
            </button>
            <span className="demo-mode-desc">
              Try StudyPilot offline. Tasks, study plans, and timer sessions will be saved locally on this device.
            </span>
          </div>
        )}

        {/* Security badges */}
        <div className="auth-footer-security">
          <div className="security-item">
            <ShieldCheck size={14} />
            <span>Row Level Security Enforced</span>
          </div>
          <div className="security-item">
            <CheckCircle2 size={14} />
            <span>Private Cloud Storage</span>
          </div>
        </div>
      </div>
    </div>
  );
}
