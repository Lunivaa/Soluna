import { useState } from "react";
import { useLocation } from "react-router-dom";
import axios from "axios";
import { API_URL } from "../api";
import OpenEyeIcon from "../assets/icons/open-eye.png";
import ClosedEyeIcon from "../assets/icons/closed-eye.png";
import "../AuthPage.css";

const API_BASE = `${API_URL}/api`;

export default function AdminResetPasswordPage() {
  const location = useLocation();
  const token = new URLSearchParams(location.search).get("token");

  const [formData, setFormData] = useState({ password: "", confirm: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [popup, setPopup] = useState({ show: false, title: "", message: "", onOk: null });
  const [loading, setLoading] = useState(false);

  const getPasswordStrength = (password) => {
    let strength = 0;
    if (password.length >= 6) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[@$!%*?&]/.test(password)) strength++;
    if (strength <= 2) return { label: "Weak" };
    if (strength === 3 || strength === 4) return { label: "Medium" };
    if (strength === 5) return { label: "Strong" };
    return { label: "" };
  };

  const showPopupMsg = (title, message, onOk = null) => {
    setPopup({ show: true, title, message, onOk });
  };

  const closePopup = () => {
    const cb = popup.onOk;
    setPopup({ show: false, title: "", message: "", onOk: null });
    if (cb) cb();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirm)
      return showPopupMsg("Password Mismatch", "Passwords do not match.");
    if (formData.password.length < 6)
      return showPopupMsg("Weak Password", "Password must be at least 6 characters.");
    if (!/[A-Z]/.test(formData.password))
      return showPopupMsg("Weak Password", "Password must include at least one uppercase letter.");
    if (!/[a-z]/.test(formData.password))
      return showPopupMsg("Weak Password", "Password must include at least one lowercase letter.");
    if (!/[0-9]/.test(formData.password))
      return showPopupMsg("Weak Password", "Password must include at least one number.");
    if (!/[@$!%*?&]/.test(formData.password))
      return showPopupMsg("Weak Password", "Password must include at least one special character (@$!%*?&).");
    if (!token)
      return showPopupMsg("Invalid Token", "Invalid or missing reset token.");

    try {
      setLoading(true);
      await axios.post(`${API_BASE}/admin/reset-password`, { token, newPassword: formData.password });
      showPopupMsg("Password Reset", "Password reset successfully. You can now log in.", () => window.close());
    } catch (err) {
      showPopupMsg("Error", err.response?.data?.error || "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-overlay" style={{ background: "linear-gradient(135deg, #b7c6fa, #b5d1fc, #c1a9fb, #e1bdff)" }}>
      <div className="auth-card">
        <h1>Reset Admin Password</h1>
        <p className="auth-intro">Enter your new password below.</p>
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group password-group">
            <label htmlFor="adminPassword">New Password</label>
            <div className="password-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                id="adminPassword"
                placeholder="Enter new password"
                required
                pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{6,}"
                title="Min 6 chars with uppercase, lowercase, number & special character"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
              {formData.password && (
                <span className={`password-strength-inside ${getPasswordStrength(formData.password).label.toLowerCase()}`}>
                  {getPasswordStrength(formData.password).label}
                </span>
              )}
              <span className="toggle-pass" onClick={() => setShowPassword(!showPassword)}>
                <img src={showPassword ? OpenEyeIcon : ClosedEyeIcon} alt="toggle" />
              </span>
            </div>
          </div>
          <div className="form-group password-group">
            <label htmlFor="adminConfirm">Confirm Password</label>
            <div className="password-wrapper">
              <input
                type={showConfirm ? "text" : "password"}
                id="adminConfirm"
                placeholder="Confirm new password"
                required
                value={formData.confirm}
                onChange={(e) => setFormData({ ...formData, confirm: e.target.value })}
              />
              {formData.confirm && (
                <span className={`password-strength-inside ${formData.confirm === formData.password ? 'strong' : 'weak'}`}>
                  {formData.confirm === formData.password ? 'Match' : 'No match'}
                </span>
              )}
              <span className="toggle-pass" onClick={() => setShowConfirm(!showConfirm)}>
                <img src={showConfirm ? OpenEyeIcon : ClosedEyeIcon} alt="toggle" />
              </span>
            </div>
          </div>
          <button type="submit" className="auth-btn" disabled={loading}>Reset Password</button>
        </form>
      </div>

      {popup.show && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header"><h3>{popup.title}</h3></div>
            <div className="modal-body"><p>{popup.message}</p></div>
            <div className="modal-actions">
              <button className="modal-btn delete-btn" onClick={closePopup}>OK</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}