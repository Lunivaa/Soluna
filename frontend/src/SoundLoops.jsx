import { useState, useEffect, useRef } from "react";
import { NavLink, useNavigate, useParams } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { FiHeadphones, FiArrowLeft, FiPlay, FiPause, FiClock } from "react-icons/fi";
import { BsBookmark, BsBookmarkFill } from "react-icons/bs";
import axios from "axios";
import { useUserPreferences } from "./hooks/useUserPreferences";
import { useSubscription } from "./contexts/SubscriptionContext";
import ProfileDropdown from './components/ProfileDropdown';
import "./Libraries.css";
import logo from "./assets/logo.png";

export default function SoundLoops() {
  const [userInitial, setUserInitial] = useState("L");
  const [profilePic, setProfilePic] = useState(null);
  const [soundLoops, setSoundLoops] = useState([]);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [audioContext, setAudioContext] = useState(null);
  const [audioBuffers, setAudioBuffers] = useState({});
  const [currentSources, setCurrentSources] = useState([]);
  const [showSaved, setShowSaved] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  
  // Use refs to maintain current state in closures
  const isPlayingRef = useRef(false);
  const currentTrackRef = useRef(null);
  const navigate = useNavigate();
  const { id: urlId } = useParams();
  
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

  const { incrementLibrary } = useSubscription();

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
    
    // Initialize Web Audio Context
    const initAudioContext = () => {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      setAudioContext(ctx);
      return ctx;
    };
    
    fetchSoundLoops(initAudioContext());
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

  const fetchSoundLoops = async (ctx) => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/sound`);
      setSoundLoops(response.data);
      
      // Check saved status for all items
      if (response.data.length > 0) {
        const itemIds = response.data.map(item => item.id);
        await checkMultipleSavedStatus(itemIds);
      }
      
      // Preload audio buffers
      if (ctx && response.data.length > 0) {
        preloadAudioBuffers(response.data, ctx);
      }
    } catch (error) {
      console.error('Error fetching sound loops:', error);
      setSoundLoops([]);
    } finally {
      setLoading(false);
    }
  };

  // Preload audio buffers using Web Audio API
  const preloadAudioBuffers = async (audioData, ctx) => {
    const newBuffers = {};
    
    for (const item of audioData) {
      if (item.audio_url) {
        try {
          let finalAudioUrl = item.audio_url;
          
          // Check if it's a Google Drive URL and use proxy
          const fileId = extractGoogleDriveFileId(item.audio_url);
          if (fileId) {
            finalAudioUrl = `http://localhost:5001/api/selfcare-proxy/audio/${fileId}`;
          } else if (item.audio_url.includes('dropbox.com')) {
            if (item.audio_url.includes('?dl=0')) {
              finalAudioUrl = item.audio_url.replace('?dl=0', '?dl=1');
            } else if (!item.audio_url.includes('?dl=1')) {
              finalAudioUrl = item.audio_url + (item.audio_url.includes('?') ? '&dl=1' : '?dl=1');
            }
          }
          
          const response = await fetch(finalAudioUrl);
          const arrayBuffer = await response.arrayBuffer();
          const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
          
          newBuffers[item.id] = audioBuffer;
          
        } catch (error) {
          console.error(`Failed to preload ${item.title}:`, error);
        }
      }
    }
    
    setAudioBuffers(newBuffers);
  };

  // Extract Google Drive file ID from URL
  const extractGoogleDriveFileId = (url) => {
    if (!url || !url.includes('drive.google.com')) {
      return null;
    }
    
    const patterns = [
      /\/file\/d\/([a-zA-Z0-9_-]+)/,
      /[?&]id=([a-zA-Z0-9_-]+)/,
      /\/d\/([a-zA-Z0-9_-]+)/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }
    
    return null;
  };

  const playAudio = async (audioUrl, trackInfo) => {
    // Stop current audio if playing
    if (currentSources.length > 0) {
      currentSources.forEach(source => { try { source.stop(); } catch (e) {} });
      setCurrentSources([]);
    }

    // If clicking the same track that's playing, just pause it
    if (currentTrack?.id === trackInfo.id && isPlaying) {
      setIsPlaying(false);
      setCurrentTrack(null);
      isPlayingRef.current = false;
      currentTrackRef.current = null;
      return;
    }

    // Count as a new session only when starting a different/new track
    const allowed = await incrementLibrary('sound', trackInfo.id);
    if (!allowed) return;

    // Add to history when starting playback
    addToHistory(trackInfo.id);

    // Update URL to reflect currently playing track
    navigate(`/libraries/sounds/${trackInfo.id}`, { replace: true });

    // Use preloaded buffer for INSTANT playback
    const buffer = audioBuffers[trackInfo.id];
    
    if (buffer && audioContext) {
      // Resume audio context if suspended
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }
      
      setCurrentTrack(trackInfo);
      setIsPlaying(true);
      isPlayingRef.current = true;
      currentTrackRef.current = trackInfo;
      
      if (trackInfo.is_loop) {
        // Create overlapping sources for absolutely seamless looping
        const sources = [];
        
        const createAndScheduleSource = (startTime) => {
          const source = audioContext.createBufferSource();
          source.buffer = buffer;
          source.connect(audioContext.destination);
          
          source.start(startTime);
          sources.push(source);
          
          const nextStartTime = startTime + buffer.duration - 0.05; // 50ms overlap
          
          setTimeout(() => {
            if (isPlayingRef.current && currentTrackRef.current?.id === trackInfo.id) {
              createAndScheduleSource(nextStartTime);
            }
          }, (buffer.duration - 0.1) * 1000);
          
          setTimeout(() => {
            const index = sources.indexOf(source);
            if (index > -1) {
              sources.splice(index, 1);
            }
          }, (buffer.duration + 1) * 1000);
        };
        
        createAndScheduleSource(audioContext.currentTime);
        setCurrentSources(sources);
        
      } else {
        const source = audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContext.destination);
        
        source.onended = () => {
          setIsPlaying(false);
          setCurrentTrack(null);
          setCurrentSources([]);
          isPlayingRef.current = false;
          currentTrackRef.current = null;
        };
        
        source.start(0);
        setCurrentSources([source]);
      }
      
    } else {
      alert(`Audio buffer not found. Please refresh the page.`);
    }
  };

  const pauseAudio = () => {
    if (currentSources.length > 0) {
      currentSources.forEach(source => {
        try {
          source.stop();
        } catch (e) {}
      });
      setCurrentSources([]);
    }
    setIsPlaying(false);
    setCurrentTrack(null);
    isPlayingRef.current = false;
    currentTrackRef.current = null;
    navigate('/libraries/sounds', { replace: true });
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
              <FiHeadphones className="section-icon" />
              Relaxing Soundscapes
            </h1>
            <p className="page-description">
              Immerse yourself in calming sounds designed to help you relax, focus, and find inner peace.
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
              All Soundscapes
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

        {/* Sound Loops Grid */}
        {loading ? (
          <div className="loading-message">Loading sound loops...</div>
        ) : (
          <>
            {(() => {
              let displayItems = soundLoops;
              if (showSaved) {
                displayItems = savedItems.filter(item => item.category === 'sound');
              } else if (showHistory) {
                displayItems = history.filter(item => item.category === 'sound');
              }
              
              // Map history items to use consistent id field
              displayItems = displayItems.map(item => ({
                ...item,
                id: item.itemId || item.id
              }));
              
              return displayItems.length > 0 ? (
                showSaved || showHistory ? (
                  <div className="history-saved-list-wrap">
                  <div className="history-saved-list">
                    {displayItems.map((sound, index) => (
                      <div key={`sound-${sound.id}-${index}`} className={`horizontal-card ${showHistory ? 'history-card' : ''}`}>
                        <div className="horizontal-card-thumbnail">
                          <img 
                            src={sound.thumbnail_url || "/images/Wellness8.jpg"} 
                            alt={sound.title}
                          />
                        </div>
                        <div className="horizontal-card-content">
                          <h4 className="horizontal-card-title">{sound.title}</h4>
                          <p className="horizontal-card-description">
                            {sound.description || "Soothing sounds to help you relax and focus."}
                          </p>
                          <p className="horizontal-card-meta">
                            {sound.duration ? `Duration: ${sound.duration} min` : 'Looping sound'}
                          </p>
                          {showHistory && sound.playedAt && (
                            <p className="history-timestamp">
                              Played on {new Date(sound.playedAt).toLocaleDateString()} at {new Date(sound.playedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          )}
                        </div>
                        <div className="horizontal-card-actions">
                          <button 
                            className={`save-btn ${savedStatus[sound.id] ? 'saved' : ''}`}
                            onClick={() => toggleSave(sound.id)}
                          >
                            <svg viewBox="0 0 24 24">
                              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                            </svg>
                          </button>
                          <button 
                            className={`play-btn ${currentTrack?.id === sound.id && isPlaying ? 'playing' : ''}`}
                            onClick={async () => {
                              if (currentTrack?.id === sound.id && isPlaying) {
                                pauseAudio();
                              } else {
                                await playAudio(sound.audio_url, sound);
                              }
                            }}
                          >
                            {currentTrack?.id === sound.id && isPlaying ? <><FiPause /> Pause</> : <><FiPlay /> Play</>}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  </div>
                ) : (
                  <div className="audio-grid">
                    {displayItems.map((sound, index) => (
                      <div key={`sound-grid-${sound.id}-${index}`} className={`audio-card ${currentTrack?.id === sound.id && isPlaying ? 'playing' : ''}`}>
                        {currentTrack?.id === sound.id && isPlaying && (
                          <div className="now-playing-indicator">Now Playing</div>
                        )}
                        <div className="audio-placeholder">
                          <img 
                            src={sound.thumbnail_url || "/images/Wellness8.jpg"} 
                            alt={sound.title} 
                            className="audio-image"
                            loading="lazy"
                          />
                        </div>
                        <h4 className="audio-title">{sound.title}</h4>
                        <p className="audio-description">
                          {sound.description || "Soothing sounds to help you relax and focus."}
                        </p>
                        <div className="audio-controls">
                          <button 
                            className={`play-btn ${currentTrack?.id === sound.id && isPlaying ? 'playing' : ''}`}
                            onClick={async () => {
                              if (currentTrack?.id === sound.id && isPlaying) {
                                pauseAudio();
                              } else {
                                await playAudio(sound.audio_url, sound);
                              }
                            }}
                          >
                            {currentTrack?.id === sound.id && isPlaying ? (
                              <>
                                <FiPause /> Pause
                              </>
                            ) : (
                              <>
                                <FiPlay /> Play
                              </>
                            )}
                          </button>
                          <button 
                            className={`save-btn ${savedStatus[sound.id] ? 'saved' : ''}`}
                            onClick={() => toggleSave(sound.id)}
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
                    {showSaved ? 'No saved soundscapes yet' : showHistory ? 'No soundscape history yet' : 'No sound loops available'}
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