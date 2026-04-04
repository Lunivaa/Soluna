import express from "express";
import { db } from "../db.js";
import { authenticate } from "./authRoutes.js";

const router = express.Router();

// Helper function to get local date string
const getLocalDateString = (date = new Date()) => {
  return date.toLocaleDateString('en-CA'); // YYYY-MM-DD format
};

// Get comprehensive progress report data
router.get("/", authenticate, async (req, res) => {
  try {
    const userId = req.userId;
    const { timeRange = 'all' } = req.query;
    
    // Calculate date range based on timeRange parameter
    let dateFilter = null;
    let dateFilterStr = null;
    
    if (timeRange !== 'all') {
      dateFilter = new Date();
      switch(timeRange) {
        case '1week':
          dateFilter.setDate(dateFilter.getDate() - 7);
          break;
        case '2weeks':
          dateFilter.setDate(dateFilter.getDate() - 14);
          break;
        case '1month':
          dateFilter.setMonth(dateFilter.getMonth() - 1);
          break;
        case '2months':
          dateFilter.setMonth(dateFilter.getMonth() - 2);
          break;
        case '3months':
          dateFilter.setMonth(dateFilter.getMonth() - 3);
          break;
        default:
          dateFilter = null;
      }
      if (dateFilter) {
        dateFilterStr = getLocalDateString(dateFilter);
      }
    }
    
    // Get mood logs count and data (with time range filter)
    const moodQuery = dateFilterStr 
      ? "SELECT DATE_FORMAT(date, '%Y-%m-%d') as date_str, mood FROM mood WHERE userId = ? AND date >= ?"
      : "SELECT DATE_FORMAT(date, '%Y-%m-%d') as date_str, mood FROM mood WHERE userId = ?";
    const moodParams = dateFilterStr ? [userId, dateFilterStr] : [userId];
    const [moodRows] = await db.query(moodQuery, moodParams);
    
    // Get ALL mood data for streak calculation (never filtered)
    const [allMoodRows] = await db.query(
      "SELECT DATE_FORMAT(date, '%Y-%m-%d') as date_str, mood FROM mood WHERE userId = ?",
      [userId]
    );

    // Build mood trend for the selected time range
    // Determine how many days to show in the chart
    let trendDays = 30; // default for 'all' and '1month'
    switch(timeRange) {
      case '1week':   trendDays = 7;  break;
      case '2weeks':  trendDays = 14; break;
      case '1month':  trendDays = 30; break;
      case '3months': trendDays = 90; break;
      default:        trendDays = 30; break; // 'all' shows last 30 days on chart
    }

    // Fetch mood rows for the trend window
    const trendStartDate = new Date();
    trendStartDate.setDate(trendStartDate.getDate() - (trendDays - 1));
    const trendStartStr = getLocalDateString(trendStartDate);

    const [trendMoodRows] = await db.query(
      "SELECT DATE_FORMAT(date, '%Y-%m-%d') as date_str, mood FROM mood WHERE userId = ? AND date >= ?",
      [userId, trendStartStr]
    );

    // Get journal entries count (with time range filter)
    const journalQuery = dateFilterStr
      ? "SELECT COUNT(*) as count FROM journal WHERE userId = ? AND modified >= ?"
      : "SELECT COUNT(*) as count FROM journal WHERE userId = ?";
    const journalParams = dateFilterStr ? [userId, dateFilterStr] : [userId];
    const [journalCount] = await db.query(journalQuery, journalParams);

    // Get chat sessions count (with time range filter)
    const chatQuery = dateFilterStr
      ? "SELECT COUNT(*) as count FROM chats WHERE userId = ? AND updatedAt >= ?"
      : "SELECT COUNT(*) as count FROM chats WHERE userId = ?";
    const chatParams = dateFilterStr ? [userId, dateFilterStr] : [userId];
    const [chatCount] = await db.query(chatQuery, chatParams);

    // Get self-care activities from listeningHistory (with time range filter)
    const listeningQuery = dateFilterStr
      ? `SELECT sc.category, COUNT(*) as count 
         FROM listeningHistory lh
         JOIN selfCare sc ON lh.itemId = sc.id
         WHERE lh.userId = ? AND lh.playedAt >= ?
         GROUP BY sc.category`
      : `SELECT sc.category, COUNT(*) as count 
         FROM listeningHistory lh
         JOIN selfCare sc ON lh.itemId = sc.id
         WHERE lh.userId = ?
         GROUP BY sc.category`;
    const listeningParams = dateFilterStr ? [userId, dateFilterStr] : [userId];
    const [listeningHistory] = await db.query(listeningQuery, listeningParams);

    // Get artwork data from artworks table (with time range filter)
    const artworkQuery = dateFilterStr
      ? `SELECT type, COUNT(*) as count 
         FROM artworks 
         WHERE userId = ? AND createdAt >= ?
         GROUP BY type`
      : `SELECT type, COUNT(*) as count 
         FROM artworks 
         WHERE userId = ?
         GROUP BY type`;
    const artworkParams = dateFilterStr ? [userId, dateFilterStr] : [userId];
    const [artworkData] = await db.query(artworkQuery, artworkParams);

    // Process mood data for trend chart (respects selected time range)
    const moodTrend = [];
    const moodTrendHistory = {};
    trendMoodRows.forEach(row => {
      moodTrendHistory[row.date_str] = row.mood;
    });

    // Build date labels and data points for the trend window
    const trendLabels = [];
    for (let i = trendDays - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = getLocalDateString(date);
      // Label: "Mon 3", "Tue 4", etc. for short ranges; "Mar 1" for longer
      const label = trendDays <= 14
        ? date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' })
        : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      trendLabels.push(label);
      moodTrend.push(moodTrendHistory[dateStr] || null);
    }

    // Calculate average mood (use filtered data for stats)
    const validMoods = moodRows.map(m => m.mood).filter(m => m !== null);
    const averageMood = validMoods.length > 0 
      ? (validMoods.reduce((a, b) => a + b, 0) / validMoods.length).toFixed(1)
      : 0;

    // Process self-care activities
    const selfCareActivities = {
      breathingExercises: 0,
      guidedMeditations: 0,
      soundscapeListening: 0,
      colorStudio: 0,
      sketchpad: 0
    };

    listeningHistory.forEach(row => {
      if (row.category === 'breathing') selfCareActivities.breathingExercises = row.count;
      if (row.category === 'meditation') selfCareActivities.guidedMeditations = row.count;
      if (row.category === 'soundscape' || row.category === 'sound') selfCareActivities.soundscapeListening = row.count;
    });

    // Process artwork data
    artworkData.forEach(row => {
      if (row.type === 'template') selfCareActivities.colorStudio = row.count;
      if (row.type === 'free') selfCareActivities.sketchpad = row.count;
    });

    // Calculate total activities for distribution (use filtered data)
    const totalActivities = 
      moodRows.length + 
      journalCount[0].count + 
      chatCount[0].count + 
      Object.values(selfCareActivities).reduce((a, b) => a + b, 0);

    // Activity distribution percentages (use filtered data)
    const activityDistribution = {
      'Mood Tracking': totalActivities > 0 ? Math.round((moodRows.length / totalActivities) * 100) : 0,
      'Journaling': totalActivities > 0 ? Math.round((journalCount[0].count / totalActivities) * 100) : 0,
      'Chatbot': totalActivities > 0 ? Math.round((chatCount[0].count / totalActivities) * 100) : 0,
      'Sound Loops': totalActivities > 0 ? Math.round((selfCareActivities.soundscapeListening / totalActivities) * 100) : 0,
      'Guided Meditation': totalActivities > 0 ? Math.round((selfCareActivities.guidedMeditations / totalActivities) * 100) : 0,
      'Breathing Exercises': totalActivities > 0 ? Math.round((selfCareActivities.breathingExercises / totalActivities) * 100) : 0,
      'Color Studio': totalActivities > 0 ? Math.round((selfCareActivities.colorStudio / totalActivities) * 100) : 0,
      'Sketchpad': totalActivities > 0 ? Math.round((selfCareActivities.sketchpad / totalActivities) * 100) : 0
    };

    // Get recent activities (filtered by time range)
    const recentMoodQuery = dateFilterStr
      ? "SELECT DATE_FORMAT(date, '%Y-%m-%d') as date_str, mood, date FROM mood WHERE userId = ? AND date >= ? ORDER BY date DESC LIMIT 3"
      : "SELECT DATE_FORMAT(date, '%Y-%m-%d') as date_str, mood, date FROM mood WHERE userId = ? ORDER BY date DESC LIMIT 3";
    const recentMoodParams = dateFilterStr ? [userId, dateFilterStr] : [userId];
    const [recentMoods] = await db.query(recentMoodQuery, recentMoodParams);

    const recentJournalQuery = dateFilterStr
      ? "SELECT title, modified, LENGTH(content) as wordCount FROM journal WHERE userId = ? AND modified >= ? ORDER BY modified DESC LIMIT 3"
      : "SELECT title, modified, LENGTH(content) as wordCount FROM journal WHERE userId = ? ORDER BY modified DESC LIMIT 3";
    const recentJournalParams = dateFilterStr ? [userId, dateFilterStr] : [userId];
    const [recentJournals] = await db.query(recentJournalQuery, recentJournalParams);

    const recentChatQuery = dateFilterStr
      ? "SELECT DATE(updatedAt) as date, updatedAt FROM chats WHERE userId = ? AND updatedAt >= ? ORDER BY updatedAt DESC LIMIT 2"
      : "SELECT DATE(updatedAt) as date, updatedAt FROM chats WHERE userId = ? ORDER BY updatedAt DESC LIMIT 2";
    const recentChatParams = dateFilterStr ? [userId, dateFilterStr] : [userId];
    const [recentChats] = await db.query(recentChatQuery, recentChatParams);

    const recentListeningQuery = dateFilterStr
      ? `SELECT sc.title, sc.category, lh.playedAt, lh.durationPlayed
         FROM listeningHistory lh
         JOIN selfCare sc ON lh.itemId = sc.id
         WHERE lh.userId = ? AND lh.playedAt >= ?
         ORDER BY lh.playedAt DESC
         LIMIT 5`
      : `SELECT sc.title, sc.category, lh.playedAt, lh.durationPlayed
         FROM listeningHistory lh
         JOIN selfCare sc ON lh.itemId = sc.id
         WHERE lh.userId = ?
         ORDER BY lh.playedAt DESC
         LIMIT 5`;
    const recentListeningParams = dateFilterStr ? [userId, dateFilterStr] : [userId];
    const [recentListening] = await db.query(recentListeningQuery, recentListeningParams);

    const recentArtworkQuery = dateFilterStr
      ? `SELECT title, type, createdAt 
         FROM artworks 
         WHERE userId = ? AND createdAt >= ?
         ORDER BY createdAt DESC 
         LIMIT 3`
      : `SELECT title, type, createdAt 
         FROM artworks 
         WHERE userId = ?
         ORDER BY createdAt DESC 
         LIMIT 3`;
    const recentArtworkParams = dateFilterStr ? [userId, dateFilterStr] : [userId];
    const [recentArtworks] = await db.query(recentArtworkQuery, recentArtworkParams);

    // Format recent activities
    const recentActivities = [];
    
    recentMoods.forEach(mood => {
      const date = new Date(mood.date);
      const timeAgo = getTimeAgo(date);
      recentActivities.push({
        type: 'Mood Log',
        time: timeAgo,
        mood: getMoodEmoji(mood.mood),
        details: `Mood: ${mood.mood}/10`
      });
    });

    recentJournals.forEach(journal => {
      const date = new Date(journal.modified);
      const timeAgo = getTimeAgo(date);
      recentActivities.push({
        type: 'Journal Entry',
        time: timeAgo,
        title: journal.title || 'Untitled',
        wordCount: Math.round(journal.wordCount / 5) // rough word count
      });
    });

    recentChats.forEach(chat => {
      const date = new Date(chat.updatedAt);
      const timeAgo = getTimeAgo(date);
      recentActivities.push({
        type: 'Chat Session',
        time: timeAgo,
        duration: 'Wellness conversation'
      });
    });

    recentListening.forEach(item => {
      const date = new Date(item.playedAt);
      const timeAgo = getTimeAgo(date);
      const activityInfo = formatListeningActivity(item);
      recentActivities.push({
        ...activityInfo,
        time: timeAgo
      });
    });

    recentArtworks.forEach(artwork => {
      const date = new Date(artwork.createdAt);
      const timeAgo = getTimeAgo(date);
      recentActivities.push({
        type: artwork.type === 'template' ? 'Color Studio' : 'Sketchpad',
        time: timeAgo,
        artwork: artwork.title || 'Untitled Artwork'
      });
    });

    // Sort by most recent and limit to 10
    recentActivities.sort((a, b) => {
      const timeA = parseTimeAgo(a.time);
      const timeB = parseTimeAgo(b.time);
      return timeA - timeB;
    });

    // Get weekly progress (last 7 days - always shows last 7 days regardless of filter)
    const weeklyProgress = [];
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = getLocalDateString(date);
      const dayName = days[date.getDay()];

      // Count activities for this day
      const [dayMood] = await db.query(
        "SELECT mood FROM mood WHERE userId = ? AND date = ?",
        [userId, dateStr]
      );

      const [dayJournal] = await db.query(
        "SELECT COUNT(*) as count FROM journal WHERE userId = ? AND DATE(modified) = ?",
        [userId, dateStr]
      );

      const [daySelfCare] = await db.query(
        `SELECT COUNT(*) as count FROM listeningHistory 
         WHERE userId = ? AND DATE(playedAt) = ?`,
        [userId, dateStr]
      );

      const [dayArtwork] = await db.query(
        `SELECT COUNT(*) as count FROM artworks 
         WHERE userId = ? AND DATE(createdAt) = ?`,
        [userId, dateStr]
      );

      const totalDayActivities = 
        (dayMood.length > 0 ? 1 : 0) + 
        dayJournal[0].count + 
        daySelfCare[0].count +
        dayArtwork[0].count;

      weeklyProgress.push({
        day: dayName,
        activities: totalDayActivities,
        mood: dayMood.length > 0 ? dayMood[0].mood : 0,
        journaling: dayJournal[0].count,
        selfCare: daySelfCare[0].count
      });
    }

    // Calculate streaks (ALWAYS use all mood data, never filtered by time range)
    const allMoodHistory = {};
    allMoodRows.forEach(row => {
      allMoodHistory[row.date_str] = row.mood;
    });
    const { currentStreak, longestStreak } = calculateStreaks(allMoodHistory);

    // Calculate total time spent (rough estimate based on activities)
    const totalTimeSpent = 
      (moodRows.length * 2) + // 2 min per mood log
      (journalCount[0].count * 10) + // 10 min per journal
      (chatCount[0].count * 15) + // 15 min per chat
      (Object.values(selfCareActivities).reduce((a, b) => a + b, 0) * 8); // 8 min per self-care

    // Calculate dynamic goal targets based on time range
    let goalTargets = {
      moodLogs: 30,
      journalEntries: 5,
      chatSessions: 10,
      selfCareMinutes: 200
    };

    // Adjust targets based on time range
    if (timeRange !== 'all') {
      switch(timeRange) {
        case '1week':
          goalTargets = { moodLogs: 7, journalEntries: 2, chatSessions: 3, selfCareMinutes: 50 };
          break;
        case '2weeks':
          goalTargets = { moodLogs: 14, journalEntries: 3, chatSessions: 5, selfCareMinutes: 100 };
          break;
        case '1month':
          goalTargets = { moodLogs: 30, journalEntries: 5, chatSessions: 10, selfCareMinutes: 200 };
          break;
        case '3months':
          goalTargets = { moodLogs: 90, journalEntries: 15, chatSessions: 30, selfCareMinutes: 600 };
          break;
      }
    }

    // Response data
    res.json({
      moodLogs: moodRows.length,
      journalEntries: journalCount[0].count,
      chatSessions: chatCount[0].count,
      ...selfCareActivities,
      totalTimeSpent,
      averageSessionLength: totalActivities > 0 ? Math.round(totalTimeSpent / totalActivities) : 0,
      longestStreak,
      currentStreak,
      monthlyMoodTrend: moodTrend,
      moodTrendLabels: trendLabels,
      trendDays,
      activityDistribution,
      recentActivities: recentActivities.slice(0, 10),
      weeklyProgress,
      wellnessInsights: {
        mostActiveDay: getMostActiveDay(weeklyProgress),
        favoriteActivity: getFavoriteActivity(activityDistribution),
        averageMood: parseFloat(averageMood),
        improvementTrend: calculateImprovementTrend(moodTrend),
        consistencyScore: calculateConsistencyScore(weeklyProgress)
      },
      goals: {
        dailyMoodTracking: {
          current: moodRows.length,
          target: goalTargets.moodLogs,
          percentage: Math.min(Math.round((moodRows.length / goalTargets.moodLogs) * 100), 100)
        },
        weeklyJournaling: {
          current: journalCount[0].count,
          target: goalTargets.journalEntries,
          percentage: Math.min(Math.round((journalCount[0].count / goalTargets.journalEntries) * 100), 100)
        },
        chatbotSessions: {
          current: chatCount[0].count,
          target: goalTargets.chatSessions,
          percentage: Math.min(Math.round((chatCount[0].count / goalTargets.chatSessions) * 100), 100)
        },
        selfCareMinutes: {
          current: totalTimeSpent,
          target: goalTargets.selfCareMinutes,
          percentage: Math.min(Math.round((totalTimeSpent / goalTargets.selfCareMinutes) * 100), 100)
        }
      }
    });

  } catch (err) {
    console.error("Progress report error:", err);
    res.status(500).json({ error: "Failed to fetch progress report", details: err.message });
  }
});

// Helper functions
function getMoodEmoji(mood) {
  const emojis = ['😭', '😢', '😡', '😒', '😕', '😐', '🙂', '😊', '😌', '🤩'];
  return emojis[Math.min(Math.max(Math.round(mood) - 1, 0), 9)];
}

function getTimeAgo(date) {
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 60) return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
  if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
  return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
}

function parseTimeAgo(timeStr) {
  const match = timeStr.match(/(\d+)\s+(minute|hour|day)/);
  if (!match) return 0;
  const value = parseInt(match[1]);
  const unit = match[2];
  if (unit === 'minute') return value;
  if (unit === 'hour') return value * 60;
  return value * 1440;
}

function formatListeningActivity(item) {
  const categoryMap = {
    'breathing': { type: 'Breathing Exercise', key: 'exercise' },
    'meditation': { type: 'Guided Meditation', key: 'session' },
    'soundscape': { type: 'Sound Loop', key: 'track' },
    'sound': { type: 'Sound Loop', key: 'track' }
  };

  const info = categoryMap[item.category] || { type: 'Self-Care Activity', key: 'name' };
  const duration = item.durationPlayed ? `${Math.round(item.durationPlayed / 60)} min` : '5-10 min';
  
  return {
    type: info.type,
    [info.key]: item.title || 'Session',
    duration: duration
  };
}

function calculateStreaks(moodHistory) {
  const dates = Object.keys(moodHistory).sort();
  if (dates.length === 0) return { currentStreak: 0, longestStreak: 0 };

  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 1;

  const today = getLocalDateString();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = getLocalDateString(yesterday);

  // Check if today or yesterday has a mood log
  if (moodHistory[today] || moodHistory[yesterdayStr]) {
    currentStreak = 1;
    
    // Count backwards from today/yesterday
    let checkDate = moodHistory[today] ? new Date() : yesterday;
    for (let i = 1; i < 365; i++) {
      checkDate.setDate(checkDate.getDate() - 1);
      const checkStr = getLocalDateString(checkDate);
      if (moodHistory[checkStr]) {
        currentStreak++;
      } else {
        break;
      }
    }
  }

  // Calculate longest streak
  for (let i = 1; i < dates.length; i++) {
    const prevDate = new Date(dates[i - 1]);
    const currDate = new Date(dates[i]);
    const diffDays = Math.round((currDate - prevDate) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      tempStreak++;
    } else {
      longestStreak = Math.max(longestStreak, tempStreak);
      tempStreak = 1;
    }
  }
  longestStreak = Math.max(longestStreak, tempStreak);

  return { currentStreak, longestStreak };
}

function getMostActiveDay(weeklyProgress) {
  if (weeklyProgress.length === 0) return 'N/A';
  const maxDay = weeklyProgress.reduce((max, day) => 
    day.activities > max.activities ? day : max
  );
  return maxDay.day === 'Sun' ? 'Sunday' :
         maxDay.day === 'Mon' ? 'Monday' :
         maxDay.day === 'Tue' ? 'Tuesday' :
         maxDay.day === 'Wed' ? 'Wednesday' :
         maxDay.day === 'Thu' ? 'Thursday' :
         maxDay.day === 'Fri' ? 'Friday' : 'Saturday';
}

function getFavoriteActivity(distribution) {
  const entries = Object.entries(distribution);
  if (entries.length === 0) return 'N/A';
  const max = entries.reduce((max, entry) => 
    entry[1] > max[1] ? entry : max
  );
  return max[0];
}

function calculateImprovementTrend(moodTrend) {
  const validMoods = moodTrend.filter(m => m !== null);
  if (validMoods.length < 2) return '0%';

  const firstHalf = validMoods.slice(0, Math.floor(validMoods.length / 2));
  const secondHalf = validMoods.slice(Math.floor(validMoods.length / 2));

  const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

  const improvement = ((secondAvg - firstAvg) / firstAvg) * 100;
  return improvement > 0 ? `+${Math.round(improvement)}%` : `${Math.round(improvement)}%`;
}

function calculateConsistencyScore(weeklyProgress) {
  if (weeklyProgress.length === 0) return 0;
  const daysWithActivity = weeklyProgress.filter(day => day.activities > 0).length;
  return Math.round((daysWithActivity / weeklyProgress.length) * 100);
}

export default router;
