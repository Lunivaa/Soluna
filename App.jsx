import React, { useState, useRef } from "react";
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from "react-router-dom";
import "./App.css";

// Import logos and icons
import logo from "./assets/logo.png";
import whitelogo from "./assets/white-logo.png";
import moodIcon from "./assets/icons/Mood.png";
import journalIcon from "./assets/icons/Journal.png";
import chatbotIcon from "./assets/icons/Chatbot.png";
import selfCareIcon from "./assets/icons/Self-Care.png";
import progressIcon from "./assets/icons/Progress.png";

// Import pages
import AboutUs from "./AboutUs";
import HelpSupport from "./HelpSupport";
import AuthPage from "./AuthPage";
import TermsPage from "./TermsPage";
import PrivacyPage from "./PrivacyPolicyPage";
import ForgetPasswordPage from "./ForgetPasswordPage";
import HomePage from "./HomePage";
import ResetPasswordPage from "./ResetPasswordPage.jsx";
import JournalPage from "./JournalPage";

// Array of images for cursor animation
const wellnessImages = Array.from({ length: 15 }, (_, i) =>
  `/images/Wellness${i + 1}.jpg`
);

// Services data for display
const services = [
  {
    title: "Mood Tracking",
    description:
      "Allows users to log daily moods, view emotional trends, and receive personalized affirmations.",
    icon: moodIcon,
  },
  {
    title: "Journal",
    description:
      "Enables users to write, edit, search, and manage private journal entries for self-reflection.",
    icon: journalIcon,
  },
  {
    title: "Chatbot",
    description:
      "Provides conversational guidance and emotional support through an integrated chatbot.",
    icon: chatbotIcon,
  },
  {
    title: "Self-Care Library",
    description:
      "Offers guided activities like meditation, breathing exercises, and art therapy for mental wellness.",
    icon: selfCareIcon,
  },
  {
    title: "Progress Report",
    description:
      "Generates visual dashboards and reports summarizing mood patterns, journaling, and self-care progress.",
    icon: progressIcon,
  },
];

function Home() {
  // State to track cursor images
  const [images, setImages] = useState([]);
  const lastPos = useRef({ x: 0, y: 0 }); // Last cursor position
  const canSpawn = useRef(true); // Prevents too many images at once
  const seqIndex = useRef(0); // Tracks which image to show next
  const navigate = useNavigate(); // For routing on button click

  // Handle mouse movement for cursor images
  const handleMouseMove = (e) => {
    const distance = Math.hypot(
      e.clientX - lastPos.current.x,
      e.clientY - lastPos.current.y
    );

    if (distance > 80 && canSpawn.current) {
      canSpawn.current = false; // Lock spawning temporarily
      lastPos.current = { x: e.clientX, y: e.clientY }; // Update last position

      // Pick next image
      const nextImageSrc = wellnessImages[seqIndex.current];
      seqIndex.current = (seqIndex.current + 1) % wellnessImages.length;

      // Random offset for fun placement
      const offsetX = Math.random() * 40 - 20;
      const offsetY = Math.random() * 40 - 20;

      // Ensure image stays inside window bounds
      const imgX = Math.min(
        Math.max(e.clientX + offsetX, 100),
        window.innerWidth - 100
      );

      const imgY = Math.min(
        Math.max(e.clientY + offsetY, 120),
        window.innerHeight - 120
      );

      // Create new image object
      const newImage = {
        x: imgX,
        y: imgY,
        src: nextImageSrc,
        rotation: Math.random() * 20 - 10,
        scale: 0.9 + Math.random() * 0.2,
        opacity: 0.8,
        id: Date.now(),
      };

      setImages((prev) => [...prev, newImage]);

      // Remove image after animation
      setTimeout(
        () => setImages((prev) => prev.filter((img) => img.id !== newImage.id)),
        1500
      );

      // Allow next spawn
      setTimeout(() => (canSpawn.current = true), 190);
    }
  };

  return (
    <div>
      {/* Landing Page */}
      <div className="landing-page" onMouseMove={handleMouseMove}>
        <div className="header">
          <img src={logo} alt="Logo" className="logo" />

          <div className="header-content">
            <h2 className="subtitle">Nurture Your Wellbeing.</h2>

            <button
              className="start-button"
              onClick={() => navigate("/auth", { state: { showSignUp: true } })}
            >
              Start Your Journey
            </button>
          </div>
        </div>

        {images.map((img) => (
          <img
            key={img.id}
            src={img.src}
            className="wellness-img"
            style={{
              left: img.x - 100 + "px",
              top: img.y - 120 + "px",
              transform: `rotate(${img.rotation}deg) scale(${img.scale})`,
              opacity: img.opacity,
            }}
            alt="wellness"
          />
        ))}
      </div>

      {/* Services Section */}
      <div id="services-section" className="services-section">
        <h2 className="services-title">Services We Provide</h2>
        <p className="services-subtitle">
          Guiding You Toward Balance and Inner Peace
        </p>

        <div className="services-grid">
          {services.slice(0, 3).map((service, i) => (
            <div key={i} className="service-card">
              <div className="service-icon">
                <img src={service.icon} alt={service.title} />
              </div>
              <h3>{service.title}</h3>
              <p>{service.description}</p>
            </div>
          ))}
        </div>

        <div className="services-bottom-row">
          {services.slice(3).map((service, i) => (
            <div key={i + 3} className="service-card">
              <div className="service-icon">
                <img src={service.icon} alt={service.title} />
              </div>
              <h3>{service.title}</h3>
              <p>{service.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-logo">
            <img src={whitelogo} alt="Logo" />
          </div>

          <div className="footer-links">
            <a
              href="#"
              className="footer-contact-link"
              onClick={(e) => {
                e.preventDefault();
                window.open(
                  "https://mail.google.com/mail/?view=cm&fs=1&to=wellnesssoluna@gmail.com",
                  "_blank"
                );
              }}
            >
              Contact Us
            </a>
            <a
              href="https://instagram.com/lu.niva"
              target="_blank"
              rel="noreferrer"
            >
              Instagram
            </a>
            <Link to="/about" className="footer-btn">
              About Us
            </Link>
            <Link to="/help" className="footer-btn">
              Help & Support
            </Link>
          </div>

          <div className="footer-copy">
            &copy; {new Date().getFullYear()} Soluna. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

// App routes
export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<AboutUs />} />
        <Route path="/help" element={<HelpSupport />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/forgot-password" element={<ForgetPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/journal" element={<JournalPage />} />
      </Routes>
    </Router>
  );
}
