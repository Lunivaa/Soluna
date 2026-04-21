import axios from "axios";
import OpenEyeIcon from "../assets/icons/open-eye.png";
import ClosedEyeIcon from "../assets/icons/closed-eye.png";

export default function ProfileSettingsPage({
  API_BASE,
  getAuthHeaders,
  profilePic, setProfilePic,
  userInitial,
  adminName, setAdminName,
  nameInput, setNameInput,
  setUserInitial,
  pwForm, setPwForm,
  showPwCurrent, setShowPwCurrent,
  showPwNew, setShowPwNew,
  showPwConfirm, setShowPwConfirm,
  showRemovePhotoModal, setShowRemovePhotoModal,
  adminPopup, setAdminPopup,
  forgotPwLoading, setForgotPwLoading,
  getPasswordStrength,
  addActivity,
}) {
  return (
    <div className="ps-page">
      <div className="ps-page-header">
        <h2 className="ps-page-title">Profile Settings</h2>
        <p className="ps-page-subtitle">Manage your admin profile and security settings.</p>
      </div>

      <input id="ps-pic-upload" type="file" accept="image/*" style={{ display: 'none' }}
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
              // Update state immediately for visual feedback
              setProfilePic(b64);

              try { 
                await axios.put(`${API_BASE}/admin/profile/avatar`, { avatar: b64 }, { headers: getAuthHeaders() }); 
                addActivity('Profile Photo Updated', 'Changed admin profile picture', '🖼️');
              } catch (err) {
                console.error("Failed to sync avatar to server:", err);
              }
            };
            img.src = reader.result;
          };
          reader.readAsDataURL(file);
          e.target.value = '';
        }}
      />

      <div className="ps-layout">
        {/* Left column */}
        <div className="ps-left-col">
          {/* Avatar card */}
          <div className="ps-card ps-avatar-card">
            <div className="ps-avatar-banner">
              <div className="ps-avatar-wrap" onClick={() => document.getElementById('ps-pic-upload').click()}>
                <div className="ps-avatar">
                  {profilePic ? <img src={profilePic} alt="Profile" /> : <span>{userInitial}</span>}
                </div>
                <div className="ps-avatar-overlay">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                </div>
              </div>
            </div>
            <div className="ps-avatar-body">
              <p className="ps-avatar-name">{adminName}</p>
              <span className="ps-avatar-role">Administrator</span>
              <button className="ps-btn-upload-full" onClick={() => document.getElementById('ps-pic-upload').click()}>
                Upload New Photo
              </button>
              <button className="ps-btn-signout-card" onClick={() => {
                if (!profilePic) {
                  setAdminPopup({ show: true, title: 'No Photo', message: 'There is no profile photo to remove.', type: 'error' });
                } else {
                  setShowRemovePhotoModal(true);
                }
              }}>
                Remove Photo
              </button>
            </div>
          </div>

          {/* Account Information */}
          <div className="ps-card">
            <div className="ps-card-header">
              <h4 className="ps-card-title">Account Information</h4>
              <p className="ps-card-desc">Update your display name shown across the admin panel.</p>
            </div>
            <div className="ps-card-body">
              <form onSubmit={async (e) => {
                e.preventDefault();
                if (!nameInput.trim()) return;
                if (nameInput.trim() === adminName) {
                  setAdminPopup({ show: true, title: 'No Changes', message: "You didn't make any changes.", type: 'info' });
                  return;
                }
                setAdminName(nameInput.trim());
                setUserInitial(nameInput.trim().charAt(0).toUpperCase());
                try {
                  await axios.put(`${API_BASE}/admin/profile/name`, { name: nameInput.trim() }, { headers: getAuthHeaders() });
                  setAdminPopup({ show: true, title: 'Success', message: 'Updated successfully.', type: 'success' });
                  addActivity('Admin Name Updated', `Changed display name to "${nameInput.trim()}"`, '👤');
                } catch {
                  setAdminPopup({ show: true, title: 'Error', message: 'Failed to update display name.', type: 'error' });
                }
              }}>
                <div className="ps-field">
                  <label className="ps-label">Display Name</label>
                  <input type="text" required className="ps-input"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder="Enter display name"
                  />
                </div>
                <button type="submit" className="ps-btn-primary" style={{ marginTop: '12px' }}>Save Changes</button>
              </form>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="ps-right-col">
          <div className="ps-card ps-pw-card">
            <div className="ps-card-header">
              <h4 className="ps-card-title">Change Password</h4>
              <p className="ps-card-desc">Ensure your account is protected with a strong, unique password.</p>
            </div>
            <div className="ps-card-body">
              <form onSubmit={async (e) => {
                e.preventDefault();
                if (pwForm.newPw !== pwForm.confirm) { setPsPopup({ show: true, title: 'Password Mismatch', message: 'New passwords do not match.', type: 'error' }); return; }
                if (pwForm.newPw.length < 6) { setPsPopup({ show: true, title: 'Weak Password', message: 'Password must be at least 6 characters.', type: 'error' }); return; }
                if (!/[A-Z]/.test(pwForm.newPw)) { setPsPopup({ show: true, title: 'Weak Password', message: 'Password must include at least one uppercase letter.', type: 'error' }); return; }
                if (!/[a-z]/.test(pwForm.newPw)) { setPsPopup({ show: true, title: 'Weak Password', message: 'Password must include at least one lowercase letter.', type: 'error' }); return; }
                if (!/[0-9]/.test(pwForm.newPw)) { setPsPopup({ show: true, title: 'Weak Password', message: 'Password must include at least one number.', type: 'error' }); return; }
                if (!/[!@#$%^&*]/.test(pwForm.newPw)) { setPsPopup({ show: true, title: 'Weak Password', message: 'Password must include at least one special character (!@#$%^&*).', type: 'error' }); return; }
                try {
                  await axios.put(`${API_BASE}/admin/profile/password`,
                    { currentPassword: pwForm.current, newPassword: pwForm.newPw },
                    { headers: getAuthHeaders() }
                  );
                  setPwForm({ current: '', newPw: '', confirm: '' });
                  setAdminPopup({ show: true, title: 'Success', message: 'Updated successfully.', type: 'success' });
                  addActivity('Password Changed', 'Admin account security updated', '🔐');
                } catch (err) {
                  setAdminPopup({ show: true, title: 'Error', message: err.response?.data?.error || 'Failed to update password.', type: 'error' });
                }
              }}>
                <div className="ps-pw-form">
                  <div className="ps-field">
                    <label className="ps-label">Current Password</label>
                    <div className="ps-pw-wrapper">
                      <input type={showPwCurrent ? "text" : "password"} required className="ps-input"
                        value={pwForm.current}
                        onChange={(e) => setPwForm(f => ({ ...f, current: e.target.value }))}
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
                      <input type={showPwNew ? "text" : "password"} required minLength={6} className="ps-input"
                        value={pwForm.newPw}
                        onChange={(e) => setPwForm(f => ({ ...f, newPw: e.target.value }))}
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
                      <input type={showPwConfirm ? "text" : "password"} required className="ps-input"
                        value={pwForm.confirm}
                        onChange={(e) => setPwForm(f => ({ ...f, confirm: e.target.value }))}
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
                  <div className="ps-pw-footer">
                    <button type="submit" className="ps-btn-primary">Update Password</button>
                    <button
                      type="button"
                      className="ps-btn-forgot"
                      disabled={forgotPwLoading}
                      onClick={async () => {
                        setForgotPwLoading(true);
                        try {
                          const token = (localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken'));
                          await axios.post(`${API_BASE}/admin/forgot-password`, {}, { headers: { Authorization: `Bearer ${token}` } });
                          setAdminPopup({ show: true, title: 'Email Sent', message: 'A password reset link has been sent to your email.', type: 'success' });
                        } catch (err) {
                          setAdminPopup({ show: true, title: 'Error', message: err.response?.data?.error || 'Failed to send reset email.', type: 'error' });
                        } finally {
                          setForgotPwLoading(false);
                        }
                      }}
                    >{forgotPwLoading ? 'Sending...' : 'Forgot Password?'}</button>
                  </div>
                </div>
              </form>
            </div>
          </div>

          {/* Password Requirements */}
          <div className="ps-card ps-pw-requirements">
            <span className="ps-pw-req-title">PASSWORD REQUIREMENTS</span>
            <ul>
              <li>Minimum 6 characters long</li>
              <li>Include at least one uppercase letter</li>
              <li>Include at least one lowercase letter</li>
              <li>Include at least one number</li>
              <li>Include at least one symbol (!@#$%^&*)</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Full-width card below */}
      <div className="ps-card ps-full-card">
        <div className="ps-quote-body">
          <p className="ps-quote-text">You can&apos;t pour from an empty cup. Take care of yourself first.</p>
          <span className="ps-quote-author">— Soluna</span>
        </div>
      </div>

      {/* Remove Photo Confirmation Modal */}
      {showRemovePhotoModal && (
        <div className="modal-overlay">
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Remove Profile Photo</h3>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to remove your profile photo? Your initial will be shown instead.</p>
            </div>
            <div className="modal-actions">
              <button className="modal-btn cancel-btn" onClick={() => setShowRemovePhotoModal(false)}>Cancel</button>
              <button className="modal-btn delete-btn" onClick={async () => {
                setShowRemovePhotoModal(false);
                setProfilePic(null);
                
                // Also ensure the file input is cleared when photo is removed
                const fileInput = document.getElementById('ps-pic-upload');
                if (fileInput) fileInput.value = '';

                try { 
                  await axios.put(`${API_BASE}/admin/profile/avatar`, { avatar: null }, { headers: getAuthHeaders() }); 
                  addActivity('Profile Photo Removed', 'Reset to initial fallback', '🗑️');
                } catch (err) {
                  console.error("Failed to remove avatar from server:", err);
                }
              }}>Remove Photo</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}