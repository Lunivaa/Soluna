import React, { useState } from "react";
import { useLocation } from "react-router-dom";
import API from "./api.jsx"; // your axios instance
import OpenEyeIcon from "./assets/icons/open-eye.png";
import ClosedEyeIcon from "./assets/icons/closed-eye.png";
import "./AuthPage.css";

export default function ResetPasswordPage() {
  const location = useLocation();
  const query = new URLSearchParams(location.search);
  const token = query.get("token"); // ✅ get token from URL

  const [formData, setFormData] = useState({ password: "", confirmPassword: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [popup, setPopup] = useState({ show: false, message: "", type: "" });
  const [fadeOut, setFadeOut] = useState(false);
  const [loading, setLoading] = useState(false);

  const validatePassword = (password) =>
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{6,}$/.test(password);

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

  const showPopup = (message, type) => setPopup({ show: true, message, type });

  const handlePopupOK = () => {
    setFadeOut(true);
    setTimeout(() => {
      setPopup({ show: false, message: "", type: "" });
      setFadeOut(false);
      if (popup.type === "success") {
        // try to close tab if opened via window.open
        window.close();
      }
    }, 350);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    const { password, confirmPassword } = formData;

    if (!password || !confirmPassword) return showPopup("All fields are required.", "error");
    if (!validatePassword(password))
      return showPopup(
        "Password must be at least 6 characters and include uppercase, lowercase, number, and special character.",
        "error"
      );
    if (password !== confirmPassword) return showPopup("Passwords do not match.", "error");

    if (!token) return showPopup("Invalid or missing token.", "error");

    try {
      setLoading(true);
      const res = await API.post("/auth/reset-password", { token, password });
      showPopup(res.data.message || "Password updated successfully!", "success");
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || "Server error. Try again later.";
      showPopup(errorMsg, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-overlay">
      <div className="auth-card">
        <h1>Reset Password</h1>
        <p className="auth-intro">Enter your new password below.</p>
        <form className="auth-form" onSubmit={handleResetPassword}>
          <div className="form-group password-group">
            <label htmlFor="password">New Password</label>
            <div className="password-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                placeholder="Enter new password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
              {formData.password && (
                <span className={`password-strength-inside ${getPasswordStrength(formData.password).label.toLowerCase()}`}>
                  {getPasswordStrength(formData.password).label}
                </span>
              )}
              <span className="toggle-pass" onClick={() => setShowPassword(!showPassword)}>
                <img src={showPassword ? OpenEyeIcon : ClosedEyeIcon} alt="toggle password visibility" />
              </span>
            </div>
          </div>

          <div className="form-group password-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <div className="password-wrapper">
              <input
                type={showConfirmPassword ? "text" : "password"}
                id="confirmPassword"
                placeholder="Confirm your new password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              />
              {formData.confirmPassword && (
                <span className={`password-strength-inside ${getPasswordStrength(formData.confirmPassword).label.toLowerCase()}`}>
                  {getPasswordStrength(formData.confirmPassword).label}
                </span>
              )}
              <span className="toggle-pass" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                <img src={showConfirmPassword ? OpenEyeIcon : ClosedEyeIcon} alt="toggle password visibility" />
              </span>
            </div>
          </div>

          <button type="submit" className="auth-btn">{loading ? "Updating..." : "Update Password"}</button>
        </form>
      </div>

      {popup.show && (
        <div className={`popup-overlay ${fadeOut ? "" : "show"}`}>
          <div className={`popup-card ${popup.type}`}>
            <div className="popup-icon">{popup.type === "success" ? "✓" : "⚠"}</div>
            <p className="popup-message">{popup.message}</p>
            <button className="popup-btn" onClick={handlePopupOK}>OK</button>
          </div>
        </div>
      )}
    </div>
  );
}
