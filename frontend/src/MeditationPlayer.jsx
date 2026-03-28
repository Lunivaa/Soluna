import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FiArrowLeft, FiPlay, FiPause, FiSkipBack, FiSkipForward, FiSun } from "react-icons/fi";
import axios from "axios";
import { useUserPreferences } from "./hooks/useUserPreferences";
import { useSubscription } from "./contexts/SubscriptionContext";
import "./MeditationPlayer.css";
import "./Libraries.css";

export default function MeditationPlayer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [meditation, setMeditation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  
  const audioRef = useRef(null);
  const isDraggingRef = useRef(false);
  
  const { savedStatus, toggleSave, checkMultipleSavedStatus } = useUserPreferences();
  const { incrementLibrary } = useSubscription();
  const API_BASE = "http://localhost:5001/api/selfcare";

  useEffect(() => {
    fetchMeditation();
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [id]);

  const fetchMeditation = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/meditation`);
      const meditationData = response.data.find(m => m.id === parseInt(id));
      
      if (meditationData) {
        setMeditation(meditationData);
        await checkMultipleSavedStatus([meditationData.id]);
        loadAudio(meditationData);
      } else {
        navigate('/libraries/meditation');
      }
    } catch (error) {
      console.error('Error fetching meditation:', error);
      navigate('/libraries/meditation');
    } finally {
      setLoading(false);
    }
  };

  const loadAudio = (meditationData) => {
    if (!meditationData.audio_url) return;
    
    let finalAudioUrl = meditationData.audio_url;
    
    const fileId = extractGoogleDriveFileId(meditationData.audio_url);
    if (fileId) {
      finalAudioUrl = `http://localhost:5001/api/selfcare-proxy/audio/${fileId}`;
    } else if (meditationData.audio_url.includes('dropbox.com')) {
      if (meditationData.audio_url.includes('?dl=0')) {
        finalAudioUrl = meditationData.audio_url.replace('?dl=0', '?dl=1');
      } else if (!meditationData.audio_url.includes('?dl=1')) {
        finalAudioUrl = meditationData.audio_url + (meditationData.audio_url.includes('?') ? '&dl=1' : '?dl=1');
      }
    }
    
    const audio = new Audio(finalAudioUrl);
    audioRef.current = audio;
    
    audio.addEventListener('loadedmetadata', () => {
      setDuration(audio.duration);
    });
    
    audio.addEventListener('timeupdate', () => {
      if (!isDraggingRef.current) {
        setCurrentTime(audio.currentTime);
      }
    });
    
    audio.addEventListener('ended', () => {
      setIsPlaying(false);
      setCurrentTime(0);
    });
  };

  const extractGoogleDriveFileId = (url) => {
    if (!url || !url.includes('drive.google.com')) return null;
    
    const patterns = [
      /\/file\/d\/([a-zA-Z0-9_-]+)/,
      /[?&]id=([a-zA-Z0-9_-]+)/,
      /\/d\/([a-zA-Z0-9_-]+)/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    
    return null;
  };

  const togglePlayPause = async () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      // Count session only on first play (currentTime === 0)
      if (currentTime === 0) {
        const allowed = await incrementLibrary('meditation', meditation?.id);
        if (!allowed) return;
      }
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const seekTo = (newTime) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleProgressClick = (e) => {
    if (isDraggingRef.current) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const newTime = percentage * duration;
    seekTo(newTime);
  };

  const handleProgressMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
    isDraggingRef.current = true;
  };

  useEffect(() => {
    const handleGlobalMouseMove = (e) => {
      if (isDraggingRef.current && audioRef.current) {
        const progressBar = document.querySelector('.meditation-progress-container');
        if (progressBar) {
          const rect = progressBar.getBoundingClientRect();
          const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
          const percentage = x / rect.width;
          const newTime = percentage * duration;
          
          audioRef.current.currentTime = newTime;
          setCurrentTime(newTime);
        }
      }
    };

    const handleGlobalMouseUp = () => {
      if (isDraggingRef.current) {
        setIsDragging(false);
        isDraggingRef.current = false;
      }
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [isDragging, duration]);

  const skipForward = () => {
    if (!audioRef.current) return;
    const newTime = Math.min(audioRef.current.currentTime + 5, duration);
    seekTo(newTime);
  };

  const skipBackward = () => {
    if (!audioRef.current) return;
    const newTime = Math.max(audioRef.current.currentTime - 5, 0);
    seekTo(newTime);
  };

  const formatTime = (seconds) => {
    if (!seconds || seconds === 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
    <div className="libraries-page">
      <div className="meditation-player-container">
          <div className="loading-message">Loading meditation...</div>
        </div>
      </div>
    );
  }

  if (!meditation) {
    return null;
  }

  return (
    <div className="libraries-page meditation-player-page">
      <div className="libraries-container">
        <div className="page-header">
          <button className="libraries-back-btn" onClick={() => navigate('/libraries/meditation')}>
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

          <div className="player-content">
          {/* Full-width hero image */}
          <div className="player-artwork">
            <img 
              src={meditation.thumbnail_url || "/images/Wellness20.jpg"} 
              alt={meditation.title}
              onError={(e) => { e.target.src = '/images/Wellness20.jpg'; }}
            />
            {meditation.category && (
              <span className="player-category-badge">{meditation.category}</span>
            )}
          </div>
          
          <div className="player-details">
            <div className="player-meta">
              <div className="player-title-row">
                <h1 className="player-title">{meditation.title}</h1>
                <button
                  className={`mp-save-btn ${savedStatus[meditation.id] ? 'saved' : ''}`}
                  onClick={() => toggleSave(meditation.id)}
                  title={savedStatus[meditation.id] ? 'Saved' : 'Save for Later'}
                >
                  <svg viewBox="0 0 24 24" width="28" height="28">
                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                  </svg>
                </button>
              </div>
              <p className="player-description">{meditation.description || "Guided meditation for relaxation and mindfulness."}</p>
            </div>
            
            <div className="player-controls-section">
              <div 
                className="meditation-progress-container"
                onMouseDown={handleProgressMouseDown}
                onClick={handleProgressClick}
              >
                {currentTime > 0 && (
                  <div 
                    className="meditation-progress-bar"
                    style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                  />
                )}
              </div>
              
              <div className="meditation-progress-time">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
              
              <div className="player-controls">
                <button 
                  className="control-btn skip-btn"
                  onClick={skipBackward}
                  disabled={!audioRef.current}
                >
                  <FiSkipBack />
                </button>
                
                <button 
                  className="control-btn play-pause-btn"
                  onClick={togglePlayPause}
                  disabled={!audioRef.current}
                >
                  {isPlaying ? <FiPause /> : <FiPlay />}
                </button>
                
                <button 
                  className="control-btn skip-btn"
                  onClick={skipForward}
                  disabled={!audioRef.current}
                >
                  <FiSkipForward />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
