import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./PrivacyPolicyPage.css";

export default function PrivcyPolicyPage() {
  const navigate = useNavigate();
  const location = useLocation(); // Get state from the previous page

  const handleBack = () => {
    // If navigated from Sign Up, go back to Sign Up form
    if (location.state?.backToSignUp) {
      navigate("/auth", { state: { showLogin: false } });
    } else {
      navigate(-1); // Default back behavior
    }
  };

  return (
    <div className="privacy-overlay">
      <button className="privacy-back-btn" onClick={handleBack}>
        ← Back
      </button>

      <div className="privacy-card">
        <h1 className="privacy-title">Privacy Policy</h1>
        <p className="privacy-intro">
          Your privacy is important to us. Soluna collects and uses your data
          responsibly to improve your experience on the platform.
        </p>

        <ul className="privacy-list">
          <li>
            Personal information like email, login credentials, and profile
            data is stored securely and used only for account management.
          </li>
          <li>
            Mood logs, journal entries, and other wellness data remain private.
            This information is used only to generate insights, reports, and
            improve services.
          </li>
          <li>
            Soluna does not share your personal data with third parties for
            commercial purposes without your explicit consent.
          </li>
          <li>
            Data is transmitted over secure, encrypted connections. Internet
            interruptions may affect data syncing.
          </li>
          <li>
            Cookies and analytics may be used to improve platform performance,
            but they do not contain personal data.
          </li>
          <li>
            Users have the right to access, update, or request deletion of
            their personal data by contacting support.
          </li>
          <li>
            Soluna may use anonymized data for research, feature improvements,
            and internal analysis without compromising personal privacy.
          </li>
          <li>
            Soluna may update this Privacy Policy. Continued use of the platform
            indicates acceptance of any changes.
          </li>
          <li>
            For any questions or concerns about your privacy, contact{" "}
            <span className="highlight">wellnesssoluna@gmail.com</span>.
          </li>
        </ul>
      </div>
    </div>
  );
}
