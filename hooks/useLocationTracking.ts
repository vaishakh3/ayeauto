import { useState, useRef } from 'react';
import * as Location from 'expo-location';

export function useLocationTracking() {
  const [currentLocation, setCurrentLocation] = useState<Location.LocationObject | null>(null);
  const [distanceTraveled, setDistanceTraveled] = useState(0);
  const [isTracking, setIsTracking] = useState(false);
  
  const lastLocationRef = useRef<Location.LocationObject | null>(null);
  const watcherRef = useRef<Location.LocationSubscription | null>(null);

  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number => {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const startTracking = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Location permission not granted');
      }

      // Get initial location
      const initialLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      
      setCurrentLocation(initialLocation);
      lastLocationRef.current = initialLocation;
      setIsTracking(true);
      setDistanceTraveled(0);

      // Start watching location
      watcherRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000, // Update every 5 seconds
          distanceInterval: 10, // Update every 10 meters
        },
        (location) => {
          setCurrentLocation(location);
          
          if (lastLocationRef.current) {
            const distance = calculateDistance(
              lastLocationRef.current.coords.latitude,
              lastLocationRef.current.coords.longitude,
              location.coords.latitude,
              location.coords.longitude
            );
            
            // Only add distance if it's significant and reasonable (less than 1km per update)
            if (distance > 0.01 && distance < 1) {
              setDistanceTraveled(prev => prev + distance);
            }
          }
          
          lastLocationRef.current = location;
        }
      );
    } catch (error) {
      console.error('Error starting location tracking:', error);
      setIsTracking(false);
    }
  };

  const stopTracking = async () => {
    if (watcherRef.current) {
      watcherRef.current.remove();
      watcherRef.current = null;
    }
    setIsTracking(false);
  };

  const resetTracking = () => {
    setDistanceTraveled(0);
    setCurrentLocation(null);
    lastLocationRef.current = null;
  };

  return {
    currentLocation,
    distanceTraveled,
    isTracking,
    startTracking,
    stopTracking,
    resetTracking,
  };
}