import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useGoogleLogin } from "@react-oauth/google";
import API from "./api.jsx";
import "./AuthPage.css";
import GoogleIcon from "./assets/icons/Google.png";
import OpenEyeIcon from "./assets/icons/open-eye.png";
import ClosedEyeIcon from "./assets/icons/closed-eye.png";

export default function AuthPage() {
  const location = useLocation();
  const navigate = useNavigate();

  // Form state and toggles
  const [isSignUp, setIsSignUp] = useState(!location.state?.showLogin);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [popup, setPopup] = useState({ show: false, message: "", type: "", resetFields: null });
  const [fadeOut, setFadeOut] = useState(false);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    signinEmail: "",
    signinPassword: ""
  });

  const [termsChecked, setTermsChecked] = useState(false);
  const [termsError, setTermsError] = useState(false);

  // Toggle between Sign Up and Login forms
  const toggleForm = () => {
    setIsSignUp(!isSignUp);
    setFormData({
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      signinEmail: "",
      signinPassword: ""
    });
    setShowPassword(false);
    setShowConfirmPassword(false);
    setTermsChecked(false);
    setTermsError(false);
  };

  // Validation helpers
  const validateName = (name) => /^[A-Za-z ]+$/.test(name);
  const validateEmail = (email) => /\S+@\S+\.\S+/.test(email);
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

  // Show popup messages
  const showPopup = (message, type, resetFields = null) => {
    setPopup({ show: true, message, type, resetFields });
  };

  // Handle popup OK click
  const handlePopupOK = () => {
    setFadeOut(true);
    setTimeout(() => {
      if (popup.resetFields) {
        setFormData(prev => ({
          ...prev,
          ...(popup.resetFields.signinEmail ? { signinEmail: "" } : {}),
          ...(popup.resetFields.signinPassword ? { signinPassword: "" } : {}),
        }));
      }
      setPopup({ show: false, message: "", type: "", resetFields: null });
      setFadeOut(false);

      if (popup.type === "success") navigate("/home");
    }, 350);
  };

  // Sign Up submission
  const handleSignUp = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.password || !formData.confirmPassword) {
      return showPopup("All fields are required.", "error");
    }
    if (!validateName(formData.name)) return showPopup("Name must contain only letters.", "error");
    if (!validateEmail(formData.email)) return showPopup("Enter a valid email address.", "error");
    if (!validatePassword(formData.password)) return showPopup("Password must be at least 6 characters and include uppercase, lowercase, number, and special character.", "error");
    if (formData.password !== formData.confirmPassword) return showPopup("Passwords do not match.", "error");
    if (!termsChecked) {
      setTermsError(true);
      return;
    }

    try {
      setLoading(true);
      const res = await API.post("/auth/signup", {
        name: formData.name,
        email: formData.email,
        password: formData.password,
      });
      localStorage.setItem("token", res.data.token);
      showPopup(res.data.message, "success");
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || "Server error. Try again later.";
      showPopup(errorMsg, "error");
    } finally {
      setLoading(false);
    }
  };

  // Login submission
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!formData.signinEmail || !formData.signinPassword) return showPopup("Email and Password are required.", "error");
    if (!validateEmail(formData.signinEmail)) return showPopup("Enter a valid email address.", "error");

    try {
      setLoading(true);
      const res = await API.post("/auth/login", {
        email: formData.signinEmail,
        password: formData.signinPassword,
      });
      localStorage.setItem("token", res.data.token);
      showPopup(res.data.message, "success");
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || "Server error. Try again later.";
      if (err.response?.status === 404) showPopup(errorMsg, "error", { signinEmail: true, signinPassword: true });
      else if (err.response?.status === 401) showPopup(errorMsg, "error", { signinPassword: true });
      else showPopup(errorMsg, "error");
    } finally {
      setLoading(false);
    }
  };

  // Google OAuth login
  const googleLogin = useGoogleLogin({
  onSuccess: async (tokenResponse) => {
    try {
      setLoading(true);
      const res = await API.post("/auth/google", {
        token: tokenResponse.access_token, // send access_token
      });
      localStorage.setItem("token", res.data.token);
      showPopup(res.data.message, "success");
    } catch (err) {
      const errorMsg = err.response?.data?.message || "Google login failed.";
      showPopup(errorMsg, "error");
    } finally {
      setLoading(false);
    }
  },
  onError: () => showPopup("Google authentication failed.", "error"),
  flow: "implicit", // implicit flow for Google OAuth
});

  return (
    <div className="auth-overlay">
      <div className="auth-card">
        {isSignUp ? (
          <>
            <h1>Create Account</h1>
            <p className="auth-intro">Join Soluna and start nurturing your well-being.</p>
            <form className="auth-form" onSubmit={handleSignUp}>
              <div className="form-group">
                <label htmlFor="name">Name</label>
                <input type="text" id="name" placeholder="Enter Name"
                  value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
              </div>
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input type="email" id="email" placeholder="Enter Email"
                  value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
              </div>
              <div className="form-group password-group">
                <label htmlFor="password">Password</label>
                <div className="password-wrapper">
                  <input type={showPassword ? "text" : "password"} id="password"
                    placeholder="Create a password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })} />
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
                  <input type={showConfirmPassword ? "text" : "password"} id="confirmPassword"
                    placeholder="Confirm your password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })} />
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
              <div className="terms">
                <input type="checkbox" id="terms" checked={termsChecked}
                  onChange={(e) => { setTermsChecked(e.target.checked); if (e.target.checked) setTermsError(false); }}
                  className={termsError ? "shake" : ""} onAnimationEnd={() => setTermsError(false)} />
                <label htmlFor="terms">
                  I agree to the <Link to="/terms"><b>Terms & Conditions</b></Link> and <Link to="/privacy"><b>Privacy Policy</b></Link>
                </label>
              </div>
              <button type="submit" className="auth-btn">Create Account</button>
            </form>
            <button className="google-btn" onClick={() => googleLogin()}>
              <img src={GoogleIcon} alt="Google icon" className="google-icon" />Continue with Google
            </button>
            <p className="switch-form">
              Already have an account? <span onClick={toggleForm}>Log In</span>
            </p>
          </>
        ) : (
          <>

            <h1>Log In</h1>
            <p className="auth-intro">Enter your credentials to access your account.</p>
            <form className="auth-form" onSubmit={handleLogin}>
              <div className="form-group">
                <label htmlFor="signinEmail">Email</label>
                <input type="email" id="signinEmail" placeholder="Enter Email"
                  value={formData.signinEmail} onChange={(e) => setFormData({ ...formData, signinEmail: e.target.value })} />
              </div>
              <div className="form-group password-group">
                <label htmlFor="signinPassword">Password</label>
                <div className="password-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  id="signinPassword"
                  placeholder="Enter Password"
                  value={formData.signinPassword}
                  onChange={(e) => setFormData({ ...formData, signinPassword: e.target.value })}
                />
                {formData.signinPassword && (
                  <span className={`password-strength-inside ${getPasswordStrength(formData.signinPassword).label.toLowerCase()}`}>
                    {getPasswordStrength(formData.signinPassword).label}
                  </span>
                )}
                <span className="toggle-pass" onClick={() => setShowPassword(!showPassword)}>
                  <img src={showPassword ? OpenEyeIcon : ClosedEyeIcon} alt="toggle password visibility" />
                </span>
              </div>
              </div>
              <button type="submit" className="auth-btn">Log In</button>
              <p className="forgot">
                <Link to="/forgot-password" className="forgot-link">Forgot your password?</Link>
              </p>
            </form>
            <button className="google-btn" onClick={() => googleLogin()}>
              <img src={GoogleIcon} alt="Google icon" className="google-icon" />Continue with Google
            </button>
            <p className="switch-form">
              Don't have an account? <span onClick={toggleForm}>Sign Up</span>
            </p>
          </>
        )}
      </div>

      {/* Popup messages */}
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
