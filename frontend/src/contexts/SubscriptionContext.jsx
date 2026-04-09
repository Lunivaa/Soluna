import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const SubscriptionContext = createContext();

const API = 'http://localhost:5001/api';

const LIMITS = {
  CHATBOT: 10,
  JOURNAL: 5,
  LIBRARY: 8,
  MOOD_TRACKING_DAYS: 90
};

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) throw new Error('useSubscription must be used within SubscriptionProvider');
  return context;
};

export const SubscriptionProvider = ({ children }) => {
  const [usage, setUsage] = useState({
    chatbotCount: 0,
    journalCount: 0,
    libraryUsageCount: 0,
    moodTrackingStartDate: null,
    isPremium: false,
    subscriptionExpiry: null
  });

  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

  const getHeaders = () => {
    const token = (localStorage.getItem('token') || sessionStorage.getItem('token'));
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const syncFromBackend = useCallback(async () => {
    const token = (localStorage.getItem('token') || sessionStorage.getItem('token'));
    if (!token) return;
    try {
      const res = await fetch(`${API}/subscription/usage`, { headers: getHeaders() });
      if (!res.ok) return;
      const data = await res.json();
      setUsage({
        chatbotCount: data.chatbotCount ?? 0,
        journalCount: data.journalCount ?? 0,
        libraryUsageCount: data.libraryUsageCount ?? 0,
        moodTrackingStartDate: data.moodTrackingStartDate ?? null,
        isPremium: data.isPremium ?? false,
        subscriptionExpiry: data.subscriptionExpiry ?? null
      });
    } catch (err) {
      console.error('Failed to sync usage:', err);
    }
  }, []);

  // Sync on mount
  useEffect(() => { syncFromBackend(); }, [syncFromBackend]);

  // Sync whenever modal opens so numbers are fresh
  useEffect(() => {
    if (showSubscriptionModal) syncFromBackend();
  }, [showSubscriptionModal, syncFromBackend]);

  const canUseChatbot = () => usage.isPremium || usage.chatbotCount < LIMITS.CHATBOT;
  const canUseJournal = () => usage.isPremium || usage.journalCount < LIMITS.JOURNAL;
  const canUseLibrary = () => usage.isPremium || usage.libraryUsageCount < LIMITS.LIBRARY;
  const canUseMoodTracking = () => {
    if (usage.isPremium) return true;
    if (!usage.moodTrackingStartDate) return true;
    const days = Math.floor((new Date() - new Date(usage.moodTrackingStartDate)) / 86400000);
    return days < LIMITS.MOOD_TRACKING_DAYS;
  };

  const incrementChatbot = () => {
    if (!canUseChatbot()) { setShowSubscriptionModal(true); return false; }
    setUsage(prev => ({ ...prev, chatbotCount: prev.chatbotCount + 1 }));
    return true;
  };

  const incrementJournal = () => {
    if (!canUseJournal()) { setShowSubscriptionModal(true); return false; }
    setUsage(prev => ({ ...prev, journalCount: prev.journalCount + 1 }));
    return true;
  };

  const incrementLibrary = async (sessionType = 'unknown', itemId = null) => {
    if (!canUseLibrary()) { setShowSubscriptionModal(true); return false; }
    try {
      const res = await fetch(`${API}/subscription/library`, {
        method: 'POST',
        headers: { ...getHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionType, itemId })
      });
      if (res.ok) {
        const data = await res.json();
        setUsage(prev => ({ ...prev, libraryUsageCount: data.libraryUsageCount }));
      }
    } catch (err) {
      console.error('Failed to increment library:', err);
    }
    return true;
  };

  const startMoodTracking = () => {
    if (!canUseMoodTracking()) { setShowSubscriptionModal(true); return false; }
    return true;
  };

  const activatePremium = async (plan) => {
    try {
      const res = await fetch(`${API}/subscription/activate`, {
        method: 'POST',
        headers: { ...getHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan })
      });
      if (res.ok) {
        const data = await res.json();
        setUsage(prev => ({
          ...prev,
          isPremium: true,
          subscriptionExpiry: data.subscriptionExpiry
        }));
      }
    } catch (err) {
      console.error('Failed to activate premium:', err);
    }
    setShowSubscriptionModal(false);
  };

  const getRemainingUsage = () => {
    const moodDays = usage.moodTrackingStartDate
      ? Math.max(0, LIMITS.MOOD_TRACKING_DAYS - Math.floor(
          (new Date() - new Date(usage.moodTrackingStartDate)) / 86400000
        ))
      : LIMITS.MOOD_TRACKING_DAYS;

    return {
      chatbot: Math.max(0, LIMITS.CHATBOT - usage.chatbotCount),
      journal: Math.max(0, LIMITS.JOURNAL - usage.journalCount),
      library: Math.max(0, LIMITS.LIBRARY - usage.libraryUsageCount),
      moodTrackingDays: moodDays
    };
  };

  return (
    <SubscriptionContext.Provider value={{
      usage,
      limits: LIMITS,
      canUseChatbot,
      canUseJournal,
      canUseLibrary,
      canUseMoodTracking,
      incrementChatbot,
      incrementJournal,
      incrementLibrary,
      startMoodTracking,
      activatePremium,
      getRemainingUsage,
      showSubscriptionModal,
      setShowSubscriptionModal,
      syncFromBackend
    }}>
      {children}
    </SubscriptionContext.Provider>
  );
};
