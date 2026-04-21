import { FiSearch, FiPlus } from "react-icons/fi";

export default function SoundsPage({
  soundLoops,
  searchQuery, setSearchQuery,
  getImageUrl,
  startEditingSound,
  setSoundToDelete,
  setShowDeleteSoundModal,
  setShowAddSoundModal,
}) {
  const filteredSounds = searchQuery
    ? soundLoops.filter(s => s.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : soundLoops;

  return (
    <div className="admin-content">
      <div className="admin-section-header">
        <h3>Relaxing Soundscapes Management</h3>
        <div className="admin-actions">
          <button className="admin-btn primary" onClick={() => setShowAddSoundModal(true)}>
            <FiPlus /> Add Soundscape
          </button>
        </div>
      </div>

      <div className="admin-search-area">
        <FiSearch className="search-icon" />
        <input
          type="text"
          className="search-input"
          placeholder="Search relaxing soundscapes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          autoComplete="off"
        />
      </div>

      <div className="content-grid">
        {filteredSounds.length === 0 ? (
          <div className="no-content-message">
            <p>No relaxing soundscapes found.</p>
          </div>
        ) : (
          filteredSounds.map(sound => (
            <div key={sound.id} className="content-card">
              {sound.thumbnail_url && (
                <div className="content-thumbnail">
                  <img
                    src={getImageUrl(sound.thumbnail_url)}
                    alt={sound.title}
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.parentElement.style.display = 'none';
                    }}
                  />
                </div>
              )}
              <div className="content-info">
                <h4>{sound.title}</h4>
                <p>{sound.description}</p>
              </div>
              <div className="content-actions">
                <button className="content-action-btn preview" onClick={() => window.open(`/libraries/sounds/${sound.id}?preview=true`, '_blank')}>Preview</button>
                <button className="content-action-btn edit" onClick={() => startEditingSound(sound)}>Edit</button>
                <button className="content-action-btn delete" onClick={() => { setSoundToDelete(sound.id); setShowDeleteSoundModal(true); }}>Delete</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}