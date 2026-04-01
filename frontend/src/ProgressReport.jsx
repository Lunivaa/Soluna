import { useState, useEffect } from "react";
import { FiHeart, FiBookOpen, FiMessageCircle, FiTrendingUp, FiDownload, FiPieChart, FiClock, FiTarget, FiStar, FiWind, FiHeadphones, FiMusic } from "react-icons/fi";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';
import "./ProgressReport.css";
import "./HomePage.css";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement);

export default function ProgressReport() {
  const [progressData, setProgressData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFileName, setExportFileName] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [timeRange, setTimeRange] = useState('1month');
  const [showTimeRangeDropdown, setShowTimeRangeDropdown] = useState(false);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showTimeRangeDropdown && !event.target.closest('.time-range-dropdown-wrapper')) {
        setShowTimeRangeDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showTimeRangeDropdown]);

  // Fetch real progress data from backend
  useEffect(() => {
    const fetchProgressData = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Please log in to view your progress report");
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        console.log('Fetching progress data for time range:', timeRange);
        
        const response = await fetch(`http://localhost:5001/api/progress-report?timeRange=${timeRange}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch progress data");
        }

        const data = await response.json();
        console.log('Progress data received:', data);
        setProgressData(data);
        setIsLoading(false);
      } catch (err) {
        console.error("Error fetching progress data:", err);
        setError("Failed to load progress report");
        setIsLoading(false);
      }
    };

    fetchProgressData();
  }, [timeRange]);

  const openExportModal = () => {
    const date = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
    const rangeLabel = getTimeRangeLabel(timeRange);
    setExportFileName(`Progress-Report-${rangeLabel}-${date}`);
    setShowExportModal(true);
  };

  const getTimeRangeLabel = (range) => {
    switch(range) {
      case '1week': return 'Last-Week';
      case '2weeks': return 'Last-2-Weeks';
      case '1month': return 'Last-Month';
      case '3months': return 'Last-3-Months';
      default: return 'All-Time';
    }
  };

  const getTimeRangeDisplay = (range) => {
    switch(range) {
      case '1week': return 'Last 1 Week';
      case '2weeks': return 'Last 2 Weeks';
      case '1month': return 'Last 1 Month';
      case '3months': return 'Last 3 Months';
      default: return 'All Time';
    }
  };

  const cancelExport = () => {
    setShowExportModal(false);
    setExportFileName('');
  };

  const confirmExport = async () => {
    if (!exportFileName.trim()) return;

    try {
      // Close modal and show loading
      setShowExportModal(false);
      setIsExporting(true);

      // Dynamically import jsPDF and html2canvas
      const { default: jsPDF } = await import('jspdf');
      const html2canvas = (await import('html2canvas')).default;
      
      // Capture only the cards wrapper (not the header)
      const cardsWrapper = document.querySelector('.progress-cards-wrapper');
      if (!cardsWrapper) return;

      // Wait a bit for modal to close
      await new Promise(resolve => setTimeout(resolve, 100));

      // Get the EXACT rendered height (no extra scroll space)
      const wrapperRect = cardsWrapper.getBoundingClientRect();
      const wrapperHeight = Math.ceil(wrapperRect.height);
      
      // Temporarily add background to wrapper
      const originalBackground = cardsWrapper.style.background;
      cardsWrapper.style.background = 'linear-gradient(135deg, #b7c6fa, #b5d1fc, #c1a9fb, #e1bdff)';

      // Wait for style to apply
      await new Promise(resolve => setTimeout(resolve, 50));

      // Create canvas with EXACT wrapper height
      const canvas = await html2canvas(cardsWrapper, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: null,
        allowTaint: true,
        foreignObjectRendering: false,
        imageTimeout: 0,
        windowWidth: cardsWrapper.scrollWidth,
        windowHeight: wrapperHeight,
        width: Math.ceil(wrapperRect.width),
        height: wrapperHeight
      });

      // Restore original background
      cardsWrapper.style.background = originalBackground;

      const imgData = canvas.toDataURL('image/png');
      const pdfWidth = 210; // A4 width in mm
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [pdfWidth, imgHeight],
        compress: true
      });

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, imgHeight);

      // Save with custom filename
      pdf.save(`${exportFileName.trim()}.pdf`);
      
      // Reset states
      setExportFileName('');
      setIsExporting(false);
    } catch (error) {
      console.error('PDF export error:', error);
      alert('Failed to export PDF. Please try again.');
      setIsExporting(false);
    }
  };

  const getMoodTrendTitle = (range) => {
    switch(range) {
      case '1week':   return 'Mood Trends — Last 7 Days';
      case '2weeks':  return 'Mood Trends — Last 2 Weeks';
      case '1month':  return 'Mood Trends — Last Month';
      case '3months': return 'Mood Trends — Last 3 Months';
      default:        return 'Mood Trends — Last 30 Days';
    }
  };

  // Chart configurations
  const monthlyMoodChartData = progressData ? {
    labels: progressData.moodTrendLabels || Array.from({ length: progressData.monthlyMoodTrend?.length || 30 }, (_, i) => `Day ${i + 1}`),
    datasets: [
      {
        label: 'Mood Score',
        data: progressData.monthlyMoodTrend || [],
        borderColor: '#9565B8',
        backgroundColor: 'rgba(149, 101, 184, 0.1)',
        tension: 0.4,
        pointBackgroundColor: '#9565B8',
        pointBorderColor: '#9565B8',
        pointRadius: 4,
        pointHoverRadius: 5,
        fill: true,
        spanGaps: true, // This joins the line even when data is missing
      }
    ]
  } : null;

  const monthlyMoodChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: function(context) {
            const moodValue = context.raw;
            if (!moodValue) return "No entry";
            // Get emoji based on mood value
            const moods = [
              { value: 1, emoji: "😭" },
              { value: 2, emoji: "😢" },
              { value: 3, emoji: "😡" },
              { value: 4, emoji: "😒" },
              { value: 5, emoji: "😕" },
              { value: 6, emoji: "😐" },
              { value: 7, emoji: "🙂" },
              { value: 8, emoji: "😊" },
              { value: 9, emoji: "😌" },
              { value: 10, emoji: "🤩" }
            ];
            const emoji = moods.find(m => m.value === Math.round(moodValue))?.emoji || '';
            return ` ${emoji} ${moodValue}/10`;
          }
        }
      }
    },
    scales: {
      y: { min: 0, max: 12, ticks: { stepSize: 2 } },
      x: { 
        ticks: {
          maxTicksLimit: 10
        },
        grid: { display: false } 
      }
    },
    elements: {
      point: {
        radius: function(context) {
          // Only show points for days with data
          return context.raw !== null ? 4 : 0;
        },
        hoverRadius: function(context) {
          return context.raw !== null ? 5 : 0;
        }
      }
    }
  };

  const activityDistributionData = progressData ? {
    labels: Object.keys(progressData.activityDistribution || {}),
    datasets: [
      {
        data: Object.values(progressData.activityDistribution || {}),
        backgroundColor: [
          '#9565B8',  // Purple - Mood Tracking
          '#3b82f6',  // Blue - Journaling
          '#ef4444',  // Red - Chatbot
          '#ec4899',  // Pink - Sound Loops
          '#f97316',  // Orange - Guided Meditation
          '#10b981',  // Green - Breathing Exercises
          '#92400e',  // Brown - Creative Canvas
          '#eab308'   // Yellow - Coloring Templates
        ],
        hoverBackgroundColor: [
          '#9565B8',  // Same colors on hover
          '#3b82f6',
          '#ef4444',
          '#ec4899',
          '#f97316',
          '#10b981',
          '#92400e',
          '#eab308'
        ],
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.8)',
        hoverBorderWidth: 2,
        hoverBorderColor: 'rgba(255, 255, 255, 0.8)',
      }
    ]
  } : null;

  const activityDistributionOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    interaction: {
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'right',
        labels: {
          color: '#1b1b1b',
          font: {
            size: 13,
            weight: '500'
          },
          padding: 12,
          usePointStyle: true,
          pointStyle: 'circle',
          boxWidth: 10,
          boxHeight: 10,
          generateLabels: function(chart) {
            const data = chart.data;
            if (data.labels.length && data.datasets.length) {
              return data.labels.map((label, i) => {
                const value = data.datasets[0].data[i];
                const backgroundColor = data.datasets[0].backgroundColor[i];
                return {
                  text: `${label}: ${value}%`,
                  fillStyle: backgroundColor,
                  strokeStyle: backgroundColor,
                  lineWidth: 0,
                  hidden: false,
                  index: i
                };
              });
            }
            return [];
          }
        }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `${context.label}: ${context.raw}%`;
          }
        }
      }
    },
    cutout: '60%',
    elements: {
      arc: {
        hoverBorderWidth: 2,
        hoverBorderColor: 'rgba(255, 255, 255, 0.8)',
      }
    }
  };

  return (
    <div className="progress-report-page">
      {/* Main Content - Progress Report Structure */}
      <div className="progress-app">
        <div className="progress-container">
          {/* Page Header with Title and Export Button */}
          <div className="page-header-row">
            <h1 className="page-title">Progress Report</h1>
            <div className="header-controls">
              {/* Time Range Dropdown */}
              <div className="time-range-dropdown-wrapper">
                <button 
                  className="time-range-dropdown-btn" 
                  onClick={() => setShowTimeRangeDropdown(!showTimeRangeDropdown)}
                >
                  {getTimeRangeDisplay(timeRange)}
                </button>
                {showTimeRangeDropdown && (
                  <div className="time-range-dropdown-menu">
                    <div 
                      className={`dropdown-item ${timeRange === '1week' ? 'active' : ''}`}
                      onClick={() => { setTimeRange('1week'); setShowTimeRangeDropdown(false); }}
                    >
                      Last 1 Week
                    </div>
                    <div 
                      className={`dropdown-item ${timeRange === '2weeks' ? 'active' : ''}`}
                      onClick={() => { setTimeRange('2weeks'); setShowTimeRangeDropdown(false); }}
                    >
                      Last 2 Weeks
                    </div>
                    <div 
                      className={`dropdown-item ${timeRange === '1month' ? 'active' : ''}`}
                      onClick={() => { setTimeRange('1month'); setShowTimeRangeDropdown(false); }}
                    >
                      Last 1 Month
                    </div>
                    <div 
                      className={`dropdown-item ${timeRange === '3months' ? 'active' : ''}`}
                      onClick={() => { setTimeRange('3months'); setShowTimeRangeDropdown(false); }}
                    >
                      Last 3 Months
                    </div>
                  </div>
                )}
              </div>
              <button onClick={openExportModal} className="export-btn" disabled={isLoading || error || isExporting}>
                <FiDownload /> {isExporting ? 'Generating...' : 'Export PDF'}
              </button>
            </div>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="progress-loading">
              <p>Loading your wellness journey...</p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="progress-error">
              <p>{error}</p>
            </div>
          )}

          {/* Data Display - Only show when data is loaded */}
          {!isLoading && !error && progressData && (
            <div className="progress-cards-wrapper">
              {/* Top Row - Main Overview Cards */}
          <div className="progress-metrics-row">
            <div className="progress-card progress-overview-card">
              <h3 className="progress-overview-title">Wellness Overview</h3>
              <div className="progress-overview-stats">
                <div className="progress-stat-group">
                  <div className="progress-stat-item">
                    <FiHeart className="progress-stat-icon" />
                    <div className="progress-stat-content">
                      <span className="progress-stat-value">{progressData?.moodLogs || 0}</span>
                      <span className="progress-stat-label">Mood Logs</span>
                    </div>
                  </div>
                  <div className="progress-stat-item">
                    <FiBookOpen className="progress-stat-icon" />
                    <div className="progress-stat-content">
                      <span className="progress-stat-value">{progressData?.journalEntries || 0}</span>
                      <span className="progress-stat-label">Journal Entries</span>
                    </div>
                  </div>
                  <div className="progress-stat-item">
                    <FiMessageCircle className="progress-stat-icon" />
                    <div className="progress-stat-content">
                      <span className="progress-stat-value">{progressData?.chatSessions || 0}</span>
                      <span className="progress-stat-label">Chat Sessions</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="progress-card progress-overview-card">
              <h3 className="progress-overview-title">Self-Care Activities</h3>
              <div className="progress-overview-stats">
                <div className="progress-stat-group">
                  <div className="progress-stat-item">
                    <FiWind className="progress-stat-icon" />
                    <div className="progress-stat-content">
                      <span className="progress-stat-value">{progressData?.breathingExercises || 0}</span>
                      <span className="progress-stat-label">Breathing</span>
                    </div>
                  </div>
                  <div className="progress-stat-item">
                    <FiHeadphones className="progress-stat-icon" />
                    <div className="progress-stat-content">
                      <span className="progress-stat-value">{progressData?.guidedMeditations || 0}</span>
                      <span className="progress-stat-label">Meditations</span>
                    </div>
                  </div>
                  <div className="progress-stat-item">
                    <FiMusic className="progress-stat-icon" />
                    <div className="progress-stat-content">
                      <span className="progress-stat-value">{progressData?.soundscapeListening || 0}</span>
                      <span className="progress-stat-label">Soundscapes</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="progress-card progress-overview-card">
              <h3 className="progress-overview-title">Progress Summary</h3>
              <div className="progress-overview-stats">
                <div className="progress-summary-stats">
                  <div className="progress-summary-item">
                    <span className="progress-summary-label">Total Wellness Time</span>
                    <span className="progress-summary-value">{Math.floor((progressData?.totalTimeSpent || 0) / 60)}h {(progressData?.totalTimeSpent || 0) % 60}m</span>
                  </div>
                  <div className="progress-summary-item">
                    <span className="progress-summary-label">Current Streak</span>
                    <span className="progress-summary-value">{progressData?.currentStreak || 0} days</span>
                  </div>
                  <div className="progress-summary-item">
                    <span className="progress-summary-label">Average Mood</span>
                    <span className="progress-summary-value">{progressData?.wellnessInsights?.averageMood || 0}/10</span>
                  </div>
                  <div className="progress-summary-item">
                    <span className="progress-summary-label">Creative Works</span>
                    <span className="progress-summary-value">{(progressData?.colorStudio || 0) + (progressData?.sketchpad || 0)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Monthly Mood Trends - Full Width */}
          <div className="progress-full-width-row">
            <div className="progress-card progress-chart-card">
              <h2>{getMoodTrendTitle(timeRange)}</h2>
              <div className="progress-line-chart">
                {monthlyMoodChartData && <Line data={monthlyMoodChartData} options={monthlyMoodChartOptions} />}
              </div>
            </div>
          </div>

          {/* Bottom Row - Recent Activities and Activity Distribution */}
          <div className="progress-bottom-row">
            <div className="progress-card progress-activity-list-card">
              <h2>Recent Activities</h2>
              <div className="progress-activity-list">
                {(progressData?.recentActivities || []).map((activity, index) => {
                  // Always render exactly 3 lines: type, detail, meta
                  const detail = activity.title ? `"${activity.title}"` 
                    : activity.mood ? activity.mood
                    : activity.exercise ? activity.exercise
                    : activity.track ? activity.track
                    : activity.session ? activity.session
                    : activity.artwork ? activity.artwork
                    : activity.template ? activity.template
                    : '—';
                  const meta = activity.wordCount ? `${activity.wordCount} words`
                    : activity.details ? activity.details
                    : activity.duration ? activity.duration
                    : activity.topic ? `Topic: ${activity.topic}`
                    : '—';
                  return (
                    <div key={index} className="activity-item-row">
                      <div className="activity-info">
                        <span className="activity-type">{activity.type}</span>
                        <span className="activity-detail">{detail}</span>
                        <span className="activity-meta">{meta}</span>
                      </div>
                      <span className="activity-time">{activity.time}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="progress-card progress-chart-card">
              <h2>Activity Distribution</h2>
              <div className="donut-chart-container">
                {activityDistributionData && <Doughnut data={activityDistributionData} options={activityDistributionOptions} />}
              </div>
            </div>
          </div>

          {/* Goals and Insights Row */}
          <div className="progress-bottom-row">
            <div className="progress-card progress-goals-card">
              <h2>Wellness Goals</h2>
              <div className="progress-goals-list">
                <div className="progress-goal-item">
                  <div className="progress-goal-info">
                    <span className="progress-goal-title">Mood Tracking</span>
                    <span className="progress-goal-progress">{progressData?.goals?.dailyMoodTracking?.current || 0}/{progressData?.goals?.dailyMoodTracking?.target || 30} logs</span>
                  </div>
                  <div className="progress-goal-progress-bar">
                    <div 
                      className="progress-goal-progress-fill" 
                      style={{ width: `${progressData?.goals?.dailyMoodTracking?.percentage || 0}%` }}
                    />
                  </div>
                  <span className="progress-goal-percentage">{progressData?.goals?.dailyMoodTracking?.percentage || 0}%</span>
                </div>
                
                <div className="progress-goal-item">
                  <div className="progress-goal-info">
                    <span className="progress-goal-title">Journaling</span>
                    <span className="progress-goal-progress">{progressData?.goals?.weeklyJournaling?.current || 0}/{progressData?.goals?.weeklyJournaling?.target || 5} entries</span>
                  </div>
                  <div className="progress-goal-progress-bar">
                    <div 
                      className="progress-goal-progress-fill" 
                      style={{ width: `${progressData?.goals?.weeklyJournaling?.percentage || 0}%` }}
                    />
                  </div>
                  <span className="progress-goal-percentage">{progressData?.goals?.weeklyJournaling?.percentage || 0}%</span>
                </div>

                <div className="progress-goal-item">
                  <div className="progress-goal-info">
                    <span className="progress-goal-title">Chatbot Sessions</span>
                    <span className="progress-goal-progress">{progressData?.goals?.chatbotSessions?.current || 0}/{progressData?.goals?.chatbotSessions?.target || 10} sessions</span>
                  </div>
                  <div className="progress-goal-progress-bar">
                    <div 
                      className="progress-goal-progress-fill" 
                      style={{ width: `${progressData?.goals?.chatbotSessions?.percentage || 0}%` }}
                    />
                  </div>
                  <span className="progress-goal-percentage">{progressData?.goals?.chatbotSessions?.percentage || 0}%</span>
                </div>
                
                <div className="progress-goal-item">
                  <div className="progress-goal-info">
                    <span className="progress-goal-title">Self-Care Time</span>
                    <span className="progress-goal-progress">{progressData?.goals?.selfCareMinutes?.current || 0}/{progressData?.goals?.selfCareMinutes?.target || 200} min</span>
                  </div>
                  <div className="progress-goal-progress-bar">
                    <div 
                      className="progress-goal-progress-fill" 
                      style={{ width: `${progressData?.goals?.selfCareMinutes?.percentage || 0}%` }}
                    />
                  </div>
                  <span className="progress-goal-percentage">{progressData?.goals?.selfCareMinutes?.percentage || 0}%</span>
                </div>
              </div>
            </div>

            <div className="progress-card progress-insights-card">
              <h2>Wellness Insights</h2>
              <div className="progress-insights-list">
                <div className="progress-insight-item">
                  <span className="progress-insight-label">Most Active Day</span>
                  <span className="progress-insight-value">{progressData?.wellnessInsights?.mostActiveDay || 'N/A'}</span>
                </div>
                <div className="progress-insight-item">
                  <span className="progress-insight-label">Favorite Activity</span>
                  <span className="progress-insight-value">{progressData?.wellnessInsights?.favoriteActivity || 'N/A'}</span>
                </div>
                <div className="progress-insight-item">
                  <span className="progress-insight-label">Improvement Trend</span>
                  <span className="progress-insight-value positive">{progressData?.wellnessInsights?.improvementTrend || '0%'}</span>
                </div>
                <div className="progress-insight-item">
                  <span className="progress-insight-label">Consistency Score</span>
                  <span className="progress-insight-value">{progressData?.wellnessInsights?.consistencyScore || 0}/100</span>
                </div>
                <div className="progress-insight-item">
                  <span className="progress-insight-label">Longest Streak</span>
                  <span className="progress-insight-value">{progressData?.longestStreak || 0} days</span>
                </div>
              </div>
            </div>
          </div>
            </div>
          )}
        </div>
      </div>

      {/* Export PDF Modal */}
      {showExportModal && (
        <div className="canvas-modal-overlay">
          <div className="canvas-modal-content">
            <div className="canvas-modal-header">
              <h3>Export Progress Report</h3>
            </div>
            <div className="canvas-modal-body">
              <p>Enter a name for your PDF file:</p>
              <input
                type="text"
                value={exportFileName}
                onChange={(e) => setExportFileName(e.target.value)}
                placeholder="Progress-Report"
                className="canvas-artwork-name-input"
                autoFocus
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    confirmExport();
                  }
                }}
              />
            </div>
            <div className="canvas-modal-actions">
              <button className="canvas-modal-btn canvas-cancel-btn" onClick={cancelExport}>
                Cancel
              </button>
              <button className="canvas-modal-btn canvas-save-btn" onClick={confirmExport}>
                Export
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}