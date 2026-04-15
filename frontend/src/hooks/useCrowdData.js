/**
 * useCrowdData — unified hook for real-time crowd data
 * Priority: Firebase Realtime DB → WebSocket simulation
 * Automatically falls back if Firebase is not configured
 */
import { useEffect, useRef } from 'react';
import { useAppStore } from '../store/appStore';
import { hasFirebaseConfig, subscribeToFirebaseCrowd, logAnalyticsEvent } from '../config/firebase';

export function useCrowdData() {
  const { crowdData, lastUpdate, wsConnected } = useAppStore();
  const firebaseUnsubRef = useRef(null);

  useEffect(() => {
    if (!hasFirebaseConfig) return; // Use WebSocket fallback

    // Subscribe to Firebase Realtime DB
    subscribeToFirebaseCrowd((data) => {
      useAppStore.setState({ crowdData: data, lastUpdate: new Date().toISOString() });
    }).then(unsub => {
      firebaseUnsubRef.current = unsub;
    });

    logAnalyticsEvent('heatmap_viewed');

    return () => {
      if (firebaseUnsubRef.current) firebaseUnsubRef.current();
    };
  }, []);

  return { crowdData, lastUpdate, wsConnected, source: hasFirebaseConfig ? 'firebase' : 'websocket' };
}
