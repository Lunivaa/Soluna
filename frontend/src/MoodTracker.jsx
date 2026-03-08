import { useState, useEffect } from 'react';
import { Link, NavLink } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { FiHeart, FiRefreshCcw, FiMessageCircle, FiEdit3, FiVolume2, FiActivity, FiUser } from "react-icons/fi";
import { Chart as ChartJS, LineElement, PointElement, LinearScale, CategoryScale, Tooltip } from 'chart.js';
import { Line } from 'react-chartjs-2';
import logo from "./assets/logo.png";
import './MoodTracker.css';

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Tooltip);

const getLocalDateString = (date = new Date()) => {
  // Use the same simple approach as journal and chatbot - just get local date
  return date.toLocaleDateString('en-CA'); // 'en-CA' gives YYYY-MM-DD format
};

const MoodTracker = () => {
  const moods = [
    { id: 1, emoji: "😭", value: 1 },
    { id: 2, emoji: "😢", value: 2 },
    { id: 3, emoji: "😡", value: 3 },
    { id: 4, emoji: "😒", value: 4 },
    { id: 5, emoji: "😕", value: 5 },
    { id: 6, emoji: "😐", value: 6 },
    { id: 7, emoji: "🙂", value: 7 },
    { id: 8, emoji: "😊", value: 8 },
    { id: 9, emoji: "😌", value: 9 },
    { id: 10, emoji: "🤩", value: 10 },
  ];

  const today = getLocalDateString();
  const API_BASE = "http://localhost:5001/api";

  const [moodHistory, setMoodHistory] = useState({});
  const [selectedMood, setSelectedMood] = useState(10);
  const [todayLogged, setTodayLogged] = useState(false);
  
  // NEW: Controls when the mood input is visible
  const [moodSectionReady, setMoodSectionReady] = useState(false);

  const [affirmations, setAffirmations] = useState([]);
  const [affirmation, setAffirmation] = useState("");
  const [affirmationKey, setAffirmationKey] = useState(0);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [userInitial, setUserInitial] = useState("U");
  const [selectedWeekOffset, setSelectedWeekOffset] = useState(0); // 0 = current week, -1 = last week, etc.
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestedActivities, setSuggestedActivities] = useState([]);

  const getCurrentWeekSunday = () => {
    const now = new Date(); // Use simple new Date() like journal and chatbot
    
    // Standard week calculation - Sunday is start of week
    const todayDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const lastSunday = new Date(now);
    lastSunday.setDate(now.getDate() - todayDay);
    lastSunday.setHours(0, 0, 0, 0); // Set to start of Sunday
    return lastSunday;
  };

  const getWeekSunday = (weekOffset = 0) => {
    const currentWeekSunday = getCurrentWeekSunday();
    const targetWeekSunday = new Date(currentWeekSunday);
    targetWeekSunday.setDate(currentWeekSunday.getDate() + (weekOffset * 7));
    return targetWeekSunday;
  };

  const goToPreviousWeek = () => {
    setSelectedWeekOffset(prev => prev - 1);
  };

  const goToNextWeek = () => {
    setSelectedWeekOffset(prev => prev + 1);
  };

  const goToCurrentWeek = () => {
    setSelectedWeekOffset(0);
  };

  const getWeekDisplayText = () => {
    if (selectedWeekOffset === 0) return "This Week";
    if (selectedWeekOffset === -1) return "Last Week";
    if (selectedWeekOffset === 1) return "Next Week";
    if (selectedWeekOffset < -1) return `${Math.abs(selectedWeekOffset)} Weeks Ago`;
    return `${selectedWeekOffset} Weeks Ahead`;
  };

  const getWeekDateRange = () => {
    const weekSunday = getWeekSunday(selectedWeekOffset);
    const weekSaturday = new Date(weekSunday);
    weekSaturday.setDate(weekSunday.getDate() + 6);
    
    const formatDate = (date) => {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric'
      });
    };
    
    return `${formatDate(weekSunday)} - ${formatDate(weekSaturday)}`;
  };

  const getActivitySuggestions = (moodScore) => {
    const suggestions = [];
    
    if (moodScore <= 3) {
      // Very low mood - calming and supportive activities
      suggestions.push(
        { 
          title: "Breathing Exercises", 
          description: "Try deep breathing to calm your mind", 
          link: "/libraries/breathing",
          icon: <FiActivity />,
          category: "Breathing"
        },
        { 
          title: "Guided Meditation", 
          description: "Find peace with gentle meditation", 
          link: "/libraries/meditation",
          icon: <FiUser />,
          category: "Meditation"
        },
        { 
          title: "Calming Sounds", 
          description: "Listen to soothing nature sounds", 
          link: "/libraries/sounds",
          icon: <FiVolume2 />,
          category: "Sounds"
        },
        { 
          title: "Talk to Someone", 
          description: "Share your feelings with our chatbot", 
          link: "/chatbot",
          icon: <FiMessageCircle />,
          category: "Support"
        }
      );
    } else if (moodScore <= 5) {
      // Low mood - gentle activities to lift spirits
      suggestions.push(
        { 
          title: "Breathing Exercises", 
          description: "Gentle breathing to ease tension", 
          link: "/libraries/breathing",
          icon: <FiActivity />,
          category: "Breathing"
        },
        { 
          title: "Creative Expression", 
          description: "Express yourself through art", 
          link: "/libraries/canvas",
          icon: <FiEdit3 />,
          category: "Creative"
        },
        { 
          title: "Relaxing Sounds", 
          description: "Peaceful sounds to soothe your mind", 
          link: "/libraries/sounds",
          icon: <FiVolume2 />,
          category: "Sounds"
        },
        { 
          title: "Journal Your Thoughts", 
          description: "Write down what's on your mind", 
          link: "/journal",
          icon: <FiEdit3 />,
          category: "Reflection"
        }
      );
    } else if (moodScore <= 7) {
      // Neutral mood - balanced activities
      suggestions.push(
        { 
          title: "Meditation Session", 
          description: "Center yourself with mindfulness", 
          link: "/libraries/meditation",
          icon: <FiUser />,
          category: "Meditation"
        },
        { 
          title: "Creative Canvas", 
          description: "Explore your creativity", 
          link: "/libraries/canvas",
          icon: <FiEdit3 />,
          category: "Creative"
        },
        { 
          title: "Breathing Practice", 
          description: "Maintain balance with breathing", 
          link: "/libraries/breathing",
          icon: <FiActivity />,
          category: "Breathing"
        },
        { 
          title: "Ambient Sounds", 
          description: "Background sounds for focus", 
          link: "/libraries/sounds",
          icon: <FiVolume2 />,
          category: "Sounds"
        }
      );
    } else {
      // High mood - energizing and celebratory activities
      suggestions.push(
        { 
          title: "Energizing Meditation", 
          description: "Boost your positive energy", 
          link: "/libraries/meditation",
          icon: <FiUser />,
          category: "Meditation"
        },
        { 
          title: "Creative Expression", 
          description: "Channel your joy into art", 
          link: "/libraries/canvas",
          icon: <FiEdit3 />,
          category: "Creative"
        },
        { 
          title: "Uplifting Sounds", 
          description: "Energizing nature sounds", 
          link: "/libraries/sounds",
          icon: <FiVolume2 />,
          category: "Sounds"
        },
        { 
          title: "Share Your Joy", 
          description: "Tell our chatbot about your day", 
          link: "/chatbot",
          icon: <FiMessageCircle />,
          category: "Share"
        }
      );
    }
    
    return suggestions.slice(0, 3); // Return top 3 suggestions
  };

  const getEmoji = (mood) => moods.find(m => m.value === mood)?.emoji || '';

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const decoded = jwtDecode(token);
        setUserInitial((decoded.name || decoded.email || "U")[0].toUpperCase());
      } catch {
        setUserInitial("U");
      }
    }
  }, []);

  // FETCH MOOD HISTORY - Now fully controls visibility
  useEffect(() => {
    const fetchMoods = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setSelectedMood(10);
        setTodayLogged(false);
        setMoodSectionReady(true);
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/mood`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();
        
        const history = data.history || data;
        const todayLoggedFromServer = data.todayLogged || false;
        const todayMood = data.todayMood || null;
        
        setMoodHistory(history);

        // Use local date string for comparison
        const localToday = getLocalDateString();
        const todayMoodFromHistory = history[localToday];
        
        if (todayMoodFromHistory !== undefined) {
          setSelectedMood(todayMoodFromHistory);
          setTodayLogged(true);
        } else if (todayLoggedFromServer && todayMood !== null) {
          setSelectedMood(todayMood);
          setTodayLogged(true);
        } else {
          setSelectedMood(10);
          setTodayLogged(false);
        }
      } catch (err) {
        console.error("Failed to load mood history:", err);
        setMoodHistory({});
        setSelectedMood(10);
        setTodayLogged(false);
      } finally {
        setMoodSectionReady(true); // Now show everything correctly
      }
    };

    fetchMoods();
  }, []);

  const handleLogMood = async () => {
    if (todayLogged) return;

    const token = localStorage.getItem("token");
    if (!token) {
      alert("Please log in to save your mood.");
      return;
    }

    const moodToLog = Math.round(selectedMood);

    try {
      const res = await fetch(`${API_BASE}/mood`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ mood: moodToLog }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Save failed: ${res.status} ${errorText}`);
      }

      setMoodHistory(prev => ({ ...prev, [today]: moodToLog }));
      setTodayLogged(true);
      setSelectedMood(moodToLog);
      
      // Generate and show activity suggestions
      const suggestions = getActivitySuggestions(moodToLog);
      setSuggestedActivities(suggestions);
      setShowSuggestions(true);
    } catch (err) {
      console.error("Failed to save mood:", err);
      alert("Failed to save mood. Check console for details.");
    }
  };

  useEffect(() => {
    const fetchAffirmations = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        const mood = Math.round(selectedMood);
        const res = await fetch(`${API_BASE}/affirmations/${mood}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const affs = await res.json();
          setAffirmations(affs);
          if (affs.length > 0) {
            setAffirmation(affs[0].text);
          }
        }
      } catch (err) {
        console.error("Failed to load affirmations:", err);
      }
    };

    // Only fetch affirmations after mood section is ready
    if (moodSectionReady) {
      fetchAffirmations();
    }
  }, [selectedMood, moodSectionReady]);

  const refreshAffirmation = () => {
    if (affirmations.length === 0) return;

    const options = affirmations.filter(a => a.text !== affirmation);
    const nextAffirmation = options.length > 0 
      ? options[Math.floor(Math.random() * options.length)]
      : affirmations[0];

    setAffirmation(nextAffirmation.text);
    setAffirmationKey(prev => prev + 1);
  };

  const handleSliderChange = (e) => {
    if (todayLogged) return;
    setSelectedMood(parseFloat(e.target.value));
  };

  const handleSliderRelease = () => {
    if (todayLogged) return;
    refreshAffirmation();
  };

  // All stats, calendar, chart code remains exactly the same...
  const getWeeklyStats = () => {
    let total = 0, count = 0;
    const weekMoods = [];
    const lastSunday = getCurrentWeekSunday();
    const now = new Date(); // Use simple new Date() like journal and chatbot
    
    // Set today to end of day for proper comparison
    const todayEndOfDay = new Date(now);
    todayEndOfDay.setHours(23, 59, 59, 999);

    let remainingDays = 0;

    for (let i = 0; i < 7; i++) {
      const d = new Date(lastSunday);
      d.setDate(lastSunday.getDate() + i);
      const key = getLocalDateString(d);
      const mood = moodHistory[key];
      
      if (mood) {
        total += mood;
        count++;
        weekMoods.push(mood);
      } else {
        // Only count days that haven't passed yet (including today if not logged)
        const dayEndOfDay = new Date(d);
        dayEndOfDay.setHours(23, 59, 59, 999);
        
        if (dayEndOfDay >= todayEndOfDay || getLocalDateString(d) === getLocalDateString(now)) {
          remainingDays++;
        }
      }
    }

    const average = count ? (total / count).toFixed(1) : null;
    const progress = average ? (average / 10) * 100 : 0;

    // Find most common mood - only if there's actually a repeated mood
    const counts = {};
    weekMoods.forEach(m => counts[m] = (counts[m] || 0) + 1);
    
    let common = null;
    let maxCount = 0;
    
    // Find the mood with highest count
    Object.keys(counts).forEach(mood => {
      if (counts[mood] > maxCount) {
        maxCount = counts[mood];
        common = parseInt(mood);
      }
    });
    
    // Only show "most common" if it appears more than once
    const emoji = (common && maxCount > 1) ? getEmoji(common) : "";

    return { average, count, progress, emoji, remainingDays };
  };

  const { average, count: daysTracked, progress, emoji: mostCommonEmoji, remainingDays } = getWeeklyStats();

  const generateCalendar = () => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month, i);
      const key = getLocalDateString(d);
      days.push({ day: i, mood: moodHistory[key] || 0 });
    }
    return days;
  };

  const calendarDays = generateCalendar();

  const lastSunday = getWeekSunday(selectedWeekOffset);

  const lineChartData = {
    labels: [],
    datasets: [{
      data: [],
      borderColor: '#9565B8',
      backgroundColor: 'rgba(149, 101, 184, 0.1)',
      tension: 0.4,
      pointBackgroundColor: '#9565B8',
      pointBorderColor: '#9565B8',
      pointRadius: 6,
      pointHoverRadius: 8,
      spanGaps: true, // This allows lines to connect across missing data points
    }]
  };

  for (let i = 0; i < 7; i++) {
    const d = new Date(lastSunday);
    d.setDate(lastSunday.getDate() + i);
    const key = getLocalDateString(d);
    lineChartData.labels.push(d.toLocaleDateString('en-US', { weekday: 'long' }));
    lineChartData.datasets[0].data.push(moodHistory[key] ?? null);
  }

  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: function(context) {
            const moodValue = context.raw;
            if (!moodValue) return "No entry";
            return ` ${getEmoji(moodValue)} ${moodValue}/10`;
          }
        }
      }
    },
    scales: {
      y: { min: 0, max: 12, ticks: { stepSize: 2 } },
      x: { grid: { display: false } }
    },
    elements: {
      point: {
        radius: function(context) {
          // Only show points for days with data
          return context.raw !== null ? 6 : 0;
        }
      }
    }
  };

  return (
    <div className="mood-tracker-page">
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
        <div className="profile-circle">{userInitial}</div>
      </nav>

      <div className="app">
        <div className="container">
          <div className="mood-affirmation-row">
            <div className="card mood-card">
              <h2>How are you feeling today?</h2>

              {/* ONLY SHOW MOOD INPUT WHEN DATA IS READY */}
              {moodSectionReady ? (
                <>
                  <div className="emoji-row-fixed" style={{ pointerEvents: 'none' }}>
                    {moods.map(mood => (
                      <div
                        key={mood.id}
                        className={`emoji-item ${Math.round(selectedMood) === mood.value ? 'selected' : ''}`}
                      >
                        {mood.emoji}
                      </div>
                    ))}
                  </div>

                  <div className="slider-container">
                    <input
                      type="range"
                      min="1"
                      max="10"
                      step="0.01"
                      value={selectedMood}
                      onChange={handleSliderChange}
                      onMouseUp={handleSliderRelease}
                      onTouchEnd={handleSliderRelease}
                      className="slider"
                      disabled={todayLogged}
                      style={{ cursor: todayLogged ? 'not-allowed' : 'pointer' }}
                    />
                    <div className="slider-labels">
                      <span>Terrible</span>
                      <span>Excellent</span>
                    </div>
                  </div>

                  <button
                    onClick={handleLogMood}
                    className={`log-btn ${todayLogged ? 'logged' : ''}`}
                    disabled={todayLogged}
                  >
                    {todayLogged ? 'Logged Today' : 'Log Mood'}
                  </button>
                </>
              ) : (
                /* Optional: empty space or subtle placeholder */
                <div style={{ height: '220px' }}></div>
              )}
            </div>

            <div className="card affirmation-card">
              <div className="affirmation-header">
                <FiHeart className="affirmation-heart" />
              </div>
              <div className="affirmation-text">
                <p key={affirmationKey}>{affirmation}</p>
              </div>
              <button onClick={refreshAffirmation} className="log-btn refresh-btn">
                <FiRefreshCcw style={{ marginRight: "8px" }} /> New Affirmation
              </button>
            </div>
          </div>

          {/* Activity Suggestions */}
          {showSuggestions && (
            <div className="suggestions-row">
              <div className="card suggestions-card">
                <div className="suggestions-header">
                  <h2>Suggested Activities for You</h2>
                  <p>Based on your mood score of {Math.round(selectedMood)}/10</p>
                  <button 
                    className="close-suggestions-btn"
                    onClick={() => setShowSuggestions(false)}
                  >
                    ×
                  </button>
                </div>
                <div className="suggestions-grid">
                  {suggestedActivities.map((activity, index) => (
                    <Link 
                      key={index} 
                      to={activity.link} 
                      className="suggestion-card"
                      onClick={() => setShowSuggestions(false)}
                    >
                      <div className="suggestion-icon">{activity.icon}</div>
                      <div className="suggestion-content">
                        <h3>{activity.title}</h3>
                        <p>{activity.description}</p>
                        <span className="suggestion-category">{activity.category}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Weekly stats, chart, calendar all show immediately */}
          <div className="weekly-row">
            <div className="card this-week-card">
              <h2>This Week</h2>
              <div className="average-display">
                <span className="average-value">{average || '-'} / 10.0</span>
              </div>
              <div className="average-label">Average mood</div>
              <div className="mood-progress-container">
                <div className="mood-progress-bar" style={{ width: `${progress}%` }}></div>
              </div>
            </div>

            <div className="card summary-card">
              <h2>Weekly Summary</h2>
              <div className="summary-item">
                <span className="label">Days tracked</span>
                <span className="value">{daysTracked}/7</span>
              </div>
              <div className="summary-item">
                <span className="label">Most common</span>
                <span className="value">{mostCommonEmoji || '—'}</span>
              </div>
              <p className="motivation">
                {daysTracked === 7
                  ? 'Great job! Full week tracked! 🎉'
                  : remainingDays === 0
                  ? 'Week is over! No more days to track.'
                  : remainingDays === 1
                  ? 'Track 1 more day this week!'
                  : `Track ${remainingDays} more days this week!`}
              </p>
            </div>
          </div>

          <div className="mood-calendar-row">
            <div className="card chart-card-left">
              <div className="chart-header">
                <div className="chart-title-section">
                  <h2>Mood Trends ({getWeekDisplayText()})</h2>
                </div>
                <div className="chart-navigation">
                  <button 
                    className="chart-nav-btn" 
                    onClick={goToPreviousWeek}
                  >
                    ‹
                  </button>
                  <span className="current-week-text">
                    {selectedWeekOffset === 0 ? getWeekDateRange() : getWeekDateRange()}
                  </span>
                  <button 
                    className="chart-nav-btn" 
                    onClick={goToNextWeek}
                    disabled={selectedWeekOffset >= 0}
                  >
                    ›
                  </button>
                  <button 
                    className="chart-nav-btn reset-btn" 
                    onClick={goToCurrentWeek}
                    disabled={selectedWeekOffset === 0}
                  >
                    Today
                  </button>
                </div>
              </div>
              <div style={{ height: '240px' }}>
                <Line data={lineChartData} options={lineChartOptions} />
              </div>
            </div>

            <div className="card calendar-card">
              <div className="calendar-header">
                <button onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1))}>{"<"}</button>
                <h3>{calendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h3>
                <button onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1))}>{">"}</button>
              </div>

              <div className="calendar-grid">
                {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
                  <div key={d} className="day-label">{d}</div>
                ))}

                {Array.from({ length: 42 }, (_, i) => {
                  const dayInfo = calendarDays[i];
                  return (
                    <div
                      key={`date-${i}`}
                      className="calendar-cell"
                    >
                      {dayInfo && dayInfo.mood > 0 && <div className="cell-emoji">{getEmoji(dayInfo.mood)}</div>}
                      {dayInfo && <div className="cell-number">{dayInfo.day}</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MoodTracker;