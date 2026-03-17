import { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { FiWind, FiHeadphones, FiSun, FiEdit3, FiPenTool } from "react-icons/fi";
import { BsPalette } from "react-icons/bs";
import { getToken } from "./api.jsx";
import "./Libraries.css";
import logo from "./assets/logo.png";
import ProfileDropdown from './components/ProfileDropdown';

export default function Libraries() {
  const [userInitial, setUserInitial] = useState("L");
  const [profilePic, setProfilePic] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = getToken();
    if (token) {
      try {
        const decoded = jwtDecode(token);
        if (decoded.name) {
          setUserInitial(decoded.name.trim().charAt(0).toUpperCase());
        } else if (decoded.email) {
          setUserInitial(decoded.email.charAt(0).toUpperCase());
        }
      } catch (err) {
        setUserInitial("L");
      }
    }
    
    // Load profile picture from backend
    const fetchProfile = async () => {
      if (!token) return;
      
      try {
        const response = await fetch('http://localhost:5001/api/auth/profile', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.avatar) {
            setProfilePic(data.avatar);
          }
        }
      } catch (error) {
        console.error('Failed to load profile:', error);
      }
    };
    
    fetchProfile();
  }, []);

  return (
    <div className="libraries-page">
      {/* Navbar */}
      <nav className="navbar">
        <img src={logo} alt="Soluna Logo" className="nav-logo" />
        <ul className="nav-links">
          <li><NavLink to="/home" end className={({ isActive }) => (isActive ? "active" : "")}>Home</NavLink></li>
          <li><NavLink to="/mood" className={({ isActive }) => (isActive ? "active" : "")}>Mood Tracking</NavLink></li>
          <li><NavLink to="/journal" className={({ isActive }) => (isActive ? "active" : "")}>Journal</NavLink></li>
          <li><NavLink to="/chatbot" className={({ isActive }) => (isActive ? "active" : "")}>Chatbot</NavLink></li>
          <li><NavLink to="/libraries" className={({ isActive }) => (isActive ? "active" : "")}>Libraries</NavLink></li>
          <li><NavLink to="/reports" className={({ isActive }) => (isActive ? "active" : "")}>Reports</NavLink></li>
        </ul>
        <ProfileDropdown 
          userInitial={userInitial} 
          profilePic={profilePic}
          onProfileUpdate={(updates) => {
            if (updates.avatar !== undefined) setProfilePic(updates.avatar);
          }}
        />
      </nav>

      {/* Main Content */}
      <div className="libraries-container">
        {/* Header Text */}
        <div className="libraries-header">
          <p className="libraries-description">
            Discover a peaceful space designed to help you slow down, reconnect with yourself, and care for your mind. Whether you're overwhelmed or simply need a quiet pause, this space is here whenever you need calm and clarity.
          </p>
        </div>

        {/* Quote Card */}
        <div className="quote-card">
          <p className="quote-text">
            "Healing begins the moment you choose to be kind to yourself, honoring your feelings and allowing yourself the rest you deserve."
          </p>
        </div>

        {/* Audio Category Cards - Single Column */}
        <div className="audio-category-cards">
          <div className="category-card">
            <div className="category-icon">
              <FiWind />
            </div>
            <div className="category-content">
              <h3 className="category-title">Breathing Exercises</h3>
              <p className="category-description">
                Discover calming breathing techniques to reduce anxiety, improve focus, and promote relaxation.
              </p>
              <button className="category-btn" onClick={() => navigate('/libraries/breathing')}>
                Explore Sessions
              </button>
            </div>
          </div>

          <div className="category-card">
            <div className="category-icon">
              <FiHeadphones />
            </div>
            <div className="category-content">
              <h3 className="category-title">Relaxing Soundscapes</h3>
              <p className="category-description">
                Immerse yourself in calming sounds designed to help you relax, focus, and find inner peace.
              </p>
              <button className="category-btn" onClick={() => navigate('/libraries/sounds')}>
                Explore Soundscapes
              </button>
            </div>
          </div>

          <div className="category-card">
            <div className="category-icon">
              <FiSun />
            </div>
            <div className="category-content">
              <h3 className="category-title">Guided Meditations</h3>
              <p className="category-description">
                Experience peace and clarity with guided meditations to calm your mind and spirit.
              </p>
              <button className="category-btn" onClick={() => navigate('/libraries/meditation')}>
                Explore Meditations
              </button>
            </div>
          </div>
        </div>

        {/* Creative Expression Canvas Section */}
        <section className="canvas-section">
          <div className="libraries-canvas-container">
            <h2 className="canvas-title">
              <FiEdit3 className="canvas-icon" />
              Creative Canvas
            </h2>
            <div className="audio-category-cards canvas-inner-cards">
              <div className="category-card">
                <div className="category-icon">
                  <BsPalette />
                </div>
                <div className="category-content">
                  <h3 className="category-title">Color Studio</h3>
                  <p className="category-description">
                    Choose from beautiful pre-made templates and bring them to life with your colors.
                  </p>
                  <button className="category-btn" onClick={() => navigate('/creative-canvas?mode=coloring-templates')}>
                    Start Coloring
                  </button>
                </div>
              </div>

              <div className="category-card">
                <div className="category-icon">
                  <FiPenTool />
                </div>
                <div className="category-content">
                  <h3 className="category-title">Sketchpad</h3>
                  <p className="category-description">
Express yourself on a blank canvas using various tools, colors, and brush sizes to create unique artwork.                  </p>
                  <button className="category-btn" onClick={() => navigate('/creative-canvas?mode=free-drawing')}>
                    Start Drawing
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}