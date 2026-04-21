import { FiUsers, FiHeart, FiWind, FiMusic, FiSun, FiImage } from "react-icons/fi";

export default function OverviewPage({ overviewStats, recentAdminActivity }) {
  return (
    <div className="soluna-admin-overview">
      <div className="soluna-welcome-section">
        <h2>Welcome to the Admin Dashboard</h2>
        <p>Manage your wellness platform, monitor content, and oversee user activity.</p>
      </div>

      <div className="soluna-system-overview-section">
        <h3>Platform Statistics</h3>
        <div className="admin-stats-grid">
          <div className="admin-stat-card">
            <div className="stat-content">
              <div className="stat-header">
                <span className="stat-label">Total Users</span>
                <FiUsers className="stat-icon users" />
              </div>
              <h3>{overviewStats.totalUsers}</h3>
              <p>Registered users</p>
            </div>
          </div>
          <div className="admin-stat-card">
            <div className="stat-content">
              <div className="stat-header">
                <span className="stat-label">Affirmations</span>
                <FiHeart className="stat-icon affirmations" />
              </div>
              <h3>{overviewStats.affirmations}</h3>
              <p>Available affirmations</p>
            </div>
          </div>
          <div className="admin-stat-card">
            <div className="stat-content">
              <div className="stat-header">
                <span className="stat-label">Breathing Exercises</span>
                <FiWind className="stat-icon breathing" />
              </div>
              <h3>{overviewStats.breathingExercises}</h3>
              <p>Available exercises</p>
            </div>
          </div>
          <div className="admin-stat-card">
            <div className="stat-content">
              <div className="stat-header">
                <span className="stat-label">Relaxing Soundscapes</span>
                <FiMusic className="stat-icon sounds" />
              </div>
              <h3>{overviewStats.soundLoops}</h3>
              <p>Available sounds</p>
            </div>
          </div>
          <div className="admin-stat-card">
            <div className="stat-content">
              <div className="stat-header">
                <span className="stat-label">Guided Meditations</span>
                <FiSun className="stat-icon meditation" />
              </div>
              <h3>{overviewStats.meditations}</h3>
              <p>Available guided meditations</p>
            </div>
          </div>
          <div className="admin-stat-card">
            <div className="stat-content">
              <div className="stat-header">
                <span className="stat-label">Coloring Templates</span>
                <FiImage className="stat-icon coloring" />
              </div>
              <h3>{overviewStats.coloringTemplates}</h3>
              <p>Available templates</p>
            </div>
          </div>
        </div>
      </div>

      <div className="admin-tools-section">
        <h3>Recent Activity</h3>
          <div className="progress-card progress-activity-list-card">
            {recentAdminActivity.length > 0 ? (
              <div className="progress-activity-list">
                {recentAdminActivity.slice(0, 5).map((activity, index) => (
                  <div key={index} className="activity-item-row">
                    <div className="activity-info">
                      <span className="activity-type">{activity.action}</span>
                      <span className="activity-detail">{activity.details}</span>
                    </div>
                    <span className="activity-time">
                      {new Date(activity.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="progress-activity-list">
                <div className="activity-item-row">
                  <div className="activity-info">
                    <span className="activity-type">No recent activity</span>
                    <span className="activity-detail">Admin actions will appear here</span>
                  </div>
                </div>
              </div>
            )}
          </div>
      </div>
    </div>
  );
}