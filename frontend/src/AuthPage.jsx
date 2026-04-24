import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useGoogleLogin } from "@react-oauth/google";
import API from "./api.jsx";
import "./AuthPage.css";
import { useAuth } from "./contexts/AuthContext.jsx";
import GoogleIcon from "./assets/icons/Google.png";
import OpenEyeIcon from "./assets/icons/open-eye.png";
import ClosedEyeIcon from "./assets/icons/closed-eye.png";

export default function AuthPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { login } = useAuth();

  const [isSignUp, setIsSignUp] = useState(!location.state?.showLogin);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [popup, setPopup] = useState({ show: false, title: "", message: "", onOk: null });

  const [formData, setFormData] = useState({
    name: "", email: "", password: "", confirmPassword: "",
    signinEmail: "", signinPassword: ""
  });

  const [termsChecked, setTermsChecked] = useState(false);
  const [termsError, setTermsError] = useState(false);

  useEffect(() => {
    const token = (localStorage.getItem('token') || sessionStorage.getItem('token'));
    if (token) navigate('/home');
  }, [navigate]);

  const showPopup = (title, message, onOk = null) => {
    setPopup({ show: true, title, message, onOk });
  };

  const closePopup = () => {
    const cb = popup.onOk;
    setPopup({ show: false, title: "", message: "", onOk: null });
    if (cb) cb();
  };

  const toggleForm = () => {
    setIsSignUp(!isSignUp);
    if (!isSignUp) {
      setFormData({ name: "", email: "", password: "", confirmPassword: "", signinEmail: "", signinPassword: "" });
    }
    setShowPassword(false);
    setShowConfirmPassword(false);
    setTermsChecked(false);
    setTermsError(false);
  };

  const validateName = (name) => /^[A-Za-z ]+$/.test(name);
  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
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

  const handleSignUp = async (e) => {
    e.preventDefault();
    if (!validateName(formData.name)) return showPopup("Invalid Name", "Name must contain only letters.");
    if (!validateEmail(formData.email)) return showPopup("Invalid Email", "Enter a valid email address.");
    if (!validatePassword(formData.password))
      return showPopup("Weak Password", "Password must be at least 6 characters and include uppercase, lowercase, number, and special character.");
    if (formData.password !== formData.confirmPassword)
      return showPopup("Password Mismatch", "Passwords do not match.");
    if (!termsChecked) { setTermsError(true); return; }

    try {
      setLoading(true);
      const res = await API.post("/auth/register", {
        name: formData.name, email: formData.email, password: formData.password,
      });
      login(res.data.token);
      showPopup("Account Created", "Your account has been created successfully. Welcome to Soluna!", () => navigate("/home"));
    } catch (err) {
      const msg = err.response?.data?.message || "Something went wrong. Please try again.";
      showPopup("Sign Up Failed", msg);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!validateEmail(formData.signinEmail)) return showPopup("Invalid Email", "Enter a valid email address.");

    try {
      setLoading(true);
      const res = await API.post("/auth/login", {
        email: formData.signinEmail, password: formData.signinPassword,
      });
      login(res.data.token);
      showPopup("Login Successful", "You have successfully logged in. Welcome back!", () => navigate("/home"));
    } catch (err) {
      if (err.response?.status === 403 && err.response?.data?.suspended) {
        showPopup("Account Suspended", err.response.data.message || "Your account has been suspended. Please contact support.");
      } else if (!navigator.onLine) {
        showPopup("No Internet", "Please check your internet connection and try again.");
      } else {
        showPopup("Invalid Credentials", "The email or password you entered is incorrect.");
      }
    } finally {
      setLoading(false);
    }
  };

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        setLoading(true);
        const res = await API.post("/auth/google", {
          token: tokenResponse.access_token,
          intent: isSignUp ? "signup" : "login",
        });
        login(res.data.token);
        if (isSignUp) {
          showPopup("Account Created", "Your account has been created successfully. Welcome to Soluna!", () => navigate("/home"));
        } else {
          showPopup("Login Successful", "You have successfully logged in. Welcome back!", () => navigate("/home"));
        }
      } catch (err) {
        showPopup("Google Sign-In Failed", err.response?.data?.message || "Google sign-in failed. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    onError: () => showPopup("Cancelled", "Google sign-in was cancelled."),
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
                <input type="text" id="name" placeholder="Enter Name" required
                  pattern="[A-Za-z ]+"
                  title="Name must contain only letters"
                  value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
              </div>
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input type="email" id="email" placeholder="Enter Email" required
                  pattern="[^\s@]+@[^\s@]+\.[^\s@]{2,}"
                  title="Enter a valid email address (e.g. name@example.com)"
                  value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
              </div>
              <div className="form-group password-group">
                <label htmlFor="password">Password</label>
                <div className="password-wrapper">
                  <input type={showPassword ? "text" : "password"} id="password"
                    placeholder="Create a password" required
                    pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{6,}"
                    title="Min 6 chars with uppercase, lowercase, number & special character"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })} />
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
                <label htmlFor="confirmPassword">Confirm Password</label>
                <div className="password-wrapper">
                  <input type={showConfirmPassword ? "text" : "password"} id="confirmPassword"
                    placeholder="Confirm your password" required
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })} />
                  {formData.confirmPassword && (
                    <span className={`password-strength-inside ${formData.confirmPassword === formData.password ? 'strong' : 'weak'}`}>
                      {formData.confirmPassword === formData.password ? 'Match' : 'No match'}
                    </span>
                  )}
                  <span className="toggle-pass" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                    <img src={showConfirmPassword ? OpenEyeIcon : ClosedEyeIcon} alt="toggle" />
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
              <button type="submit" className="auth-btn" disabled={loading}>
                Create Account
              </button>
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
                <input type="email" id="signinEmail" placeholder="Enter Email" required
                  autoComplete="username"
                  pattern="[^\s@]+@[^\s@]+\.[^\s@]{2,}"
                  title="Enter a valid email address (e.g. name@example.com)"
                  value={formData.signinEmail} onChange={(e) => setFormData({ ...formData, signinEmail: e.target.value })} />
              </div>
              <div className="form-group password-group">
                <label htmlFor="signinPassword">Password</label>
                <div className="password-wrapper">
                  <input type={showPassword ? "text" : "password"} id="signinPassword"
                    autoComplete="current-password"
                    placeholder="Enter Password" required value={formData.signinPassword}
                    onChange={(e) => setFormData({ ...formData, signinPassword: e.target.value })} />
                  {formData.signinPassword && (
                    <span className={`password-strength-inside ${getPasswordStrength(formData.signinPassword).label.toLowerCase()}`}>
                      {getPasswordStrength(formData.signinPassword).label}
                    </span>
                  )}
                  <span className="toggle-pass" onClick={() => setShowPassword(!showPassword)}>
                    <img src={showPassword ? OpenEyeIcon : ClosedEyeIcon} alt="toggle" />
                  </span>
                </div>
              </div>
              <button type="submit" className="auth-btn" disabled={loading}>
                Log In
              </button>
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

      {/* Popup — same structure as journal delete modal */}
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
