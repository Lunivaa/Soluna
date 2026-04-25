import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from "./api";
import { FiLogOut } from 'react-icons/fi';
import logo from './assets/logo.png';
import ProfileDropdown from './components/ProfileDropdown';
import OpenEyeIcon from './assets/icons/open-eye.png';
import ClosedEyeIcon from './assets/icons/closed-eye.png';
import './UserProfile.css';
import { useAuth } from './contexts/AuthContext';

const API = `${API_URL}/api`;

export default function UserProfile() {
  const { user, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [nameInput, setNameInput] = useState('');
  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' });
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showRemovePhotoModal, setShowRemovePhotoModal] = useState(false);
  const [popup, setPopup] = useState({ show: false, title: '', message: '' });
  const [showPwCurrent, setShowPwCurrent] = useState(false);
  const [showPwNew, setShowPwNew] = useState(false);
  const [showPwConfirm, setShowPwConfirm] = useState(false);

  const getHeaders = () => {
    const token = (localStorage.getItem('token') || sessionStorage.getItem('token'));
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const showPopup = (title, message) => setPopup({ show: true, title, message });
  const closePopup = () => setPopup({ show: false, title: '', message: '' });

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
    setNameInput(user.name);
  }, [user.name]);

  const handleLogout = () => setShowLogoutModal(true);
  const confirmLogout = () => { localStorage.removeItem('token'); sessionStorage.removeItem('token'); navigate('/'); };

  return (
    <div className="soluna-admin-dashboard">
      <nav className="soluna-admin-navbar">
        <div className="soluna-admin-nav-left">
          <img src={logo} alt="Soluna" className="soluna-admin-nav-logo" />
        </div>
        <div className="soluna-admin-nav-right">
          <button className="soluna-admin-nav-btn" onClick={() => navigate('/home')}>← Back to Home</button>
        </div>
      </nav>

      <div style={{ flex: 1, padding: '28px 32px', overflowY: 'auto' }}>
        <div className="ps-page-header">
          <h2 className="ps-page-title">Profile Settings</h2>
          <p className="ps-page-subtitle">Manage your personal information and account security.</p>
        </div>

        <input id="up-pic-upload" type="file" accept="image/*" style={{ display: 'none' }}
          onChange={(e) => {
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
                updateProfile({ avatar: b64 });
                try { await axios.put(`${API}/auth/profile/avatar`, { avatar: b64 }, { headers: getHeaders() }); } catch {}
              };
              img.src = reader.result;
            };
            reader.readAsDataURL(file);
            e.target.value = '';
          }}
        />

        <div className="ps-layout">
          {/* Left col */}
          <div className="ps-left-col">
            <div className="ps-card ps-avatar-card">
              <div className="ps-avatar-banner">
                <div className="ps-avatar-wrap" onClick={() => document.getElementById('up-pic-upload').click()}>
                  <div className="ps-avatar">
                    {user.avatar ? <img src={user.avatar} alt="Profile" /> : <span>{user.initial}</span>}
                  </div>
                  <div className="ps-avatar-overlay">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                  </div>
                </div>
              </div>
              <div className="ps-avatar-body">
                <p className="ps-avatar-name">{user.name}</p>
                <span className="ps-avatar-role">Member</span>
                <button className="ps-btn-upload-full" onClick={() => document.getElementById('up-pic-upload').click()}>
                  Upload New Photo
                </button>
                <button className="ps-btn-signout-card" onClick={() => {
                  if (!user.avatar) {
                    showPopup('No Photo', 'There is no profile photo to remove.');
                  } else {
                    setShowRemovePhotoModal(true);
                  }
                }}>
                  Remove Photo
                </button>
              </div>
            </div>

            <div className="ps-card">
              <div className="ps-card-header">
                <h4 className="ps-card-title">Account Information</h4>
                <p className="ps-card-desc">Update your display name.</p>
              </div>
              <div className="ps-card-body">
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  if (!nameInput.trim()) return;
                  if (nameInput.trim() === user.name) {
                    showPopup('No Changes', 'The name is the same as the current one.');
                    return;
                  }
                  try {
                    await axios.put(`${API}/auth/profile/name`, { name: nameInput.trim() }, { headers: getHeaders() });
                    updateProfile({ name: nameInput.trim() });
                    showPopup('Name Updated', 'Display name updated successfully.');
                  } catch {
                    showPopup('Error', 'Failed to update display name.');
                  }
                }}>
                  <div className="ps-field">
                    <label className="ps-label">Display Name</label>
                    <input type="text" required className="ps-input"
                      autoComplete="off"
                      value={nameInput}
                      onChange={e => setNameInput(e.target.value)}
                      placeholder="Enter display name"
                    />
                  </div>
                  <button type="submit" className="ps-btn-primary" style={{ marginTop: '12px' }}>Save Changes</button>
                </form>
              </div>
            </div>
          </div>

          {/* Right col */}
          <div className="ps-right-col">
            <div className="ps-card ps-pw-card">
              <div className="ps-card-header">
                <h4 className="ps-card-title">Change Password</h4>
                <p className="ps-card-desc">Keep your account secure with a strong password.</p>
              </div>
              <div className="ps-card-body">
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
                  <div className="ps-pw-form">
                    <div className="ps-field">
                      <label className="ps-label">Current Password</label>
                      <div className="ps-pw-wrapper">
                        <input type={showPwCurrent ? 'text' : 'password'} required className="ps-input"
                          value={pwForm.current}
                          onChange={e => setPwForm(f => ({ ...f, current: e.target.value }))}
                          placeholder="Enter current password"
                        />
                        <span className="ps-pw-toggle" onClick={() => setShowPwCurrent(v => !v)}>
                          <img src={showPwCurrent ? OpenEyeIcon : ClosedEyeIcon} alt="toggle" />
                        </span>
                      </div>
                    </div>
                    <div className="ps-field">
                      <label className="ps-label">New Password</label>
                      <div className="ps-pw-wrapper">
                        <input type={showPwNew ? 'text' : 'password'} required minLength={6} className="ps-input"
                          value={pwForm.newPw}
                          onChange={e => setPwForm(f => ({ ...f, newPw: e.target.value }))}
                          placeholder="New password"
                        />
                        {pwForm.newPw && (
                          <span className={`ps-pw-strength ${getPasswordStrength(pwForm.newPw)}`}>
                            {getPasswordStrength(pwForm.newPw).charAt(0).toUpperCase() + getPasswordStrength(pwForm.newPw).slice(1)}
                          </span>
                        )}
                        <span className="ps-pw-toggle" onClick={() => setShowPwNew(v => !v)}>
                          <img src={showPwNew ? OpenEyeIcon : ClosedEyeIcon} alt="toggle" />
                        </span>
                      </div>
                    </div>
                    <div className="ps-field">
                      <label className="ps-label">Confirm New Password</label>
                      <div className="ps-pw-wrapper">
                        <input type={showPwConfirm ? 'text' : 'password'} required className="ps-input"
                          value={pwForm.confirm}
                          onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))}
                          placeholder="Confirm new password"
                        />
                        {pwForm.confirm && (
                          <span className={`ps-pw-strength ${pwForm.confirm === pwForm.newPw ? 'strong' : 'weak'}`}>
                            {pwForm.confirm === pwForm.newPw ? 'Match' : 'No match'}
                          </span>
                        )}
                        <span className="ps-pw-toggle" onClick={() => setShowPwConfirm(v => !v)}>
                          <img src={showPwConfirm ? OpenEyeIcon : ClosedEyeIcon} alt="toggle" />
                        </span>
                      </div>
                    </div>
                    <div className="ps-pw-requirements">
                      <span className="ps-pw-req-title">PASSWORD REQUIREMENTS</span>
                      <ul>
                        {[
                          { label: 'Minimum 6 characters', check: pwForm.newPw.length >= 6 },
                          { label: 'At least one uppercase letter (A–Z)', check: /[A-Z]/.test(pwForm.newPw) },
                          { label: 'At least one lowercase letter (a–z)', check: /[a-z]/.test(pwForm.newPw) },
                          { label: 'At least one number (0–9)', check: /[0-9]/.test(pwForm.newPw) },
                          { label: 'At least one special character (!@#$%^&*)', check: /[!@#$%^&*]/.test(pwForm.newPw) },
                        ].map(({ label, check }) => (
                          <li key={label} style={{ color: pwForm.newPw && !check ? '#dc2626' : undefined }}>{label}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="ps-pw-footer">
                      <button type="submit" className="ps-btn-primary">Update Password</button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>

      {popup.show && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header"><h3>{popup.title}</h3></div>
            <div className="modal-body"><p>{popup.message}</p></div>
            <div className="modal-actions">
              <button className="modal-btn delete-btn" onClick={closePopup}>OK</button>
            </div>
          </div>
        </div>
      )}

      {showLogoutModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header"><h3>Log Out</h3></div>
            <div className="modal-body"><p>Do you really want to log out?</p></div>
            <div className="modal-actions">
              <button className="modal-btn cancel-btn" onClick={() => setShowLogoutModal(false)}>Cancel</button>
              <button className="modal-btn delete-btn" onClick={confirmLogout}>Log Out</button>
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
                updateProfile({ avatar: null });
                const fileInput = document.getElementById('up-pic-upload');
                if (fileInput) fileInput.value = '';
                try { await axios.put(`${API}/auth/profile/avatar`, { avatar: null }, { headers: getHeaders() }); } catch {}
              }}>Remove</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
