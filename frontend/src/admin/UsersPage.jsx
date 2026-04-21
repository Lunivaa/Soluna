import { FiSearch } from "react-icons/fi";

export default function UsersPage({
  filteredUsers,
  statusFilter, setStatusFilter,
  loginFilter, setLoginFilter,
  showStatusDropdown, setShowStatusDropdown,
  showLoginDropdown, setShowLoginDropdown,
  searchQuery, setSearchQuery,
  usersPage, setUsersPage,
  reactivatingUserId,
  toggleUserStatus,
}) {
  return (
    <div className="admin-users">
      <div className="admin-section-header">
        <h3>User Management</h3>
        <div className="admin-actions">
          <div className="filter-controls">
            <div className="custom-dropdown">
              <button
                className="filter-select"
                onClick={() => setShowStatusDropdown(!showStatusDropdown)}
              >
                {statusFilter}
              </button>
              {showStatusDropdown && (
                <div className="dropdown-menu">
                  <div className="dropdown-item" onClick={() => { setStatusFilter("Status"); setShowStatusDropdown(false); setUsersPage(1); }}>Status</div>
                  <div className="dropdown-item" onClick={() => { setStatusFilter("Active"); setShowStatusDropdown(false); setUsersPage(1); }}>Active</div>
                  <div className="dropdown-item" onClick={() => { setStatusFilter("Suspended"); setShowStatusDropdown(false); setUsersPage(1); }}>Suspended</div>
                </div>
              )}
            </div>
            <div className="custom-dropdown">
              <button
                className="filter-select"
                onClick={() => setShowLoginDropdown(!showLoginDropdown)}
              >
                {loginFilter}
              </button>
              {showLoginDropdown && (
                <div className="dropdown-menu">
                  <div className="dropdown-item" onClick={() => { setLoginFilter("Last Login"); setShowLoginDropdown(false); }}>Last Login</div>
                  <div className="dropdown-item" onClick={() => { setLoginFilter("Today"); setShowLoginDropdown(false); }}>Today</div>
                  <div className="dropdown-item" onClick={() => { setLoginFilter("This Week"); setShowLoginDropdown(false); }}>This Week</div>
                  <div className="dropdown-item" onClick={() => { setLoginFilter("This Month"); setShowLoginDropdown(false); }}>This Month</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="admin-search-area">
        <FiSearch className="search-icon" />
        <input
          type="text"
          className="search-input"
          placeholder="Search users..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          autoComplete="off"
        />
      </div>

      <div className="admin-table-container">
        <table className="admin-table user-table" key={`users-${searchQuery}-${statusFilter}-${loginFilter}`}>
          <thead>
            <tr>
              <th style={{width: '20%', paddingLeft: '80px'}}>User</th>
              <th style={{width: '22%', paddingLeft: '60px'}}>Email</th>
              <th style={{width: '18%'}}>Last Login</th>
              <th style={{width: '13%', textAlign: 'left', paddingLeft: '20px'}}>Status</th>
              <th style={{width: '13%', textAlign: 'center'}}>Plan</th>
              <th style={{width: '14%', textAlign: 'center'}}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan="6" style={{textAlign: 'center', padding: '40px', color: '#666'}}>
                  {searchQuery || statusFilter !== "Status" || loginFilter !== "Last Login"
                    ? `No users found matching the filters`
                    : 'No users found'}
                </td>
              </tr>
            ) : (
              filteredUsers.slice((usersPage - 1) * 6, usersPage * 6).map(user => (
                <tr key={user.id}>
                  <td style={{width: '22%'}}>
                    <div className="user-info">
                      <div className="user-avatar">
                        {user.avatar ? (
                          <img src={user.avatar} alt={user.name} className="user-avatar-img" />
                        ) : (
                          user.name.split(' ').map(n => n[0]).join('')
                        )}
                      </div>
                      <span>{user.name}</span>
                    </div>
                  </td>
                  <td style={{width: '25%'}}>{user.email}</td>
                  <td style={{width: '20%'}}>{user.lastLogin}</td>
                  <td style={{width: '13%', textAlign: 'left', paddingLeft: '0px'}}>
                    <span className={`status-badge ${user.status}`}>
                      {user.status === 'active' ? 'Active' : 'Suspended'}
                    </span>
                  </td>
                  <td style={{width: '13%', textAlign: 'center'}}>
                    <span className={`status-badge ${user.isPremium ? 'premium' : 'free'}`}>
                      {user.isPremium ? 'Premium' : 'Free'}
                    </span>
                  </td>
                  <td style={{width: '14%', textAlign: 'center'}}>
                    <div className="admin-table-actions">
                      <button
                        className={`admin-text-btn ${user.status === 'active' ? 'suspend' : 'reactivate'}`}
                        onClick={() => toggleUserStatus(user.id)}
                        disabled={reactivatingUserId === user.id}
                      >
                        {reactivatingUserId === user.id ? 'Reactivating' : (user.status === 'active' ? 'Suspend' : 'Reactivate')}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <div className="table-pagination">
          <span>Showing {filteredUsers.length === 0 ? '0-0' : `${((usersPage-1)*6)+1}-${Math.min(usersPage*6, filteredUsers.length)}`} of {filteredUsers.length} users</span>
          <div className="pagination-controls">
            <button className="pagination-btn" onClick={() => setUsersPage(p => Math.max(1, p-1))} disabled={usersPage === 1}>Previous</button>
            <span className="pagination-info">Page {usersPage} of {Math.max(1, Math.ceil(filteredUsers.length / 6))}</span>
            <button className="pagination-btn" onClick={() => setUsersPage(p => Math.min(Math.ceil(filteredUsers.length / 6), p+1))} disabled={usersPage >= Math.ceil(filteredUsers.length / 6)}>Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}