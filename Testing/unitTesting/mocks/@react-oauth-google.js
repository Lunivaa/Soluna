import React from 'react';
import { vi } from 'vitest';

export const GoogleOAuthProvider = ({ children }) => <div>{children}</div>;
export const useGoogleLogin = vi.fn(() => vi.fn());
export const googleLogout = vi.fn();
export const useGoogleOAuth = vi.fn(() => ({}));
export const GoogleLogin = () => <div>Google Login Mock</div>;

export default {
  GoogleOAuthProvider,
  useGoogleLogin,
  googleLogout,
  useGoogleOAuth,
  GoogleLogin
};
