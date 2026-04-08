import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './ProfileDropdown.css';

export default function ProfileDropdown({ userInitial, profilePic, userName: propUserName, userEmail, onProfileUpdate, onLogout, isAdmin, variant, onEditClick }) {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [userName, setUserName] = useState(propUserName || '');
  const [localProfilePic, setLocalProfilePic] = useState(profilePic);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showRemovePhotoModal, setShowRemovePhotoModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setLocalProfilePic(profilePic);
  }, [profilePic]);

  useEffect(() => {
    if (propUserName) {
      setUserName(propUserName);
      return;
    }
    const token = (localStorage.getItem('token') || sessionStorage.getItem('token'));
    if (token) {
      try {
        const decoded = JSON.parse(atob(token.split('.')[1]));
        const name = (decoded.name || decoded.email?.split('@')[0] || 'User').trim();
        setUserName(name);
      } catch (err) {
        console.error('Failed to decode token');
      }
    }
  }, [propUserName]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showProfileMenu && !event.target.closest('.profile-wrapper') && !event.target.closest('.modal-overlay') && !event.target.closest('.modal-content')) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showProfileMenu]);

  const getAuthHeaders = () => {
    const token = isAdmin ? (localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken')) : (localStorage.getItem('token') || sessionStorage.getItem('token'));
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const handleProfilePicChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = async () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          const MAX = 400;
          let w = img.width, h = img.height;
          if (w > h) { if (w > MAX) { h *= MAX / w; w = MAX; } }
          else { if (h > MAX) { w *= MAX / h; h = MAX; } }
          canvas.width = w; canvas.height = h;
          ctx.drawImage(img, 0, 0, w, h);
          const base64String = canvas.toDataURL('image/jpeg', 0.7);
          setLocalProfilePic(base64String);
          try {
            const apiBase = isAdmin ? 'http://localhost:5001/api/admin' : 'http://localhost:5001/api/auth';
            await axios.put(`${apiBase}/profile/avatar`, { avatar: base64String }, { headers: getAuthHeaders() });
            if (onProfileUpdate) onProfileUpdate({ avatar: base64String });
          } catch (error) {
            console.error('Failed to save profile picture:', error);
            alert('Failed to save profile picture. Please try a smaller image.');
          }
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveProfilePic = () => setShowRemovePhotoModal(true);

  const confirmRemovePhoto = async () => {
    setLocalProfilePic(null);
    try {
      const apiBase = isAdmin ? 'http://localhost:5001/api/admin' : 'http://localhost:5001/api/auth';
      await axios.put(`${apiBase}/profile/avatar`, { avatar: null }, { headers: getAuthHeaders() });
      if (onProfileUpdate) onProfileUpdate({ avatar: null });
    } catch (error) {
      console.error('Failed to remove profile picture:', error);
    } finally {
      setShowRemovePhotoModal(false);
    }
  };

  const handleLogout = () => setShowLogoutModal(true);

  const confirmLogout = () => {
    if (isAdmin) {
      localStorage.removeItem('adminToken'); sessionStorage.removeItem('adminToken');
      if (onLogout) onLogout();
    } else {
      localStorage.removeItem('token'); sessionStorage.removeItem('token');
      setShowLogoutModal(false);
      navigate('/');
    }
  };

  const handleProfilePicClick = () => {
    const input = document.getElementById('profile-pic-upload');
    if (input) { input.value = ''; input.click(); }
  };

  return (
    <>
      <div className="profile-wrapper">
        <div className="profile-circle" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowProfileMenu(!showProfileMenu); }}>
          {localProfilePic ? <img src={localProfilePic} alt="Profile" className="profile-pic-img" /> : userInitial}
        </div>
        {showProfileMenu && (
          <div className={`profile-dropdown${variant === 'sidebar' ? ' profile-dropdown-sidebar' : ''}`} onClick={(e) => e.stopPropagation()}>
            <div className="profile-dropdown-header">
              <div className="profile-dropdown-pic">
                {localProfilePic ? <img src={localProfilePic} alt="Profile" /> : <div className="profile-dropdown-initial">{userInitial}</div>}
              </div>
              <div className="profile-dropdown-info">
                <div className="profile-dropdown-name">{userName}</div>
                {!localProfilePic
                  ? <button className="photo-link" onClick={handleProfilePicClick}>Add photo</button>
                  : <button className="photo-link" onClick={handleRemoveProfilePic}>Remove photo</button>
                }
              </div>
            </div>
            <input id="profile-pic-upload" type="file" accept="image/*" onChange={handleProfilePicChange} style={{ display: 'none' }} />
            <div className="profile-dropdown-actions">
              <div className="profile-dropdown-row">
                <button className="profile-dropdown-item-half" onClick={() => { setShowProfileMenu(false); if (onEditClick) onEditClick(); }}>
                  Edit
                </button>
                <button className="profile-dropdown-item-half" onClick={handleLogout}>
                  Logout
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {showLogoutModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header"><h3>Logout</h3></div>
            <div className="modal-body"><p>Do you really want to log out?</p></div>
            <div className="modal-actions">
              <button className="modal-btn cancel-btn" onClick={() => setShowLogoutModal(false)}>Cancel</button>
              <button className="modal-btn delete-btn" onClick={confirmLogout}>Yes</button>
            </div>
          </div>
        </div>
      )}

      {showRemovePhotoModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header"><h3>Remove Photo</h3></div>
            <div className="modal-body"><p>Do you really want to remove your profile photo?</p></div>
            <div className="modal-actions">
              <button className="modal-btn cancel-btn" onClick={() => setShowRemovePhotoModal(false)}>Cancel</button>
              <button className="modal-btn delete-btn" onClick={confirmRemovePhoto}>Yes</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}