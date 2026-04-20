import { FiSearch, FiPlus } from "react-icons/fi";

export default function BreathingPage({
  breathingExercises,
  currentBreathingPage, setCurrentBreathingPage,
  searchQuery, setSearchQuery,
  getImageUrl,
  startEditingBreathing,
  setBreathingToDelete,
  setShowDeleteBreathingModal,
  setShowAddBreathingModal,
}) {
  const breathingPerPage = 6;
  const filteredBreathing = searchQuery
    ? breathingExercises.filter(ex => ex.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : breathingExercises;
  const totalBreathingPages = Math.ceil(filteredBreathing.length / breathingPerPage);
  const startIdx = (currentBreathingPage - 1) * breathingPerPage;
  const paginatedBreathing = filteredBreathing.slice(startIdx, startIdx + breathingPerPage);

  return (
    <div className="admin-content">
      <div className="admin-section-header">
        <h3>Breathing Exercises Management</h3>
        <div className="admin-actions">
          <button className="admin-btn primary" onClick={() => setShowAddBreathingModal(true)}>
            <FiPlus /> Add Exercise
          </button>
        </div>
      </div>

      <div className="admin-search-area">
        <FiSearch className="search-icon" />
        <input
          type="text"
          className="search-input"
          placeholder="Search breathing exercises..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          autoComplete="off"
        />
      </div>

      <div className="content-grid">
        {paginatedBreathing.length === 0 ? (
          <div className="no-content-message">
            <p>{searchQuery ? 'No breathing exercises found matching the search' : 'No breathing exercises found'}</p>
          </div>
        ) : (
          paginatedBreathing.map(exercise => (
            <div key={exercise.id} className="content-card">
              {exercise.thumbnail_url && (
                <div className="content-image">
                  <img
                    src={getImageUrl(exercise.thumbnail_url)}
                    alt={exercise.title}
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.parentElement.style.display = 'none';
                    }}
                  />
                </div>
              )}
              <div className="content-info">
                <h4>{exercise.title}</h4>
                <p>{exercise.description || 'A guided breathing exercise for relaxation and mindfulness.'}</p>
                {exercise.duration != null && exercise.duration !== '' && (
                  <div style={{fontSize: '14px', color: '#1b1b1b', marginBottom: '12px', fontWeight: '500'}}>
                    Duration: {exercise.duration} min
                  </div>
                )}
                {(exercise.inhale_duration || exercise.hold_duration || exercise.exhale_duration || exercise.rest_duration) && (
                  <div style={{fontSize: '13px', color: '#1b1b1b', marginBottom: '12px', opacity: '0.8'}}>
                    Pattern: {exercise.inhale_duration || 0}s inhale, {exercise.hold_duration || 0}s hold, {exercise.exhale_duration || 0}s exhale, {exercise.rest_duration || 0}s rest
                  </div>
                )}
              </div>
              <div className="content-actions">
                <button className="content-action-btn preview" onClick={() => window.open(`/libraries/breathing/${exercise.id}?preview=true`, '_blank')}>Preview</button>
                <button className="content-action-btn edit" onClick={() => startEditingBreathing(exercise)}>Edit</button>
                <button className="content-action-btn delete" onClick={() => { setBreathingToDelete(exercise.id); setShowDeleteBreathingModal(true); }}>Delete</button>
              </div>
            </div>
          ))
        )}
      </div>

      {filteredBreathing.length > breathingPerPage && (
        <div className="table-pagination">
          <span>Showing {startIdx + 1}-{Math.min(startIdx + breathingPerPage, filteredBreathing.length)} of {filteredBreathing.length} exercises</span>
          <div className="pagination-controls">
            <button className="pagination-btn" onClick={() => setCurrentBreathingPage(prev => prev - 1)} disabled={currentBreathingPage === 1}>Previous</button>
            <span className="pagination-info">Page {currentBreathingPage} of {totalBreathingPages || 1}</span>
            <button className="pagination-btn" onClick={() => setCurrentBreathingPage(prev => prev + 1)} disabled={currentBreathingPage >= totalBreathingPages}>Next</button>
          </div>
        </div>
      )}
    </div>
  );
}