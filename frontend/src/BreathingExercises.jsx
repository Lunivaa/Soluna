import { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { FiWind, FiArrowLeft, FiClock } from "react-icons/fi";
import { BsBookmark, BsBookmarkFill } from "react-icons/bs";
import axios from "axios";
import { useUserPreferences } from "./hooks/useUserPreferences";
import ProfileDropdown from './components/ProfileDropdown';
import "./Libraries.css";
import logo from "./assets/logo.png";

export default function BreathingExercises() {
  const [userInitial, setUserInitial] = useState("L");
  const [profilePic, setProfilePic] = useState(null);
  const [breathingExercises, setBreathingExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSaved, setShowSaved] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const navigate = useNavigate();
  
  // User preferences hook
  const { 
    savedItems, 
    history, 
    savedStatus, 
    fetchSavedItems, 
    fetchHistory,
    checkMultipleSavedStatus,
    toggleSave,
    addToHistory 
  } = useUserPreferences();

  const API_BASE = "http://localhost:5001/api/selfcare";

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const decoded = jwtDecode(token);
        if (decoded.name) {
          setUserInitial(decoded.name.trim().charAt(0).toUpperCase());
        } else if (decoded.email) {
          setUserInitial(decoded.email.charAt(0).toUpperCase());
        }
      } catch (err) {
        setUserInitial("U");
      }
    }
    
    // Load profile picture
    fetchProfile();
    fetchBreathingExercises();
  }, []);

  const fetchProfile = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    try {
      const response = await axios.get('http://localhost:5001/api/auth/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.avatar) {
        setProfilePic(response.data.avatar);
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    }
  };

  const handleProfileUpdate = (updates) => {
    if (updates.avatar !== undefined) {
      setProfilePic(updates.avatar);
    }
  };

  const fetchBreathingExercises = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/breathing`);
      setBreathingExercises(response.data);
      
      // Check saved status for all items
      if (response.data.length > 0) {
        const itemIds = response.data.map(item => item.id);
        await checkMultipleSavedStatus(itemIds);
      }
    } catch (error) {
      console.error('Error fetching breathing exercises:', error);
      setBreathingExercises([]);
    } finally {
      setLoading(false);
    }
  };

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
          onProfileUpdate={handleProfileUpdate}
        />
      </nav>

      {/* Main Content */}
      <div className="libraries-container">
        {/* Back Button and Header */}
        <div className="page-header">
          <button className="libraries-back-btn" onClick={() => navigate('/libraries')}>
            <FiArrowLeft />
          </button>
          <div className="page-header-content">
            <h1 className="page-title">
              <FiWind className="section-icon" />
              Breathing Exercises
            </h1>
            <p className="page-description">
              Discover calming breathing techniques to reduce anxiety, improve focus, and promote relaxation.
            </p>
          </div>
        </div>

        {/* View Toggle Buttons */}
        <div className="view-toggle-container">
          <div className="left-group">
            <button 
              className={`view-toggle-btn ${!showSaved && !showHistory ? 'active' : ''}`}
              onClick={() => { setShowSaved(false); setShowHistory(false); }}
            >
              All Exercises
            </button>
          </div>
          <div className="right-group">
            <button 
              className={`view-toggle-btn ${showSaved ? 'active' : ''}`}
              onClick={() => { 
                setShowSaved(true); 
                setShowHistory(false); 
                fetchSavedItems();
              }}
            >
              <svg viewBox="0 0 24 24" style={{ width: '16px', height: '16px', fill: 'none', stroke: 'currentColor', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round' }}>
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
              </svg>
              Saved
            </button>
            <button 
              className={`view-toggle-btn ${showHistory ? 'active' : ''}`}
              onClick={() => { 
                setShowHistory(true); 
                setShowSaved(false); 
                fetchHistory();
              }}
            >
              <FiClock /> History
            </button>
          </div>
        </div>

        {/* Breathing Exercises Grid */}
        {loading ? (
          <div className="loading-message">Loading breathing exercises...</div>
        ) : (
          <>
            {(() => {
              let displayItems = breathingExercises;
              if (showSaved) {
                displayItems = savedItems.filter(item => item.category === 'breathing');
              } else if (showHistory) {
                displayItems = history.filter(item => item.category === 'breathing');
              }
              
              // Map history items to use consistent id field and ensure unique keys
              displayItems = displayItems.map((item, index) => ({
                ...item,
                id: item.itemId || item.id,
                uniqueKey: `${item.itemId || item.id}-${index}` // Add unique key for React
              }));
              
              return displayItems.length > 0 ? (
                showSaved || showHistory ? (
                  <div className="history-saved-list-wrap">
                  <div className="history-saved-list">
                    {displayItems.map((exercise, index) => (
                      <div key={exercise.uniqueKey || `${exercise.id}-${index}`} className={`horizontal-card ${showHistory ? 'history-card' : ''}`}>
                        <div className="horizontal-card-thumbnail">
                          <img 
                            src={exercise.thumbnail_url || "/images/Wellness20.jpg"} 
                            alt={exercise.title}
                          />
                        </div>
                        <div className="horizontal-card-content">
                          <h4 className="horizontal-card-title">{exercise.title}</h4>
                          <p className="horizontal-card-description">
                            {exercise.description || "A guided breathing exercise for relaxation and mindfulness."}
                          </p>
                          <p className="horizontal-card-meta">
                            Duration: {exercise.duration ? `${exercise.duration} minutes` : 'Unknown'}
                          </p>
                          {showHistory && exercise.playedAt && (
                            <p className="history-timestamp">
                              Played on {new Date(exercise.playedAt).toLocaleDateString()} at {new Date(exercise.playedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          )}
                        </div>
                        <div className="horizontal-card-actions">
                          <button 
                            className={`save-btn ${savedStatus[exercise.id] ? 'saved' : ''}`}
                            onClick={() => toggleSave(exercise.id)}
                          >
                            <svg viewBox="0 0 24 24">
                              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                            </svg>
                          </button>
                          <button 
                            className="play-btn"
                            onClick={() => {
                              addToHistory(exercise.id);
                              navigate(`/libraries/breathing/${exercise.id}`);
                            }}
                          >
                            Start Exercise
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  </div>
                ) : (
                  <div className="meditation-grid">
                    {displayItems.map((exercise, index) => (
                    <div key={exercise.uniqueKey || `${exercise.id}-${index}`} className="meditation-card">
                      <div className="meditation-placeholder">
                        <img 
                          src={exercise.thumbnail_url || "/images/Wellness20.jpg"} 
                          alt={exercise.title} 
                          className="meditation-image"
                          loading="lazy"
                        />
                      </div>
                      <h4 className="meditation-title">{exercise.title}</h4>
                      <p className="meditation-description">
                        {exercise.description || "A guided breathing exercise for relaxation and mindfulness."}
                      </p>
                      <p className="meditation-duration">
                        Duration: {exercise.duration ? `${exercise.duration} minutes` : 'Unknown'}
                      </p>
                      <div className="meditation-simple-controls">
                        <button 
                          className="play-btn"
                          onClick={() => {
                            addToHistory(exercise.id);
                            navigate(`/libraries/breathing/${exercise.id}`);
                          }}
                        >
                          Start Exercise
                        </button>
                        <button 
                          className={`save-btn ${savedStatus[exercise.id] ? 'saved' : ''}`}
                          onClick={() => toggleSave(exercise.id)}
                        >
                          <svg viewBox="0 0 24 24">
                            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                          </svg>
                        </button>
                      </div>
                    </div>
                    ))}
                  </div>
                )
              ) : (
                <div className="empty-state">
                  <p className="empty-state-text">
                    {showSaved ? 'No saved exercises yet' : showHistory ? 'No exercise history yet' : 'No breathing exercises available'}
                  </p>
                </div>
              );
            })()}
          </>
        )}
      </div>
    </div>
  );
}