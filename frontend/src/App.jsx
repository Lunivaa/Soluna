import { useState, useRef, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, Navigate } from "react-router-dom";
import { FiChevronLeft, FiChevronRight, FiMail, FiPhone, FiMapPin, FiInstagram } from "react-icons/fi";
import { SubscriptionProvider } from "./contexts/SubscriptionContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import SubscriptionModal from "./components/SubscriptionModal";
import AppLayout from "./components/AppLayout";
import { API_URL } from "./api";
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
import ContactPage from "./ContactPage";
import HelpSupport from "./HelpSupport";
import AuthPage from "./AuthPage";
import TermsPage from "./TermsPage";
import PrivacyPage from "./PrivacyPolicyPage";
import ForgetPasswordPage from "./ForgetPasswordPage";
import HomePage from "./HomePage";
import ResetPasswordPage from "./ResetPasswordPage.jsx";
import JournalPage from "./JournalPage";
import Chatbot from "./Chatbot";
import MoodTracker from "./MoodTracker";
import Libraries from "./Libraries";
import BreathingExercises from "./BreathingExercises";
import BreathingPlayer from "./BreathingPlayer";
import SoundLoops from "./SoundLoops";
import MeditationAudio from "./MeditationAudio";
import MeditationPlayer from "./MeditationPlayer";
import CreativeCanvas from "./CreativeCanvas";
import ColoringTemplate from "./ColoringTemplate";
import ProgressReport from "./ProgressReport";
import PaymentResult from "./PaymentResult";
import AdminDashboard from "./admin/AdminDashboard";
import UserProfile from "./UserProfile";
import AdminResetPasswordPage from "./admin/AdminResetPasswordPage";
import SciencePage from "./SciencePage";

// Array of images for cursor animation
const wellnessImages = Array.from({ length: 20 }, (_, i) =>
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
  const [reviews, setReviews] = useState([]);
  const [reviewPage, setReviewPage] = useState(0);
  const REVIEWS_PER_PAGE = 4;

  useEffect(() => {
    fetch(`${API_URL}/api/feedback/public`)
      .then(r => r.json())
      .then(data => setReviews(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  // Check if user is already logged in
  useEffect(() => {
    const token = (localStorage.getItem('token') || sessionStorage.getItem('token'));
    if (token) {
      navigate('/home');
      return;
    }
    // Scroll to footer if returning from a footer link
    if (sessionStorage.getItem('fromFooter')) {
      sessionStorage.removeItem('fromFooter');
      setTimeout(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }), 100);
    }
  }, [navigate]);

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
    <div style={{ background: 'linear-gradient(135deg, #b7c6fa,#b5d1fc, #c1a9fb, #e1bdff)', display: 'flex', flexDirection: 'column' }}>
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
              left: img.x + "px",
              top: img.y + "px",
              transform: `translate(-50%, -50%) rotate(${img.rotation}deg) scale(${img.scale})`,
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

      {/* User Reviews Section */}
      <div className="reviews-section">
        <h2 className="services-title">What Our Users Say</h2>
        <p className="services-subtitle">Real experiences from our community</p>
        <div className="reviews-carousel">
          <button
            className="reviews-nav-btn"
            onClick={() => setReviewPage(p => Math.max(0, p - 1))}
            disabled={reviewPage === 0}
          ><FiChevronLeft size={22} /></button>
          <div className="reviews-grid">
            {reviews.slice(reviewPage * REVIEWS_PER_PAGE, (reviewPage + 1) * REVIEWS_PER_PAGE).map((r, i) => (
              <div key={i} className="review-card">
                <span className="review-quote-mark">"</span>
                <div className="review-stars">
                  {[1,2,3,4,5].map(s => (
                    <span key={s} style={{ color: s <= r.rating ? '#9565B8' : 'rgba(149,101,184,0.25)', fontSize: '15px' }}>★</span>
                  ))}
                </div>
                <p className="review-comment">{r.comment}</p>
                <div className="review-footer">
                  <div className="review-name-initial">
                    {r.avatar
                      ? <img src={r.avatar} alt={r.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                      : (r.name || 'A').charAt(0).toUpperCase()
                    }
                  </div>
                  <span className="review-name">{r.name || 'Anonymous'}</span>
                </div>
              </div>
            ))}
          </div>
          <button
            className="reviews-nav-btn"
            onClick={() => setReviewPage(p => Math.min(Math.ceil(reviews.length / REVIEWS_PER_PAGE) - 1, p + 1))}
            disabled={reviewPage >= Math.ceil(reviews.length / REVIEWS_PER_PAGE) - 1}
          ><FiChevronRight size={22} /></button>
        </div>
        {reviews.length > 0 && (
          <div className="reviews-dots-row">
            {Array.from({ length: Math.max(1, Math.ceil(reviews.length / REVIEWS_PER_PAGE)) }).map((_, i) => (
              <span key={i} className={`reviews-dot ${i === reviewPage ? 'active' : ''}`} onClick={() => setReviewPage(i)} />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-main">

          {/* Col 1 - Brand */}
          <div className="footer-brand">
            <img src={whitelogo} alt="Soluna Logo" className="footer-logo-img" />
            <p className="footer-tagline">A safe space to nurture your mental wellbeing — one mindful moment at a time.</p>
            <div className="footer-socials">
              <a href="https://instagram.com/lu.niva" target="_blank" rel="noreferrer" className="footer-social" aria-label="Instagram">
                <FiInstagram size={16} />
                @Soluna
              </a>
            </div>
          </div>

          {/* Col 2 - Features */}
          <div className="footer-col">
            <h4 className="footer-col-title">Features</h4>
            <ul className="footer-col-list">
              <li>Mood Tracking</li>
              <li>Journal</li>
              <li>Chatbot</li>
              <li>Self-Care Library</li>
              <li>Progress Reports</li>
            </ul>
          </div>

          {/* Col 3 - Company */}
          <div className="footer-col">
            <h4 className="footer-col-title">Company</h4>
            <ul className="footer-col-list">
              <li><Link to="/about" onClick={() => sessionStorage.setItem('fromFooter', '1')}>About Us</Link></li>
              <li><Link to="/science" onClick={() => sessionStorage.setItem('fromFooter', '1')}>Scientific Foundation</Link></li>
              <li><Link to="/contact" onClick={() => sessionStorage.setItem('fromFooter', '1')}>Contact Us</Link></li>
              <li><Link to="/help" onClick={() => sessionStorage.setItem('fromFooter', '1')}>Help & Support</Link></li>
              <li><Link to="/terms" onClick={() => sessionStorage.setItem('fromFooter', '1')}>Terms & Conditions</Link></li>
              <li><Link to="/privacy" onClick={() => sessionStorage.setItem('fromFooter', '1')}>Privacy Policy</Link></li>
            </ul>
          </div>

          {/* Col 4 - Contact */}
          <div className="footer-col">
            <h4 className="footer-col-title">Get in Touch</h4>
            <ul className="footer-col-list footer-contact-list">
              <li>
                <FiMail size={15} />
                wellnesssoluna@gmail.com
              </li>
              <li>
                <FiPhone size={15} />
                +977 9741847218
              </li>
              <li>
                <FiMapPin size={15} />
                Ason, Kathmandu, Nepal
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom bar */}
        <div className="footer-bottom">
          <span>&copy; {new Date().getFullYear()} Soluna. All rights reserved.</span>
          <div className="footer-bottom-links">
            <Link to="/terms" onClick={() => sessionStorage.setItem('fromFooter', '1')}>Terms</Link>
            <Link to="/privacy" onClick={() => sessionStorage.setItem('fromFooter', '1')}>Privacy</Link>
            <Link to="/help" onClick={() => sessionStorage.setItem('fromFooter', '1')}>Support</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

// App routes
function ProtectedRoute({ children }) {
  const token = (localStorage.getItem('token') || sessionStorage.getItem('token'));
  const { isPreview } = useAuth();
  if (!token && !isPreview) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
    <SubscriptionProvider>
      <Router>
        <SubscriptionModal />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<AboutUs />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/help" element={<HelpSupport />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/forgot-password" element={<ForgetPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/home" element={<ProtectedRoute><AppLayout><HomePage /></AppLayout></ProtectedRoute>} />
          <Route path="/journal" element={<ProtectedRoute><AppLayout><JournalPage /></AppLayout></ProtectedRoute>} />
          <Route path="/chatbot" element={<ProtectedRoute><AppLayout><Chatbot /></AppLayout></ProtectedRoute>} />
          <Route path="/mood" element={<ProtectedRoute><AppLayout><MoodTracker /></AppLayout></ProtectedRoute>} />
          <Route path="/libraries" element={<ProtectedRoute><AppLayout><Libraries /></AppLayout></ProtectedRoute>} />
          <Route path="/libraries/breathing" element={<ProtectedRoute><AppLayout><BreathingExercises /></AppLayout></ProtectedRoute>} />
          <Route path="/libraries/breathing/:id" element={<ProtectedRoute><AppLayout><BreathingPlayer /></AppLayout></ProtectedRoute>} />
          <Route path="/libraries/sounds" element={<ProtectedRoute><AppLayout><SoundLoops /></AppLayout></ProtectedRoute>} />
          <Route path="/libraries/sounds/:id" element={<ProtectedRoute><AppLayout><SoundLoops /></AppLayout></ProtectedRoute>} />
          <Route path="/libraries/meditation" element={<ProtectedRoute><AppLayout><MeditationAudio /></AppLayout></ProtectedRoute>} />
          <Route path="/libraries/meditation/:id" element={<ProtectedRoute><AppLayout><MeditationPlayer /></AppLayout></ProtectedRoute>} />
          <Route path="/creative-canvas" element={<ProtectedRoute><AppLayout><CreativeCanvas /></AppLayout></ProtectedRoute>} />
          <Route path="/creative-canvas/coloring-templates/:templateId" element={<ProtectedRoute><AppLayout><CreativeCanvas /></AppLayout></ProtectedRoute>} />
          <Route path="/coloring-template/:templateId" element={<ProtectedRoute><AppLayout><ColoringTemplate /></AppLayout></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute><AppLayout><ProgressReport /></AppLayout></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><AppLayout><UserProfile /></AppLayout></ProtectedRoute>} />
          <Route path="/payment/success" element={<PaymentResult />} />
          <Route path="/payment/failure" element={<PaymentResult />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin-reset-password" element={<AdminResetPasswordPage />} />
          <Route path="/science" element={<SciencePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </SubscriptionProvider>
    </AuthProvider>
  );
}
