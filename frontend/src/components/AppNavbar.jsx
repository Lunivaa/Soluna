import { useState, useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import axios from 'axios';
import { FiBell } from 'react-icons/fi';
import ProfileDropdown from './ProfileDropdown';
import UserSettingsModal from './UserSettingsModal';
import logo from '../assets/logo.png';

export default function AppNavbar() {
  const [userInitial, setUserInitial] = useState('L');
  const [profilePic, setProfilePic] = useState(null);
  const [userName, setUserName] = useState('');
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notifSeen, setNotifSeen] = useState(() => localStorage.getItem('notifSeen') === '1');
  const notifRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const decoded = jwtDecode(token);
      const name = decoded.name || decoded.email?.split('@')[0] || 'User';
      const first = name.trim().split(' ')[0];
      setUserName(first);
      setUserInitial(first.charAt(0).toUpperCase());
    } catch {}

    axios.get('http://localhost:5001/api/auth/profile', {
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => {
      if (res.data.avatar) setProfilePic(res.data.avatar);
      if (res.data.name) {
        const first = res.data.name.trim().split(' ')[0];
        setUserName(first);
        setUserInitial(first.charAt(0).toUpperCase());
      }
    }).catch(() => {});

    buildNotifications(token);
  }, []);

  const buildNotifications = async (token) => {
    const headers = { Authorization: `Bearer ${token}` };
    const notifs = [];

    try {
      const subRes = await axios.get('http://localhost:5001/api/subscription/usage', { headers });
      const sub = subRes.data;
      const isPremium = sub?.isPremium;

      // Subscription expiry warning
      if (isPremium && sub?.subscriptionExpiry) {
        const daysLeft = Math.ceil((new Date(sub.subscriptionExpiry) - Date.now()) / 86400000);
        if (daysLeft <= 7 && daysLeft > 0) {
          notifs.push({ type: 'warning', text: `Your subscription expires in ${daysLeft} day${daysLeft > 1 ? 's' : ''}. Renew to keep full access.` });
        }
      }

      if (!isPremium) {
        // Chatbot limit (3 total)
        const chatUsed = sub?.chatbotCount ?? 0;
        const chatLeft = Math.max(0, 3 - chatUsed);
        if (chatLeft === 0) {
          notifs.push({ type: 'warning', text: "You've used all 3 free chatbot messages. Upgrade to keep chatting with your wellness companion." });
        } else if (chatLeft === 1) {
          notifs.push({ type: 'warning', text: `Only 1 chatbot message left. Have a chat with our wellness companion while you still can!` });
        }

        // Journal limit (5 total)
        const journalUsed = sub?.journalCount ?? 0;
        const journalLeft = Math.max(0, 5 - journalUsed);
        if (journalLeft === 0) {
          notifs.push({ type: 'warning', text: "You've reached your 5 free journal entries. Upgrade to keep reflecting." });
        } else if (journalLeft <= 2) {
          notifs.push({ type: 'reminder', text: `${journalLeft} journal entr${journalLeft > 1 ? 'ies' : 'y'} remaining on your free plan.` });
        }

        // Self-care library limit (8 total)
        const libraryUsed = sub?.libraryUsageCount ?? 0;
        const libraryLeft = Math.max(0, 8 - libraryUsed);
        if (libraryLeft === 0) {
          notifs.push({ type: 'warning', text: "You've used all 8 free self-care sessions. Upgrade for unlimited access." });
        } else if (libraryLeft <= 3) {
          notifs.push({ type: 'reminder', text: `${libraryLeft} self-care session${libraryLeft > 1 ? 's' : ''} left on your free plan.` });
        }
      }
    } catch {}

    try {
      // Mood reminder — if no entry today
      const moodRes = await axios.get('http://localhost:5001/api/mood', { headers });
      const history = moodRes.data.history || {};
      const todayKey = new Date().toLocaleDateString('en-CA');
      if (!history[todayKey]) {
        notifs.push({ type: 'reminder', text: "You haven't logged your mood today. How are you feeling?" });
      }
    } catch {}

    try {
      // Journal reminder — if no entry in last 3 days
      const journalRes = await axios.get('http://localhost:5001/api/journal', { headers });
      const entries = journalRes.data || [];
      if (entries.length === 0) {
        notifs.push({ type: 'info', text: 'Start your journaling journey — write your first entry today.' });
      } else {
        const diffDays = Math.floor((Date.now() - new Date(entries[0].modified)) / 86400000);
        if (diffDays >= 3) {
          notifs.push({ type: 'reminder', text: `It's been ${diffDays} days since your last journal entry. Take a moment to reflect.` });
        }
      }
    } catch {}

    if (notifs.length === 0) {
      notifs.push({ type: 'info', text: "You're all caught up! Keep up your wellness journey." });
    }

    setNotifications(notifs);
    // Only reset seen if content changed from last time
    const newHash = notifs.map(n => n.text).join('|');
    const lastHash = localStorage.getItem('notifHash');
    if (newHash !== lastHash) {
      localStorage.setItem('notifHash', newHash);
      localStorage.removeItem('notifSeen');
      setNotifSeen(false);
    }
  };

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotif(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Show subscription success notification right after payment
  useEffect(() => {
    const handler = () => {
      setNotifications(prev => [
        { type: 'info', text: 'Your Soluna subscription is active. Enjoy unlimited access to all features!' },
        ...prev.filter(n => n.text !== "You're all caught up! Keep up your wellness journey.")
      ]);
      setNotifSeen(false);
      localStorage.removeItem('notifSeen');
    };
    window.addEventListener('soluna:subscriptionActivated', handler);
    return () => window.removeEventListener('soluna:subscriptionActivated', handler);
  }, []);

  const unread = notifications.filter(n => n.type !== 'info').length;

  return (
    <>
    <nav className="navbar">
      <img src={logo} alt="Soluna Logo" className="nav-logo" />
      <ul className="nav-links">
        <li><NavLink to="/home" end className={({ isActive }) => isActive ? 'active' : ''}>Home</NavLink></li>
        <li><NavLink to="/mood" className={({ isActive }) => isActive ? 'active' : ''}>Mood Tracking</NavLink></li>
        <li><NavLink to="/journal" className={({ isActive }) => isActive ? 'active' : ''}>Journal</NavLink></li>
        <li><NavLink to="/chatbot" className={({ isActive }) => isActive ? 'active' : ''}>Chatbot</NavLink></li>
        <li><NavLink to="/libraries" className={({ isActive }) => isActive ? 'active' : ''}>Libraries</NavLink></li>
        <li><NavLink to="/reports" className={({ isActive }) => isActive ? 'active' : ''}>Reports</NavLink></li>
      </ul>

      {/* Notification Bell */}
      <div className="notif-wrapper" ref={notifRef}>
        <button className="notif-btn" onClick={() => { setShowNotif(v => !v); setNotifSeen(true); localStorage.setItem('notifSeen', '1'); }}>
          <FiBell size={24} />
          {unread > 0 && !notifSeen && <span className="notif-badge" />}
        </button>
        {showNotif && (
          <div className="notif-dropdown">
            <div className="notif-header">
              <span>Notifications</span>
              {unread > 0 && <span className="notif-count">{unread} new</span>}
            </div>
            {notifications.length === 0 ? (
              <div className="notif-empty">No notifications</div>
            ) : (
              notifications.map((n, i) => (
                <div key={i} className={`notif-item notif-${n.type}`}>
                  <span className="notif-dot" />
                  <p>{n.text}</p>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <ProfileDropdown
        userInitial={userInitial}
        profilePic={profilePic}
        userName={userName}
        onEditClick={() => setShowSettingsModal(true)}
        onProfileUpdate={(updates) => {
          if (updates.avatar !== undefined) setProfilePic(updates.avatar);
          if (updates.name) {
            const first = updates.name.trim().split(' ')[0];
            setUserName(first);
            setUserInitial(first.charAt(0).toUpperCase());
          }
        }}
      />
    </nav>
    {showSettingsModal && (
      <UserSettingsModal
        onClose={() => setShowSettingsModal(false)}
        profilePic={profilePic}
        setProfilePic={setProfilePic}
        adminName={userName}
        setAdminName={(name) => { setUserName(name); setUserInitial(name.charAt(0).toUpperCase()); }}
      />
    )}
    </>
  );
}