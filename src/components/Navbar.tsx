import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import {
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth } from '../firebase';
import client from '../api/client';
import { useAppDispatch, useAppSelector } from '../hooks/hoots';
import { setProfile, setToken, clearProfile, type UserProfile } from '../store/profile';

const provider = new GoogleAuthProvider();

export const Navbar = () => {
  const dispatch = useAppDispatch();
  const { profile } = useAppSelector((state) => state.profile);
  const location = useLocation();
  const navRef = useRef<HTMLElement>(null);
  const menuToggleRef = useRef<HTMLButtonElement>(null);

  const [openPath, setOpenPath] = useState<string | null>(null);
  const isOpen = openPath === location.pathname;

  // Modal & Auth State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(false);

  // Listen for global open-auth-modal events
  useEffect(() => {
    const handleOpenAuth = (e: any) => {
      setAuthMode(e.detail?.mode || 'login');
      setAuthNotice(e.detail?.message || null);
      setAuthError(null);
      setIsModalOpen(true);
    };
    window.addEventListener('open-auth-modal', handleOpenAuth);
    return () => window.removeEventListener('open-auth-modal', handleOpenAuth);
  }, []);

  // Sync Firebase auth state with Redux store
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const token = await currentUser.getIdToken();
        dispatch(setToken(token));

        const baseProfile: UserProfile = {
          firebaseUid: currentUser.uid,
          name: currentUser.displayName || 'Anonymous User',
          email: currentUser.email || '',
          emailVerified: currentUser.emailVerified,
          photoURL: currentUser.photoURL || undefined,
        };
        dispatch(setProfile(baseProfile));

        // Sync with backend to retrieve full user document (cart, orders, etc.)
        try {
          const res = await client.post('/auth/create', {
            firebaseUid: currentUser.uid,
            name: currentUser.displayName || 'Anonymous User',
            email: currentUser.email,
            emailVerified: currentUser.emailVerified,
            photoURL: currentUser.photoURL || undefined,
          });
          if (res.data?.user) {
            dispatch(setProfile(res.data.user));
          }
          if (res.data?.token) {
            dispatch(setToken(res.data.token));
          }
        } catch (err) {
          console.warn('Backend user sync failed (server may be offline):', err);
        }
      } else {
        dispatch(clearProfile());
      }
    });

    return () => unsubscribe();
  }, [dispatch]);

  const toggleMenu = () =>
    setOpenPath((prev) => (prev === location.pathname ? null : location.pathname));
  const closeMenu = () => setOpenPath(null);

  // Close mobile menu on outside tap/click, Escape key, or desktop resize
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setOpenPath(null);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenPath(null);
        menuToggleRef.current?.focus();
      }
    };

    const mediaQuery = window.matchMedia('(min-width: 769px)');
    const handleViewportChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setOpenPath(null);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    mediaQuery.addEventListener('change', handleViewportChange);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
      mediaQuery.removeEventListener('change', handleViewportChange);
    };
  }, [isOpen]);

  const closeModal = () => {
    setIsModalOpen(false);
    setEmail('');
    setPassword('');
    setName('');
    setAuthError(null);
    setAuthNotice(null);
    setAuthMode('login');
  };

  // Option 1: Google Login
  const handleGoogleLogin = async () => {
    setAuthError(null);
    setIsAuthLoading(true);
    try {
      const result = await signInWithPopup(auth, provider);
      const token = await result.user.getIdToken();
      dispatch(setToken(token));

      const userProfile: UserProfile = {
        firebaseUid: result.user.uid,
        name: result.user.displayName || 'Anonymous User',
        email: result.user.email || '',
        emailVerified: result.user.emailVerified,
        photoURL: result.user.photoURL || undefined,
      };
      dispatch(setProfile(userProfile));

      try {
        const res = await client.post('/auth/create', {
          firebaseUid: result.user.uid,
          name: result.user.displayName || 'Anonymous User',
          email: result.user.email,
          emailVerified: result.user.emailVerified,
          photoURL: result.user.photoURL || undefined,
        });
        if (res.data?.user) {
          dispatch(setProfile(res.data.user));
        }
        if (res.data?.token) {
          dispatch(setToken(res.data.token));
        }
      } catch (err) {
        console.warn('Backend user sync error:', err);
      }

      closeModal();
      closeMenu();
    } catch (error: any) {
      const host = window.location.hostname;

      if (error?.code === 'auth/unauthorized-domain') {
        // The page's hostname is not listed in Firebase Auth > Settings > Authorized domains.
        setAuthError(
          `Google sign-in is not allowed from "${host}". Add this domain in Firebase Console > Authentication > Settings > Authorized domains.`
        );
        console.error(
          `Google Sign-In Error: "${host}" is not an authorized domain for Firebase project "${import.meta.env.VITE_FIREBASE_PROJECT_ID}". ` +
            `Add it at https://console.firebase.google.com/project/${import.meta.env.VITE_FIREBASE_PROJECT_ID}/authentication/settings`
        );
      } else if (error?.code === 'auth/operation-not-allowed') {
        setAuthError('Google sign-in is disabled for this project. Enable the Google provider in Firebase Console > Authentication > Sign-in method.');
        console.error('Google Sign-In Error:', error);
      } else if (error?.code === 'auth/popup-blocked') {
        setAuthError('Your browser blocked the sign-in popup. Allow popups for this site and try again.');
        console.error('Google Sign-In Error:', error);
      } else if (
        error?.code !== 'auth/popup-closed-by-user' &&
        error?.code !== 'auth/cancelled-popup-request'
      ) {
        setAuthError('Google sign-in failed. Please try again.');
        console.error('Google Sign-In Error:', error);
      }
    } finally {
      setIsAuthLoading(false);
    }
  };

  // Option 2: Email & Password (Login or Sign Up)
  const handleEmailPasswordAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setIsAuthLoading(true);

    try {
      if (authMode === 'signup') {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        if (name.trim()) {
          await updateProfile(userCredential.user, { displayName: name.trim() });
        }
        const token = await userCredential.user.getIdToken();
        dispatch(setToken(token));

        const userProfile: UserProfile = {
          firebaseUid: userCredential.user.uid,
          name: name.trim() || 'Anonymous User',
          email: userCredential.user.email || '',
          emailVerified: userCredential.user.emailVerified,
        };
        dispatch(setProfile(userProfile));

        try {
          const res = await client.post('/auth/create', {
            firebaseUid: userCredential.user.uid,
            name: name.trim() || 'Anonymous User',
            email: userCredential.user.email,
            emailVerified: userCredential.user.emailVerified,
          });
          if (res.data?.user) {
            dispatch(setProfile(res.data.user));
          }
          if (res.data?.token) {
            dispatch(setToken(res.data.token));
          }
        } catch (err) {
          console.warn('Backend user sync error:', err);
        }
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const token = await userCredential.user.getIdToken();
        dispatch(setToken(token));

        const userProfile: UserProfile = {
          firebaseUid: userCredential.user.uid,
          name: userCredential.user.displayName || userCredential.user.email?.split('@')[0] || 'User',
          email: userCredential.user.email || '',
          emailVerified: userCredential.user.emailVerified,
          photoURL: userCredential.user.photoURL || undefined,
        };
        dispatch(setProfile(userProfile));

        try {
          const res = await client.post('/auth/create', {
            firebaseUid: userCredential.user.uid,
            name: userProfile.name,
            email: userProfile.email,
            emailVerified: userProfile.emailVerified,
            photoURL: userProfile.photoURL,
          });
          if (res.data?.user) {
            dispatch(setProfile(res.data.user));
          }
          if (res.data?.token) {
            dispatch(setToken(res.data.token));
          }
        } catch (err) {
          console.warn('Backend user sync error:', err);
        }
      }
      closeModal();
      closeMenu();
    } catch (error: any) {
      const errorCode = error?.code || '';
      if (
        errorCode === 'auth/invalid-credential' ||
        errorCode === 'auth/wrong-password' ||
        errorCode === 'auth/user-not-found'
      ) {
        setAuthError('Invalid email or password. Please try again.');
      } else if (errorCode === 'auth/email-already-in-use') {
        setAuthError('An account with this email already exists. Please sign in instead.');
      } else if (errorCode === 'auth/weak-password') {
        setAuthError('Password must be at least 6 characters long.');
      } else if (errorCode === 'auth/invalid-email') {
        setAuthError('Please enter a valid email address.');
      } else {
        setAuthError(error.message || 'Authentication failed. Please try again.');
      }
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    setIsAuthLoading(true);
    try {
      await signOut(auth);
      dispatch(clearProfile());
    } catch (error) {
      console.error('Sign-Out Error:', error);
    } finally {
      setIsAuthLoading(false);
      closeMenu();
    }
  };

  return (
    <>
      <nav ref={navRef} className="navbar" aria-label="Primary">
        <div className="nav-container">
          {/* Brand / Logo */}
          <Link to="/" className="nav-logo" onClick={closeMenu}>
            <img src="/logo.png" alt="Appu Sarees" className="logo-img" />
            <div className="logo-text-group">
              <span className="logo-title">Appu Sarees</span>
              <span className="logo-subtitle">Pure Silk & Handlooms</span>
            </div>
          </Link>

          {/* Navigation Links */}
          <div id="primary-navigation" className={`nav-links ${isOpen ? 'open' : ''}`}>
            <NavLink
              to="/"
              end
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
              onClick={closeMenu}
            >
              <svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                <polyline points="9 22 9 12 15 12 15 22"></polyline>
              </svg>
              <span>Home</span>
            </NavLink>

            <NavLink
              to="/customized"
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
              onClick={closeMenu}
            >
              <svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                <path d="M2 17l10 5 10-5"></path>
                <path d="M2 12l10 5 10-5"></path>
              </svg>
              <span>Customized</span>
            </NavLink>

            <NavLink
              to="/cart"
              className={({ isActive }) => (isActive ? 'nav-link active nav-cart-item' : 'nav-link nav-cart-item')}
              onClick={closeMenu}
            >
              <div className="nav-cart-wrapper">
                <svg aria-hidden="true" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="9" cy="21" r="1"></circle>
                  <circle cx="20" cy="21" r="1"></circle>
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                </svg>
                {profile?.cart && profile.cart.length > 0 && (
                  <span className="cart-badge">{profile.cart.length}</span>
                )}
              </div>
              <span>Cart</span>
            </NavLink>

            {/* Auth Section using Redux State */}
            <div className="nav-auth-section">
              {profile ? (
                <div className="user-profile">
                  {profile.photoURL ? (
                    <img
                      src={profile.photoURL}
                      alt={profile.name || 'User'}
                      className="user-avatar"
                    />
                  ) : (
                    <div className="user-avatar-fallback">
                      {(profile.name || profile.email || 'U')[0].toUpperCase()}
                    </div>
                  )}
                  <div className="user-info-text">
                    <span className="user-greeting">Hi,</span>
                    <span className="user-name">
                      {profile.name?.split(' ')[0] || profile.email?.split('@')[0]}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="auth-btn logout-btn"
                    onClick={handleLogout}
                    disabled={isAuthLoading}
                    title="Sign Out"
                  >
                    <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                      <polyline points="16 17 21 12 16 7"></polyline>
                      <line x1="21" y1="12" x2="9" y2="12"></line>
                    </svg>
                    <span>Logout</span>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="auth-btn login-trigger-btn"
                  onClick={() => {
                    setIsModalOpen(true);
                    closeMenu();
                  }}
                >
                  <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                  <span>Sign In</span>
                </button>
              )}
            </div>
          </div>

          {/* Mobile Hamburger Button */}
          <button
            ref={menuToggleRef}
            type="button"
            className={`menu-toggle ${isOpen ? 'active' : ''}`}
            onClick={toggleMenu}
            aria-label="Toggle navigation menu"
            aria-expanded={isOpen}
            aria-controls="primary-navigation"
          >
            <span className="bar" aria-hidden="true"></span>
            <span className="bar" aria-hidden="true"></span>
            <span className="bar" aria-hidden="true"></span>
          </button>
        </div>
      </nav>

      {/* Login / Auth Popup Modal */}
      {isModalOpen && (
        <div className="auth-modal-overlay" onClick={closeModal}>
          <div
            className="auth-modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            {/* Modal Close Button */}
            <button
              type="button"
              className="modal-close-btn"
              onClick={closeModal}
              aria-label="Close modal"
            >
              &times;
            </button>

            {/* Header */}
            <div className="modal-header">
              <div className="modal-logo-wrap">
                <img src="/logo.png" alt="Appu Sarees" className="modal-logo-img" />
              </div>
              <h2 className="modal-title">
                {authMode === 'login' ? 'Welcome Back' : 'Create an Account'}
              </h2>
              <p className="modal-subtitle">
                {authMode === 'login'
                  ? 'Sign in to access your cart, wishlist, and orders.'
                  : 'Join Appu Sarees today to start shopping.'}
              </p>
            </div>

            {/* Error Message Alert */}
            {authError && (
              <div className="auth-error-alert" role="alert">
                {authError}
              </div>
            )}

            {/* Info Notice Alert */}
            {authNotice && (
              <div className="auth-notice-alert" role="status">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{authNotice}</span>
              </div>
            )}

            {/* Option 1: Google Login */}
            <div className="modal-oauth-section">
              <button
                type="button"
                className="oauth-btn google-full-btn"
                onClick={handleGoogleLogin}
                disabled={isAuthLoading}
              >
                <svg className="google-icon" width="20" height="20" viewBox="0 0 24 24">
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
                <span>{isAuthLoading ? 'Connecting...' : 'Continue with Google'}</span>
              </button>
            </div>

            {/* Divider */}
            <div className="modal-divider">
              <span>or continue with email</span>
            </div>

            {/* Option 2: Email & Password Form */}
            <form onSubmit={handleEmailPasswordAuth} className="modal-form">
              {authMode === 'signup' && (
                <div className="form-group">
                  <label htmlFor="auth-name">Full Name</label>
                  <input
                    id="auth-name"
                    type="text"
                    placeholder="e.g. Priyadharshini"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    disabled={isAuthLoading}
                  />
                </div>
              )}

              <div className="form-group">
                <label htmlFor="auth-email">Email Address</label>
                <input
                  id="auth-email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isAuthLoading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="auth-password">Password</label>
                <input
                  id="auth-password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isAuthLoading}
                  minLength={6}
                />
              </div>

              <button
                type="submit"
                className="modal-submit-btn"
                disabled={isAuthLoading}
              >
                {isAuthLoading
                  ? 'Processing...'
                  : authMode === 'login'
                  ? 'Sign In with Email'
                  : 'Create Account'}
              </button>
            </form>

            {/* Toggle Login / Sign Up */}
            <div className="modal-footer">
              {authMode === 'login' ? (
                <p>
                  Don't have an account?{' '}
                  <button
                    type="button"
                    className="mode-switch-btn"
                    onClick={() => {
                      setAuthMode('signup');
                      setAuthError(null);
                    }}
                  >
                    Sign Up
                  </button>
                </p>
              ) : (
                <p>
                  Already have an account?{' '}
                  <button
                    type="button"
                    className="mode-switch-btn"
                    onClick={() => {
                      setAuthMode('login');
                      setAuthError(null);
                    }}
                  >
                    Sign In
                  </button>
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
