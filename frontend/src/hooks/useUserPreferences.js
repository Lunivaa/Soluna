import { useState, useEffect, useCallback } from 'react';
import API from '../api';

export const useUserPreferences = () => {
  const [savedItems, setSavedItems] = useState([]);
  const [history, setHistory] = useState([]);
  const [savedStatus, setSavedStatus] = useState({});
  const [loading, setLoading] = useState(false);

  const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // Check multiple items saved status
  const checkMultipleSavedStatus = useCallback(async (itemIds) => {
    if (!itemIds || itemIds.length === 0) return {};
    
    try {
      const response = await API.post('/preferences/saved/check-multiple', 
        { item_ids: itemIds },
        { headers: getAuthHeader() }
      );
      
      // Only update with actual saved status, don't initialize as false
      const finalStatus = response.data || {};
      
      // Update saved status state - preserve existing status for items not in response
      setSavedStatus(prev => ({
        ...prev,
        ...finalStatus
      }));
      
      return finalStatus;
    } catch (error) {
      console.error('Error checking multiple saved status:', error);
      return {};
    }
  }, []);

  // Fetch saved items
  const fetchSavedItems = useCallback(async (force = false) => {
    if (!force && savedItems.length > 0) return; // use cache
    try {
      setLoading(true);
      const response = await API.get('/preferences/saved', {
        headers: getAuthHeader()
      });
      setSavedItems(response.data);
      
      // Update saved status for saved items
      if (response.data.length > 0) {
        const itemIds = response.data.map(item => item.itemId || item.id);
        await checkMultipleSavedStatus(itemIds);
      }
    } catch (error) {
      console.error('Error fetching saved items:', error);
    } finally {
      setLoading(false);
    }
  }, [checkMultipleSavedStatus, savedItems.length]);

  // Fetch history
  const fetchHistory = useCallback(async (limit = 50, force = false) => {
    if (!force && history.length > 0) return; // use cache
    try {
      setLoading(true);
      const response = await API.get(`/preferences/history?limit=${limit}`, {
        headers: getAuthHeader()
      });
      setHistory(response.data);
      
      // Check saved status for history items
      if (response.data.length > 0) {
        const itemIds = response.data.map(item => item.itemId || item.id);
        await checkMultipleSavedStatus(itemIds);
      }
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoading(false);
    }
  }, [checkMultipleSavedStatus, history.length]);

  // Check if item is saved
  const checkSavedStatus = useCallback(async (itemId) => {
    try {
      const response = await API.get(`/preferences/saved/check/${itemId}`, {
        headers: getAuthHeader()
      });
      return response.data.isSaved;
    } catch (error) {
      console.error('Error checking saved status:', error);
      return false;
    }
  }, []);

  // Save item
  const saveItem = useCallback(async (itemId) => {
    try {
      await API.post('/preferences/saved', 
        { item_id: itemId },
        { headers: getAuthHeader() }
      );
      // Don't update state here - let toggleSave handle it
      return true;
    } catch (error) {
      console.error('Error saving item:', error);
      return false;
    }
  }, []);

  // Unsave item
  const unsaveItem = useCallback(async (itemId) => {
    try {
      await API.delete(`/preferences/saved/${itemId}`, {
        headers: getAuthHeader()
      });
      // Don't update state here - let toggleSave handle it
      return true;
    } catch (error) {
      console.error('Error unsaving item:', error);
      return false;
    }
  }, []);

  // Toggle save status
  const toggleSave = useCallback(async (itemId) => {
    const isSaved = savedStatus[itemId];
    
    // Optimistically update UI immediately
    setSavedStatus(prev => ({ ...prev, [itemId]: !isSaved }));
    
    try {
      if (isSaved) {
        const success = await unsaveItem(itemId);
        if (!success) {
          // Revert on failure
          setSavedStatus(prev => ({ ...prev, [itemId]: true }));
        }
        return success;
      } else {
        const success = await saveItem(itemId);
        if (!success) {
          // Revert on failure
          setSavedStatus(prev => ({ ...prev, [itemId]: false }));
        }
        return success;
      }
    } catch (error) {
      // Revert on error
      setSavedStatus(prev => ({ ...prev, [itemId]: isSaved }));
      console.error('Error toggling save status:', error);
      return false;
    }
  }, [savedStatus, saveItem, unsaveItem]);

  // Add to history
  const addToHistory = useCallback(async (itemId, durationPlayed = 0) => {
    try {
      await API.post('/preferences/history', 
        { item_id: itemId, duration_played: durationPlayed },
        { headers: getAuthHeader() }
      );
      return true;
    } catch (error) {
      console.error('Error adding to history:', error);
      return false;
    }
  }, []);

  // Clear history
  const clearHistory = useCallback(async () => {
    try {
      await API.delete('/preferences/history', {
        headers: getAuthHeader()
      });
      setHistory([]);
      return true;
    } catch (error) {
      console.error('Error clearing history:', error);
      return false;
    }
  }, []);

  return {
    savedItems,
    history,
    savedStatus,
    loading,
    fetchSavedItems,
    fetchHistory,
    checkSavedStatus,
    checkMultipleSavedStatus,
    saveItem,
    unsaveItem,
    toggleSave,
    addToHistory,
    clearHistory
  };
};