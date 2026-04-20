import { FiSearch, FiPlus } from "react-icons/fi";

export default function MeditationPage({
  meditations,
  searchQuery, setSearchQuery,
  getImageUrl,
  startEditingMeditation,
  setMeditationToDelete,
  setShowDeleteMeditationModal,
  setShowAddMeditationModal,
}) {
  const filteredMeditations = searchQuery
    ? meditations.filter(m => m.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : meditations;

  return (
    <div className="admin-content">
      <div className="admin-section-header">
        <h3>Guided Meditation Management</h3>
        <div className="admin-actions">
          <button className="admin-btn primary" onClick={() => setShowAddMeditationModal(true)}>
            <FiPlus /> Add Meditation
          </button>
        </div>
      </div>

      <div className="admin-search-area">
        <FiSearch className="search-icon" />
        <input
          type="text"
          className="search-input"
          placeholder="Search guided meditations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          autoComplete="off"
        />
      </div>

      <div className="content-grid">
        {filteredMeditations.length === 0 ? (
          <div className="no-content-message">
            <p>No guided meditations found.</p>
          </div>
        ) : (
          filteredMeditations.map(meditation => (
            <div key={meditation.id} className="content-card">
              {meditation.thumbnail_url && (
                <div className="content-thumbnail">
                  <img
                    src={getImageUrl(meditation.thumbnail_url)}
                    alt={meditation.title}
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.parentElement.style.display = 'none';
                    }}
                  />
                </div>
              )}
              <div className="content-info">
                <h4>{meditation.title}</h4>
                <p>{meditation.description}</p>
                {meditation.duration != null && meditation.duration !== '' && (
                  <div style={{fontSize: '14px', color: '#1b1b1b', marginBottom: '12px', fontWeight: '500'}}>
                    Duration: {meditation.duration} min
                  </div>
                )}
              </div>
              <div className="content-actions">
                <button className="content-action-btn preview" onClick={() => window.open(`/libraries/meditation/${meditation.id}?preview=true`, '_blank')}>Preview</button>
                <button className="content-action-btn edit" onClick={() => startEditingMeditation(meditation)}>Edit</button>
                <button className="content-action-btn delete" onClick={() => { setMeditationToDelete(meditation.id); setShowDeleteMeditationModal(true); }}>Delete</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}