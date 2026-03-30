import { useState, useRef, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FiDownload, FiTrash2, FiSearch, FiHeart, FiArrowLeft, FiEdit3, FiEdit2, FiRotateCcw, FiPenTool, FiImage } from "react-icons/fi";
import { BsEraser, BsPalette } from "react-icons/bs";
import CanvasDraw from "react-canvas-draw";
import axios from "axios";
import { useUserPreferences } from "./hooks/useUserPreferences";
import "./CreativeCanvas.css";

export default function CreativeCanvas() {
  const navigate = useNavigate();
  const { templateId: urlTemplateId } = useParams();
  const canvasDrawRef = useRef(null);
  
  // NEW: State to track which mode is selected (null = selection screen, 'free-drawing' or 'coloring-templates')
  const [selectedMode, setSelectedMode] = useState(null);
  
  // Check URL parameters on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode');
    if (mode === 'coloring-templates' || mode === 'free-drawing') {
      setSelectedMode(mode);
    }
    // If we have a templateId in the URL path, set coloring-templates mode
    if (urlTemplateId) {
      setSelectedMode('coloring-templates');
    }
  }, []);
  
  // State for artworks (both templates and free drawings)
  const [artworks, setArtworks] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [navState, setNavState] = useState("Recent");
  
  // State for selected coloring template
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  
  // Canvas drawing settings
  const [brushColor, setBrushColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(3);
  const [isEraser, setIsEraser] = useState(false);
  
  // Modal state for naming artwork
  const [showNameModal, setShowNameModal] = useState(false);
  const [artworkName, setArtworkName] = useState('');
  
  // Modal state for download naming
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [downloadName, setDownloadName] = useState('');
  
  // Modal state for delete confirmation
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteArtworkId, setDeleteArtworkId] = useState(null);
  
  // State for current canvas favorite status
  const [isCurrentCanvasFavorited, setIsCurrentCanvasFavorited] = useState(false);
  
  // State for selected artwork in sidebar
  const [selectedArtworkId, setSelectedArtworkId] = useState(null);
  
  // State for selected artwork to load
  const [artworkToLoad, setArtworkToLoad] = useState(null);

  // Load artwork after template is set and canvas is ready
  useEffect(() => {
    if (artworkToLoad && selectedTemplate && canvasDrawRef.current) {
      const artworkDataUrl = artworkToLoad.dataUrl;
      const artworkBackgroundUrl = artworkToLoad.backgroundUrl;
      
      // Wait for canvas to be fully rendered
      setTimeout(() => {
        if (!canvasDrawRef.current) return;
        
        const canvas = canvasDrawRef.current.canvasContainer.children[1];
        const ctx = canvas.getContext('2d');
        
        // Clear the canvas first
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        if (artworkToLoad.type === 'template' && artworkBackgroundUrl) {
          // Load the saved drawing directly (it already includes the background)
          const drawingImg = new Image();
          drawingImg.onload = () => {
            ctx.drawImage(drawingImg, 0, 0, canvas.width, canvas.height);
          };
          drawingImg.src = artworkDataUrl;
        } else {
          // For free drawings
          const img = new Image();
          img.onload = () => {
            ctx.drawImage(img, 0, 0);
          };
          img.src = artworkDataUrl;
        }
        
        // Set the favorite state
        setIsCurrentCanvasFavorited(artworkToLoad.favorite);
        setSelectedArtworkId(artworkToLoad.id);
        
        // Clear the artworkToLoad
        setArtworkToLoad(null);
      }, 200);
    }
  }, [artworkToLoad, selectedTemplate]);

  // Database templates state
  const [coloringTemplates, setColoringTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // User preferences hook
  const { 
    checkMultipleSavedStatus,
    addToHistory 
  } = useUserPreferences();

  const API_BASE = "http://localhost:5001/api/selfcare";
  const ARTWORK_API = "http://localhost:5001/api/artwork";

  // Configure axios with auth token
  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // Extract Google Drive file ID from URL
  const extractGoogleDriveFileId = (url) => {
    if (!url || !url.includes('drive.google.com')) {
      return null;
    }
    
    const patterns = [
      /\/file\/d\/([a-zA-Z0-9_-]+)/,
      /[?&]id=([a-zA-Z0-9_-]+)/,
      /\/d\/([a-zA-Z0-9_-]+)/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }
    
    return null;
  };

  // Get proper image URL (use proxy for Google Drive)
  const getImageUrl = (thumbnailUrl) => {
    if (!thumbnailUrl) {
      return "/images/Wellness1.jpg"; // fallback
    }
    
    const fileId = extractGoogleDriveFileId(thumbnailUrl);
    if (fileId) {
      return `http://localhost:5001/api/selfcare-proxy/image/${fileId}`;
    }
    
    return thumbnailUrl; // Use direct URL if not Google Drive
  };
 

  useEffect(() => {
    // Scroll to top when component mounts
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    
    // Load saved artworks from backend
    loadArtworks();
    
    // Fetch coloring templates from database
    fetchColoringTemplates();
  }, []);

  const fetchColoringTemplates = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/art`);
      setColoringTemplates(response.data);
      
      // Check saved status for all items
      if (response.data.length > 0) {
        const itemIds = response.data.map(item => item.id);
        await checkMultipleSavedStatus(itemIds);
      }

      // If URL has a templateId, auto-select that template
      if (urlTemplateId) {
        const found = response.data.find(t => t.id === parseInt(urlTemplateId));
        if (found) {
          setSelectedTemplate(found);
          addToHistory(found.id);
        }
      }
    } catch (error) {
      console.error('Error fetching coloring templates:', error);
      setColoringTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  const loadArtworks = async () => {
    try {
      const response = await axios.get(ARTWORK_API, {
        headers: getAuthHeaders()
      });
      setArtworks(response.data);
    } catch (error) {
      console.error('Error loading artworks:', error);
      setArtworks([]);
    }
  };

  const saveArtwork = async (type = 'free', customName = null) => {
    let dataUrl;
    
    if (canvasDrawRef.current) {
      dataUrl = canvasDrawRef.current.canvasContainer.children[1].toDataURL();
    } else {
      return;
    }
    
    // If we're editing an existing artwork, update it instead of creating new
    if (selectedArtworkId) {
      try {
        const existingArtwork = artworks.find(art => art.id === selectedArtworkId);
        if (existingArtwork) {
          const updatedArtwork = {
            ...existingArtwork,
            dataUrl,
            favorite: isCurrentCanvasFavorited
          };
          
          const response = await axios.put(`${ARTWORK_API}/${selectedArtworkId}`, updatedArtwork, {
            headers: getAuthHeaders()
          });
          
          // Update the artwork in the list
          setArtworks(artworks.map(art => art.id === selectedArtworkId ? response.data : art));
          
          // Close modal if open
          setShowNameModal(false);
          setArtworkName('');
          
          return;
        }
      } catch (error) {
        console.error('Error updating artwork:', error);
        alert('Failed to update artwork. Please try again.');
        return;
      }
    }
    
    // Otherwise, create a new artwork
    const artworkTitle = customName || (type === 'template' && selectedTemplate ? `${selectedTemplate.title} - Colored` : `Free Drawing ${new Date().toLocaleDateString()}`);
    const newArtwork = {
      title: artworkTitle,
      dataUrl,
      type: type,
      favorite: isCurrentCanvasFavorited,
      ...(type === 'template' && selectedTemplate && {
        templateId: selectedTemplate.id,
        backgroundUrl: getImageUrl(selectedTemplate.thumbnail_url)
      })
    };
    
    try {
      const response = await axios.post(ARTWORK_API, newArtwork, {
        headers: getAuthHeaders()
      });
      
      // Add the new artwork to the list
      setArtworks([response.data, ...artworks]);
      
      // Set this as the selected artwork
      setSelectedArtworkId(response.data.id);
      
      // Close modal and reset states
      setShowNameModal(false);
      setArtworkName('');
      
      // Reset canvas states after saving
      setIsCurrentCanvasFavorited(false);
    } catch (error) {
      console.error('Error saving artwork:', error);
      alert('Failed to save artwork. Please try again.');
    }
  };

  const openSaveModal = () => {
    setShowNameModal(true);
    setArtworkName('');
  };

  const cancelSave = () => {
    setShowNameModal(false);
    setArtworkName('');
  };

  const confirmSave = () => {
    if (artworkName.trim()) {
      saveArtwork('free', artworkName.trim());
      // Clear the canvas after saving to provide clean drawing space
      if (canvasDrawRef.current) {
        canvasDrawRef.current.clear();
      }
    }
  };

  const handleUndo = () => {
    if (canvasDrawRef.current) {
      canvasDrawRef.current.undo();
    }
  };

  const addToFavorites = () => {
    // Just toggle the heart fill state, don't add to sidebar
    setIsCurrentCanvasFavorited(!isCurrentCanvasFavorited);
  };

  const loadArtwork = (artwork) => {
    // If it's a colored template, set the template first WITHOUT clearing selectedArtworkId
    if (artwork.type === 'template' && artwork.templateId) {
      // Find the template from the coloringTemplates list
      const template = coloringTemplates.find(t => t.id === artwork.templateId);
      if (template) {
        // Set template WITHOUT clearing artwork ID (different from selectTemplate)
        setSelectedTemplate(template);
        // Don't call addToHistory here since we're loading existing artwork
        setArtworkToLoad(artwork); // Set artwork to load after template renders
        return;
      }
    }
    
    // For free drawings, load immediately
    const artworkDataUrl = artwork.dataUrl;
    
    if (artworkDataUrl && canvasDrawRef.current) {
      setTimeout(() => {
        if (!canvasDrawRef.current) return;
        
        const canvas = canvasDrawRef.current.canvasContainer.children[1];
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0);
        };
        img.src = artworkDataUrl;
        
        setIsCurrentCanvasFavorited(artwork.favorite);
        setSelectedArtworkId(artwork.id);
      }, 100);
    }
  };

  // Clear selection when clicking outside sidebar
  const handleCanvasClick = () => {
    setSelectedArtworkId(null);
  };

  const deleteArtwork = (artworkId) => {
    setDeleteArtworkId(artworkId);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!deleteArtworkId) return;
    
    try {
      await axios.delete(`${ARTWORK_API}/${deleteArtworkId}`, {
        headers: getAuthHeaders()
      });
      
      const filtered = artworks.filter((art) => art.id !== deleteArtworkId);
      setArtworks(filtered);
      
      // If the deleted artwork was currently selected, clear the canvas
      if (selectedArtworkId === deleteArtworkId) {
        if (canvasDrawRef.current) {
          canvasDrawRef.current.clear();
        }
        setSelectedArtworkId(null);
        setIsCurrentCanvasFavorited(false);
      }
      
      setShowDeleteModal(false);
      setDeleteArtworkId(null);
    } catch (error) {
      console.error('Error deleting artwork:', error);
      alert('Failed to delete artwork. Please try again.');
      setShowDeleteModal(false);
      setDeleteArtworkId(null);
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setDeleteArtworkId(null);
  };

  const toggleFavorite = async (artworkId) => {
    const artwork = artworks.find(art => art.id === artworkId);
    if (!artwork) return;
    
    try {
      const updatedArtwork = { 
        ...artwork, 
        favorite: !artwork.favorite,
        dataUrl: artwork.dataUrl
      };
      
      await axios.put(`${ARTWORK_API}/${artworkId}`, updatedArtwork, {
        headers: getAuthHeaders()
      });
      
      const updatedArtworks = artworks.map(art => 
        art.id === artworkId ? { ...art, favorite: !art.favorite } : art
      );
      setArtworks(updatedArtworks);
    } catch (error) {
      console.error('Error toggling favorite:', error);
      alert('Failed to update favorite status. Please try again.');
    }
  };

  const clearFreeDrawing = () => {
    if (canvasDrawRef.current) {
      canvasDrawRef.current.clear();
      // Reset favorite state when clearing canvas
      setIsCurrentCanvasFavorited(false);
      // Reset selected artwork
      setSelectedArtworkId(null);
    }
  };

  const downloadFreeDrawing = () => {
    setShowDownloadModal(true);
  };

  const confirmDownload = () => {
    if (downloadName.trim() && canvasDrawRef.current) {
      const canvas = canvasDrawRef.current.canvasContainer.children[1];
      const link = document.createElement('a');
      link.download = `${downloadName.trim()}.png`;
      link.href = canvas.toDataURL();
      link.click();
      setShowDownloadModal(false);
      setDownloadName('');
    }
  };

  const cancelDownload = () => {
    setShowDownloadModal(false);
    setDownloadName('');
  };

  const selectTemplate = (template) => {
    setSelectedTemplate(template);
    addToHistory(template.id);
    setSelectedArtworkId(null);
    setIsCurrentCanvasFavorited(false);
    navigate(`/creative-canvas/coloring-templates/${template.id}`, { replace: true });
    if (canvasDrawRef.current) {
      canvasDrawRef.current.clear();
    }
  };

  const filteredArtworks = artworks
    .filter((artwork) => {
      const q = searchQuery.trim().toLowerCase();
      const isFavorite = navState === "Favorites" ? artwork.favorite : true;
      
      // Filter by mode: only show templates in coloring mode, only free drawings in free-drawing mode
      const matchesMode = selectedMode === 'coloring-templates' 
        ? artwork.type === 'template' 
        : artwork.type === 'free';
      
      if (!q) return isFavorite && matchesMode;
      return (
        isFavorite &&
        matchesMode &&
        artwork.title.toLowerCase().includes(q)
      );
    });

  return (
    <div className="creative-canvas-page">
      {/* Selection Screen - Show when no mode is selected */}
      {!selectedMode && (
        <div className="libraries-container">
          {/* Back Button and Header */}
          <div className="page-header">
            <button className="libraries-back-btn" onClick={() => navigate('/libraries')}>
              <FiArrowLeft />
            </button>
            <div className="page-header-content">
              <h1 className="page-title">
                <FiEdit3 className="section-icon" />
                Creative Canvas
              </h1>
              <p className="page-description">
                Choose your creative activity to express yourself and relax
              </p>
            </div>
          </div>

          {/* Selection Cards - Libraries Style */}
          <div className="audio-category-cards">
            <div className="category-card" onClick={() => setSelectedMode('coloring-templates')}>
              <div className="category-icon">
                <BsPalette />
              </div>
              <div className="category-content">
                <h3 className="category-title">Color Studio</h3>
                <p className="category-description">
                  Choose from beautiful pre-made templates and bring them to life with your colors
                </p>
                <button className="category-btn">
                  Start Coloring
                </button>
              </div>
            </div>

            <div className="category-card" onClick={() => setSelectedMode('free-drawing')}>
              <div className="category-icon">
                <FiPenTool />
              </div>
              <div className="category-content">
                <h3 className="category-title">Sketchpad</h3>
                <p className="category-description">
                  Express yourself freely on a blank canvas with various drawing tools
                </p>
                <button className="category-btn">
                  Start Drawing
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Container - Show when mode is selected */}
      {selectedMode && (
        <div className="canvas-container">
        {/* Left Sidebar - Previous Work */}
        <div className="canvas-sidebar">
          <div className="logo-wrap">
            <button className="sidebar-back-btn" onClick={() => navigate('/libraries')}>
              <FiArrowLeft />
            </button>
            <span className="logo-text">Art Gallery</span>
          </div>
          
          {selectedMode === 'free-drawing' && (
            <div className="create-row">
              <button 
                className="create-btn" 
                onClick={() => {
                  if (canvasDrawRef.current) {
                    canvasDrawRef.current.clear();
                    setIsCurrentCanvasFavorited(false);
                    setSelectedArtworkId(null);
                  }
                }}
              >
                + New Art
              </button>
            </div>
          )}
          
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
              type="text"
              placeholder="Search artworks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>
          
          <div className="previous-entries">
            <div className="entries-list">
              {filteredArtworks.length > 0 ? (
                filteredArtworks.map((artwork) => (
                  <div
                    key={artwork.id}
                    className={`artwork-item ${selectedArtworkId === artwork.id ? 'selected' : ''} ${selectedTemplate ? 'disabled' : ''}`}
                    onClick={(e) => {
                      // Only allow clicking if not currently coloring a template
                      if (!selectedTemplate) {
                        e.stopPropagation();
                        loadArtwork(artwork);
                      }
                    }}
                    style={{ cursor: selectedTemplate ? 'not-allowed' : 'pointer' }}
                  >
                    <div className="artwork-left">
                      <div className="artwork-thumbnail-placeholder">
                        {artwork.dataUrl ? (
                          <img 
                            src={artwork.dataUrl} 
                            alt={artwork.title}
                            className="artwork-thumbnail-image"
                          />
                        ) : (
                          artwork.type === 'template' ? '🎨' : '✏️'
                        )}
                      </div>
                      <div className="artwork-info">
                        <h4 className="artwork-title">{artwork.title}</h4>
                        <p className="artwork-date">{new Date(artwork.createdAt).toLocaleDateString()}</p>
                        <p className="artwork-type">{artwork.type === 'template' ? 'Colored Template' : 'Free Drawing'}</p>
                      </div>
                    </div>
                    <div className="artwork-actions">
                      <button
                        className={`heart-btn ${artwork.favorite ? 'fav' : ''}`}
                        onClick={(e) => { e.stopPropagation(); toggleFavorite(artwork.id); }}
                      >
                        <FiHeart />
                      </button>
                      <button
                        className="delete-artwork-btn"
                        onClick={(e) => { e.stopPropagation(); deleteArtwork(artwork.id); }}
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  </div>
                ))
              ) : navState === "Favorites" ? (
                <div className="canvas-no-results">
                  <FiImage className="canvas-empty-icon" />
                  <span>No Favorites</span>
                </div>
              ) : (
                <div className="canvas-empty-gallery">
                  <FiImage className="canvas-empty-icon" />
                  <p>No artworks yet. Start creating!</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Side - Main Canvas Area */}
        <div className="canvas-main" onClick={handleCanvasClick}>
          {/* Back Button and Header */}
          <div className="page-header">
            <button className="libraries-back-btn" onClick={() => setSelectedMode(null)}>
              <FiArrowLeft />
            </button>
            <div className="page-header-content">
              <h1 className="page-title">
                {selectedMode === 'coloring-templates' ? <BsPalette className="section-icon" /> : <FiPenTool className="section-icon" />}
                {selectedMode === 'coloring-templates' ? 'Color Studio' : 'Sketchpad'}
              </h1>
              <p className="page-description">
                {selectedMode === 'coloring-templates' ? 'Choose a template and bring it to life with colors' : 'Create your own masterpiece on a blank canvas'}
              </p>
            </div>
          </div>

          {/* Template Cards Section - Only show in coloring-templates mode */}
          {selectedMode === 'coloring-templates' && !selectedTemplate && (
            <div className="canvas-templates-section">
            {loading ? (
              <div className="loading-message">Loading coloring templates...</div>
            ) : coloringTemplates.length === 0 ? (
              <div className="empty-state">
                <p className="empty-state-text">No coloring templates available yet.</p>
                <p style={{ fontSize: '14px', color: '#666', marginTop: '10px' }}>
                  Add some art templates to the database with category 'art' to see them here.
                </p>
              </div>
            ) : (
              <div className="canvas-template-grid">
                {coloringTemplates.map((template) => (
                  <div 
                    key={template.id} 
                    className="canvas-template-card"
                  >
                    <div className="canvas-template-preview">
                      <img 
                        src={getImageUrl(template.thumbnail_url)} 
                        alt={template.title} 
                        className="canvas-template-image"
                        onError={(e) => {
                          e.target.src = "/images/Wellness1.jpg"; // fallback image
                        }}
                      />
                    </div>
                    <h4 className="canvas-template-title">{template.title}</h4>
                    <p className="canvas-template-description">
                      {template.description || "A beautiful coloring template to help you relax and express your creativity."}
                    </p>
                    <div className="canvas-template-controls">
                      <button 
                        className="canvas-start-btn"
                        onClick={() => selectTemplate(template)}
                      >
                        Start Coloring
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          )}

          {/* Coloring Canvas Section - Show when template is selected */}
          {selectedMode === 'coloring-templates' && selectedTemplate && (
          <div className="canvas-drawing-section">
            <div className="canvas-section-header">
              <button className="canvas-back-to-templates-btn" onClick={() => { setSelectedTemplate(null); navigate('/creative-canvas?mode=coloring-templates', { replace: true }); }}>
                <FiArrowLeft /> Back to Templates
              </button>
              <h2 className="canvas-section-title">{selectedTemplate.title}</h2>
            </div>
            
            <div className="simple-drawing-controls">
              <input
                type="color"
                value={brushColor}
                onChange={(e) => setBrushColor(e.target.value)}
                className="simple-color-picker"
                disabled={isEraser}
              />
              
              <button 
                className={`simple-drawing-btn ${!isEraser ? 'active' : ''}`}
                onClick={() => setIsEraser(false)}
              >
                <FiEdit2 />
              </button>
              
              <button 
                className={`simple-drawing-btn ${isEraser ? 'active' : ''}`}
                onClick={() => setIsEraser(true)}
              >
                <BsEraser />
              </button>
              
              <div className="brush-size-control">
                <input
                  type="range"
                  min="1"
                  max="50"
                  value={brushSize}
                  onChange={(e) => setBrushSize(e.target.value)}
                  className="simple-size-slider"
                />
                <span className="simple-size-badge">{brushSize}px</span>
              </div>
              
              <button 
                className="simple-drawing-btn" 
                onClick={handleUndo}
              >
                <FiRotateCcw />
              </button>
              
              <button 
                className="simple-drawing-btn clear-text-btn" 
                onClick={() => canvasDrawRef.current?.clear()}
              >
                Clear
              </button>
              
              <button 
                className="simple-drawing-btn save-text-btn"
                onClick={() => saveArtwork('template')}
              >
                Save
              </button>
              
              <button 
                className="simple-drawing-btn" 
                onClick={downloadFreeDrawing}
              >
                <FiDownload />
              </button>
              
              <button 
                className="simple-drawing-btn canvas-favorite-btn"
                onClick={addToFavorites}
              >
                <FiHeart className={isCurrentCanvasFavorited ? 'filled-heart' : ''} />
              </button>
            </div>
            
            <div className="coloring-canvas-area-inline">
              <div className="template-background">
                <img 
                  src={getImageUrl(selectedTemplate.thumbnail_url)}
                  alt={selectedTemplate.title}
                  className="template-background-image"
                  onError={(e) => {
                    e.target.src = "/images/Wellness1.jpg";
                  }}
                />
              </div>
              <CanvasDraw
                ref={canvasDrawRef}
                brushColor={isEraser ? '#FAFAFA' : brushColor}
                brushRadius={brushSize}
                canvasWidth={700}
                canvasHeight={430}
                lazyRadius={0}
                immediateLoading={true}
                hideGrid={true}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  background: 'transparent'
                }}
              />
            </div>
          </div>
          )}

          {/* Drawing Canvas Section - Only show in free-drawing mode */}
          {selectedMode === 'free-drawing' && (
          <div className="canvas-drawing-section">
            
            <div className="simple-drawing-controls">
              <input
                type="color"
                value={brushColor}
                onChange={(e) => setBrushColor(e.target.value)}
                className="simple-color-picker"
                disabled={isEraser}
              />
              
              <button 
                className={`simple-drawing-btn ${!isEraser ? 'active' : ''}`}
                onClick={() => setIsEraser(false)}
              >
                <FiEdit2 />
              </button>
              
              <button 
                className={`simple-drawing-btn ${isEraser ? 'active' : ''}`}
                onClick={() => setIsEraser(true)}
              >
                <BsEraser />
              </button>
              
              <div className="brush-size-control">
                <input
                  type="range"
                  min="1"
                  max="50"
                  value={brushSize}
                  onChange={(e) => setBrushSize(e.target.value)}
                  className="simple-size-slider"
                />
                <span className="simple-size-badge">{brushSize}px</span>
              </div>
              
              <button 
                className="simple-drawing-btn" 
                onClick={handleUndo}
              >
                <FiRotateCcw />
              </button>
              
              <button 
                className="simple-drawing-btn clear-text-btn" 
                onClick={() => canvasDrawRef.current?.clear()}
              >
                Clear
              </button>
              
              <button 
                className="simple-drawing-btn save-text-btn"
                onClick={openSaveModal}
              >
                Save
              </button>
              
              <button 
                className="simple-drawing-btn" 
                onClick={downloadFreeDrawing}
              >
                <FiDownload />
              </button>
              
              <button 
                className="simple-drawing-btn canvas-favorite-btn"
                onClick={addToFavorites}
              >
                <FiHeart className={isCurrentCanvasFavorited ? 'filled-heart' : ''} />
              </button>
            </div>
            
            <div className="drawing-canvas-wrapper">
              <CanvasDraw
                ref={canvasDrawRef}
                brushColor={isEraser ? 'rgba(250, 250, 250, 1)' : brushColor}
                brushRadius={brushSize}
                canvasWidth={920}
                canvasHeight={480}
                lazyRadius={0}
                immediateLoading={true}
                hideGrid={true}
                style={{
                  border: '2px solid rgba(255, 255, 255, 0.3)',
                  borderRadius: '12px',
                  background: '#FAFAFA',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.1)'
                }}
                onChange={() => {
                  // Canvas change handler
                }}
              />
              {/* Custom grid overlay that won't be affected by eraser */}
              <div className="canvas-grid-overlay"></div>
            </div>
          </div>
          )}
        </div>
        </div>
      )}

      {/* Modals - Always available */}
      {/* Save Artwork Modal */}
      {showNameModal && (
        <div className="canvas-modal-overlay">
          <div className="canvas-modal-content">
            <div className="canvas-modal-header">
              <h3>Save Artwork</h3>
            </div>
            <div className="canvas-modal-body">
              <p>Enter a name for your artwork:</p>
              <input
                type="text"
                value={artworkName}
                onChange={(e) => setArtworkName(e.target.value)}
                placeholder="Untitled Artwork"
                className="canvas-artwork-name-input"
                autoFocus
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    confirmSave();
                  }
                }}
              />
            </div>
            <div className="canvas-modal-actions">
              <button className="canvas-modal-btn canvas-cancel-btn" onClick={cancelSave}>
                Cancel
              </button>
              <button className="canvas-modal-btn canvas-save-btn" onClick={confirmSave}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Download Modal */}
      {showDownloadModal && (
        <div className="canvas-modal-overlay">
          <div className="canvas-modal-content">
            <div className="canvas-modal-header">
              <h3>Download Artwork</h3>
            </div>
            <div className="canvas-modal-body">
              <p>Enter a name for your download:</p>
              <input
                type="text"
                value={downloadName}
                onChange={(e) => setDownloadName(e.target.value)}
                placeholder="Untitled Artwork"
                className="canvas-artwork-name-input"
                autoFocus
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    confirmDownload();
                  }
                }}
              />
            </div>
            <div className="canvas-modal-actions">
              <button className="canvas-modal-btn canvas-cancel-btn" onClick={cancelDownload}>
                Cancel
              </button>
              <button className="canvas-modal-btn canvas-save-btn" onClick={confirmDownload}>
                Download
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Delete Artwork</h3>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to delete this artwork? This action cannot be undone.</p>
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