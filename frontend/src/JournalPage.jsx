import { useState, useRef, useEffect } from "react";
import { Link, NavLink } from "react-router-dom";
import axios from "axios";
import "./JournalPage.css";
import "./HomePage.css";
import logo from "./assets/logo.png";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import { jwtDecode } from "jwt-decode";
import {
  FiHeart,
  FiSearch,
  FiTrash2,
  FiDownload,
  FiPrinter,
  FiBookOpen,
} from "react-icons/fi";
import ProfileDropdown from './components/ProfileDropdown';

export default function JournalPage() {
  const API_BASE = "http://localhost:5001/api/journal";

  // Configure axios with auth token
  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const [userInitial, setUserInitial] = useState("L");
  const [profilePic, setProfilePic] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const decoded = jwtDecode(token);
        if (decoded.name) {
          setUserInitial(decoded.name.trim().charAt(0).toUpperCase());
        } else if (decoded.email) {
          setUserInitial(decoded.email.charAt(0).toUpperCase());
        }
      } catch (err) {
        setUserInitial("U");
      }
    }
    
    // Load profile picture from backend
    const fetchProfile = async () => {
      if (!token) return;
      
      try {
        const response = await axios.get('http://localhost:5001/api/auth/profile', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.data.avatar) {
          setProfilePic(response.data.avatar);
        }
      } catch (error) {
        console.error('Failed to load profile:', error);
      }
    };
    
    fetchProfile();
  }, []);

  const formatDateTime = (isoString) => {
    if (!isoString) return "-";
    const d = new Date(isoString);
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}/${pad(d.getMonth()+1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  };

  const [entries, setEntries] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [editorContent, setEditorContent] = useState("");
  const [query, setQuery] = useState("");
  const [navState, setNavState] = useState("Recent");
  const [isLoading, setIsLoading] = useState(false);

  const selectedEntry =
    selectedId !== null ? entries.find((e) => e.id === selectedId) : null;

  const hasLoaded = useRef(false);

  useEffect(() => {
    const fetchEntries = async () => {
      setIsLoading(true);
      try {
        const { data } = await axios.get(API_BASE, {
          headers: getAuthHeaders()
        });
        setEntries(data || []);
        if (data?.length) {
          setSelectedId(data[0].id);
          setEditorContent(data[0].content || "");
        }
        hasLoaded.current = true;
      } catch (err) {
        console.error("Failed to fetch entries:", err);
        hasLoaded.current = true;
      } finally {
        setIsLoading(false);
      }
    };
    fetchEntries();
  }, []);

  // Cleanup auto-save timeout on unmount
  useEffect(() => {
    return () => {
      clearTimeout(window.autoSaveTimeout);
    };
  }, []);

  // ReactQuill toolbar - simple and clean
  const modules = {
    toolbar: [
      ['bold', 'italic', 'underline'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'align': [] }],
      ['clean']
    ]
  };

  const formats = [
    'bold', 'italic', 'underline',
    'color', 'background', 'list', 'bullet', 'align'
  ];

  // Force toolbar spacing after ReactQuill renders
  useEffect(() => {
    const applyToolbarSpacing = () => {
      console.log('Attempting to apply toolbar spacing...');
      
      const toolbar = document.querySelector('.ql-toolbar') || document.querySelector('[class*="ql-toolbar"]');
      console.log('Toolbar found:', toolbar);
      
      if (toolbar) {
        // Get all toolbar items in order
        const allItems = toolbar.querySelectorAll('button, .ql-picker');
        console.log('All toolbar items found:', allItems.length);
        
        if (allItems.length >= 9) {
          // Reset all margins first
          allItems.forEach(item => {
            item.style.setProperty('margin-right', '0px', 'important');
          });
          
          // Apply specific spacing to create visually equal gaps
          // Based on your screenshot: B I U A A̲ ≡ ≡ ≡ Tx
          allItems[0].style.setProperty('margin-right', '25px', 'important'); // B → I
          allItems[1].style.setProperty('margin-right', '25px', 'important'); // I → U  
          allItems[2].style.setProperty('margin-right', '35px', 'important'); // U → A (text color)
          allItems[3].style.setProperty('margin-right', '25px', 'important'); // A → A̲ (highlighter)
          allItems[4].style.setProperty('margin-right', '35px', 'important'); // A̲ → ≡ (numbered list)
          allItems[5].style.setProperty('margin-right', '25px', 'important'); // ≡ → ≡ (bullet list)
          allItems[6].style.setProperty('margin-right', '35px', 'important'); // ≡ → ≡ (alignment)
          allItems[7].style.setProperty('margin-right', '35px', 'important'); // ≡ → Tx (clean)
          allItems[8].style.setProperty('margin-right', '0px', 'important');  // Tx (last)
          
          console.log('Applied individual spacing to all items');
        }

        // Fix alignment dropdown icons size
        const alignmentDropdownIcons = toolbar.querySelectorAll('.ql-align .ql-picker-options .ql-picker-item svg');
        console.log('Alignment dropdown icons found:', alignmentDropdownIcons.length);
        
        alignmentDropdownIcons.forEach(icon => {
          icon.style.setProperty('width', '24px', 'important');
          icon.style.setProperty('height', '24px', 'important');
          icon.style.setProperty('min-width', '24px', 'important');
          icon.style.setProperty('min-height', '24px', 'important');
        });

        // Also try to fix them when dropdown opens
        const alignmentPicker = toolbar.querySelector('.ql-align');
        if (alignmentPicker) {
          alignmentPicker.addEventListener('click', () => {
            setTimeout(() => {
              const dropdownIcons = document.querySelectorAll('.ql-align .ql-picker-options .ql-picker-item svg');
              dropdownIcons.forEach(icon => {
                icon.style.setProperty('width', '24px', 'important');
                icon.style.setProperty('height', '24px', 'important');
                icon.style.setProperty('min-width', '24px', 'important');
                icon.style.setProperty('min-height', '24px', 'important');
              });
            }, 50);
          });
        }
      }
    };

    // Apply multiple times with different delays
    setTimeout(applyToolbarSpacing, 50);
    setTimeout(applyToolbarSpacing, 200);
    setTimeout(applyToolbarSpacing, 500);
    
    return () => {};
  }, [editorContent, selectedEntry]);

  const handleQuillChange = (content, delta, source, editor) => {
    setEditorContent(content);
    
    // Auto-create entry if no entry exists and user is typing
    if (!selectedEntry && source === 'user' && content.trim()) {
      createNewEntry();
      return; // Exit early, the new entry will be created and selected
    }
    
    // Only auto-save for user changes, not programmatic changes
    if (!hasLoaded.current || !selectedEntry || source !== 'user') return;

    const plainText = editor.getText().trim();
    
    // Create updated entry with new content and snippet
    const updatedEntry = {
      ...selectedEntry,
      content,
      snippet: plainText.slice(0, 100),
      modified: new Date().toISOString() // Update modified timestamp
    };

    // Update local state immediately for responsive UI
    setEntries((prev) =>
      prev.map((e) => (e.id === selectedEntry.id ? { ...e, ...updatedEntry } : e))
    );

    // Debounced auto-save to server
    clearTimeout(window.autoSaveTimeout);
    window.autoSaveTimeout = setTimeout(async () => {
      try {
        const { data } = await axios.put(`${API_BASE}/${selectedEntry.id}`, updatedEntry, {
          headers: getAuthHeaders()
        });
        
        // Update with server response to ensure consistency
        setEntries((prev) =>
          prev.map((e) => (e.id === selectedEntry.id ? data : e))
        );
      } catch (err) {
        console.error("Failed to auto-save entry:", err);
        
        // Retry once after 2 seconds
        setTimeout(async () => {
          try {
            const { data } = await axios.put(`${API_BASE}/${selectedEntry.id}`, updatedEntry, {
              headers: getAuthHeaders()
            });
            setEntries((prev) =>
              prev.map((e) => (e.id === selectedEntry.id ? data : e))
            );
          } catch (retryErr) {
            console.error("Auto-save retry failed:", retryErr);
          }
        }, 2000);
      }
    }, 800); // Optimized timing - not too fast, not too slow
  };

  // All your original functions below — Enhanced with proper error handling
  const updateTitle = async (title) => {
    if (!selectedEntry) return;
    try {
      const updated = { ...selectedEntry, title };
      const { data } = await axios.put(`${API_BASE}/${selectedEntry.id}`, updated, {
        headers: getAuthHeaders()
      });
      setEntries((prev) => prev.map((e) => (e.id === selectedEntry.id ? data : e)));
    } catch (err) {
      console.error("Failed to update title:", err);
    }
  };

  const selectEntry = (id) => {
    // Clear any pending auto-save before switching entries
    clearTimeout(window.autoSaveTimeout);
    
    const entry = entries.find((e) => e.id === id);
    if (!entry) return;
    
    setSelectedId(id);
    setEditorContent(entry.content || "");
    
    // Small delay to ensure editor is ready
    setTimeout(() => {
      hasLoaded.current = true;
    }, 100);
  };

  const toggleFavorite = async (id) => {
    const entry = entries.find((e) => e.id === id);
    if (!entry) return;
    try {
      const updated = { ...entry, favorite: !entry.favorite };
      const { data } = await axios.put(`${API_BASE}/${id}`, updated, {
        headers: getAuthHeaders()
      });
      setEntries((prev) => prev.map((e) => (e.id === id ? data : e)));
    } catch (err) {
      console.error("Failed to toggle favorite:", err);
    }
  };

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteEntryId, setDeleteEntryId] = useState(null);

  const deleteEntry = async (id) => {
    setDeleteEntryId(id);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!deleteEntryId) return;
    
    try {
      await axios.delete(`${API_BASE}/${deleteEntryId}`, {
        headers: getAuthHeaders()
      });
      const filtered = entries.filter((e) => e.id !== deleteEntryId);
      setEntries(filtered);
      if (selectedId === deleteEntryId) {
        if (filtered.length) {
          selectEntry(filtered[0].id);
        } else {
          setSelectedId(null);
          setEditorContent("");
        }
      }
    } catch (err) {
      console.error("Failed to delete entry:", err);
    } finally {
      setShowDeleteModal(false);
      setDeleteEntryId(null);
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setDeleteEntryId(null);
  };

  const createNewEntry = async () => {
    try {
      setIsLoading(true);
      const newEntry = { 
        title: "Untitled", 
        content: "", 
        snippet: "", 
        favorite: false 
      };
      const { data } = await axios.post(API_BASE, newEntry, {
        headers: getAuthHeaders()
      });
      setEntries((prev) => [data, ...prev]);
      setSelectedId(data.id);
      setEditorContent("");
    } catch (err) {
      console.error("Failed to create entry:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const downloadEntry = () => {
    if (!selectedEntry) return;
    
    // Create a more comprehensive download with HTML formatting
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${selectedEntry.title || "Untitled"}</title>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
            h1 { color: #9565B8; border-bottom: 2px solid #9565B8; padding-bottom: 10px; }
            .meta { color: #666; font-size: 14px; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <h1>${selectedEntry.title || "Untitled"}</h1>
          <div class="meta">Created: ${formatDateTime(selectedEntry.modified)}</div>
          <div class="content">${selectedEntry.content}</div>
        </body>
      </html>
    `;
    
    const blob = new Blob([htmlContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedEntry.title || "Untitled"}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const printEntry = () => {
    if (!selectedEntry) return;
    const printWindow = window.open("", "_blank");
    const printContent = `
      <html>
        <head>
          <title>${selectedEntry.title}</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
            h1 { color: #9565B8; border-bottom: 2px solid #9565B8; padding-bottom: 10px; }
            .meta { color: #666; font-size: 14px; margin-bottom: 20px; }
            @media print { body { margin: 0; padding: 15px; } }
          </style>
        </head>
        <body>
          <h1>${selectedEntry.title || "Untitled"}</h1>
          <div class="meta">Created: ${formatDateTime(selectedEntry.modified)}</div>
          <div class="content">${selectedEntry.content}</div>
        </body>
      </html>
    `;
    printWindow.document.open();
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const filtered = entries
    .filter((e) => {
      const q = query.trim().toLowerCase();
      const isFavorite = navState === "Favorites" ? e.favorite : true;
      if (!q) return isFavorite;
      return (
        isFavorite &&
        (e.title?.toLowerCase().includes(q) ||
          e.snippet?.toLowerCase().includes(q) ||
          e.content?.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => new Date(b.modified) - new Date(a.modified));

  const hasEntries = entries.length > 0;

  return (
    <div className="journal-page">
      {/* PERFECT HOMEPAGE-STYLE NAVBAR */}
      <nav className="navbar">
        <img src={logo} alt="Soluna Logo" className="nav-logo" />
        <ul className="nav-links">
          <li><NavLink to="/home" end className={({ isActive }) => (isActive ? "active" : "")}>Home</NavLink></li>
          <li><NavLink to="/mood" className={({ isActive }) => (isActive ? "active" : "")}>Mood Tracking</NavLink></li>
          <li><NavLink to="/journal" className={({ isActive }) => (isActive ? "active" : "")}>Journal</NavLink></li>
          <li><NavLink to="/chatbot" className={({ isActive }) => (isActive ? "active" : "")}>Chatbot</NavLink></li>
          <li><NavLink to="/libraries" className={({ isActive }) => (isActive ? "active" : "")}>Libraries</NavLink></li>
          <li><NavLink to="/reports" className={({ isActive }) => (isActive ? "active" : "")}>Reports</NavLink></li>
        </ul>
        <ProfileDropdown 
          userInitial={userInitial} 
          profilePic={profilePic}
          onProfileUpdate={(updates) => {
            if (updates.avatar !== undefined) setProfilePic(updates.avatar);
          }}
        />
      </nav>

      {/* YOUR FULL ORIGINAL LAYOUT BELOW — ENHANCED */}
      <div className={`journal-container ${isLoading ? 'loading' : ''}`}>
        {isLoading && <div className="loading-spinner"></div>}
        <aside className="sidebar">
          <div className="logo-wrap">
            <div className="logo-text">Previous Entries</div>
          </div>
          <div className="create-row">
            <button 
              className="create-btn" 
              onClick={createNewEntry}
              disabled={isLoading}
            >
              {isLoading ? "Creating..." : "+ New Entry"}
            </button>
          </div>
          <div className="nav-list">
            {["Recent", "Favorites"].map((nav) => (
              <button
                key={nav}
                className={`nav-item ${navState === nav ? "active" : ""}`}
                onClick={() => setNavState(nav)}
              >
                {nav}
              </button>
            ))}
          </div>
          <div className="search-area">
            <FiSearch className="search-icon" />
            <input
              className="search-input"
              placeholder="Search entries..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="previous-entries">
            <div className="entries-list">
              {!hasEntries ? (
                <div className="no-results">
                  <FiBookOpen className="open-book-icon" />
                  <span>No previous entries</span>
                </div>
              ) : filtered.length === 0 ? (
                <div className="no-results">
                  <FiBookOpen className="open-book-icon" />
                  <span>No Favorites</span>
                </div>
              ) : (
                filtered.map((e) => (
                  <div
                    key={e.id}
                    className={`entry-row ${e.id === selectedId ? "selected" : ""}`}
                    onClick={() => selectEntry(e.id)}
                  >
                    <div className="entry-left">
                      <div className="entry-title">{e.title || "Untitled"}</div>
                      <div className="entry-sub">
                        {e.snippet || (e.content ? e.content.replace(/<[^>]*>/g, '').slice(0, 60) : 'No content')}
                      </div>
                      <div className="entry-date">
                        {formatDateTime(e.modified)}
                      </div>
                    </div>
                    <div className="entry-actions">
                      <button
                        className={`heart-btn ${e.favorite ? "fav" : ""}`}
                        onClick={(ev) => {
                          ev.stopPropagation();
                          toggleFavorite(e.id);
                        }}
                      >
                        <FiHeart />
                      </button>
                      <button
                        className="delete-btn"
                        onClick={(ev) => {
                          ev.stopPropagation();
                          deleteEntry(e.id);
                        }}
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>

        <main className="main-area">
          <div className="main-header">
            <input
              className="title-input"
              value={selectedEntry?.title ?? "Untitled"}
              onChange={(e) => updateTitle(e.target.value)}
              placeholder="Title"
            />
            <div className="header-actions">
              <button
                className={`heart-btn ${selectedEntry?.favorite ? "fav" : ""}`}
                onClick={() => selectedEntry && toggleFavorite(selectedEntry.id)}
                disabled={!selectedEntry}
              >
                <FiHeart />
              </button>
              <div className="download-print-wrapper">
                <button 
                  className="download-btn" 
                  onClick={downloadEntry} 
                  disabled={!selectedEntry}
                >
                  <FiDownload />
                </button>
                <button 
                  className="print-btn" 
                  onClick={printEntry} 
                  disabled={!selectedEntry}
                >
                  <FiPrinter />
                </button>
              </div>
            </div>
          </div>

          <div className="editor-section">
            <div className="editor-wrap glass-card">
              <ReactQuill
                theme="snow"
                value={editorContent}
                onChange={handleQuillChange}
                modules={modules}
                formats={formats}
                placeholder="Start writing here... Let your heart speak."
                bounds=".editor-wrap"
                style={{
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  '--ql-primary-color': '#9565B8',
                  '--ql-hover-color': 'rgba(149, 101, 184, 0.2)',
                  '--ql-active-color': 'rgba(149, 101, 184, 0.3)'
                }}
              />
            </div>
          </div>

          <div className="footer-row">
            <div className="modified-text">
              Last modified: {formatDateTime(selectedEntry?.modified)}
            </div>
          </div>
        </main>
      </div>

      {/* Custom Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Delete Entry</h3>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to delete this entry? This action cannot be undone.</p>
            </div>
            <div className="modal-actions">
              <button className="modal-btn cancel-btn" onClick={cancelDelete}>
                Cancel
              </button>
              <button className="modal-btn delete-btn" onClick={confirmDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}