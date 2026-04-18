import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useGoogleLogin } from "@react-oauth/google";
import axios from "axios";
import { API_URL } from "../api";
import "./AdminLogin.css";
import OpenEyeIcon from "../assets/icons/open-eye.png";
import ClosedEyeIcon from "../assets/icons/closed-eye.png";
import GoogleIcon from "../assets/icons/Google.png";

const API_BASE = `${API_URL}/api`;

export default function AdminLogin({ onLogin }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [popup, setPopup] = useState({ show: false, title: "", message: "", onOk: null });
  const [forgotLoading, setForgotLoading] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    if (token) onLogin();
  }, [onLogin]);

  const showPopupMsg = (title, message, onOk = null) => {
    setPopup({ show: true, title, message, onOk });
  };

  const closePopup = () => {
    const cb = popup.onOk;
    setPopup({ show: false, title: "", message: "", onOk: null });
    if (cb) cb();
  };

  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Check lockout
    if (lockedUntil && new Date() < lockedUntil) {
      const secsLeft = Math.ceil((lockedUntil - new Date()) / 1000);
      showPopupMsg("Too Many Attempts", `Too many failed attempts. Please wait ${secsLeft} seconds before trying again.`);
      return;
    }

    if (!email.trim() || !password.trim()) {
      showPopupMsg("Missing Fields", "Email and password are required.");
      return;
    }
    if (!validateEmail(email.trim())) {
      showPopupMsg("Invalid Email", "Enter a valid email address.");
      return;
    }
    if (password.length < 6) {
      showPopupMsg("Invalid Password", "Password must be at least 6 characters.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.post(`${API_BASE}/admin/login`, { email: email.trim(), password });
      setFailedAttempts(0);
      setLockedUntil(null);
      localStorage.setItem("adminToken", response.data.token);
      showPopupMsg("Login Successful", "You have successfully logged in to the admin panel.", () => onLogin());
    } catch (error) {
      const newAttempts = failedAttempts + 1;
      setFailedAttempts(newAttempts);
      // Lock for 30 seconds after 5 failed attempts
      if (newAttempts >= 5) {
        const lockTime = new Date(Date.now() + 30000);
        setLockedUntil(lockTime);
        showPopupMsg("Account Locked", "Too many failed attempts. Please wait 30 seconds before trying again.");
      } else {
        showPopupMsg("Login Failed", error.response?.data?.message || "Incorrect email or password. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setIsLoading(true);
      try {
        const res = await axios.post(`${API_BASE}/auth/google`, {
          token: tokenResponse.access_token,
          intent: "admin",
        });
        localStorage.setItem("adminToken", res.data.token);
        showPopupMsg("Login Successful", "You have successfully logged in to the admin panel.", () => onLogin());
      } catch (error) {
        showPopupMsg("Google Login Failed", error.response?.data?.message || "This Google account is not authorized for admin access.");
      } finally {
        setIsLoading(false);
      }
    },
    onError: () => showPopupMsg("Cancelled", "Google sign-in was cancelled."),
  });

  const handleForgotPassword = async () => {
    setForgotLoading(true);
    try {
      await axios.post(`${API_BASE}/admin/forgot-password`);
      showPopupMsg("Email Sent", "Password reset link sent to your admin email.");
    } catch (err) {
      showPopupMsg("Error", err.response?.data?.error || "Failed to send reset email.");
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="auth-overlay admin-login-overlay">
      <div className="auth-card">
        <h1>Admin Portal</h1>
        <p className="auth-intro">Sign in to access the admin dashboard.</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="admin-email">Email</label>
            <input
              type="email"
              id="admin-email"
              placeholder="Enter your email"
              pattern="[^\s@]+@[^\s@]+\.[^\s@]{2,}"
              title="Enter a valid email address (e.g. name@example.com)"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="form-group password-group">
            <label htmlFor="admin-password">Password</label>
            <div className="password-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                id="admin-password"
                placeholder="Enter your password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <span className="toggle-pass" onClick={() => setShowPassword(!showPassword)}>
                <img src={showPassword ? OpenEyeIcon : ClosedEyeIcon} alt="toggle password visibility" />
              </span>
            </div>
          </div>

          <button type="submit" className="auth-btn" disabled={isLoading}>
            {isLoading ? "Log In" : "Log In"}
          </button>

          <p className="forgot">
            <button
              type="button"
              className="forgot-link"
              onClick={handleForgotPassword}
              disabled={forgotLoading}
              style={{ background: "none", border: "none", cursor: "pointer", padding: 0, fontWeight: 700 }}
            >
              {forgotLoading ? "Sending..." : "Forgot your password?"}
            </button>
          </p>
        </form>

        <button className="google-btn" onClick={() => googleLogin()} disabled={isLoading}>
          <img src={GoogleIcon} alt="Google icon" className="google-icon" />
          {isLoading ? "Please wait..." : "Continue with Google"}
        </button>

        <div className="admin-login-footer">
          <p>Secure admin access for Soluna wellness platform</p>
        </div>
      </div>

      {popup.show && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{popup.title}</h3>
            </div>
            <div className="modal-body">
              <p>{popup.message}</p>
            </div>
            <div className="modal-actions">
              <button className="modal-btn delete-btn" onClick={closePopup}>OK</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}