import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./TermsPage.css";

export default function TermsPage() {
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
    <div className="terms-overlay">
      <button className="terms-back-btn" onClick={handleBack}>
        ← Back
      </button>

      <div className="terms-card">
        <h1 className="terms-title">Terms & Conditions</h1>
        <p className="terms-intro">
          By accessing and using Soluna, you agree to the following terms that
          guide responsible use of the platform.
        </p>

        <ul className="terms-list">
          <li>
            Soluna is a wellness tool offering mood tracking, journaling,
            affirmations, chatbot support, and self-care resources.
          </li>
          <li>
            It is <strong>not a replacement for professional therapy</strong>.
            Users experiencing severe mental health concerns should seek
            qualified help.
          </li>
          <li>
            User accounts are private. You are responsible for keeping your
            login information safe and secure.
          </li>
          <li>
            Personal data such as moods and journal entries will be stored
            securely and used only to generate insights and progress reports.
          </li>
          <li>
            Stable internet connection is required for the platform to function
            properly.
          </li>
          <li>
            Soluna may update these terms occasionally. Continued use of the
            platform means acceptance of the latest terms.
          </li>
          <li>
            The chatbot and other AI features provide supportive responses, but
            they may not always be fully personalized.
          </li>
          <li>
            All guided exercises, affirmations, and wellness content are
            provided for personal growth and reflection, not for commercial use.
          </li>
          <li>
            For any concerns or feedback, please contact{" "}
            <span className="highlight">wellnesssoluna@gmail.com</span>.
          </li>
        </ul>
      </div>
    </div>
  );
}
