import { useState } from 'react';
import axios from 'axios';
import { API_URL } from "../api";
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './AccountDeleteModal.css';

const API = `${API_URL}/api`;

export default function AccountDeleteModal({ onClose, onDeleted }) {
  const [reason, setReason] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const navigate = useNavigate();
  const { logout } = useAuth();

  const reasons = [
    { id: 'not-needed', label: "I no longer need it" },
    { id: 'privacy', label: "Privacy concerns" },
    { id: 'technical', label: "Technical issues" },
    { id: 'switching', label: "Switching to another app" },
    { id: 'exploring', label: "Just exploring" }
  ];

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    try {
      setIsDeleting(true);
      const selectedLabel = reasons.find(r => r.id === reason)?.label || reason;
      const token = (localStorage.getItem('token') || sessionStorage.getItem('token'));
      await axios.delete(`${API}/auth/profile`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { reason: selectedLabel }
      });

      onDeleted();
      logout();
      navigate('/');
    } catch (err) {
      console.error('Account deletion failed:', err);
      setIsDeleting(false);
      alert('Failed to delete account. Please try again later.');
    }
  };

  return (
    <div className="adm-overlay">
      <div className="adm-modal" onClick={e => e.stopPropagation()}>
        <div className="adm-header">
          <h2>Delete Account</h2>
          <button className="adm-close-x" type="button" onClick={onClose}>×</button>
        </div>
        
        <form className="adm-body" onSubmit={handleSubmit}>
          <p className="adm-intro">We're sorry to see you go. If you delete your account, all your information and data will be permanently deleted.</p>

          <div className="adm-reasons">
            {reasons.map((r) => (
              <label 
                key={r.id} 
                className={`adm-reason-item ${reason === r.id ? 'selected' : ''}`}
              >
                <input 
                  type="radio" 
                  name="delete-reason" 
                  value={r.id} 
                  required
                  checked={reason === r.id}
                  onChange={() => setReason(r.id)}
                />
                <span className="adm-radio-custom"></span>
                <span className="adm-reason-label">{r.label}</span>
              </label>
            ))}
          </div>

          <div className="adm-actions">
            <button className="adm-btn-ghost" type="button" onClick={onClose} disabled={isDeleting}>
              Cancel
            </button>
            <button 
              className="adm-btn-delete" 
              type="submit"
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}