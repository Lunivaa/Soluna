import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../api";
import { jwtDecode } from "jwt-decode";
import {
  FiUsers, FiBarChart, FiRefreshCw, FiLogOut,
  FiHeart, FiWind, FiMusic, FiSun, FiImage, FiStar, FiPlus
} from "react-icons/fi";
import axios from "axios";
import AdminLogin from "./AdminLogin";
import "./AdminDashboard.css";
import logo from "../assets/logo.png";
import OverviewPage from "./OverviewPage";
import UsersPage from "./UsersPage";
import AffirmationsPage from "./AffirmationsPage";
import BreathingPage from "./BreathingPage";
import SoundsPage from "./SoundsPage";
import MeditationPage from "./MeditationPage";
import ArtPage from "./ArtPage";
import FeedbackPage from "./FeedbackPage";
import ProfileSettingsPage from "./ProfileSettingsPage";

const API_BASE = `${API_URL}/api`;

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

const extractGoogleDriveFileId = (url) => {
  if (!url || !url.includes('drive.google.com')) return null;
  const patterns = [/\/file\/d\/([a-zA-Z0-9_-]+)/, /[?&]id=([a-zA-Z0-9_-]+)/, /\/d\/([a-zA-Z0-9_-]+)/];
  for (const pattern of patterns) { const match = url.match(pattern); if (match) return match[1]; }
  return null;
};

const getImageUrl = (thumbnailUrl) => {
  if (!thumbnailUrl) return "/images/Wellness1.jpg";
  if (thumbnailUrl.startsWith('/uploads/')) return `${API_URL}${thumbnailUrl}`;
  const fileId = extractGoogleDriveFileId(thumbnailUrl);
  if (fileId) return `${API_URL}/api/selfcare-proxy/image/${fileId}`;
  return thumbnailUrl;
};

const getAuthHeaders = () => {
  const token = (localStorage.getItem("adminToken") || sessionStorage.getItem("adminToken"));
  return token ? { Authorization: `Bearer ${token}` } : {};
};


export default function AdminDashboard() {
  const [userInitial, setUserInitial] = useState("S");
  const [profilePic, setProfilePic] = useState(null);
  const [adminName, setAdminName] = useState("Soluna");
  const [activeTab, setActiveTab] = useState("overview");
  const [users, setUsers] = useState([]);
  const [affirmations, setAffirmations] = useState([]);
  const [currentAffirmationPage, setCurrentAffirmationPage] = useState(1);
  const [breathingExercises, setBreathingExercises] = useState([]);
  const [currentBreathingPage, setCurrentBreathingPage] = useState(1);
  const [editingBreathing, setEditingBreathing] = useState(null);
  const [showEditBreathingModal, setShowEditBreathingModal] = useState(false);
  const [showAddBreathingModal, setShowAddBreathingModal] = useState(false);
  const [editBreathingData, setEditBreathingData] = useState({ title: '', description: '', category: '', thumbnail_url: '', duration: '', is_loop: true, inhale_duration: '', hold_duration: '', exhale_duration: '', rest_duration: '' });
  const [newBreathingData, setNewBreathingData] = useState({ title: '', description: '', thumbnail_url: '', duration: '', inhale_duration: '', hold_duration: '', exhale_duration: '', rest_duration: '' });
  const [showDeleteBreathingModal, setShowDeleteBreathingModal] = useState(false);
  const [breathingToDelete, setBreathingToDelete] = useState(null);
  const [soundLoops, setSoundLoops] = useState([]);
  const [showEditSoundModal, setShowEditSoundModal] = useState(false);
  const [showAddSoundModal, setShowAddSoundModal] = useState(false);
  const [editSoundData, setEditSoundData] = useState({ id: null, title: '', description: '', category: '', audio_url: '', thumbnail_url: '', is_loop: true });
  const [newSoundData, setNewSoundData] = useState({ title: '', description: '', audio_url: '', thumbnail_url: '' });
  const [showDeleteSoundModal, setShowDeleteSoundModal] = useState(false);
  const [soundToDelete, setSoundToDelete] = useState(null);
  const [meditations, setMeditations] = useState([]);
  const [currentMeditationPage, setCurrentMeditationPage] = useState(1);
  const [showEditMeditationModal, setShowEditMeditationModal] = useState(false);
  const [showAddMeditationModal, setShowAddMeditationModal] = useState(false);
  const [editMeditationData, setEditMeditationData] = useState({ id: null, title: '', description: '', category: '', audio_url: '', thumbnail_url: '', duration: '', is_loop: false });
  const [newMeditationData, setNewMeditationData] = useState({ title: '', description: '', audio_url: '', thumbnail_url: '', duration: '' });
  const [showDeleteMeditationModal, setShowDeleteMeditationModal] = useState(false);
  const [meditationToDelete, setMeditationToDelete] = useState(null);
  const [artTherapy, setArtTherapy] = useState([]);
  const [showEditArtModal, setShowEditArtModal] = useState(false);
  const [showAddArtModal, setShowAddArtModal] = useState(false);
  const [editArtData, setEditArtData] = useState({ id: null, title: '', description: '', category: '', thumbnail_url: '' });
  const [newArtData, setNewArtData] = useState({ title: '', description: '', thumbnail_url: '' });
  const [showDeleteArtModal, setShowDeleteArtModal] = useState(false);
  const [artToDelete, setArtToDelete] = useState(null);
  const [editingAffirmation, setEditingAffirmation] = useState(null);
  const [editText, setEditText] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!(localStorage.getItem("adminToken") || sessionStorage.getItem("adminToken")));
  const [overviewStats, setOverviewStats] = useState({ totalUsers: 0, affirmations: 0, breathingExercises: 0, soundLoops: 0, meditations: 0, coloringTemplates: 0 });
  const [recentAdminActivity, setRecentAdminActivity] = useState([]);
  const [showDeleteFeedbackModal, setShowDeleteFeedbackModal] = useState(false);
  const [feedbackToDelete, setFeedbackToDelete] = useState(null);
  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' });
  const [showPwCurrent, setShowPwCurrent] = useState(false);
  const [showPwNew, setShowPwNew] = useState(false);
  const [showPwConfirm, setShowPwConfirm] = useState(false);
  const [showRemovePhotoModal, setShowRemovePhotoModal] = useState(false);
  const [adminPopup, setAdminPopup] = useState({ show: false, title: '', message: '', type: '' });
  const [statusFilter, setStatusFilter] = useState("Status");
  const [loginFilter, setLoginFilter] = useState("Last Login");
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showLoginDropdown, setShowLoginDropdown] = useState(false);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [suspendUserId, setSuspendUserId] = useState(null);
  const [suspendReason, setSuspendReason] = useState("");
  const [isSuspending, setIsSuspending] = useState(false);
  const [reactivatingUserId, setReactivatingUserId] = useState(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [forgotPwLoading, setForgotPwLoading] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [feedbackList, setFeedbackList] = useState([]);
  const [feedbackPage, setFeedbackPage] = useState(1);
  const [usersPage, setUsersPage] = useState(1);
  const [feedbackSort, setFeedbackSort] = useState('default');
  const [showFeedbackSortDropdown, setShowFeedbackSortDropdown] = useState(false);
  const [feedbackRatingFilter, setFeedbackRatingFilter] = useState(0);
  const [showFeedbackRatingDropdown, setShowFeedbackRatingDropdown] = useState(false);
  const [showAddAffirmationModal, setShowAddAffirmationModal] = useState(false);
  const [showDeleteAffirmationModal, setShowDeleteAffirmationModal] = useState(false);
  const [affirmationToDelete, setAffirmationToDelete] = useState(null);
  const [newAffirmationText, setNewAffirmationText] = useState("");
  const [newAffirmationMood, setNewAffirmationMood] = useState("1");
  const [addAffirmationError, setAddAffirmationError] = useState("");
  const [isModalClosing, setIsModalClosing] = useState(false);
  const navigate = useNavigate();

  useEffect(() => { setSearchQuery(""); setUsersPage(1); }, [activeTab]);

  const filteredUsers = useMemo(() => {
    let filtered = users;
    if (searchQuery && searchQuery.trim().length > 0) {
      const searchLower = searchQuery.toLowerCase().trim();
      return filtered.filter(user => (user.name || '').toLowerCase().includes(searchLower));
    }
    if (statusFilter !== "Status") filtered = filtered.filter(user => user.status?.toLowerCase() === statusFilter.toLowerCase());
    if (loginFilter !== "Last Login") {
      filtered = filtered.filter(user => {
        if (!user.lastLogin || user.lastLogin === 'Not logged in yet') return false;
        const loginText = user.lastLogin.toLowerCase();
        if (loginFilter === "Today") return loginText.includes('just now') || loginText.includes('min') || loginText.includes('hour');
        if (loginFilter === "This Week") {
          if (loginText.includes('just now') || loginText.includes('min') || loginText.includes('hour')) return true;
          if (loginText.includes('day')) { const m = loginText.match(/(\d+)\s*day/); return m ? parseInt(m[1]) <= 7 : false; }
          return false;
        }
        if (loginFilter === "This Month") {
          if (loginText.includes('just now') || loginText.includes('min') || loginText.includes('hour') || loginText.includes('day')) return true;
          if (loginText.includes('week')) { const m = loginText.match(/(\d+)\s*week/); return m ? parseInt(m[1]) <= 4 : false; }
          if (loginText.includes('month')) { const m = loginText.match(/(\d+)\s*month/); return m ? parseInt(m[1]) === 1 : false; }
          return false;
        }
        return true;
      });
    }
    return filtered;
  }, [users, searchQuery, statusFilter, loginFilter]);

  const filteredAffirmations = useMemo(() => {
    let filtered = affirmations;
    if (searchQuery && searchQuery.trim().length > 0) {
      const searchLower = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(a => a.text?.toLowerCase().includes(searchLower) || a.moodNumber?.toString().includes(searchLower));
    }
    return filtered;
  }, [affirmations, searchQuery]);

  const handleLogin = () => setIsAuthenticated(true);
  const handleLogout = () => setShowLogoutModal(true);
  const confirmLogout = () => { localStorage.removeItem("adminToken"); sessionStorage.removeItem("adminToken"); setShowLogoutModal(false); setIsAuthenticated(false); setActiveTab("overview"); };
  const cancelLogout = () => setShowLogoutModal(false);

  const loadOverviewData = async () => {
    try {
      const [usersRes, affirmRes, breathRes, soundRes, medRes, artRes] = await Promise.all([
        axios.get(`${API_BASE}/admin/users/count`, { headers: getAuthHeaders() }),
        axios.get(`${API_BASE}/affirmations/all`, { headers: getAuthHeaders() }),
        axios.get(`${API_BASE}/selfcare/breathing`, { headers: getAuthHeaders() }),
        axios.get(`${API_BASE}/selfcare/sound`, { headers: getAuthHeaders() }),
        axios.get(`${API_BASE}/selfcare/meditation`, { headers: getAuthHeaders() }),
        axios.get(`${API_BASE}/selfcare/art`, { headers: getAuthHeaders() }),
      ]);
      setArtTherapy(artRes.data || []);
      setOverviewStats({ totalUsers: usersRes.data.count || 0, affirmations: affirmRes.data.length || 0, breathingExercises: breathRes.data.length || 0, soundLoops: soundRes.data.length || 0, meditations: medRes.data.length || 0, coloringTemplates: artRes.data.length || 0 });
    } catch (error) {
      console.error("Error loading overview data:", error);
      setOverviewStats({ totalUsers: 0, affirmations: 0, breathingExercises: 0, soundLoops: 0, meditations: 0, coloringTemplates: 0 });
    }
  };

  const fetchAdminProfile = async () => {
    const token = (localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken'));
    if (!token) return;
    try {
      const response = await axios.get(`${API_BASE}/admin/profile`, { headers: { Authorization: `Bearer ${token}` } });
      if (response.data.name) { setAdminName(response.data.name); setNameInput(response.data.name); setUserInitial(response.data.name.charAt(0).toUpperCase()); }
      if (response.data.avatar) { setProfilePic(response.data.avatar); }
    } catch (error) {
      if (error.response?.status === 401) { localStorage.removeItem('adminToken'); sessionStorage.removeItem('adminToken'); setIsAuthenticated(false); }
    }
  };

  const fetchActivities = async () => {
    try {
      const response = await axios.get(`${API_BASE}/admin/activities`, { headers: getAuthHeaders() });
      setRecentAdminActivity(response.data || []);
    } catch (error) {
      console.error("Error fetching admin activities:", error);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchAdminProfile();
      loadOverviewData();
      fetchActivities();
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) return <AdminLogin onLogin={handleLogin} />;

  const addActivity = async (action, details) => {
    try {
      await axios.post(`${API_BASE}/admin/activities`, { action, details }, { headers: getAuthHeaders() });
      fetchActivities(); // Refresh the list from backend
    } catch (error) {
      console.error("Error logging activity:", error);
    }
  };

  const handleImageUpload = async (file) => {
    if (!file) return null;
    const formData = new FormData();
    formData.append('image', file);
    try {
      const response = await axios.post(`${API_BASE}/admin/upload/image`, formData, {
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'multipart/form-data'
        }
      });
      return response.data.imageUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image. Please try again.');
      return null;
    }
  };

  const handleAudioUpload = async (file) => {
    if (!file) return null;
    const formData = new FormData();
    formData.append('audio', file);
    try {
      const response = await axios.post(`${API_BASE}/admin/upload/audio`, formData, {
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'multipart/form-data'
        }
      });
      return response.data.audioUrl;
    } catch (error) {
      console.error('Error uploading audio:', error);
      alert('Failed to upload audio. Please try again.');
      return null;
    }
  };

  const loadUsers = async () => { try { const r = await axios.get(`${API_BASE}/admin/users`, { headers: getAuthHeaders() }); setUsers(r.data || []); } catch (e) { console.error("Error loading users:", e); } };
  const loadSelfCareItems = async () => { try { const r = await axios.get(`${API_BASE}/affirmations/all`, { headers: getAuthHeaders() }); setAffirmations(r.data || []); setCurrentAffirmationPage(1); } catch (e) { console.error("Error loading affirmations:", e); } };
  const loadBreathingExercises = async () => { try { const r = await axios.get(`${API_BASE}/selfcare/breathing`, { headers: getAuthHeaders() }); setBreathingExercises(r.data || []); } catch (e) { console.error("Error loading breathing:", e); } };
  const loadSoundLoops = async () => { try { const r = await axios.get(`${API_BASE}/selfcare/sound`, { headers: getAuthHeaders() }); setSoundLoops(r.data || []); } catch (e) { console.error("Error loading sounds:", e); } };
  const loadMeditations = async () => { try { const r = await axios.get(`${API_BASE}/selfcare/meditation`, { headers: getAuthHeaders() }); setMeditations(r.data || []); } catch (e) { console.error("Error loading meditations:", e); } };
  const loadArtTherapy = async () => { try { const r = await axios.get(`${API_BASE}/selfcare/art`, { headers: getAuthHeaders() }); setArtTherapy(r.data || []); } catch (e) { console.error("Error loading art:", e); } };
  const loadFeedback = async () => { try { const r = await axios.get(`${API_BASE}/feedback/all`, { headers: getAuthHeaders() }); setFeedbackList(r.data || []); } catch (e) { console.error("Error loading feedback:", e); } };
  const deleteFeedback = async (id) => {
    if (!id) return;
    try {
      await axios.delete(`${API_BASE}/feedback/${id}`, { headers: getAuthHeaders() });
      setFeedbackList(feedbackList.filter(fb => fb.id !== id));
      addActivity('Feedback Deleted', `Feedback from ${fb.name} (${fb.email}) was removed.`);
      setShowDeleteFeedbackModal(false);
      setFeedbackToDelete(null);
    } catch (e) {
      console.error("Error deleting feedback:", e);
      alert("Failed to delete feedback");
    }
  };

  const toggleUserStatus = async (userId) => {
    const user = users.find(u => u.id === userId);
    if (user.status === 'active') { setSuspendUserId(userId); setShowSuspendModal(true); }
    else {
      setReactivatingUserId(userId);
      try {
        await axios.post(`${API_BASE}/admin/users/${userId}/reactivate`, {}, { headers: getAuthHeaders() });
        setUsers(users.map(u => u.id === userId ? { ...u, status: 'active' } : u));
        addActivity('User Reactivated', `User ${user.name} (${user.email}) was reactivated.`);
        setAdminPopup({ show: true, title: 'Success', message: 'User reactivated successfully.', type: 'success' });
      } catch (error) { console.error("Error reactivating user:", error); alert("Failed to reactivate user"); }
      finally { setReactivatingUserId(null); }
    }
  };

  const handleSuspendUser = async () => {
    setIsSuspending(true);
    try {
      const user = users.find(u => u.id === suspendUserId);
      await axios.post(`${API_BASE}/admin/users/${suspendUserId}/suspend`, { reason: suspendReason, userEmail: user.email, userName: user.name }, { headers: getAuthHeaders() });
      setUsers(users.map(u => u.id === suspendUserId ? { ...u, status: 'suspended' } : u));
      addActivity('User Suspended', `User ${user.name} (${user.email}) was suspended. Reason: ${suspendReason || 'No reason provided'}`);
      setAdminPopup({ show: true, title: 'Success', message: 'User suspended successfully.', type: 'success' });
      setTimeout(() => { setShowSuspendModal(false); setSuspendUserId(null); setSuspendReason(""); setIsSuspending(false); }, 300);
    } catch (error) { console.error("Error suspending user:", error); alert(`Failed to suspend user: ${error.response?.data?.error || error.message}`); setIsSuspending(false); }
  };

  const closeSuspendModal = () => { if (!isSuspending) { setShowSuspendModal(false); setSuspendUserId(null); setSuspendReason(""); } };


  // Affirmation CRUD
  const deleteAffirmation = async () => {
    if (!affirmationToDelete) return;
    try {
      const affirmation = affirmations.find(a => a.id === affirmationToDelete);
      await axios.delete(`${API_BASE}/affirmations/${affirmationToDelete}`, { headers: getAuthHeaders() });
      setAffirmations(affirmations.filter(a => a.id !== affirmationToDelete));
      addActivity('Affirmation Deleted', `Affirmation "${affirmation.text.substring(0, 30)}..." was removed from mood category ${affirmation.moodNumber}.`);
      setShowDeleteAffirmationModal(false); setAffirmationToDelete(null);
    } catch (error) { console.error("Error deleting affirmation:", error); alert("Failed to delete affirmation"); }
  };

  const handleAddAffirmation = async () => {
    setAddAffirmationError("");
    if (!newAffirmationText.trim()) { setAddAffirmationError("Please enter affirmation text"); return; }
    const moodNum = parseInt(newAffirmationMood);
    if (isNaN(moodNum) || moodNum < 1 || moodNum > 10) { setAddAffirmationError("Mood number must be between 1 and 10"); return; }
    try {
      const response = await axios.post(`${API_BASE}/affirmations`, { text: newAffirmationText, mood: moodNum }, { headers: getAuthHeaders() });
      setAffirmations([...affirmations, response.data]);
      setShowAddAffirmationModal(false); setNewAffirmationText(""); setNewAffirmationMood("1"); setAddAffirmationError("");
      addActivity('Affirmation Added', `A new affirmation for mood category ${moodNum} was created: "${newAffirmationText.substring(0, 30)}..."`);
    } catch (error) { console.error("Error adding affirmation:", error); setAddAffirmationError(error.response?.data?.error || "Failed to add affirmation"); }
  };

  const startEditingAffirmation = (affirmation) => {
    setEditingAffirmation(affirmation.id); setEditText(affirmation.text);
    setTimeout(() => { const input = document.querySelector('.affirmation-edit-input'); if (input) { input.selectionStart = input.selectionEnd = input.value.length; } }, 0);
  };

  const saveAffirmationEdit = async (affirmationId) => {
    const original = affirmations.find(a => a.id === affirmationId);
    if (original && original.text === editText) {
      setAdminPopup({ show: true, title: 'No Changes', message: "You didn't make any changes.", type: 'info' });
      // Keep mode open, just return
      return;
    }
    try {
      await axios.put(`${API_BASE}/affirmations/${affirmationId}`, { text: editText }, { headers: getAuthHeaders() });
      setAffirmations(affirmations.map(a => a.id === affirmationId ? { ...a, text: editText } : a));
      setEditingAffirmation(null); setEditText("");
      addActivity('Affirmation Updated', `Affirmation text was updated to: "${editText.substring(0, 30)}..."`);
      setAdminPopup({ show: true, title: 'Success', message: 'Updated successfully.', type: 'success' });
    } catch (error) { console.error("Error saving affirmation:", error); alert("Failed to save affirmation"); }
  };

  const cancelAffirmationEdit = () => { setEditingAffirmation(null); setEditText(""); };

  // Breathing CRUD
  const startEditingBreathing = (exercise) => {
    setEditingBreathing(exercise.id);
    setEditBreathingData({ title: exercise.title || '', description: exercise.description || '', category: exercise.category || 'breathing', thumbnail_url: exercise.thumbnail_url || '', duration: exercise.duration || '', is_loop: exercise.is_loop !== undefined ? exercise.is_loop : true, inhale_duration: exercise.inhale_duration || '', hold_duration: exercise.hold_duration || '', exhale_duration: exercise.exhale_duration || '', rest_duration: exercise.rest_duration || '' });
    setShowEditBreathingModal(true);
  };

  const saveBreathingEdit = async () => {
    if (!editingBreathing) return;
    const original = breathingExercises.find(e => e.id === editingBreathing);
    const isSame = original &&
      original.title === editBreathingData.title &&
      original.description === editBreathingData.description &&
      original.thumbnail_url === editBreathingData.thumbnail_url &&
      original.duration == editBreathingData.duration &&
      original.inhale_duration == editBreathingData.inhale_duration &&
      original.hold_duration == editBreathingData.hold_duration &&
      original.exhale_duration == editBreathingData.exhale_duration &&
      original.rest_duration == editBreathingData.rest_duration;

    if (isSame) {
      setAdminPopup({ show: true, title: 'No Changes', message: "You didn't make any changes.", type: 'info' });
      return;
    }

    try {
      const dataToSave = { ...editBreathingData, category: 'breathing', is_loop: false };
      await axios.put(`${API_BASE}/selfcare/${editingBreathing}`, dataToSave, { headers: getAuthHeaders() });
      setBreathingExercises(breathingExercises.map(e => e.id === editingBreathing ? { ...e, ...editBreathingData } : e));
      setIsModalClosing(true);
      setTimeout(() => {
        setShowEditBreathingModal(false); 
        setEditingBreathing(null);
        setEditBreathingData({ title: '', description: '', category: '', thumbnail_url: '', duration: '', is_loop: true, inhale_duration: '', hold_duration: '', exhale_duration: '', rest_duration: '' });
        setIsModalClosing(false);
      }, 300);
      addActivity('Breathing Updated', `Breathing exercise "${dataToSave.title}" was updated.`);
      setAdminPopup({ show: true, title: 'Success', message: 'Updated successfully.', type: 'success' });
    } catch (error) { console.error("Error saving breathing exercise:", error); alert("Failed to save breathing exercise"); }
  };

  const cancelBreathingEdit = () => {
    setIsModalClosing(true);
    setTimeout(() => {
      setShowEditBreathingModal(false); 
      setEditingBreathing(null);
      setEditBreathingData({ title: '', description: '', category: '', thumbnail_url: '', duration: '', is_loop: true, inhale_duration: '', hold_duration: '', exhale_duration: '', rest_duration: '' });
      setIsModalClosing(false);
    }, 300);
  };

  const deleteBreathingExercise = async () => {
    if (!breathingToDelete) return;
    try {
      const exercise = breathingExercises.find(e => e.id === breathingToDelete);
      await axios.delete(`${API_BASE}/selfcare/${breathingToDelete}`, { headers: getAuthHeaders() });
      const updated = breathingExercises.filter(e => e.id !== breathingToDelete);
      setBreathingExercises(updated);
      setOverviewStats(prev => ({ ...prev, breathingExercises: updated.length }));
      const totalPages = Math.ceil(updated.length / 6);
      if (currentBreathingPage > totalPages && totalPages > 0) setCurrentBreathingPage(totalPages);
      else if (updated.length === 0) setCurrentBreathingPage(1);
      addActivity('Breathing Deleted', `Breathing exercise "${exercise.title}" was permanently removed.`);
      setShowDeleteBreathingModal(false); setBreathingToDelete(null);
    } catch (error) { console.error("Error deleting breathing exercise:", error); alert("Failed to delete breathing exercise"); }
  };

  const getMaxId = async () => {
    try {
      const [breathingRes, soundRes, meditationRes, artRes] = await Promise.all([
        axios.get(`${API_BASE}/selfcare/breathing`, { headers: getAuthHeaders() }),
        axios.get(`${API_BASE}/selfcare/sound`, { headers: getAuthHeaders() }),
        axios.get(`${API_BASE}/selfcare/meditation`, { headers: getAuthHeaders() }),
        axios.get(`${API_BASE}/selfcare/art`, { headers: getAuthHeaders() })
      ]);
      const allItems = [...breathingRes.data, ...soundRes.data, ...meditationRes.data, ...artRes.data];
      return allItems.length > 0 ? Math.max(...allItems.map(item => item.id)) + 1 : 1;
    } catch { return Math.floor(Date.now() / 1000); }
  };

  const addBreathingExercise = async () => {
    try {
      const newId = await getMaxId();
      const dataToSave = { id: newId, ...newBreathingData, category: 'breathing', is_loop: false, audio_url: '' };
      await axios.post(`${API_BASE}/selfcare`, dataToSave, { headers: getAuthHeaders() });
      const response = await axios.get(`${API_BASE}/selfcare/breathing`, { headers: getAuthHeaders() });
      setBreathingExercises(response.data);
      setOverviewStats(prev => ({ ...prev, breathingExercises: response.data.length }));
      setShowAddBreathingModal(false);
      setNewBreathingData({ title: '', description: '', thumbnail_url: '', duration: '', inhale_duration: '', hold_duration: '', exhale_duration: '', rest_duration: '' });
      addActivity('Breathing Added', `A new breathing exercise "${dataToSave.title}" was added.`);
    } catch (error) { console.error("Error adding breathing exercise:", error); alert(`Failed to add breathing exercise: ${error.response?.data?.error || error.message}`); }
  };


  // Sound CRUD
  const startEditingSound = (sound) => {
    setEditSoundData({ id: sound.id, title: sound.title || '', description: sound.description || '', category: sound.category || 'sound', audio_url: sound.audio_url || '', thumbnail_url: sound.thumbnail_url || '', is_loop: sound.is_loop !== undefined ? sound.is_loop : true });
    setShowEditSoundModal(true);
  };
  const cancelSoundEdit = () => { setShowEditSoundModal(false); setEditSoundData({ id: null, title: '', description: '', category: '', audio_url: '', thumbnail_url: '', is_loop: true }); };
  const saveSoundEdit = async () => {
    if (!editSoundData.id) return;
    const original = soundLoops.find(s => s.id === editSoundData.id);
    const isSame = original &&
      original.title === editSoundData.title &&
      original.description === editSoundData.description &&
      original.audio_url === editSoundData.audio_url &&
      original.thumbnail_url === editSoundData.thumbnail_url;

    if (isSame) {
      setAdminPopup({ show: true, title: 'No Changes', message: "You didn't make any changes.", type: 'info' });
      return;
    }

    try {
      const dataToSave = { ...editSoundData, category: 'sound', is_loop: true };
      await axios.put(`${API_BASE}/selfcare/${editSoundData.id}`, dataToSave, { headers: getAuthHeaders() });
      const response = await axios.get(`${API_BASE}/selfcare/sound`, { headers: getAuthHeaders() });
      setSoundLoops(response.data);
      setIsModalClosing(true);
      setTimeout(() => {
        setShowEditSoundModal(false); 
        setEditSoundData({ id: null, title: '', description: '', category: '', audio_url: '', thumbnail_url: '', is_loop: true });
        setIsModalClosing(false);
      }, 300);
      addActivity('Soundscape Updated', `Relaxing soundscape "${dataToSave.title}" was updated.`);
      setAdminPopup({ show: true, title: 'Success', message: 'Updated successfully.', type: 'success' });
    } catch (error) { console.error("Error updating soundscape:", error); alert("Failed to update relaxing soundscape"); }
  };
  const deleteSoundLoop = async () => {
    if (!soundToDelete) return;
    try {
      const sound = soundLoops.find(s => s.id === soundToDelete);
      await axios.delete(`${API_BASE}/selfcare/${soundToDelete}`, { headers: getAuthHeaders() });
      const updated = soundLoops.filter(s => s.id !== soundToDelete);
      setSoundLoops(updated);
      setOverviewStats(prev => ({ ...prev, soundLoops: updated.length }));
      addActivity('Soundscape Deleted', `Relaxing soundscape "${sound.title}" was removed.`);
      setShowDeleteSoundModal(false); setSoundToDelete(null);
    } catch (error) { console.error("Error deleting soundscape:", error); alert("Failed to delete relaxing soundscape"); }
  };
  const addSoundLoop = async () => {
    try {
      const newId = await getMaxId();
      const dataToSave = { id: newId, ...newSoundData, category: 'sound', is_loop: true };
      await axios.post(`${API_BASE}/selfcare`, dataToSave, { headers: getAuthHeaders() });
      const response = await axios.get(`${API_BASE}/selfcare/sound`, { headers: getAuthHeaders() });
      setSoundLoops(response.data);
      setOverviewStats(prev => ({ ...prev, soundLoops: response.data.length }));
      setShowAddSoundModal(false); setNewSoundData({ title: '', description: '', audio_url: '', thumbnail_url: '' });
      addActivity('Soundscape Added', `New soundscape "${dataToSave.title}" was uploaded.`);
    } catch (error) { console.error("Error adding soundscape:", error); alert(`Failed to add relaxing soundscape: ${error.response?.data?.error || error.message}`); }
  };

  // Meditation CRUD
  const startEditingMeditation = (meditation) => {
    setEditMeditationData({ id: meditation.id, title: meditation.title || '', description: meditation.description || '', category: meditation.category || 'meditation', audio_url: meditation.audio_url || '', thumbnail_url: meditation.thumbnail_url || '', duration: meditation.duration || '', is_loop: meditation.is_loop !== undefined ? meditation.is_loop : false });
    setShowEditMeditationModal(true);
  };
  const cancelMeditationEdit = () => {
    setIsModalClosing(true);
    setTimeout(() => {
      setShowEditMeditationModal(false); 
      setEditMeditationData({ id: null, title: '', description: '', category: '', audio_url: '', thumbnail_url: '', duration: '', is_loop: false });
      setIsModalClosing(false);
    }, 300);
  };
  const saveMeditationEdit = async () => {
    if (!editMeditationData.id) return;
    const original = meditations.find(m => m.id === editMeditationData.id);
    const isSame = original &&
      original.title === editMeditationData.title &&
      original.description === editMeditationData.description &&
      original.audio_url === editMeditationData.audio_url &&
      original.thumbnail_url === editMeditationData.thumbnail_url &&
      original.duration == editMeditationData.duration;

    if (isSame) {
      setAdminPopup({ show: true, title: 'No Changes', message: "You didn't make any changes.", type: 'info' });
      return;
    }

    try {
      const dataToSave = { ...editMeditationData, category: 'meditation', is_loop: false };
      await axios.put(`${API_BASE}/selfcare/${editMeditationData.id}`, dataToSave, { headers: getAuthHeaders() });
      const response = await axios.get(`${API_BASE}/selfcare/meditation`, { headers: getAuthHeaders() });
      setMeditations(response.data);
      setIsModalClosing(true);
      setTimeout(() => {
        setShowEditMeditationModal(false); 
        setEditMeditationData({ id: null, title: '', description: '', category: '', audio_url: '', thumbnail_url: '', duration: '', is_loop: false });
        setIsModalClosing(false);
      }, 300);
      addActivity('Meditation Updated', `Guided meditation "${dataToSave.title}" was updated.`);
      setAdminPopup({ show: true, title: 'Success', message: 'Updated successfully.', type: 'success' });
    } catch (error) { console.error("Error updating meditation:", error); alert("Failed to update guided meditation"); }
  };
  const deleteMeditation = async () => {
    if (!meditationToDelete) return;
    try {
      const meditation = meditations.find(m => m.id === meditationToDelete);
      await axios.delete(`${API_BASE}/selfcare/${meditationToDelete}`, { headers: getAuthHeaders() });
      const updated = meditations.filter(m => m.id !== meditationToDelete);
      setMeditations(updated);
      setOverviewStats(prev => ({ ...prev, meditations: updated.length }));
      const totalPages = Math.ceil(updated.length / 6);
      if (currentMeditationPage > totalPages && totalPages > 0) setCurrentMeditationPage(totalPages);
      else if (updated.length === 0) setCurrentMeditationPage(1);
      addActivity('Meditation Deleted', `Guided meditation "${meditation.title}" was removed.`);
      setShowDeleteMeditationModal(false); setMeditationToDelete(null);
    } catch (error) { console.error("Error deleting meditation:", error); alert("Failed to delete guided meditation"); }
  };
  const addMeditation = async () => {
    try {
      const newId = await getMaxId();
      const dataToSave = { id: newId, ...newMeditationData, category: 'meditation', is_loop: false };
      await axios.post(`${API_BASE}/selfcare`, dataToSave, { headers: getAuthHeaders() });
      const response = await axios.get(`${API_BASE}/selfcare/meditation`, { headers: getAuthHeaders() });
      setMeditations(response.data);
      setOverviewStats(prev => ({ ...prev, meditations: response.data.length }));
      setShowAddMeditationModal(false); setNewMeditationData({ title: '', description: '', audio_url: '', thumbnail_url: '', duration: '' });
      addActivity('Meditation Added', `New guided meditation "${dataToSave.title}" was added.`);
    } catch (error) { console.error("Error adding meditation:", error); alert(`Failed to add guided meditation: ${error.response?.data?.error || error.message}`); }
  };

  // Art CRUD
  const startEditingArt = (art) => {
    setEditArtData({ id: art.id, title: art.title || '', description: art.description || '', category: art.category || 'art', thumbnail_url: art.thumbnail_url || '' });
    setShowEditArtModal(true);
  };
  const cancelArtEdit = () => {
    setIsModalClosing(true);
    setTimeout(() => {
      setShowEditArtModal(false);
      setEditArtData({ id: null, title: '', description: '', category: '', thumbnail_url: '' });
      setIsModalClosing(false);
    }, 300);
  };
  const saveArtEdit = async () => {
    if (!editArtData.id) return;
    const original = artTherapy.find(a => a.id === editArtData.id);
    const isSame = original &&
      original.title === editArtData.title &&
      original.description === editArtData.description &&
      original.thumbnail_url === editArtData.thumbnail_url;

    if (isSame) {
      setAdminPopup({ show: true, title: 'No Changes', message: "You didn't make any changes.", type: 'info' });
      return;
    }

    try {
      const dataToSave = { ...editArtData, category: 'art', audio_url: '' };
      await axios.put(`${API_BASE}/selfcare/${editArtData.id}`, dataToSave, { headers: getAuthHeaders() });
      const response = await axios.get(`${API_BASE}/selfcare/art`, { headers: getAuthHeaders() });
      setArtTherapy(response.data);
      setIsModalClosing(true);
      setTimeout(() => {
        setShowEditArtModal(false);
        setEditArtData({ id: null, title: '', description: '', category: '', thumbnail_url: '' });
        setIsModalClosing(false);
      }, 300);
      addActivity('Template Updated', `Coloring template "${dataToSave.title}" was updated.`);
      setAdminPopup({ show: true, title: 'Success', message: 'Updated successfully.', type: 'success' });
    } catch (error) { console.error("Error updating coloring template:", error); alert("Failed to update coloring template"); }
  };
  const deleteArt = async () => {
    if (!artToDelete) return;
    try {
      const art = artTherapy.find(a => a.id === artToDelete);
      await axios.delete(`${API_BASE}/selfcare/${artToDelete}`, { headers: getAuthHeaders() });
      const updated = artTherapy.filter(a => a.id !== artToDelete);
      setArtTherapy(updated);
      setOverviewStats(prev => ({ ...prev, coloringTemplates: updated.length }));
      addActivity('Template Deleted', `Coloring template "${art.title}" was removed.`);
      setShowDeleteArtModal(false); setArtToDelete(null);
    } catch (error) { console.error("Error deleting coloring template:", error); alert("Failed to delete coloring template"); }
  };
  const addArt = async () => {
    try {
      const newId = await getMaxId();
      const dataToSave = { id: newId, ...newArtData, category: 'art', audio_url: '' };
      await axios.post(`${API_BASE}/selfcare`, dataToSave, { headers: getAuthHeaders() });
      const response = await axios.get(`${API_BASE}/selfcare/art`, { headers: getAuthHeaders() });
      setArtTherapy(response.data);
      setOverviewStats(prev => ({ ...prev, coloringTemplates: response.data.length }));
      setShowAddArtModal(false); setNewArtData({ title: '', description: '', thumbnail_url: '' });
      addActivity('Template Added', `New coloring template "${dataToSave.title}" was published.`);
    } catch (error) { console.error("Error adding coloring template:", error); alert(`Failed to add coloring template: ${error.response?.data?.error || error.message}`); }
  };

  // Affirmation pagination
  const affirmationsPerPage = 6;
  const totalAffirmationPages = Math.ceil(filteredAffirmations.length / affirmationsPerPage);
  const startIndex = (currentAffirmationPage - 1) * affirmationsPerPage;
  const endIndex = startIndex + affirmationsPerPage;
  const paginatedAffirmations = filteredAffirmations.slice(startIndex, endIndex);
  const handleAffirmationPageChange = (direction) => {
    if (direction === 'next' && currentAffirmationPage < totalAffirmationPages) setCurrentAffirmationPage(currentAffirmationPage + 1);
    else if (direction === 'prev' && currentAffirmationPage > 1) setCurrentAffirmationPage(currentAffirmationPage - 1);
  };


  const inputStyle = { width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid rgba(149, 101, 184, 0.3)', background: 'rgba(255, 255, 255, 0.8)', fontSize: '14px', color: '#1b1b1b', outline: 'none', boxSizing: 'border-box', height: '40px' };
  const textareaStyle = { width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid rgba(149, 101, 184, 0.3)', background: 'rgba(255, 255, 255, 0.8)', fontSize: '14px', color: '#1b1b1b', outline: 'none', boxSizing: 'border-box', resize: 'none' };
  const labelStyle = { display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: '600', color: '#1b1b1b' };
  const staticFieldStyle = { width: '100%', padding: '7px 14px', borderRadius: '10px', border: '1px solid rgba(149, 101, 184, 0.3)', background: 'rgba(255, 255, 255, 0.8)', fontSize: '14px', color: '#1b1b1b', boxSizing: 'border-box', height: '35px', display: 'flex', alignItems: 'center' };

  return (
    <div className="soluna-admin-dashboard">
      <nav className="soluna-admin-navbar">
        <div className="soluna-admin-nav-left">
          <img src={logo} alt="Soluna Logo" className="soluna-admin-nav-logo" />
        </div>
      </nav>

      <div className="soluna-admin-container">
        <div className="soluna-admin-sidebar">
          <div className="soluna-admin-nav-menu">
            <button className={`soluna-admin-nav-item ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}><FiBarChart /><span>Dashboard</span></button>
            <button className={`soluna-admin-nav-item ${activeTab === 'users' ? 'active' : ''}`} onClick={() => { setActiveTab('users'); loadUsers(); }}><FiUsers /><span>User Management</span></button>
            <button className={`soluna-admin-nav-item ${activeTab === 'affirmations' ? 'active' : ''}`} onClick={() => { setActiveTab('affirmations'); loadSelfCareItems(); }}><FiHeart /><span>Affirmation Management</span></button>
            <button className={`soluna-admin-nav-item ${activeTab === 'breathing' ? 'active' : ''}`} onClick={() => { setActiveTab('breathing'); loadBreathingExercises(); }}><FiWind /><span>Breathing Exercises</span></button>
            <button className={`soluna-admin-nav-item ${activeTab === 'sounds' ? 'active' : ''}`} onClick={() => { setActiveTab('sounds'); loadSoundLoops(); }}><FiMusic /><span>Relaxing Soundscapes</span></button>
            <button className={`soluna-admin-nav-item ${activeTab === 'meditation' ? 'active' : ''}`} onClick={() => { setActiveTab('meditation'); loadMeditations(); }}><FiSun /><span>Guided Meditation</span></button>
            <button className={`soluna-admin-nav-item ${activeTab === 'art' ? 'active' : ''}`} onClick={() => { setActiveTab('art'); loadArtTherapy(); }}><FiImage /><span>Coloring Templates</span></button>
            <button className={`soluna-admin-nav-item ${activeTab === 'feedback' ? 'active' : ''}`} onClick={() => { setActiveTab('feedback'); loadFeedback(); }}><FiStar /><span>User Feedback</span></button>
          </div>
          <div className="soluna-admin-sidebar-profile">
            <div className="sidebar-profile-content">
              <div className="sidebar-profile-avatar">
                {profilePic ? <img src={profilePic} alt="Profile" className="sidebar-profile-img" /> : <span>{userInitial}</span>}
              </div>
              <div className="sidebar-profile-info">
                <span className="sidebar-profile-name">{adminName}</span>
                <button className="sidebar-profile-settings-btn" onClick={() => setActiveTab('profileSettings')}>Profile Settings</button>
              </div>
            </div>
            <button className="sidebar-logout-btn" onClick={handleLogout}><FiLogOut size={15} />Log Out</button>
          </div>
        </div>

        <div className="soluna-admin-main">
          {loading && <div className="soluna-admin-loading"><FiRefreshCw className="soluna-spinning" /><span>Loading...</span></div>}
          {!loading && (
            <>
              {activeTab === 'overview' && <OverviewPage overviewStats={overviewStats} recentAdminActivity={recentAdminActivity} />}
              {activeTab === 'users' && <UsersPage filteredUsers={filteredUsers} statusFilter={statusFilter} setStatusFilter={setStatusFilter} loginFilter={loginFilter} setLoginFilter={setLoginFilter} showStatusDropdown={showStatusDropdown} setShowStatusDropdown={setShowStatusDropdown} showLoginDropdown={showLoginDropdown} setShowLoginDropdown={setShowLoginDropdown} searchQuery={searchQuery} setSearchQuery={setSearchQuery} usersPage={usersPage} setUsersPage={setUsersPage} reactivatingUserId={reactivatingUserId} toggleUserStatus={toggleUserStatus} />}
              {activeTab === 'affirmations' && <AffirmationsPage filteredAffirmations={filteredAffirmations} paginatedAffirmations={paginatedAffirmations} currentAffirmationPage={currentAffirmationPage} totalAffirmationPages={totalAffirmationPages} startIndex={startIndex} endIndex={endIndex} handleAffirmationPageChange={handleAffirmationPageChange} editingAffirmation={editingAffirmation} editText={editText} setEditText={setEditText} startEditingAffirmation={startEditingAffirmation} saveAffirmationEdit={saveAffirmationEdit} cancelAffirmationEdit={cancelAffirmationEdit} setAffirmationToDelete={setAffirmationToDelete} setShowDeleteAffirmationModal={setShowDeleteAffirmationModal} setShowAddAffirmationModal={setShowAddAffirmationModal} searchQuery={searchQuery} setSearchQuery={setSearchQuery} />}
              {activeTab === 'breathing' && <BreathingPage breathingExercises={breathingExercises} currentBreathingPage={currentBreathingPage} setCurrentBreathingPage={setCurrentBreathingPage} searchQuery={searchQuery} setSearchQuery={setSearchQuery} getImageUrl={getImageUrl} startEditingBreathing={startEditingBreathing} setBreathingToDelete={setBreathingToDelete} setShowDeleteBreathingModal={setShowDeleteBreathingModal} setShowAddBreathingModal={setShowAddBreathingModal} />}
              {activeTab === 'sounds' && <SoundsPage soundLoops={soundLoops} searchQuery={searchQuery} setSearchQuery={setSearchQuery} getImageUrl={getImageUrl} startEditingSound={startEditingSound} setSoundToDelete={setSoundToDelete} setShowDeleteSoundModal={setShowDeleteSoundModal} setShowAddSoundModal={setShowAddSoundModal} />}
              {activeTab === 'meditation' && <MeditationPage meditations={meditations} searchQuery={searchQuery} setSearchQuery={setSearchQuery} getImageUrl={getImageUrl} startEditingMeditation={startEditingMeditation} setMeditationToDelete={setMeditationToDelete} setShowDeleteMeditationModal={setShowDeleteMeditationModal} setShowAddMeditationModal={setShowAddMeditationModal} />}
              {activeTab === 'art' && <ArtPage artTherapy={artTherapy} searchQuery={searchQuery} setSearchQuery={setSearchQuery} getImageUrl={getImageUrl} startEditingArt={startEditingArt} setArtToDelete={setArtToDelete} setShowDeleteArtModal={setShowDeleteArtModal} setShowAddArtModal={setShowAddArtModal} />}
              {activeTab === 'feedback' && <FeedbackPage 
                feedbackList={feedbackList} 
                feedbackPage={feedbackPage} setFeedbackPage={setFeedbackPage}
                feedbackSort={feedbackSort} setFeedbackSort={setFeedbackSort}
                feedbackRatingFilter={feedbackRatingFilter} setFeedbackRatingFilter={setFeedbackRatingFilter}
                showFeedbackSortDropdown={showFeedbackSortDropdown} setShowFeedbackSortDropdown={setShowFeedbackSortDropdown}
                showFeedbackRatingDropdown={showFeedbackRatingDropdown} setShowFeedbackRatingDropdown={setShowFeedbackRatingDropdown}
                searchQuery={searchQuery} setSearchQuery={setSearchQuery}
                onDelete={(id) => { setFeedbackToDelete(id); setShowDeleteFeedbackModal(true); }} 
              />}
              {activeTab === 'profileSettings' && <ProfileSettingsPage API_BASE={API_BASE} getAuthHeaders={getAuthHeaders} profilePic={profilePic} setProfilePic={setProfilePic} userInitial={userInitial} adminName={adminName} setAdminName={setAdminName} nameInput={nameInput} setNameInput={setNameInput} setUserInitial={setUserInitial} pwForm={pwForm} setPwForm={setPwForm} showPwCurrent={showPwCurrent} setShowPwCurrent={setShowPwCurrent} showPwNew={showPwNew} setShowPwNew={setShowPwNew} showPwConfirm={showPwConfirm} setShowPwConfirm={setShowPwConfirm} showRemovePhotoModal={showRemovePhotoModal} setShowRemovePhotoModal={setShowRemovePhotoModal} adminPopup={adminPopup} setAdminPopup={setAdminPopup} forgotPwLoading={forgotPwLoading} setForgotPwLoading={setForgotPwLoading} getPasswordStrength={getPasswordStrength} addActivity={addActivity} />}
            </>
          )}
        </div>
      </div>


      {/* Suspend User Modal */}
      {showSuspendModal && (
        <div className="suspend-modal-overlay">
          <div className="suspend-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="suspend-modal-header"><h3>Suspend User</h3></div>
            <form id="suspend-form" onSubmit={(e) => { e.preventDefault(); handleSuspendUser(); }}>
              <div className="suspend-modal-body">
                <p>Please provide a reason for suspending this user.</p>
                <textarea className="suspend-reason-input" placeholder="Enter reason for suspension..." value={suspendReason} onChange={(e) => setSuspendReason(e.target.value)} rows="4" required minLength={10} />
              </div>
              <div className="suspend-modal-actions">
                <button type="button" className="suspend-modal-btn suspend-cancel-btn" onClick={closeSuspendModal} disabled={isSuspending}>Cancel</button>
                <button type="submit" className="suspend-modal-btn suspend-confirm-btn" disabled={isSuspending}>{isSuspending ? 'Sending..' : 'Suspend & Send Email'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Logout Modal */}
      {showLogoutModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header"><h3>Logout</h3></div>
            <div className="modal-body"><p>Do you really want to log out?</p></div>
            <div className="modal-actions">
              <button className="modal-btn cancel-btn" onClick={cancelLogout}>Cancel</button>
              <button className="modal-btn delete-btn" onClick={confirmLogout}>Yes</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Affirmation Modal */}
      {showAddAffirmationModal && (
        <div className="suspend-modal-overlay">
          <div className="suspend-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="suspend-modal-header"><h3>Add New Affirmation</h3></div>
            <form onSubmit={(e) => { e.preventDefault(); handleAddAffirmation(); }}>
              <div className="suspend-modal-body">
                <p>Create a new affirmation for the mood tracker.</p>
                <div style={{position: 'relative', marginBottom: '12px'}}>
                  <textarea value={newAffirmationText} onChange={(e) => { setNewAffirmationText(e.target.value); setAddAffirmationError(""); }} placeholder="Enter affirmation text..." className="suspend-reason-input" rows="4" required />
                </div>
                <div style={{position: 'relative'}}>
                  <label style={{display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '600', color: '#1b1b1b'}}>Mood Number (1-10)</label>
                  <input type="number" min="1" max="10" value={newAffirmationMood} onChange={(e) => { setNewAffirmationMood(e.target.value); setAddAffirmationError(""); }} placeholder="Enter mood number (1-10)" required style={{width: '100%', padding: '14px 16px', borderRadius: '10px', border: '1px solid rgba(149, 101, 184, 0.3)', background: 'rgba(255, 255, 255, 0.8)', fontSize: '16px', color: '#1b1b1b', outline: 'none', boxSizing: 'border-box'}} />
                </div>
              </div>
              <div className="suspend-modal-actions">
                <button type="button" className="suspend-modal-btn suspend-cancel-btn" onClick={() => { setShowAddAffirmationModal(false); setNewAffirmationText(""); setNewAffirmationMood("1"); setAddAffirmationError(""); }}>Cancel</button>
                <button type="submit" className="suspend-modal-btn suspend-confirm-btn" style={{width: '180px', minWidth: '180px', maxWidth: '180px'}}>Add Affirmation</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Affirmation Modal */}
      {showDeleteAffirmationModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header"><h3>Delete Affirmation</h3></div>
            <div className="modal-body"><p>Are you sure you want to delete this affirmation? This action cannot be undone.</p></div>
            <div className="modal-actions">
              <button className="modal-btn cancel-btn" onClick={() => { setShowDeleteAffirmationModal(false); setAffirmationToDelete(null); }}>Cancel</button>
              <button className="modal-btn delete-btn" onClick={deleteAffirmation}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Feedback Modal */}
      {showDeleteFeedbackModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header"><h3>Delete Feedback</h3></div>
            <div className="modal-body"><p>Are you sure you want to delete this feedback? This action cannot be undone.</p></div>
            <div className="modal-actions">
              <button className="modal-btn cancel-btn" onClick={() => { setShowDeleteFeedbackModal(false); setFeedbackToDelete(null); }}>Cancel</button>
              <button className="modal-btn delete-btn" onClick={() => deleteFeedback(feedbackToDelete)}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Breathing Modal */}
      {showDeleteBreathingModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header"><h3>Delete Breathing Exercise</h3></div>
            <div className="modal-body"><p>Are you sure you want to delete this breathing exercise? This action cannot be undone.</p></div>
            <div className="modal-actions">
              <button className="modal-btn cancel-btn" onClick={() => { setShowDeleteBreathingModal(false); setBreathingToDelete(null); }}>Cancel</button>
              <button className="modal-btn delete-btn" onClick={deleteBreathingExercise}>Delete</button>
            </div>
          </div>
        </div>
      )}


      {/* Add Breathing Modal */}
      {showAddBreathingModal && (
        <div className="suspend-modal-overlay">
          <div className="suspend-modal-content" style={{width: '600px'}} onClick={(e) => e.stopPropagation()}>
            <div className="suspend-modal-header"><h3>Add Breathing Exercise</h3></div>
            <form onSubmit={(e) => { e.preventDefault(); addBreathingExercise(); }}>
              <div className="suspend-modal-body">
                <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
                  <div><label style={labelStyle}>Title</label><input type="text" value={newBreathingData.title} onChange={(e) => setNewBreathingData({...newBreathingData, title: e.target.value})} placeholder="Enter exercise title..." required style={inputStyle} /></div>
                  <div><label style={labelStyle}>Description</label><textarea value={newBreathingData.description} onChange={(e) => setNewBreathingData({...newBreathingData, description: e.target.value})} placeholder="Enter exercise description..." required rows="2" style={textareaStyle} /></div>
                  <div>
                    <label style={labelStyle}>Thumbnail Image</label>
                    <div className="soluna-file-upload-container">
                      <label className="soluna-file-btn">
                        Choose File
                        <input 
                          type="file" 
                          accept=".jpg,.jpeg,.png,.webp,.gif,.svg" 
                          className="soluna-file-input-real"
                          onChange={async (e) => {
                            const file = e.target.files[0];
                            if (file) {
                              const url = await handleImageUpload(file);
                              if (url) setNewBreathingData({...newBreathingData, thumbnail_url: url});
                            }
                          }} 
                        />
                      </label>
                      <span className="soluna-file-name" style={{ display: 'flex', alignItems: 'center' }}>
                        {newBreathingData.thumbnail_url ? (
                          <img src={getImageUrl(newBreathingData.thumbnail_url)} alt="preview" style={{ width: '28px', height: '28px', objectFit: 'cover', borderRadius: '4px' }} />
                        ) : 'No file chosen'}
                      </span>
                    </div>
                  </div>
                  <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px'}}><div><label style={labelStyle}>Duration (minutes)</label><input type="number" value={newBreathingData.duration} onChange={(e) => setNewBreathingData({...newBreathingData, duration: e.target.value})} placeholder="Enter duration..." required style={inputStyle} /></div></div>
                  <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px'}}>
                    <div><label style={labelStyle}>Inhale (seconds)</label><input type="number" value={newBreathingData.inhale_duration} onChange={(e) => setNewBreathingData({...newBreathingData, inhale_duration: e.target.value})} placeholder="Enter inhale..." required style={inputStyle} /></div>
                    <div><label style={labelStyle}>Hold (seconds)</label><input type="number" value={newBreathingData.hold_duration} onChange={(e) => setNewBreathingData({...newBreathingData, hold_duration: e.target.value})} placeholder="Enter hold..." required style={inputStyle} /></div>
                  </div>
                  <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px'}}>
                    <div><label style={labelStyle}>Exhale (seconds)</label><input type="number" value={newBreathingData.exhale_duration} onChange={(e) => setNewBreathingData({...newBreathingData, exhale_duration: e.target.value})} placeholder="Enter exhale..." required style={inputStyle} /></div>
                    <div><label style={labelStyle}>Rest (seconds)</label><input type="number" value={newBreathingData.rest_duration} onChange={(e) => setNewBreathingData({...newBreathingData, rest_duration: e.target.value})} placeholder="Enter rest..." required style={inputStyle} /></div>
                  </div>
                  <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px'}}>
                    <div><label style={labelStyle}>Category</label><div style={staticFieldStyle}>Breathing</div></div>
                    <div><label style={labelStyle}>Is Loop</label><div style={staticFieldStyle}>No</div></div>
                  </div>
                </div>
              </div>
              <div className="suspend-modal-actions">
                <button type="button" className="suspend-modal-btn suspend-cancel-btn" onClick={() => { setShowAddBreathingModal(false); setNewBreathingData({ title: '', description: '', thumbnail_url: '', duration: '', inhale_duration: '', hold_duration: '', exhale_duration: '', rest_duration: '' }); }}>Cancel</button>
                <button type="submit" className="suspend-modal-btn suspend-confirm-btn" style={{width: '180px', minWidth: '180px', maxWidth: '180px'}}>Add Exercise</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Breathing Modal */}
      {showEditBreathingModal && (
        <div className={`suspend-modal-overlay ${isModalClosing ? 'closing' : ''}`}>
          <div className="suspend-modal-content" style={{width: '600px'}} onClick={(e) => e.stopPropagation()}>
            <div className="suspend-modal-header"><h3>Edit Breathing Exercise</h3></div>
            <form onSubmit={(e) => { e.preventDefault(); saveBreathingEdit(); }}>
              <div className="suspend-modal-body">
                <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
                  <div><label style={labelStyle}>Title</label><input type="text" value={editBreathingData.title} onChange={(e) => setEditBreathingData({...editBreathingData, title: e.target.value})} placeholder="Enter exercise title..." required style={inputStyle} /></div>
                  <div><label style={labelStyle}>Description</label><textarea value={editBreathingData.description} onChange={(e) => setEditBreathingData({...editBreathingData, description: e.target.value})} placeholder="Enter exercise description..." required rows="2" style={textareaStyle} /></div>
                  <div>
                    <label style={labelStyle}>Thumbnail Image</label>
                    <div className="soluna-file-upload-container">
                      <label className="soluna-file-btn">
                        Choose File
                        <input 
                          type="file" 
                          accept=".jpg,.jpeg,.png,.webp,.gif,.svg" 
                          className="soluna-file-input-real"
                          onChange={async (e) => {
                            const file = e.target.files[0];
                            if (file) {
                              const url = await handleImageUpload(file);
                              if (url) setEditBreathingData({...editBreathingData, thumbnail_url: url});
                            }
                          }} 
                        />
                      </label>
                      <span className="soluna-file-name" style={{ display: 'flex', alignItems: 'center' }}>
                        {editBreathingData.thumbnail_url ? (
                          <img src={getImageUrl(editBreathingData.thumbnail_url)} alt="preview" style={{ width: '28px', height: '28px', objectFit: 'cover', borderRadius: '4px' }} />
                        ) : 'No file chosen'}
                      </span>
                    </div>
                  </div>
                  <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px'}}><div><label style={labelStyle}>Duration (minutes)</label><input type="number" value={editBreathingData.duration} onChange={(e) => setEditBreathingData({...editBreathingData, duration: e.target.value})} placeholder="Enter duration..." required style={inputStyle} /></div></div>
                  <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px'}}>
                    <div><label style={labelStyle}>Inhale (seconds)</label><input type="number" value={editBreathingData.inhale_duration} onChange={(e) => setEditBreathingData({...editBreathingData, inhale_duration: e.target.value})} placeholder="Enter inhale..." required style={inputStyle} /></div>
                    <div><label style={labelStyle}>Hold (seconds)</label><input type="number" value={editBreathingData.hold_duration} onChange={(e) => setEditBreathingData({...editBreathingData, hold_duration: e.target.value})} placeholder="Enter hold..." required style={inputStyle} /></div>
                  </div>
                  <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px'}}>
                    <div><label style={labelStyle}>Exhale (seconds)</label><input type="number" value={editBreathingData.exhale_duration} onChange={(e) => setEditBreathingData({...editBreathingData, exhale_duration: e.target.value})} placeholder="Enter exhale..." required style={inputStyle} /></div>
                    <div><label style={labelStyle}>Rest (seconds)</label><input type="number" value={editBreathingData.rest_duration} onChange={(e) => setEditBreathingData({...editBreathingData, rest_duration: e.target.value})} placeholder="Enter rest..." required style={inputStyle} /></div>
                  </div>
                  <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px'}}>
                    <div><label style={labelStyle}>Category</label><div style={staticFieldStyle}>Breathing</div></div>
                    <div><label style={labelStyle}>Is Loop</label><div style={staticFieldStyle}>No</div></div>
                  </div>
                </div>
              </div>
              <div className="suspend-modal-actions">
                <button type="button" className="suspend-modal-btn suspend-cancel-btn" onClick={cancelBreathingEdit}>Cancel</button>
                <button type="submit" className="suspend-modal-btn suspend-confirm-btn" style={{width: '140px', minWidth: '140px', maxWidth: '140px'}}>Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* Add Sound Modal */}
      {showAddSoundModal && (
        <div className="suspend-modal-overlay">
          <div className="suspend-modal-content" style={{width: '600px'}} onClick={(e) => e.stopPropagation()}>
            <div className="suspend-modal-header"><h3>Add Relaxing Soundscape</h3></div>
            <form onSubmit={(e) => { e.preventDefault(); addSoundLoop(); }}>
              <div className="suspend-modal-body">
                <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
                  <div><label style={labelStyle}>Title</label><input type="text" value={newSoundData.title} onChange={(e) => setNewSoundData({...newSoundData, title: e.target.value})} placeholder="Enter sound title..." required style={inputStyle} /></div>
                  <div><label style={labelStyle}>Description</label><textarea value={newSoundData.description} onChange={(e) => setNewSoundData({...newSoundData, description: e.target.value})} placeholder="Enter sound description..." required rows="2" style={textareaStyle} /></div>
                  <div>
                    <label style={labelStyle}>Audio File</label>
                    <div className="soluna-file-upload-container">
                      <label className="soluna-file-btn">
                        Choose File
                        <input 
                          type="file" 
                          accept="audio/*" 
                          className="soluna-file-input-real"
                          onChange={async (e) => {
                            const file = e.target.files[0];
                            if (file) {
                              const url = await handleAudioUpload(file);
                              if (url) setNewSoundData({...newSoundData, audio_url: url});
                            }
                          }} 
                        />
                      </label>
                      <span className="soluna-file-name" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {newSoundData.audio_url ? (
                          <><FiMusic size={14} /> <span>Audio Selected</span></>
                        ) : 'No file chosen'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>Thumbnail Image</label>
                    <div className="soluna-file-upload-container">
                      <label className="soluna-file-btn">
                        Choose File
                        <input 
                          type="file" 
                          accept=".jpg,.jpeg,.png,.webp,.gif,.svg" 
                          className="soluna-file-input-real"
                          onChange={async (e) => {
                            const file = e.target.files[0];
                            if (file) {
                              const url = await handleImageUpload(file);
                              if (url) setNewSoundData({...newSoundData, thumbnail_url: url});
                            }
                          }} 
                        />
                      </label>
                      <span className="soluna-file-name" style={{ display: 'flex', alignItems: 'center' }}>
                        {newSoundData.thumbnail_url ? (
                          <img src={getImageUrl(newSoundData.thumbnail_url)} alt="preview" style={{ width: '28px', height: '28px', objectFit: 'cover', borderRadius: '4px' }} />
                        ) : 'No file chosen'}
                      </span>
                    </div>
                  </div>
                  <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px'}}>
                    <div><label style={labelStyle}>Category</label><div style={staticFieldStyle}>Sound</div></div>
                    <div><label style={labelStyle}>Is Loop</label><div style={staticFieldStyle}>Yes</div></div>
                  </div>
                </div>
              </div>
              <div className="suspend-modal-actions">
                <button type="button" className="suspend-modal-btn suspend-cancel-btn" onClick={() => { setShowAddSoundModal(false); setNewSoundData({ title: '', description: '', audio_url: '', thumbnail_url: '' }); }}>Cancel</button>
                <button type="submit" className="suspend-modal-btn suspend-confirm-btn" style={{width: '180px', minWidth: '180px', maxWidth: '180px'}}>Add Soundscape</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Sound Modal */}
      {showEditSoundModal && (
        <div className={`suspend-modal-overlay ${isModalClosing ? 'closing' : ''}`}>
          <div className="suspend-modal-content" style={{width: '600px'}} onClick={(e) => e.stopPropagation()}>
            <div className="suspend-modal-header"><h3>Edit Relaxing Soundscape</h3></div>
            <form onSubmit={(e) => { e.preventDefault(); saveSoundEdit(); }}>
              <div className="suspend-modal-body">
                <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
                  <div><label style={labelStyle}>Title</label><input type="text" value={editSoundData.title} onChange={(e) => setEditSoundData({...editSoundData, title: e.target.value})} placeholder="Enter sound title..." required style={inputStyle} /></div>
                  <div><label style={labelStyle}>Description</label><textarea value={editSoundData.description} onChange={(e) => setEditSoundData({...editSoundData, description: e.target.value})} placeholder="Enter sound description..." required rows="2" style={textareaStyle} /></div>
                  <div>
                    <label style={labelStyle}>Audio File</label>
                    <div className="soluna-file-upload-container">
                      <label className="soluna-file-btn">
                        Choose File
                        <input 
                          type="file" 
                          accept="audio/*" 
                          className="soluna-file-input-real"
                          onChange={async (e) => {
                            const file = e.target.files[0];
                            if (file) {
                              const url = await handleAudioUpload(file);
                              if (url) setEditSoundData({...editSoundData, audio_url: url});
                            }
                          }} 
                        />
                      </label>
                      <span className="soluna-file-name" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {editSoundData.audio_url ? (
                          <><FiMusic size={14} /> <span>Audio Selected</span></>
                        ) : 'No file chosen'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>Thumbnail Image</label>
                    <div className="soluna-file-upload-container">
                      <label className="soluna-file-btn">
                        Choose File
                        <input 
                          type="file" 
                          accept=".jpg,.jpeg,.png,.webp,.gif,.svg" 
                          className="soluna-file-input-real"
                          onChange={async (e) => {
                            const file = e.target.files[0];
                            if (file) {
                              const url = await handleImageUpload(file);
                              if (url) setEditSoundData({...editSoundData, thumbnail_url: url});
                            }
                          }} 
                        />
                      </label>
                      <span className="soluna-file-name" style={{ display: 'flex', alignItems: 'center' }}>
                        {editSoundData.thumbnail_url ? (
                          <img src={getImageUrl(editSoundData.thumbnail_url)} alt="preview" style={{ width: '28px', height: '28px', objectFit: 'cover', borderRadius: '4px' }} />
                        ) : 'No file chosen'}
                      </span>
                    </div>
                  </div>
                  <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px'}}>
                    <div><label style={labelStyle}>Category</label><div style={staticFieldStyle}>Sound</div></div>
                    <div><label style={labelStyle}>Is Loop</label><div style={staticFieldStyle}>Yes</div></div>
                  </div>
                </div>
              </div>
              <div className="suspend-modal-actions">
                <button type="button" className="suspend-modal-btn suspend-cancel-btn" onClick={cancelSoundEdit}>Cancel</button>
                <button type="submit" className="suspend-modal-btn suspend-confirm-btn" style={{width: '140px', minWidth: '140px', maxWidth: '140px'}}>Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Sound Modal */}
      {showDeleteSoundModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header"><h3>Delete Relaxing Soundscape</h3></div>
            <div className="modal-body"><p>Are you sure you want to delete this relaxing soundscape? This action cannot be undone.</p></div>
            <div className="modal-actions">
              <button className="modal-btn cancel-btn" onClick={() => { setShowDeleteSoundModal(false); setSoundToDelete(null); }}>Cancel</button>
              <button className="modal-btn delete-btn" onClick={deleteSoundLoop}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Meditation Modal */}
      {showAddMeditationModal && (
        <div className="suspend-modal-overlay">
          <div className="suspend-modal-content" style={{width: '600px'}} onClick={(e) => e.stopPropagation()}>
            <div className="suspend-modal-header"><h3>Add Guided Meditation</h3></div>
            <form onSubmit={(e) => { e.preventDefault(); addMeditation(); }}>
              <div className="suspend-modal-body">
                <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
                  <div><label style={labelStyle}>Title</label><input type="text" value={newMeditationData.title} onChange={(e) => setNewMeditationData({...newMeditationData, title: e.target.value})} placeholder="Enter meditation title..." required style={inputStyle} /></div>
                  <div><label style={labelStyle}>Description</label><textarea value={newMeditationData.description} onChange={(e) => setNewMeditationData({...newMeditationData, description: e.target.value})} placeholder="Enter meditation description..." required rows="2" style={textareaStyle} /></div>
                  <div>
                    <label style={labelStyle}>Audio File</label>
                    <div className="soluna-file-upload-container">
                      <label className="soluna-file-btn">
                        Choose File
                        <input 
                          type="file" 
                          accept="audio/*" 
                          className="soluna-file-input-real"
                          onChange={async (e) => {
                            const file = e.target.files[0];
                            if (file) {
                              const url = await handleAudioUpload(file);
                              if (url) setNewMeditationData({...newMeditationData, audio_url: url});
                            }
                          }} 
                        />
                      </label>
                      <span className="soluna-file-name" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {newMeditationData.audio_url ? (
                          <><FiMusic size={14} /> <span>Audio Selected</span></>
                        ) : 'No file chosen'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>Thumbnail Image</label>
                    <div className="soluna-file-upload-container">
                      <label className="soluna-file-btn">
                        Choose File
                        <input 
                          type="file" 
                          accept=".jpg,.jpeg,.png,.webp,.gif,.svg" 
                          className="soluna-file-input-real"
                          onChange={async (e) => {
                            const file = e.target.files[0];
                            if (file) {
                              const url = await handleImageUpload(file);
                              if (url) setNewMeditationData({...newMeditationData, thumbnail_url: url});
                            }
                          }} 
                        />
                      </label>
                      <span className="soluna-file-name" style={{ display: 'flex', alignItems: 'center' }}>
                        {newMeditationData.thumbnail_url ? (
                          <img src={getImageUrl(newMeditationData.thumbnail_url)} alt="preview" style={{ width: '28px', height: '28px', objectFit: 'cover', borderRadius: '4px' }} />
                        ) : 'No file chosen'}
                      </span>
                    </div>
                  </div>
                  <div><label style={labelStyle}>Duration (minutes)</label><input type="number" value={newMeditationData.duration} onChange={(e) => setNewMeditationData({...newMeditationData, duration: e.target.value})} placeholder="Enter duration..." required style={inputStyle} /></div>
                  <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px'}}>
                    <div><label style={labelStyle}>Category</label><div style={staticFieldStyle}>Meditation</div></div>
                    <div><label style={labelStyle}>Is Loop</label><div style={staticFieldStyle}>No</div></div>
                  </div>
                </div>
              </div>
              <div className="suspend-modal-actions">
                <button type="button" className="suspend-modal-btn suspend-cancel-btn" onClick={() => { setShowAddMeditationModal(false); setNewMeditationData({ title: '', description: '', audio_url: '', thumbnail_url: '', duration: '' }); }}>Cancel</button>
                <button type="submit" className="suspend-modal-btn suspend-confirm-btn" style={{width: '180px', minWidth: '180px', maxWidth: '180px'}}>Add Meditation</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Meditation Modal */}
      {showEditMeditationModal && (
        <div className={`suspend-modal-overlay ${isModalClosing ? 'closing' : ''}`}>
          <div className="suspend-modal-content" style={{width: '600px'}} onClick={(e) => e.stopPropagation()}>
            <div className="suspend-modal-header"><h3>Edit Guided Meditation</h3></div>
            <form onSubmit={(e) => { e.preventDefault(); saveMeditationEdit(); }}>
              <div className="suspend-modal-body">
                <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
                  <div><label style={labelStyle}>Title</label><input type="text" value={editMeditationData.title} onChange={(e) => setEditMeditationData({...editMeditationData, title: e.target.value})} placeholder="Enter meditation title..." required style={inputStyle} /></div>
                  <div><label style={labelStyle}>Description</label><textarea value={editMeditationData.description} onChange={(e) => setEditMeditationData({...editMeditationData, description: e.target.value})} placeholder="Enter meditation description..." required rows="2" style={textareaStyle} /></div>
                  <div>
                    <label style={labelStyle}>Audio File</label>
                    <div className="soluna-file-upload-container">
                      <label className="soluna-file-btn">
                        Choose File
                        <input 
                          type="file" 
                          accept="audio/*" 
                          className="soluna-file-input-real"
                          onChange={async (e) => {
                            const file = e.target.files[0];
                            if (file) {
                              const url = await handleAudioUpload(file);
                              if (url) setEditMeditationData({...editMeditationData, audio_url: url});
                            }
                          }} 
                        />
                      </label>
                      <span className="soluna-file-name" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {editMeditationData.audio_url ? (
                          <><FiMusic size={14} /> <span>Audio Selected</span></>
                        ) : 'No file chosen'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>Thumbnail Image</label>
                    <div className="soluna-file-upload-container">
                      <label className="soluna-file-btn">
                        Choose File
                        <input 
                          type="file" 
                          accept=".jpg,.jpeg,.png,.webp,.gif,.svg" 
                          className="soluna-file-input-real"
                          onChange={async (e) => {
                            const file = e.target.files[0];
                            if (file) {
                              const url = await handleImageUpload(file);
                              if (url) setEditMeditationData({...editMeditationData, thumbnail_url: url});
                            }
                          }} 
                        />
                      </label>
                      <span className="soluna-file-name" style={{ display: 'flex', alignItems: 'center' }}>
                        {editMeditationData.thumbnail_url ? (
                          <img src={getImageUrl(editMeditationData.thumbnail_url)} alt="preview" style={{ width: '28px', height: '28px', objectFit: 'cover', borderRadius: '4px' }} />
                        ) : 'No file chosen'}
                      </span>
                    </div>
                  </div>
                  <div><label style={labelStyle}>Duration (minutes)</label><input type="number" value={editMeditationData.duration} onChange={(e) => setEditMeditationData({...editMeditationData, duration: e.target.value})} placeholder="Enter duration..." required style={inputStyle} /></div>
                  <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px'}}>
                    <div><label style={labelStyle}>Category</label><div style={staticFieldStyle}>Meditation</div></div>
                    <div><label style={labelStyle}>Is Loop</label><div style={staticFieldStyle}>No</div></div>
                  </div>
                </div>
              </div>
              <div className="suspend-modal-actions">
                <button type="button" className="suspend-modal-btn suspend-cancel-btn" onClick={cancelMeditationEdit}>Cancel</button>
                <button type="submit" className="suspend-modal-btn suspend-confirm-btn" style={{width: '140px', minWidth: '140px', maxWidth: '140px'}}>Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Meditation Modal */}
      {showDeleteMeditationModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header"><h3>Delete Guided Meditation</h3></div>
            <div className="modal-body"><p>Are you sure you want to delete this guided meditation? This action cannot be undone.</p></div>
            <div className="modal-actions">
              <button className="modal-btn cancel-btn" onClick={() => { setShowDeleteMeditationModal(false); setMeditationToDelete(null); }}>Cancel</button>
              <button className="modal-btn delete-btn" onClick={deleteMeditation}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Art Modal */}
      {showAddArtModal && (
        <div className="suspend-modal-overlay">
          <div className="suspend-modal-content" style={{width: '600px'}} onClick={(e) => e.stopPropagation()}>
            <div className="suspend-modal-header"><h3>Add Coloring Template</h3></div>
            <form onSubmit={(e) => { e.preventDefault(); addArt(); }}>
              <div className="suspend-modal-body">
                <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
                  <div><label style={labelStyle}>Title</label><input type="text" value={newArtData.title} onChange={(e) => setNewArtData({...newArtData, title: e.target.value})} placeholder="Enter template title..." required style={inputStyle} /></div>
                  <div><label style={labelStyle}>Description</label><textarea value={newArtData.description} onChange={(e) => setNewArtData({...newArtData, description: e.target.value})} placeholder="Enter template description..." required rows="2" style={textareaStyle} /></div>
                  <div>
                    <label style={labelStyle}>Thumbnail Image</label>
                    <div className="soluna-file-upload-container">
                      <label className="soluna-file-btn">
                        Choose File
                        <input 
                          type="file" 
                          accept=".jpg,.jpeg,.png,.webp,.gif,.svg" 
                          className="soluna-file-input-real"
                          onChange={async (e) => {
                            const file = e.target.files[0];
                            if (file) {
                              const url = await handleImageUpload(file);
                              if (url) setNewArtData({...newArtData, thumbnail_url: url});
                            }
                          }} 
                        />
                      </label>
                      <span className="soluna-file-name" style={{ display: 'flex', alignItems: 'center' }}>
                        {newArtData.thumbnail_url ? (
                          <img src={getImageUrl(newArtData.thumbnail_url)} alt="preview" style={{ width: '28px', height: '28px', objectFit: 'cover', borderRadius: '4px' }} />
                        ) : 'No file chosen'}
                      </span>
                    </div>
                  </div>
                  <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px'}}><div><label style={labelStyle}>Category</label><div style={staticFieldStyle}>Art</div></div></div>
                </div>
              </div>
              <div className="suspend-modal-actions">
                <button type="button" className="suspend-modal-btn suspend-cancel-btn" onClick={() => { setShowAddArtModal(false); setNewArtData({ title: '', description: '', thumbnail_url: '' }); }}>Cancel</button>
                <button type="submit" className="suspend-modal-btn suspend-confirm-btn" style={{width: '180px', minWidth: '180px', maxWidth: '180px'}}>Add Template</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Art Modal */}
      {showEditArtModal && (
        <div className={`suspend-modal-overlay ${isModalClosing ? 'closing' : ''}`}>
          <div className="suspend-modal-content" style={{width: '600px'}} onClick={(e) => e.stopPropagation()}>
            <div className="suspend-modal-header"><h3>Edit Coloring Template</h3></div>
            <form onSubmit={(e) => { e.preventDefault(); saveArtEdit(); }}>
              <div className="suspend-modal-body">
                <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
                  <div><label style={labelStyle}>Title</label><input type="text" value={editArtData.title} onChange={(e) => setEditArtData({...editArtData, title: e.target.value})} placeholder="Enter template title..." required style={inputStyle} /></div>
                  <div><label style={labelStyle}>Description</label><textarea value={editArtData.description} onChange={(e) => setEditArtData({...editArtData, description: e.target.value})} placeholder="Enter template description..." required rows="2" style={textareaStyle} /></div>
                  <div>
                    <label style={labelStyle}>Thumbnail Image</label>
                    <div className="soluna-file-upload-container">
                      <label className="soluna-file-btn">
                        Choose File
                        <input 
                          type="file" 
                          accept=".jpg,.jpeg,.png,.webp,.gif,.svg" 
                          className="soluna-file-input-real"
                          onChange={async (e) => {
                            const file = e.target.files[0];
                            if (file) {
                              const url = await handleImageUpload(file);
                              if (url) setEditArtData({...editArtData, thumbnail_url: url});
                            }
                          }} 
                        />
                      </label>
                      <span className="soluna-file-name" style={{ display: 'flex', alignItems: 'center' }}>
                        {editArtData.thumbnail_url ? (
                          <img src={getImageUrl(editArtData.thumbnail_url)} alt="preview" style={{ width: '28px', height: '28px', objectFit: 'cover', borderRadius: '4px' }} />
                        ) : 'No file chosen'}
                      </span>
                    </div>
                  </div>
                  <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px'}}><div><label style={labelStyle}>Category</label><div style={staticFieldStyle}>Art</div></div></div>
                </div>
              </div>
              <div className="suspend-modal-actions">
                <button type="button" className="suspend-modal-btn suspend-cancel-btn" onClick={cancelArtEdit}>Cancel</button>
                <button type="submit" className="suspend-modal-btn suspend-confirm-btn" style={{width: '140px', minWidth: '140px', maxWidth: '140px'}}>Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Art Modal */}
      {showDeleteArtModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header"><h3>Delete Coloring Template</h3></div>
            <div className="modal-body"><p>Are you sure you want to delete this coloring template? This action cannot be undone.</p></div>
            <div className="modal-actions">
              <button className="modal-btn cancel-btn" onClick={() => { setShowDeleteArtModal(false); setArtToDelete(null); }}>Cancel</button>
              <button className="modal-btn delete-btn" onClick={deleteArt}>Delete</button>
            </div>
          </div>
        </div>
      )}
      {/* Global Admin Popup */}
      {adminPopup.show && (
        <div className="modal-overlay">
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ height: 'auto', minHeight: '180px' }}>
            <div className="modal-header">
              <h3>{adminPopup.title || (adminPopup.type === 'success' ? 'Success' : 'Notification')}</h3>
            </div>
            <div className="modal-body">
              <p>{adminPopup.message}</p>
            </div>
            <div className="modal-actions">
              <button className="modal-btn delete-btn" onClick={() => setAdminPopup({ show: false, title: '', message: '', type: '' })}>Got it</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
