// frontend/src/ForgetPasswordPage.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "./api.jsx"; 
import "./ForgetPasswordPage.css";

export default function ForgetPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  // Popup state
  const [popup, setPopup] = useState({ show: false, message: "", type: "" });
  const [fadeOut, setFadeOut] = useState(false);

  const handleBack = () => {
    navigate("/auth", { state: { showLogin: true } });
  };

  const showPopup = (message, type) => {
    setPopup({ show: true, message, type });
  };

  const handlePopupOK = () => {
    setFadeOut(true);
    setTimeout(() => {
      setPopup({ show: false, message: "", type: "" });
      setFadeOut(false);

      // If reset link was sent successfully, go back to login
      if (popup.type === "success") {
        navigate("/auth", { state: { showLogin: true } });
      }
    }, 350);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return showPopup("Please enter your email.", "error");
    try {
      setLoading(true);
      const res = await API.post("/auth/forgot-password", { email });
      showPopup(res.data.message, "success");
    } catch (err) {
      const errorMsg = err.response?.data?.message || "Something went wrong.";
      showPopup(errorMsg, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forget-overlay">
      <div className="forget-card">
        <button className="forget-back-btn" onClick={handleBack}>
          ← Back
        </button>
        <h1>Forgot Password</h1>
        <p>Enter your email to reset your password.</p>
        <form className="forget-form" onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <button type="submit" disabled={loading}>
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>
      </div>

      {/* Popup */}
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
