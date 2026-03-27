import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { FiSun, FiArrowLeft, FiPlay, FiPause, FiSkipBack, FiSkipForward, FiClock } from "react-icons/fi";
import axios from "axios";
import { useUserPreferences } from "./hooks/useUserPreferences";
import "./Libraries.css";

export default function MeditationAudio() {
  const [meditations, setMeditations] = useState([]);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [audioContext, setAudioContext] = useState(null);
  const [audioBuffers, setAudioBuffers] = useState({});
  const [currentSources, setCurrentSources] = useState([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [listenedProgress, setListenedProgress] = useState({});
  const [showSaved, setShowSaved] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  
  // Use refs to maintain current state in closures
  const isPlayingRef = useRef(false);
  const currentTrackRef = useRef(null);
  const animationFrameRef = useRef(null);
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
    // Initialize Web Audio Context
    const initAudioContext = () => {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      setAudioContext(ctx);
      return ctx;
    };
    
    fetchMeditations(initAudioContext());

    // Cleanup function
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const fetchMeditations = async (ctx) => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/meditation`);
      setMeditations(response.data);
      
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
      console.error('Error fetching meditations:', error);
      setMeditations([]);
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

  const playAudio = (audioUrl, trackInfo) => {
    // Stop current audio if playing
    if (currentSources.length > 0) {
      currentSources.forEach(source => {
        try {
          source.stop();
        } catch (e) {
          // Ignore if already stopped
        }
      });
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

    // Add to history when starting playback
    addToHistory(trackInfo.id);

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
      
      const buffer = audioBuffers[trackInfo.id];
      setDuration(buffer.duration);
      const newStartTime = audioContext.currentTime;
      setStartTime(newStartTime);
      setCurrentTime(0);
      
      // Start progress tracking
      updateProgress();
      
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
        } catch (e) {
          // Ignore errors when stopping
        }
      });
      setCurrentSources([]);
    }
    setIsPlaying(false);
    setCurrentTrack(null);
    isPlayingRef.current = false;
    currentTrackRef.current = null;
    setCurrentTime(0);
    setDuration(0);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  };

  // Enhanced playback functions for meditation
  const updateProgress = () => {
    if (isPlayingRef.current && audioContext && startTime && currentTrackRef.current) {
      const elapsed = audioContext.currentTime - startTime;
      setCurrentTime(elapsed);
      
      // Update listened progress
      const trackId = currentTrackRef.current.id;
      const buffer = audioBuffers[trackId];
      if (buffer) {
        const progressPercent = (elapsed / buffer.duration) * 100;
        setListenedProgress(prev => ({
          ...prev,
          [trackId]: Math.max(prev[trackId] || 0, progressPercent)
        }));
      }
      
      // Continue updating if still playing
      if (isPlayingRef.current) {
        animationFrameRef.current = requestAnimationFrame(updateProgress);
      }
    }
  };

  const seekTo = (percentage) => {
    if (!currentTrack || !audioBuffers[currentTrack.id] || !isPlaying) return;
    
    const buffer = audioBuffers[currentTrack.id];
    const newTime = (percentage / 100) * buffer.duration;
    
    // Stop current playback
    if (currentSources.length > 0) {
      currentSources.forEach(source => {
        try {
          source.stop();
        } catch (e) {}
      });
      setCurrentSources([]);
    }
    
    // Start from new position
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);
    
    const newStartTime = audioContext.currentTime - newTime;
    setStartTime(newStartTime);
    setCurrentTime(newTime);
    
    source.onended = () => {
      setIsPlaying(false);
      setCurrentTrack(null);
      setCurrentSources([]);
      isPlayingRef.current = false;
      currentTrackRef.current = null;
      setCurrentTime(0);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
    
    source.start(0, newTime);
    setCurrentSources([source]);
  };

  const skipForward = () => {
    if (!currentTrack || !audioBuffers[currentTrack.id] || !isPlaying) return;
    const buffer = audioBuffers[currentTrack.id];
    const newTime = Math.min(currentTime + 15, buffer.duration);
    const percentage = (newTime / buffer.duration) * 100;
    seekTo(percentage);
  };

  const skipBackward = () => {
    if (!currentTrack || !audioBuffers[currentTrack.id] || !isPlaying) return;
    const newTime = Math.max(currentTime - 15, 0);
    const buffer = audioBuffers[currentTrack.id];
    const percentage = (newTime / buffer.duration) * 100;
    seekTo(percentage);
  };

  const formatTime = (seconds) => {
    if (!seconds || seconds === 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDurationFromMinutes = (minutes) => {
    if (!minutes) return '0:00';
    const mins = Math.floor(minutes);
    const secs = Math.floor((minutes - mins) * 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDuration = (seconds) => {
    if (!seconds) return 'Unknown';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="libraries-page">
      {/* Main Content */}
      <div className="libraries-container">
        {/* Back Button and Header */}
        <div className="page-header">
          <button className="libraries-back-btn" onClick={() => navigate('/libraries')}>
            <FiArrowLeft />
          </button>
          <div className="page-header-content">
            <h1 className="page-title">
              <FiSun className="section-icon" />
              Guided Meditations
            </h1>
            <p className="page-description">
              Find peace and clarity through guided meditation sessions designed to calm your mind and nurture your spirit.
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
              All Meditations
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

        {/* Meditation Grid */}
        {loading ? (
          <div className="loading-message">Loading meditation audio...</div>
        ) : (
          <>
            {/* Determine which items to display */}
            {(() => {
              let displayItems = meditations;
              if (showSaved) {
                displayItems = savedItems.filter(item => item.category === 'meditation');
              } else if (showHistory) {
                displayItems = history.filter(item => item.category === 'meditation');
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
                    {displayItems.map((meditation, index) => (
                      <div key={`med-${meditation.id}-${index}`} className={`horizontal-card ${showHistory ? 'history-card' : ''}`}>
                        <div className="horizontal-card-thumbnail">
                          <img 
                            src={meditation.thumbnail_url || "/images/Wellness20.jpg"} 
                            alt={meditation.title}
                          />
                        </div>
                        <div className="horizontal-card-content">
                          <h4 className="horizontal-card-title">{meditation.title}</h4>
                          <p className="horizontal-card-description">
                            {meditation.description || "Guided meditation for relaxation and mindfulness."}
                          </p>
                          <p className="horizontal-card-meta">
                            Duration: {meditation.duration ? `${meditation.duration} min` : 'Unknown'}
                          </p>
                          {showHistory && meditation.playedAt && (
                            <p className="history-timestamp">
                              Played on {new Date(meditation.playedAt).toLocaleDateString()} at {new Date(meditation.playedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          )}
                        </div>
                        <div className="horizontal-card-actions">
                          <button 
                            className={`save-btn ${savedStatus[meditation.id] ? 'saved' : ''}`}
                            onClick={() => toggleSave(meditation.id)}
                          >
                            <svg viewBox="0 0 24 24">
                              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                            </svg>
                          </button>
                          <button 
                            className="play-btn"
                            onClick={() => {
                              addToHistory(meditation.id);
                              navigate(`/libraries/meditation/${meditation.id}`);
                            }}
                          >
                            Start Meditation
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  </div>
                ) : (
                  <div className="meditation-grid">
                    {displayItems.map((meditation, index) => (
                    <div key={`med-grid-${meditation.id}-${index}`} className="meditation-card">
                      <div className="meditation-placeholder">
                        <img 
                          src={meditation.thumbnail_url || "/images/Wellness20.jpg"} 
                          alt={meditation.title} 
                          className="meditation-image"
                          loading="lazy"
                        />
                      </div>
                      <h4 className="meditation-title">{meditation.title}</h4>
                      <p className="meditation-description">
                        {meditation.description || "Guided meditation for relaxation and mindfulness."}
                      </p>
                      <p className="meditation-duration">
                        Duration: {meditation.duration ? formatDuration(meditation.duration) : 'Unknown'} minutes
                      </p>
                      <div className="meditation-simple-controls">
                        <button 
                          className="play-btn"
                          onClick={() => {
                            addToHistory(meditation.id);
                            navigate(`/libraries/meditation/${meditation.id}`);
                          }}
                        >
                          Start Meditation
                        </button>
                        <button 
                          className={`save-btn ${savedStatus[meditation.id] ? 'saved' : ''}`}
                          onClick={() => toggleSave(meditation.id)}
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
                    {showSaved ? 'No saved meditations yet' : showHistory ? 'No meditation history yet' : 'No meditation audio available'}
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