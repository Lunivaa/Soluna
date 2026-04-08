import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import OpenEyeIcon from '../assets/icons/open-eye.png';
import ClosedEyeIcon from '../assets/icons/closed-eye.png';

const API = 'http://localhost:5001/api';

export default function UserSettingsModal({ onClose, profilePic, setProfilePic, adminName, setAdminName }) {
  const [nameInput, setNameInput] = useState(adminName || '');
  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' });
  const [userInitial, setUserInitial] = useState((adminName || 'L').charAt(0).toUpperCase());
  const [showRemovePhotoModal, setShowRemovePhotoModal] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [popup, setPopup] = useState({ show: false, title: '', message: '' });
  const navigate = useNavigate();

  const showPopup = (title, message) => setPopup({ show: true, title, message });
  const closePopup = () => setPopup({ show: false, title: '', message: '' });

  const getHeaders = () => {
    const token = (localStorage.getItem('token') || sessionStorage.getItem('token'));
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const getPasswordStrength = (pw) => {
    let s = 0;
    if (pw.length >= 6) s++;
    if (/[A-Z]/.test(pw)) s++;
    if (/[a-z]/.test(pw)) s++;
    if (/[0-9]/.test(pw)) s++;
    if (/[!@#$%^&*]/.test(pw)) s++;
    if (s <= 2) return 'weak';
    if (s <= 4) return 'medium';
    return 'strong';
  };

  useEffect(() => {
    setNameInput(adminName || '');
    setUserInitial((adminName || 'L').charAt(0).toUpperCase());
  }, [adminName]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        const size = Math.min(img.width, img.height, 400);
        canvas.width = size; canvas.height = size;
        canvas.getContext('2d').drawImage(img, 0, 0, size, size);
        const b64 = canvas.toDataURL('image/jpeg', 0.7);
        setProfilePic(b64);
        try { await axios.put(`${API}/auth/profile/avatar`, { avatar: b64 }, { headers: getHeaders() }); } catch {}
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="us-overlay">
      <div className="us-modal" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="us-header">
          <h3>Settings</h3>
          <button className="us-close" onClick={onClose}>×</button>
        </div>

        <div className="us-body">
          {/* Avatar section */}
          <div className="us-avatar-section">
            <input id="us-pic-upload" type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
            <div className="us-avatar" onClick={() => document.getElementById('us-pic-upload').click()}>
              {profilePic
                ? <img src={profilePic} alt="Profile" />
                : <span>{userInitial}</span>}
              <div className="us-avatar-overlay">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
              </div>
            </div>
            <div className="us-avatar-actions">
              <button className="us-btn-outline" onClick={() => document.getElementById('us-pic-upload').click()}>Upload Photo</button>
              <button className="us-btn-ghost" onClick={() => setShowRemovePhotoModal(true)}>Remove</button>
            </div>
          </div>

          <div className="us-divider" />

          {/* Display Name */}
          <div className="us-section">
            <h4 className="us-section-title">Account Information</h4>
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!nameInput.trim()) return;
              if (nameInput.trim() === adminName) {
                showPopup('No Changes', 'The name is the same as the current one.');
                return;
              }
              try {
                await axios.put(`${API}/auth/profile/name`, { name: nameInput.trim() }, { headers: getHeaders() });
                setAdminName(nameInput.trim());
                setUserInitial(nameInput.trim().charAt(0).toUpperCase());
                showPopup('Name Updated', 'Display name updated successfully.');
              } catch {
                showPopup('Error', 'Failed to update display name.');
              }
            }}>
              <div className="us-field" style={{ position: 'relative' }}>
                <label className="us-label">Display Name</label>
                <input type="text" required className="us-input"
                  value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                  placeholder="Enter display name"
                />
              </div>
              <button type="submit" className="us-btn-primary">Save Changes</button>
            </form>
          </div>

          <div className="us-divider" />

          {/* Change Password */}
          <div className="us-section">
            <h4 className="us-section-title">Change Password</h4>
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (pwForm.newPw !== pwForm.confirm) { showPopup('Password Mismatch', 'New passwords do not match.'); return; }
              if (pwForm.newPw.length < 6) { showPopup('Weak Password', 'Password must be at least 6 characters.'); return; }
              if (!/[A-Z]/.test(pwForm.newPw)) { showPopup('Weak Password', 'Password must include at least one uppercase letter.'); return; }
              if (!/[a-z]/.test(pwForm.newPw)) { showPopup('Weak Password', 'Password must include at least one lowercase letter.'); return; }
              if (!/[0-9]/.test(pwForm.newPw)) { showPopup('Weak Password', 'Password must include at least one number.'); return; }
              if (!/[!@#$%^&*]/.test(pwForm.newPw)) { showPopup('Weak Password', 'Password must include at least one special character (!@#$%^&*).'); return; }
              try {
                await axios.put(`${API}/auth/profile/password`,
                  { currentPassword: pwForm.current, newPassword: pwForm.newPw },
                  { headers: getHeaders() }
                );
                setPwForm({ current: '', newPw: '', confirm: '' });
                showPopup('Password Updated', 'Your password has been updated successfully.');
              } catch (err) {
                showPopup('Error', err.response?.data?.message || 'Failed to update password.');
              }
            }}>
              <div className="us-field">
                <label className="us-label">Current Password</label>
                <div className="us-pw-wrap">
                  <input type={showCurrent ? 'text' : 'password'} required className="us-input"
                    value={pwForm.current}
                    onChange={e => setPwForm(f => ({ ...f, current: e.target.value }))}
                    placeholder="Current password"
                  />
                  <button type="button" className="us-pw-toggle" onClick={() => setShowCurrent(v => !v)}>
                    <img src={showCurrent ? OpenEyeIcon : ClosedEyeIcon} alt="toggle" />
                  </button>
                </div>
              </div>
              <div className="us-field">
                <label className="us-label">New Password</label>
                <div className="us-pw-wrap">
                  <input type={showNew ? 'text' : 'password'} required minLength={6} className="us-input"
                    pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).{6,}"
                    title="Min 6 chars with uppercase, lowercase, number & special character (!@#$%^&*)"
                    value={pwForm.newPw}
                    onChange={e => setPwForm(f => ({ ...f, newPw: e.target.value }))}
                    placeholder="New password"
                  />
                  {pwForm.newPw && (
                    <span className={`us-pw-strength ${getPasswordStrength(pwForm.newPw)}`}>
                      {getPasswordStrength(pwForm.newPw).charAt(0).toUpperCase() + getPasswordStrength(pwForm.newPw).slice(1)}
                    </span>
                  )}
                  <button type="button" className="us-pw-toggle" onClick={() => setShowNew(v => !v)}>
                    <img src={showNew ? OpenEyeIcon : ClosedEyeIcon} alt="toggle" />
                  </button>
                </div>
              </div>
              <div className="us-field">
                <label className="us-label">Confirm New Password</label>
                <div className="us-pw-wrap">
                  <input type={showConfirm ? 'text' : 'password'} required className="us-input"
                    value={pwForm.confirm}
                    onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))}
                    placeholder="Confirm new password"
                  />
                  {pwForm.confirm && (
                    <span className={`us-pw-strength ${pwForm.confirm === pwForm.newPw ? 'strong' : 'weak'}`}>
                      {pwForm.confirm === pwForm.newPw ? 'Match' : 'No match'}
                    </span>
                  )}
                  <button type="button" className="us-pw-toggle" onClick={() => setShowConfirm(v => !v)}>
                    <img src={showConfirm ? OpenEyeIcon : ClosedEyeIcon} alt="toggle" />
                  </button>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                <button type="submit" className="us-btn-primary">Update Password</button>
                <button type="button" className="us-btn-forgot" onClick={() => { onClose(); navigate('/forgot-password'); }}>
                  Forgot Password?
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {popup.show && (
        <div className="modal-overlay" onClick={e => e.stopPropagation()}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3>{popup.title}</h3></div>
            <div className="modal-body"><p>{popup.message}</p></div>
            <div className="modal-actions">
              <button className="modal-btn delete-btn" onClick={closePopup}>OK</button>
            </div>
          </div>
        </div>
      )}

      {showRemovePhotoModal && (
        <div className="modal-overlay">
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3>Remove Photo</h3></div>
            <div className="modal-body"><p>Are you sure you want to remove your profile photo?</p></div>
            <div className="modal-actions">
              <button className="modal-btn cancel-btn" onClick={() => setShowRemovePhotoModal(false)}>Cancel</button>
              <button className="modal-btn delete-btn" onClick={async () => {
                setShowRemovePhotoModal(false);
                setProfilePic(null);
                try { await axios.put(`${API}/auth/profile/avatar`, { avatar: null }, { headers: getHeaders() }); } catch {}
              }}>Remove</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}