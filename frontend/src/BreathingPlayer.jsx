import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, NavLink } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { FiArrowLeft, FiPlay, FiPause, FiVolume2, FiVolumeX, FiRotateCcw, FiWind } from "react-icons/fi";
import axios from "axios";
import { useUserPreferences } from "./hooks/useUserPreferences";
import "./BreathingPlayer.css";
import logo from "./assets/logo.png";
import ProfileDropdown from "./components/ProfileDropdown";

export default function BreathingPlayer() {
  const [userInitial, setUserInitial] = useState("L");
  const [profilePic, setProfilePic] = useState(null);
  const { id } = useParams();
  const navigate = useNavigate();
  const [exercise, setExercise] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [phase, setPhase] = useState("ready");
  const [cycleCount, setcycleCount] = useState(0);
  const [totalCycles, setTotalCycles] = useState(0);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [pausedPhase, setPausedPhase] = useState(null);
  const [countdownValue, setCountdownValue] = useState(3);

  const timerRef = useRef(null);
  const isPlayingRef = useRef(false);
  const audioEnabledRef = useRef(true);
  const exerciseRef = useRef(null);
  const totalCyclesRef = useRef(0);

  const { savedStatus, toggleSave, checkMultipleSavedStatus } = useUserPreferences();
  const API_BASE = "http://localhost:5001/api/selfcare";

  const playAudioCue = (text) => {
    if (!audioEnabledRef.current || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.6;
    utterance.pitch = 1.2;
    utterance.volume = 0.25;
    const voices = window.speechSynthesis.getVoices();
    const melodicVoice = voices.find(voice =>
      voice.name.includes('Samantha') || voice.name.includes('Serena') ||
      voice.name.includes('Ava') || voice.name.includes('Zoe') ||
      voice.name.includes('Tessa') || voice.name.includes('Nicky') ||
      voice.name.includes('Fiona') ||
      (voice.lang.includes('en-US') && voice.name.includes('Female') && voice.localService) ||
      (voice.lang.includes('en-GB') && voice.name.includes('Female'))
    ) || voices.find(voice => voice.lang.includes('en') && voice.localService && !voice.name.includes('Microsoft'))
      || voices.find(voice => voice.lang.includes('en'));
    if (melodicVoice) utterance.voice = melodicVoice;
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const decoded = jwtDecode(token);
        if (decoded.name) setUserInitial(decoded.name.trim().charAt(0).toUpperCase());
        else if (decoded.email) setUserInitial(decoded.email.charAt(0).toUpperCase());
      } catch { setUserInitial("U"); }
      axios.get('http://localhost:5001/api/auth/profile', { headers: { Authorization: `Bearer ${token}` } })
        .then(res => { if (res.data.avatar) setProfilePic(res.data.avatar); }).catch(() => {});
    }
    fetchExercise();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (window.speechSynthesis) window.speechSynthesis.cancel();
    };
  }, [id]);

  const fetchExercise = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/breathing`);
      const exerciseData = response.data.find(e => e.id === parseInt(id));
      if (exerciseData) {
        setExercise(exerciseData);
        exerciseRef.current = exerciseData;
        await checkMultipleSavedStatus([exerciseData.id]);
        // Calculate cycles from actual phase durations vs total duration
        const totalSeconds = (exerciseData.duration || 5) * 60;
        const cycleSeconds = (
          (exerciseData.inhale_duration || 4) +
          (exerciseData.hold_duration || 0) +
          (exerciseData.exhale_duration || 4) +
          (exerciseData.rest_duration || 0)
        );
        const cycles = Math.max(1, Math.round(totalSeconds / cycleSeconds));
        setTotalCycles(cycles);
        totalCyclesRef.current = cycles;
      } else { navigate('/libraries/breathing'); }
    } catch { navigate('/libraries/breathing'); }
    finally { setLoading(false); }
  };

  const getBreathingPattern = (ex) => {
    if (!ex) return { inhale: 4000, hold: 0, exhale: 4000, rest: 0 };
    return {
      inhale: (ex.inhale_duration ?? 4) * 1000,
      hold:   (ex.hold_duration   ?? 0) * 1000,
      exhale: (ex.exhale_duration ?? 4) * 1000,
      rest:   (ex.rest_duration   ?? 0) * 1000
    };
  };

  const continueFromPhase = (resumePhase, skipAudio = false) => {
    if (!isPlayingRef.current) return;
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    const pattern = getBreathingPattern(exerciseRef.current);
    switch (resumePhase) {
      case "inhale":
        setPhase("inhale");
        if (!skipAudio && audioEnabledRef.current) playAudioCue("Breathe in");
        timerRef.current = setTimeout(() => {
          if (!isPlayingRef.current) return;
          continueFromPhase(pattern.hold > 0 ? "hold" : "exhale");
        }, pattern.inhale);
        break;
      case "hold":
        setPhase("hold");
        if (!skipAudio && audioEnabledRef.current && pattern.hold > 0) playAudioCue("Hold");
        if (pattern.hold > 0) {
          timerRef.current = setTimeout(() => { if (!isPlayingRef.current) return; continueFromPhase("exhale"); }, pattern.hold);
        } else { continueFromPhase("exhale"); }
        break;
      case "exhale":
        setPhase("exhale");
        if (!skipAudio && audioEnabledRef.current) playAudioCue("Breathe out");
        timerRef.current = setTimeout(() => {
          if (!isPlayingRef.current) return;
          if (pattern.rest > 0) { continueFromPhase("rest"); }
          else {
            setcycleCount(prev => {
              const n = prev + 1;
              if (n >= totalCyclesRef.current) { setIsPlaying(false); isPlayingRef.current = false; setPhase("complete"); if (audioEnabledRef.current) playAudioCue("Exercise complete"); return n; }
              runBreathingCycle(); return n;
            });
          }
        }, pattern.exhale);
        break;
      case "rest":
        setPhase("rest");
        if (!skipAudio && audioEnabledRef.current && pattern.rest > 0) playAudioCue("Rest");
        if (pattern.rest > 0) {
          timerRef.current = setTimeout(() => {
            if (!isPlayingRef.current) return;
            setcycleCount(prev => {
              const n = prev + 1;
              if (n >= totalCyclesRef.current) { setIsPlaying(false); isPlayingRef.current = false; setPhase("complete"); if (audioEnabledRef.current) playAudioCue("Exercise complete"); return n; }
              runBreathingCycle(); return n;
            });
          }, pattern.rest);
        }
        break;
      default: runBreathingCycle(); break;
    }
  };

  const runBreathingCycle = () => continueFromPhase("inhale");

  const startExercise = () => {
    setIsPlaying(true); isPlayingRef.current = true;
    setCountdownValue(3); setPhase("countdown");
    if (audioEnabledRef.current) playAudioCue("3");
    timerRef.current = setTimeout(() => {
      if (!isPlayingRef.current) return; setCountdownValue(2); if (audioEnabledRef.current) playAudioCue("2");
      timerRef.current = setTimeout(() => {
        if (!isPlayingRef.current) return; setCountdownValue(1); if (audioEnabledRef.current) playAudioCue("1");
        timerRef.current = setTimeout(() => { if (!isPlayingRef.current) return; setcycleCount(0); runBreathingCycle(); }, 1000);
      }, 1000);
    }, 1000);
  };

  const pauseExercise = () => {
    setIsPlaying(false); isPlayingRef.current = false; setPausedPhase(phase);
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    if (window.speechSynthesis) window.speechSynthesis.cancel();
  };

  const resumeExercise = () => {
    setIsPlaying(true); isPlayingRef.current = true;
    if (pausedPhase) { continueFromPhase(pausedPhase, true); setPausedPhase(null); }
    else runBreathingCycle();
  };

  const resetExercise = () => {
    setIsPlaying(false); isPlayingRef.current = false;
    setPhase("ready"); setcycleCount(0); setCountdownValue(3); setPausedPhase(null);
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    if (window.speechSynthesis) window.speechSynthesis.cancel();
  };

  const getPhaseText = () => {
    switch (phase) {
      case "ready": return "Ready";
      case "countdown": return countdownValue;
      case "inhale": return "Inhale";
      case "hold": return "Hold";
      case "exhale": return "Exhale";
      case "rest": return "Rest";
      case "complete": return "Done!";
      default: return "";
    }
  };

  const getAnimationStyle = () => {
    if (!exerciseRef.current) return {};
    const pattern = getBreathingPattern(exerciseRef.current);
    return { '--inhale-duration': `${pattern.inhale / 1000}s`, '--exhale-duration': `${pattern.exhale / 1000}s` };
  };

  const pattern = exerciseRef.current ? getBreathingPattern(exerciseRef.current) : { inhale: 4000, hold: 0, exhale: 4000, rest: 0 };

  if (loading) return (
    <div className="libraries-page">
      <nav className="navbar">
        <img src={logo} alt="Soluna Logo" className="nav-logo" />
        <ul className="nav-links">
          <li><NavLink to="/home" end className={({ isActive }) => isActive ? "active" : ""}>Home</NavLink></li>
          <li><NavLink to="/mood" className={({ isActive }) => isActive ? "active" : ""}>Mood Tracking</NavLink></li>
          <li><NavLink to="/journal" className={({ isActive }) => isActive ? "active" : ""}>Journal</NavLink></li>
          <li><NavLink to="/chatbot" className={({ isActive }) => isActive ? "active" : ""}>Chatbot</NavLink></li>
          <li><NavLink to="/libraries" className={({ isActive }) => isActive ? "active" : ""}>Libraries</NavLink></li>
          <li><NavLink to="/reports" className={({ isActive }) => isActive ? "active" : ""}>Reports</NavLink></li>
        </ul>
        <ProfileDropdown userInitial={userInitial} profilePic={profilePic}
          onProfileUpdate={(updates) => { if (updates.avatar !== undefined) setProfilePic(updates.avatar); }} />
      </nav>
      <div className="bp-loading">Loading exercise...</div>
    </div>
  );

  if (!exercise) return null;

  return (
    <div className="libraries-page">
      <nav className="navbar">
        <img src={logo} alt="Soluna Logo" className="nav-logo" />
        <ul className="nav-links">
          <li><NavLink to="/home" end className={({ isActive }) => isActive ? "active" : ""}>Home</NavLink></li>
          <li><NavLink to="/mood" className={({ isActive }) => isActive ? "active" : ""}>Mood Tracking</NavLink></li>
          <li><NavLink to="/journal" className={({ isActive }) => isActive ? "active" : ""}>Journal</NavLink></li>
          <li><NavLink to="/chatbot" className={({ isActive }) => isActive ? "active" : ""}>Chatbot</NavLink></li>
          <li><NavLink to="/libraries" className={({ isActive }) => isActive ? "active" : ""}>Libraries</NavLink></li>
          <li><NavLink to="/reports" className={({ isActive }) => isActive ? "active" : ""}>Reports</NavLink></li>
        </ul>
        <ProfileDropdown userInitial={userInitial} profilePic={profilePic}
          onProfileUpdate={(updates) => { if (updates.avatar !== undefined) setProfilePic(updates.avatar); }} />
      </nav>

      <div className="libraries-container">
        {/* Header — matches BreathingExercises page-header exactly */}
        <div className="page-header">
          <button className="libraries-back-btn" onClick={() => navigate('/libraries/breathing')}>
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

        {/* Player card */}
        <div className="bp-card">

          {/* Card header: thumbnail + title/desc + save */}
          <div className="bp-card-header">
            <img
              className="bp-thumbnail"
              src={exercise.thumbnail_url || '/images/Wellness1.jpg'}
              alt={exercise.title}
              onError={(e) => { e.target.src = '/images/Wellness1.jpg'; }}
            />
            <div className="bp-card-info">
              <h2 className="bp-title">{exercise.title}</h2>
              <p className="bp-desc">{exercise.description || "Follow the breathing pattern for relaxation."}</p>
            </div>
            <button
              className={`bp-save-btn ${savedStatus[exercise.id] ? 'saved' : ''}`}
              onClick={() => toggleSave(exercise.id)}
              title={savedStatus[exercise.id] ? 'Saved' : 'Save Exercise'}
            >
              <svg viewBox="0 0 24 24" width="22" height="22">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
              </svg>
            </button>
          </div>

          {/* Breathing circle */}
          <div className="bp-circle-area">
            <div className={`bp-circle ${phase}`} style={getAnimationStyle()}>
              <div className="bp-circle-inner">
                <span className="bp-phase-text">{getPhaseText()}</span>
                {phase !== "ready" && phase !== "complete" && phase !== "countdown" && (
                  <span className="bp-cycle-label">Cycle {cycleCount + 1} / {totalCycles}</span>
                )}
              </div>
            </div>
          </div>

          {/* Phase stats row */}
          <div className="bp-stats-row">
            <div className={`bp-stat ${phase === 'inhale' ? 'active' : ''}`}>
              <span className="bp-stat-label">INHALE</span>
              <span className="bp-stat-value">{pattern.inhale / 1000}s</span>
            </div>
            <div className={`bp-stat ${phase === 'hold' ? 'active' : ''}`}>
              <span className="bp-stat-label">HOLD</span>
              <span className="bp-stat-value">{pattern.hold / 1000}s</span>
            </div>
            <div className={`bp-stat ${phase === 'exhale' ? 'active' : ''}`}>
              <span className="bp-stat-label">EXHALE</span>
              <span className="bp-stat-value">{pattern.exhale / 1000}s</span>
            </div>
            <div className={`bp-stat ${phase === 'rest' ? 'active' : ''}`}>
              <span className="bp-stat-label">REST</span>
              <span className="bp-stat-value">{pattern.rest / 1000}s</span>
            </div>
          </div>

          {/* Controls */}
          <div className="bp-controls">
            {/* Reset — always visible, disabled before starting */}
            <button
              className={`bp-btn bp-btn-secondary ${phase === "ready" ? "disabled" : ""}`}
              onClick={phase !== "ready" ? resetExercise : undefined}
              title="Reset"
              disabled={phase === "ready"}
            >
              <FiRotateCcw />
            </button>

            {/* Play / Pause */}
            {!isPlaying && phase === "ready" && (
              <button className="bp-btn bp-btn-play" onClick={startExercise}><FiPlay /></button>
            )}
            {isPlaying && (
              <button className="bp-btn bp-btn-play" onClick={pauseExercise}><FiPause /></button>
            )}
            {!isPlaying && phase !== "ready" && phase !== "complete" && (
              <button className="bp-btn bp-btn-play" onClick={resumeExercise}><FiPlay /></button>
            )}
            {phase === "complete" && (
              <button className="bp-btn bp-btn-play" onClick={resetExercise}><FiRotateCcw /></button>
            )}

            {/* Sound — always visible */}
            <button
              className={`bp-btn bp-btn-secondary ${!audioEnabled ? 'muted' : ''}`}
              onClick={() => {
                const next = !audioEnabled;
                setAudioEnabled(next);
                audioEnabledRef.current = next;
                if (!next && window.speechSynthesis) window.speechSynthesis.cancel();
              }}
              title={audioEnabled ? 'Mute guidance' : 'Enable guidance'}
            >
              {audioEnabled ? <FiVolume2 /> : <FiVolumeX />}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
