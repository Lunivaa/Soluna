import { FiSearch, FiPlus } from "react-icons/fi";

export default function AffirmationsPage({
  filteredAffirmations,
  paginatedAffirmations,
  currentAffirmationPage,
  totalAffirmationPages,
  startIndex,
  endIndex,
  handleAffirmationPageChange,
  editingAffirmation,
  editText, setEditText,
  startEditingAffirmation,
  saveAffirmationEdit,
  cancelAffirmationEdit,
  setAffirmationToDelete,
  setShowDeleteAffirmationModal,
  setShowAddAffirmationModal,
  searchQuery, setSearchQuery,
}) {
  return (
    <div className="admin-users">
      <div className="admin-section-header">
        <h3>Affirmation Management</h3>
        <div className="admin-actions">
          <button className="admin-btn primary" onClick={() => setShowAddAffirmationModal(true)}>
            <FiPlus /> Add Affirmation
          </button>
        </div>
      </div>

      <div className="admin-search-area">
        <FiSearch className="search-icon" />
        <input
          type="text"
          className="search-input"
          placeholder="Search affirmations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          autoComplete="off"
        />
      </div>

      <div className="admin-table-container">
        <table className="admin-table affirmation-table">
          <thead>
            <tr>
              <th style={{width: '396px', textAlign: 'center'}}>Affirmation</th>
              <th style={{width: '120px', paddingLeft: '6px'}}>Mood Number</th>
              <th style={{width: '100px', paddingLeft: '0px'}}>Status</th>
              <th style={{width: '150px', textAlign: 'center', paddingLeft: '2px'}}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedAffirmations.length === 0 ? (
              <tr>
                <td colSpan="4" style={{textAlign: 'center', padding: '40px', color: '#666'}}>
                  {searchQuery ? `No affirmations found matching the search` : 'No affirmations found'}
                </td>
              </tr>
            ) : (
              paginatedAffirmations.map(affirmation => (
                <tr key={affirmation.id} style={{height: '42px'}}>
                  <td style={{width: '396px', maxWidth: '396px', height: '42px', verticalAlign: 'middle'}}>
                    {editingAffirmation === affirmation.id ? (
                      <textarea
                        value={editText}
                        onChange={(e) => {
                          setEditText(e.target.value);
                          e.target.style.height = 'auto';
                          e.target.style.height = e.target.scrollHeight + 'px';
                        }}
                        className="affirmation-edit-input"
                        autoFocus
                        required
                        id={`edit-textarea-${affirmation.id}`}
                        onFocus={(e) => {
                          e.target.style.height = 'auto';
                          e.target.style.height = e.target.scrollHeight + 'px';
                        }}
                        style={{height: 'auto'}}
                      />
                    ) : (
                      <span>{affirmation.text}</span>
                    )}
                  </td>
                  <td style={{width: '120px', paddingLeft: '45px', height: '42px', verticalAlign: 'middle'}}>
                    <span className="mood-number">{affirmation.moodNumber}</span>
                  </td>
                  <td style={{width: '100px', paddingLeft: '0px', height: '42px', verticalAlign: 'middle'}}>
                    <span className={`status-badge ${affirmation.status}`} style={{marginLeft: '-23px'}}>
                      {affirmation.status === 'active' ? 'Active' : 'Suspended'}
                    </span>
                  </td>
                  <td style={{width: '150px', paddingLeft: '2px', height: '42px', verticalAlign: 'middle'}}>
                    <div className="admin-table-actions">
                      {editingAffirmation === affirmation.id ? (
                        <>
                          <button className="admin-text-btn cancel" onClick={cancelAffirmationEdit}>Cancel</button>
                          <button
                            className="admin-text-btn save"
                            onClick={() => {
                              const textarea = document.getElementById(`edit-textarea-${affirmation.id}`);
                              if (textarea && textarea.checkValidity()) {
                                saveAffirmationEdit(affirmation.id);
                              } else if (textarea) {
                                textarea.reportValidity();
                              }
                            }}
                          >
                            Save
                          </button>
                        </>
                      ) : (
                        <>
                          <button className="admin-text-btn edit" onClick={() => startEditingAffirmation(affirmation)}>Edit</button>
                          <button
                            className="admin-text-btn delete"
                            onClick={() => {
                              setAffirmationToDelete(affirmation.id);
                              setShowDeleteAffirmationModal(true);
                            }}
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <div className="table-pagination">
          <span>Showing {filteredAffirmations.length === 0 ? '0-0' : `${startIndex + 1}-${Math.min(endIndex, filteredAffirmations.length)}`} of {filteredAffirmations.length} affirmations</span>
          <div className="pagination-controls">
            <button className="pagination-btn" onClick={() => handleAffirmationPageChange('prev')} disabled={currentAffirmationPage === 1}>Previous</button>
            <span className="pagination-info">Page {currentAffirmationPage} of {totalAffirmationPages || 1}</span>
            <button className="pagination-btn" onClick={() => handleAffirmationPageChange('next')} disabled={currentAffirmationPage >= totalAffirmationPages}>Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}