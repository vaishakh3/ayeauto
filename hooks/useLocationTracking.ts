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
      // Check if we're in web environment
      const isWeb = typeof window !== 'undefined';
      
      if (isWeb && 'geolocation' in navigator) {
        // Use browser geolocation for web/PWA
        console.log('Starting web location tracking...');
        
        // Get initial location with iOS PWA-friendly settings
        const initialPosition = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: false,
            timeout: 15000,
            maximumAge: 60000 // Allow cached position for iOS PWA
          });
        });

        const initialLocation = {
          coords: {
            latitude: initialPosition.coords.latitude,
            longitude: initialPosition.coords.longitude,
            altitude: initialPosition.coords.altitude,
            accuracy: initialPosition.coords.accuracy,
            altitudeAccuracy: initialPosition.coords.altitudeAccuracy,
            heading: initialPosition.coords.heading,
            speed: initialPosition.coords.speed,
          },
          timestamp: initialPosition.timestamp,
        };
        
        setCurrentLocation(initialLocation);
        lastLocationRef.current = initialLocation;
        setIsTracking(true);
        setDistanceTraveled(0);
        
        // Start watching location for web
        const watchId = navigator.geolocation.watchPosition(
          (position) => {
            const newLocationObject = {
              coords: {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                altitude: position.coords.altitude,
                accuracy: position.coords.accuracy,
                altitudeAccuracy: position.coords.altitudeAccuracy,
                heading: position.coords.heading,
                speed: position.coords.speed,
              },
              timestamp: position.timestamp,
            };
            
            console.log('New location received:', newLocationObject.coords.latitude, newLocationObject.coords.longitude);
            setCurrentLocation(newLocationObject);
            
            if (lastLocationRef.current) {
              const distance = calculateDistance(
                lastLocationRef.current.coords.latitude,
                lastLocationRef.current.coords.longitude,
                newLocationObject.coords.latitude,
                newLocationObject.coords.longitude
              );
              
              console.log('Calculated distance:', distance);
              
              // Only add distance if it's significant and reasonable  
              if (distance > 0.001 && distance < 1) {
                setDistanceTraveled(prev => {
                  const newTotal = prev + distance;
                  console.log('Distance updated:', prev, '+', distance, '=', newTotal);
                  return newTotal;
                });
              }
            }
            
            lastLocationRef.current = newLocationObject;
          },
          (error) => {
            console.error('Web location tracking error:', error);
            setIsTracking(false);
          },
          {
            enableHighAccuracy: false,
            timeout: 15000,
            maximumAge: 60000 // iOS PWA-friendly settings
          }
        );
        
        // Store watchId for later cleanup
        watcherRef.current = { remove: () => navigator.geolocation.clearWatch(watchId) };
        
      } else {
        // Use Expo Location for native
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
      }
    } catch (error) {
      console.error('Error starting location tracking:', error);
      setIsTracking(false);
      throw error; // Re-throw so the caller knows it failed
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