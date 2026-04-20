import { FiSearch, FiStar, FiTrash2 } from "react-icons/fi";

export default function FeedbackPage({
  feedbackList,
  feedbackPage, setFeedbackPage,
  feedbackSort, setFeedbackSort,
  feedbackRatingFilter, setFeedbackRatingFilter,
  showFeedbackSortDropdown, setShowFeedbackSortDropdown,
  showFeedbackRatingDropdown, setShowFeedbackRatingDropdown,
  searchQuery, setSearchQuery,
  onDelete
}) {
  const FEEDBACK_PER_PAGE = 6;
  const filtered = feedbackList.filter(fb => {
    const matchesSearch = !searchQuery.trim() ||
      (fb.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (fb.email || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRating = feedbackRatingFilter === 0 || fb.rating === feedbackRatingFilter;
    return matchesSearch && matchesRating;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (feedbackSort === 'high') return b.rating - a.rating;
    if (feedbackSort === 'low') return a.rating - b.rating;
    return 0;
  });
  const totalPages = Math.max(1, Math.ceil(sorted.length / FEEDBACK_PER_PAGE));
  const page = Math.min(feedbackPage, totalPages);
  const paginated = sorted.slice((page - 1) * FEEDBACK_PER_PAGE, page * FEEDBACK_PER_PAGE);

  return (
    <div className="admin-users">
      <div className="admin-section-header">
        <h3>User Feedback</h3>
        <div style={{ display: 'flex', gap: '10px' }}>
          <div className="custom-dropdown">
            <button className="filter-select" onClick={() => { setShowFeedbackRatingDropdown(v => !v); setShowFeedbackSortDropdown(false); }}>
              {feedbackRatingFilter === 0 ? 'All Ratings' : `${feedbackRatingFilter} Star${feedbackRatingFilter > 1 ? 's' : ''}`}
            </button>
            {showFeedbackRatingDropdown && (
              <div className="dropdown-menu">
                <div className="dropdown-item" onClick={() => { setFeedbackRatingFilter(0); setShowFeedbackRatingDropdown(false); setFeedbackPage(1); }}>All Ratings</div>
                {[5,4,3,2,1].map(r => (
                  <div key={r} className="dropdown-item" onClick={() => { setFeedbackRatingFilter(r); setShowFeedbackRatingDropdown(false); setFeedbackPage(1); }}>
                    {r} Star{r > 1 ? 's' : ''}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="custom-dropdown">
            <button className="filter-select" onClick={() => { setShowFeedbackSortDropdown(v => !v); setShowFeedbackRatingDropdown(false); }}>
              {feedbackSort === 'high' ? 'Highest Rating' : feedbackSort === 'low' ? 'Lowest Rating' : 'Sort by Rating'}
            </button>
            {showFeedbackSortDropdown && (
              <div className="dropdown-menu">
                <div className="dropdown-item" onClick={() => { setFeedbackSort('default'); setShowFeedbackSortDropdown(false); setFeedbackPage(1); }}>Default</div>
                <div className="dropdown-item" onClick={() => { setFeedbackSort('high'); setShowFeedbackSortDropdown(false); setFeedbackPage(1); }}>Highest to Lowest</div>
                <div className="dropdown-item" onClick={() => { setFeedbackSort('low'); setShowFeedbackSortDropdown(false); setFeedbackPage(1); }}>Lowest to Highest</div>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="admin-search-area">
        <FiSearch className="search-icon" />
        <input
          className="search-input"
          placeholder="Search by name or email..."
          value={searchQuery}
          onChange={e => { setSearchQuery(e.target.value); setFeedbackPage(1); }}
        />
      </div>
      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th style={{ width: '20%', paddingLeft: '40px' }}>User</th>
              <th style={{ width: '10%', paddingLeft: '15px', textAlign: 'center' }}>Rating</th>
              <th style={{ width: '30%', textAlign: 'center' }}>Comment</th>
              <th style={{ width: '12%', textAlign: 'center' }}>Visibility</th>
              <th style={{ width: '13%', textAlign: 'center' }}>Date</th>
              <th style={{ width: '15%', textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                  {feedbackList.length === 0 ? 'No feedback submitted yet.' : 'No feedback found matching the filters'}
                </td>
              </tr>
            ) : (
              paginated.map(fb => (
                <tr key={fb.id}>
                  <td style={{ width: '20%', paddingLeft: '20px' }}>
                    <div className="user-info">
                      <div className="user-avatar" style={{ width: '30px', height: '30px', fontSize: '12px' }}>
                        {fb.avatar
                          ? <img src={fb.avatar} alt={fb.name} className="user-avatar-img" />
                          : (fb.name || 'U').charAt(0).toUpperCase()
                        }
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '13px' }}>{fb.name || 'Unknown'}</div>
                        <div style={{ fontSize: '11px', color: '#888' }}>{fb.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ width: '10%', paddingLeft: '15px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '1px', alignItems: 'center', justifyContent: 'center' }}>
                      {[1,2,3,4,5].map(s => (
                        <FiStar key={s} size={12} style={{ color: s <= fb.rating ? '#9565B8' : 'rgba(149,101,184,0.2)', fill: s <= fb.rating ? '#9565B8' : 'none' }} />
                      ))}
                    </div>
                  </td>
                  <td style={{ width: '30%', textAlign: 'left', fontSize: '13px', color: fb.comment ? '#1b1b1b' : '#aaa', fontStyle: fb.comment ? 'normal' : 'italic', paddingLeft: '15px' }}>
                    {fb.comment || 'No comment'}
                  </td>
                  <td style={{ width: '12%', textAlign: 'center' }}>
                    <span className={`status-badge ${fb.show_publicly ? 'active' : 'suspended'}`}>
                      {fb.show_publicly ? 'Public' : 'Private'}
                    </span>
                  </td>
                  <td style={{ width: '13%', textAlign: 'center', fontSize: '12px', color: '#666' }}>
                    {new Date(fb.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td style={{ width: '15%', textAlign: 'center' }}>
                    <div className="admin-table-actions" style={{ justifyContent: 'center' }}>
                      <button 
                        className="admin-text-btn delete" 
                        onClick={() => onDelete(fb.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <div className="table-pagination">
          <span>Showing {sorted.length === 0 ? '0-0' : `${((page-1)*FEEDBACK_PER_PAGE)+1}-${Math.min(page*FEEDBACK_PER_PAGE, sorted.length)}`} of {sorted.length} feedback</span>
          <div className="pagination-controls">
            <button className="pagination-btn" onClick={() => setFeedbackPage(p => Math.max(1, p - 1))} disabled={page === 1}>Previous</button>
            <span className="pagination-info">Page {page} of {totalPages}</span>
            <button className="pagination-btn" onClick={() => setFeedbackPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}