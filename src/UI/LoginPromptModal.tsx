import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import './LoginPromptModal.css';

export interface LoginPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
  productTitle?: string;
  onLoginClick?: () => void;
}

export const LoginPromptModal: React.FC<LoginPromptModalProps> = ({
  isOpen,
  onClose,
  title = "Login Required",
  message = "Please sign in to manage your shopping cart and save your handcrafted sarees.",
  productTitle,
  onLoginClick,
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleLogin = () => {
    onClose();
    if (onLoginClick) {
      onLoginClick();
    } else {
      window.dispatchEvent(
        new CustomEvent("open-auth-modal", {
          detail: {
            mode: "login",
            message: "Please sign in to manage your shopping cart.",
          },
        })
      );
    }
  };

  return createPortal(
    <div
      className="login-prompt-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="login-prompt-title"
    >
      <div
        className="login-prompt-card"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="login-prompt-close-btn"
          onClick={onClose}
          aria-label="Close login prompt"
        >
          &times;
        </button>

        <div className="login-prompt-badge">
          <div className="login-prompt-icon-wrap">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#881337"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
        </div>

        <h3 id="login-prompt-title" className="login-prompt-title">
          {title}
        </h3>

        {productTitle && (
          <div className="login-prompt-product-tag">
            <span className="product-tag-prefix">Item:</span>
            <span className="product-tag-name">{productTitle}</span>
          </div>
        )}

        <p className="login-prompt-message">{message}</p>

        <div className="login-prompt-actions">
          <button
            type="button"
            className="login-prompt-btn-primary"
            onClick={handleLogin}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
              <polyline points="10 17 15 12 10 7" />
              <line x1="15" y1="12" x2="3" y2="12" />
            </svg>
            <span>Sign In / Register</span>
          </button>

          <button
            type="button"
            className="login-prompt-btn-secondary"
            onClick={onClose}
          >
            Continue Browsing
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default LoginPromptModal;
