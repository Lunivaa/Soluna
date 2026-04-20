import { FiSearch, FiPlus } from "react-icons/fi";

export default function ArtPage({
  artTherapy,
  searchQuery, setSearchQuery,
  getImageUrl,
  startEditingArt,
  setArtToDelete,
  setShowDeleteArtModal,
  setShowAddArtModal,
}) {
  const filteredArt = searchQuery
    ? artTherapy.filter(a => a.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : artTherapy;

  return (
    <div className="admin-content">
      <div className="admin-section-header">
        <h3>Coloring Templates Management</h3>
        <div className="admin-actions">
          <button className="admin-btn primary" onClick={() => setShowAddArtModal(true)}>
            <FiPlus /> Add Template
          </button>
        </div>
      </div>

      <div className="admin-search-area">
        <FiSearch className="search-icon" />
        <input
          type="text"
          className="search-input"
          placeholder="Search coloring templates..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          autoComplete="off"
        />
      </div>

      <div className="content-grid">
        {filteredArt.length === 0 ? (
          <div className="no-content-message">
            <p>No coloring templates found.</p>
          </div>
        ) : (
          filteredArt.map(art => (
            <div key={art.id} className="content-card">
              {art.thumbnail_url && (
                <div className="content-thumbnail-art">
                  <img
                    src={getImageUrl(art.thumbnail_url)}
                    alt={art.title}
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.parentElement.style.display = 'none';
                    }}
                  />
                </div>
              )}
              <div className="content-info">
                <h4>{art.title}</h4>
                <p>{art.description}</p>
              </div>
              <div className="content-actions">
                <button className="content-action-btn preview" onClick={() => window.open(`/creative-canvas/coloring-templates/${art.id}?preview=true`, '_blank')}>Preview</button>
                <button className="content-action-btn edit" onClick={() => startEditingArt(art)}>Edit</button>
                <button className="content-action-btn delete" onClick={() => { setArtToDelete(art.id); setShowDeleteArtModal(true); }}>Delete</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}