import { useState, useRef, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FiDownload, FiTrash2, FiSearch, FiHeart, FiArrowLeft, FiEdit3, FiEdit2, FiRotateCcw } from "react-icons/fi";
import { BsEraser } from "react-icons/bs";
import { AiFillHeart } from "react-icons/ai";
import CanvasDraw from "react-canvas-draw";
import axios from "axios";
import "./ColoringTemplate.css";

export default function ColoringTemplate() {
  const navigate = useNavigate();
  const { templateId } = useParams();
  const canvasDrawRef = useRef(null);
  
  // Canvas drawing settings
  const [brushColor, setBrushColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(3);
  const [isEraser, setIsEraser] = useState(false);
  
  // Template state
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [showNameModal, setShowNameModal] = useState(false);
  const [artworkName, setArtworkName] = useState('');
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [downloadName, setDownloadName] = useState('');
  
  // State for current canvas favorite status
  const [isCurrentCanvasFavorited, setIsCurrentCanvasFavorited] = useState(false);

  const API_BASE = "http://localhost:5001/api/selfcare";

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

  // Toolbar functions
  const handleUndo = () => {
    if (canvasDrawRef.current) {
      canvasDrawRef.current.undo();
    }
  };

  const addToFavorites = () => {
    setIsCurrentCanvasFavorited(!isCurrentCanvasFavorited);
  };

  const handleSave = () => {
    // Save immediately with default name
    const defaultName = `${selectedTemplate.title} - Colored`;
    saveColoredTemplate(defaultName);
  };

  const openSaveModal = () => {
    setShowNameModal(true);
  };

  const confirmSave = () => {
    if (artworkName.trim()) {
      saveColoredTemplate(artworkName.trim());
    }
  };

  const cancelSave = () => {
    setShowNameModal(false);
    setArtworkName('');
  };

  const openDownloadModal = () => {
    setShowDownloadModal(true);
  };

  const confirmDownload = () => {
    if (downloadName.trim()) {
      downloadColoring(downloadName.trim());
      setShowDownloadModal(false);
      setDownloadName('');
    }
  };

  const cancelDownload = () => {
    setShowDownloadModal(false);
    setDownloadName('');
  };

  useEffect(() => {
    // Fetch the specific template
    if (templateId) {
      fetchTemplate();
    }
  }, [templateId]);

  const fetchTemplate = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/item/${templateId}`);
      setSelectedTemplate(response.data);
    } catch (error) {
      console.error('Error fetching template:', error);
      setSelectedTemplate(null);
    } finally {
      setLoading(false);
    }
  };

  const saveColoredTemplate = (customName = null) => {
    if (canvasDrawRef.current && selectedTemplate) {
      // For now, just save the drawing canvas without the background
      // This avoids CORS issues with the background image
      const drawingCanvas = canvasDrawRef.current.canvasContainer.children[1];
      const dataURL = drawingCanvas.toDataURL('image/png');
      
      // Save to localStorage
      const saved = localStorage.getItem('soluna-artworks');
      const artworks = saved ? JSON.parse(saved) : [];
      
      const artworkTitle = customName || `${selectedTemplate.title} - Colored`;
      const newArtwork = {
        id: Date.now(),
        title: artworkTitle,
        dataURL,
        createdAt: new Date().toISOString(),
        favorite: isCurrentCanvasFavorited,
        type: 'template',
        templateId: selectedTemplate.id,
        backgroundUrl: getImageUrl(selectedTemplate.thumbnail_url) // Store background URL separately
      };
      
      const updatedArtworks = [newArtwork, ...artworks];
      localStorage.setItem('soluna-artworks', JSON.stringify(updatedArtworks));
      
      // Close modal and reset states
      setShowNameModal(false);
      setArtworkName('');
      setIsCurrentCanvasFavorited(false);
      
      // Navigate back to main page
      navigate('/creative-canvas');
    }
  };

  const downloadColoring = (customName = null) => {
    if (canvasDrawRef.current && selectedTemplate) {
      // For now, just download the drawing canvas without the background
      // This avoids CORS issues with the background image
      const drawingCanvas = canvasDrawRef.current.canvasContainer.children[1];
      
      // Download the drawing
      const link = document.createElement('a');
      const fileName = customName || `${selectedTemplate.title}-colored-${Date.now()}`;
      link.download = `${fileName}.png`;
      link.href = drawingCanvas.toDataURL('image/png');
      link.click();
    }
  };

  const clearCanvas = () => {
    if (canvasDrawRef.current) {
      canvasDrawRef.current.clear();
    }
  };

  if (loading) {
    return (
      <div className="coloring-template-page">
        <div className="loading-message">
          <h2>Loading template...</h2>
        </div>
      </div>
    );
  }

  if (!selectedTemplate) {
    return (
      <div className="coloring-template-page">
        <div className="error-message">
          <h2>Template not found</h2>
          <button onClick={() => navigate('/creative-canvas')}>Go Back</button>
        </div>
      </div>
    );
  }

  return (
    <div className="coloring-template-page">
      {/* Main Content */}
      <div className="coloring-container">
        {/* Header */}
        <div className="coloring-header">
          <button className="meditation-style-back-btn" onClick={() => navigate('/libraries')}>
            <FiArrowLeft />
          </button>
          <div className="coloring-header-content">
            <h1>Coloring: {selectedTemplate.title}</h1>
            <p>Color within the lines to create your masterpiece</p>
          </div>
        </div>

        {/* Drawing Canvas Toolbar */}
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
            onClick={handleSave}
          >
            Save
          </button>
          
          <button 
            className="simple-drawing-btn" 
            onClick={openDownloadModal}
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

        {/* Canvas Area */}
        <div className="coloring-canvas-area">
          <div className="template-background">
            <img 
              src={getImageUrl(selectedTemplate.thumbnail_url)}
              alt={selectedTemplate.title}
              className="template-background-image"
              onError={(e) => {
                console.log('Background image failed to load:', selectedTemplate.thumbnail_url);
                e.target.src = "/images/Wellness1.jpg"; // fallback image
              }}
            />
          </div>
          <CanvasDraw
            ref={canvasDrawRef}
            brushColor={isEraser ? '#FAFAFA' : brushColor}
            brushRadius={brushSize}
            canvasWidth={800}
            canvasHeight={500}
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
    </div>
  );
}