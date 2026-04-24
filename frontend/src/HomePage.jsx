import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useSearchParams } from "react-router-dom";
import "./HomePage.css";
import { API_URL } from "./api";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { jwtDecode } from "jwt-decode";
import axios from "axios";
import { useAuth } from './contexts/AuthContext';
import { useSubscription } from './contexts/SubscriptionContext';
import UserSettingsModal from './components/UserSettingsModal';
import { FiWind, FiHeadphones, FiActivity, FiSettings, FiHelpCircle, FiBookOpen, FiStar } from "react-icons/fi";
import './components/SubscriptionModal.css';
import './components/UserSettingsModal.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend);

const HomePage = () => {
  const { user, updateProfile } = useAuth();
  const [moodData, setMoodData] = useState(null);
  const [recentJournals, setRecentJournals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedWeekOffset, setSelectedWeekOffset] = useState(0);
  const [subSuccessInfo, setSubSuccessInfo] = useState(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const { setShowSubscriptionModal, syncFromBackend } = useSubscription();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Rate Soluna modal state
  const [showRateModal, setShowRateModal] = useState(false);
  const [ratingValue, setRatingValue] = useState(0);
  const [ratingHover, setRatingHover] = useState(0);
  const [ratingComment, setRatingComment] = useState("");
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const [hasRated, setHasRated] = useState(false);
  const [allowPublic, setAllowPublic] = useState(false);


  useEffect(() => {
    // Restore scroll position if coming back from Help & Support
    const savedPos = sessionStorage.getItem('homeScrollPos');
    if (savedPos) {
      setTimeout(() => {
        window.scrollTo({ top: parseInt(savedPos), behavior: 'instant' });
      }, 50);
      sessionStorage.removeItem('homeScrollPos');
    } else {
      window.scrollTo(0, 0);
    }
  }, []);

  // Detect post-payment redirect and show success popup
  useEffect(() => {
    const subscribed = searchParams.get('subscribed');
    if (subscribed) {
      const expiry = new Date();
      if (subscribed === 'yearly') expiry.setFullYear(expiry.getFullYear() + 1);
      else expiry.setMonth(expiry.getMonth() + 1);
      setSubSuccessInfo({ plan: subscribed, expiry });
      syncFromBackend();
      setSearchParams({}, { replace: true });
    }
  }, []);

  // Check if user has already rated
  useEffect(() => {
    const checkRating = async () => {
      const token = (localStorage.getItem('token') || sessionStorage.getItem('token'));
      if (!token) return;
      try {
        const res = await axios.get(`${API_URL}/api/feedback/mine`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data.hasRated) {
          setHasRated(true);
        }
      } catch { }
    };
    checkRating();
  }, []);

  const handleNavigation = (path) => {
    if (path === '/help') {
      sessionStorage.setItem('homeScrollPos', window.scrollY);
    }
    navigate(path);
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }, 0);
  };

  const getAuthHeaders = () => {
    const token = (localStorage.getItem("token") || sessionStorage.getItem("token"));
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  useEffect(() => {
    // Fetch real data from backend
    fetchHomePageData();
  }, []);

  // Refetch mood data when week changes
  useEffect(() => {
    const token = (localStorage.getItem("token") || sessionStorage.getItem("token"));
    if (token && !isLoading) {
      const fetchMoodForWeek = async () => {
        try {
          const moodResponse = await axios.get(`${API_URL}/api/mood`, {
            headers: getAuthHeaders()
          });
          const moodHistory = moodResponse.data.history || {};
          updateMoodDataForWeek(moodHistory);
        } catch (error) {
          console.error("Error fetching mood data for week:", error);
        }
      };
      fetchMoodForWeek();
    }
  }, [selectedWeekOffset]);

  const getCurrentWeekSunday = () => {
    const now = new Date();
    const todayDay = now.getDay();
    const lastSunday = new Date(now);
    lastSunday.setDate(now.getDate() - todayDay);
    lastSunday.setHours(0, 0, 0, 0);
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

  const fetchHomePageData = async () => {
    try {
      setIsLoading(true);

      // Fetch mood history
      const moodResponse = await axios.get(`${API_URL}/api/mood`, {
        headers: getAuthHeaders()
      });

      // Fetch recent journal entries
      const journalResponse = await axios.get(`${API_URL}/api/journal`, {
        headers: getAuthHeaders()
      });

      // Store full mood history for week navigation
      const moodHistory = moodResponse.data.history || {};

      // Get last 3 journal entries
      const sortedJournals = journalResponse.data
        .sort((a, b) => new Date(b.modified) - new Date(a.modified))
        .slice(0, 3);

      setRecentJournals(sortedJournals);

      // Process mood data based on selected week
      updateMoodDataForWeek(moodHistory);

      setIsLoading(false);
    } catch (error) {
      console.error("Error fetching homepage data:", error);
      setIsLoading(false);

      // Set default empty data on error
      updateMoodDataForWeek({});
    }
  };

  const updateMoodDataForWeek = (moodHistory) => {
    const weekSunday = getWeekSunday(selectedWeekOffset);
    const labels = [];
    const moodValues = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(weekSunday);
      d.setDate(weekSunday.getDate() + i);
      const key = d.toLocaleDateString('en-CA');
      labels.push(d.toLocaleDateString('en-US', { weekday: 'long' }));
      moodValues.push(moodHistory[key] ?? null);
    }

    setMoodData({
      labels,
      datasets: [
        {
          label: "Mood Level",
          data: moodValues,
          backgroundColor: "#9565B8",
          borderColor: "#9565B8",
          borderWidth: 0,
          borderRadius: { topLeft: 6, topRight: 6, bottomLeft: 0, bottomRight: 0 },
          borderSkipped: false,
          hoverBackgroundColor: "#9565B8",
          hoverBorderColor: "#9565B8",
        },
      ],
    });
  };

  const getTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
    if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    return `${diffDays} days ago`;
  };

  const moodOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: function (context) {
            const moodValue = context.raw;
            if (!moodValue) return "No entry";
            const emoji = moods.find(m => m.value === Math.round(moodValue))?.emoji || '';
            return ` ${emoji} ${moodValue}/10`;
          }
        }
      }
    },
    scales: {
      y: { min: 0, max: 12, ticks: { stepSize: 2 } },
      x: { grid: { display: false } }
    }
  };

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

  const submitRating = async () => {
    if (!ratingValue) return;
    setRatingSubmitting(true);
    try {
      const token = (localStorage.getItem("token") || sessionStorage.getItem("token"));
      await axios.post(`${API_URL}/api/feedback`, {
        rating: ratingValue,
        comment: ratingComment.trim(),
        is_public: allowPublic
      }, { headers: { Authorization: `Bearer ${token}` } });
      setRatingSubmitted(true);
      setHasRated(true);
    } catch (err) {
      console.error("Failed to submit rating:", err);
    } finally {
      setRatingSubmitting(false);
    }
  };

  const quickAccessItems = [
    { title: "Mood Tracking", desc: "Monitor your emotional well-being over time and identify patterns.", link: "/mood" },
    { title: "Journaling", desc: "Reflect on your thoughts and feelings in a private, safe space designed just for you.", link: "/journal" },
    { title: "Chatbot Support", desc: "Engage in supportive conversations with our AI companion.", link: "/chatbot" },
    { title: "Self-Care Library", desc: "Discover curated resources for mental wellness and personal growth.", link: "/libraries" },
    { title: "Progress Reports", desc: "Visualize your journey and gain insights into your well-being.", link: "/reports" },
  ];

  return (
    <>
      <div className="homepage">
        {/* Welcome Section */}
        <section className="welcome-section">
          <h1>Hello, {user?.name}!</h1>
          <p>Your feelings are valid, and your journey matters.</p>
          <button className="log-mood-btn" onClick={() => handleNavigation('/mood')}>Log My Mood</button>
        </section>

        {/* Quick-Play Libraries */}
        <section className="quick-play-section">
          <h2>Quick-Play Libraries</h2>
          <div className="quick-play-grid">
            <div className="quick-play-card" onClick={() => handleNavigation('/libraries/breathing')}>
              <img src="https://i.pinimg.com/736x/8a/72/9f/8a729f4a2ed735ceb466f4e327337d75.jpg" alt="Breathing Exercises" className="quick-play-img" />
              <div className="quick-play-overlay">
                <div className="quick-play-icon">
                  <FiWind />
                </div>
                <h3>Breathing Exercises</h3>
                <p>Short guided exercises for focus and calm.</p>
              </div>
            </div>
            <div className="quick-play-card" onClick={() => handleNavigation('/libraries/sounds')}>
              <img src="https://i.pinimg.com/736x/84/d2/c2/84d2c2b0c809ae90e3b0395d615f2551.jpg" alt="Calm Sound Loops" className="quick-play-img" />
              <div className="quick-play-overlay">
                <div className="quick-play-icon">
                  <FiHeadphones />
                </div>
                <h3>Relaxing Soundscapes</h3>
                <p>Soothing ambient sounds to relax and unwind.</p>
              </div>
            </div>
            <div className="quick-play-card" onClick={() => handleNavigation('/libraries/meditation')}>
              <img src="https://i.pinimg.com/736x/98/31/ad/9831ad555a8db60817347f2a2dd2b586.jpg" alt="Meditation Audio" className="quick-play-img" />
              <div className="quick-play-overlay">
                <div className="quick-play-icon">
                  <FiActivity />
                </div>
                <h3>Guided Meditations</h3>
                <p>Guided meditations for stress reduction and clarity.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Wellness Overview */}
        <section className="wellness-overview">
          <h2>Your Wellness Overview</h2>
          {isLoading ? (
            <div className="loading-state">Loading your wellness data...</div>
          ) : (
            <div className="overview-grid">
              <div className="mood-trends">
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
                      {getWeekDateRange()}
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
                  {moodData && <Bar data={moodData} options={moodOptions} />}
                </div>
              </div>
              <div className="recent-reflections">
                <h3>Recent Reflections</h3>
                {recentJournals.length > 0 ? (
                  <>
                    <div className="reflections-list">
                      {recentJournals.map((journal) => {
                        // Properly strip HTML and decode entities
                        const tempDiv = document.createElement('div');
                        tempDiv.innerHTML = journal.content || '';
                        const plainText = tempDiv.textContent || tempDiv.innerText || '';

                        return (
                          <div key={journal.id} className="journal-entry-card">
                            <div className="journal-entry-time">{getTimeAgo(journal.modified)}</div>
                            <div className="journal-entry-title">{journal.title || 'Untitled Entry'}</div>
                            {plainText && (
                              <div className="journal-entry-preview">
                                {plainText.substring(0, 60)}...
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <button className="view-entries-btn" onClick={() => handleNavigation('/journal')}>View All Entries</button>
                  </>
                ) : (
                  <>
                    <p className="no-entries">No journal entries yet. Start reflecting on your thoughts and feelings.</p>
                    <button className="view-entries-btn" onClick={() => handleNavigation('/journal')}>Start Journaling</button>
                  </>
                )}
              </div>
            </div>
          )}
        </section>

        {/* Quick Access */}
        <section className="quick-access">
          <h2>Quick Access</h2>
          <div className="quick-grid">
            {quickAccessItems.map((item, index) => (
              <div className="quick-card" key={index}>
                <h3>{item.title}</h3>
                <p>{item.desc}</p>
                <button onClick={() => handleNavigation(item.link)}>Explore</button>
              </div>
            ))}
          </div>
        </section>

        {/* Account Shortcuts */}
        <section className="account-shortcuts">
          <h2>Account Shortcuts</h2>
          <div className="account-shortcuts-grid">
            <div className="account-shortcut-item" onClick={() => handleNavigation('/help')}>
              <FiHelpCircle className="shortcut-icon" />
              <span>Help &amp; Support</span>
            </div>
            <div className="account-shortcut-item" onClick={() => setShowSettingsModal(true)}>
              <FiSettings className="shortcut-icon" />
              <span>Settings</span>
            </div>
            <div className="account-shortcut-item" onClick={() => setShowSubscriptionModal(true)}>
              <FiBookOpen className="shortcut-icon" />
              <span>Subscription</span>
            </div>
            <div className="account-shortcut-item" onClick={() => setShowRateModal(true)}>
              <FiStar className="shortcut-icon" />
              <span>Rate Soluna</span>
            </div>
          </div>
        </section>

      </div>

      {/* Rate Soluna Modal */}
      {showRateModal && createPortal(
        <div className="rate-modal-overlay">
          <div className="rate-modal">
            {ratingSubmitted ? (
              <>
                <div className="rate-modal-header">
                  <h3>Thank You!</h3>
                </div>
                <div className="rate-modal-body">
                  <p>Your rating helps us improve Soluna. We appreciate your feedback!</p>
                </div>
                <div className="rate-modal-actions">
                  <button className="rate-submit-btn" onClick={() => setShowRateModal(false)}>Got it</button>
                </div>
              </>
            ) : hasRated ? (
              <>
                <div className="rate-modal-header">
                  <h3>Already Rated</h3>
                </div>
                <div className="rate-modal-body">
                  <p>You have already submitted your rating. Thank you for your feedback!</p>
                </div>
                <div className="rate-modal-actions">
                  <button className="rate-submit-btn" onClick={() => setShowRateModal(false)}>Got it</button>
                </div>
              </>
            ) : (
              <>
                <div className="rate-modal-header">
                  <div>
                    <h3>Rate Soluna</h3>
                    <p>How has your experience been?</p>
                  </div>
                </div>
                <form onSubmit={(e) => { e.preventDefault(); submitRating(); }}>
                  <div className="rate-modal-body">
                    <div style={{ position: 'relative' }}>
                      <input
                        type="number"
                        required
                        min="1"
                        max="5"
                        value={ratingValue || ''}
                        onChange={() => { }}
                        tabIndex={-1}
                        style={{ position: 'absolute', bottom: '22px', left: '50%', width: 0, height: 0, opacity: 0, pointerEvents: 'none' }}
                      />
                      <div className="rate-stars">
                        {[1, 2, 3, 4, 5].map(star => (
                          <button
                            type="button"
                            key={star}
                            className={`rate-star-btn ${star <= (ratingHover || ratingValue) ? 'active' : ''}`}
                            onMouseEnter={() => setRatingHover(star)}
                            onMouseLeave={() => setRatingHover(0)}
                            onClick={() => setRatingValue(star)}
                          >
                            <FiStar />
                          </button>
                        ))}
                      </div>
                    </div>
                    <textarea
                      className="rate-comment"
                      placeholder="Share your thoughts..."
                      value={ratingComment}
                      onChange={e => setRatingComment(e.target.value)}
                      rows={3}
                      required
                    />
                    <label className="rate-public-label">
                      <input
                        type="checkbox"
                        className="rate-public-checkbox"
                        checked={allowPublic}
                        onChange={e => setAllowPublic(e.target.checked)}
                        id="rate-public-check"
                      />
                      <span className="rate-public-box" aria-hidden="true" />
                      <span>Allow my feedback to be shown publicly</span>
                    </label>
                    <p className="rate-privacy-note">
                      We guarantee no personal information will be displayed — not even your email address.
                    </p>
                  </div>
                  <div className="rate-modal-actions">
                    <button type="button" className="rate-cancel-btn" onClick={() => {
                      setShowRateModal(false);
                      setRatingValue(0);
                      setRatingComment("");
                      setRatingHover(0);
                      setAllowPublic(false);
                      // Don't ask again in this session
                      sessionStorage.setItem('rateDismissedDate', new Date().toLocaleDateString('en-CA'));
                    }}>Cancel</button>
                    <button type="submit" className="rate-submit-btn" disabled={ratingSubmitting}>
                      Submit
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
        , document.body)}

      {/* Subscription success popup */}
      {subSuccessInfo && (
        <div className="sub-overlay" style={{ zIndex: 999999 }}>
          <div className="sub-success-modal">
            <div className="sub-success-header">
              <h3>Subscription Activated</h3>
            </div>
            <div className="sub-success-body">
              <p>Your <strong>{subSuccessInfo.plan === 'yearly' ? 'Yearly' : 'Monthly'} Plan</strong> is now active.</p>
              <div className="sub-success-details">
                <div className="sub-success-detail-row">
                  <span>Plan</span>
                  <strong>{subSuccessInfo.plan === 'yearly' ? 'Yearly' : 'Monthly'}</strong>
                </div>
                <div className="sub-success-detail-row">
                  <span>Amount Paid</span>
                  <strong>{subSuccessInfo.plan === 'yearly' ? 'Rs. 5,000 / year' : 'Rs. 500 / month'}</strong>
                </div>
                <div className="sub-success-detail-row">
                  <span>Valid For</span>
                  <strong>{subSuccessInfo.plan === 'yearly' ? '12 months' : '1 month'}</strong>
                </div>
                <div className="sub-success-detail-row">
                  <span>Expires On</span>
                  <strong>{subSuccessInfo.expiry.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</strong>
                </div>
              </div>
              <p className="sub-success-perks">
                {subSuccessInfo.plan === 'yearly'
                  ? 'Unlimited access to all features + Priority Support'
                  : 'Unlimited access to all features'}
              </p>
            </div>
            <div className="sub-success-actions">
              <button className="sub-success-btn" onClick={() => setSubSuccessInfo(null)}>Start Exploring</button>
            </div>
          </div>
        </div>
      )}
      {showSettingsModal && (
        <UserSettingsModal
          onClose={() => setShowSettingsModal(false)}
          profilePic={user.avatar}
          setProfilePic={(avatar) => updateProfile({ avatar })}
          adminName={user.name}
          setAdminName={(name) => updateProfile({ name })}
        />
      )}
    </>
  );
};

export default HomePage;