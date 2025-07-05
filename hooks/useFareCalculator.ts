import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Default Kerala auto rickshaw fare constants
const DEFAULT_MIN_CHARGE = 30; // ₹30 for first 1.5 km
const DEFAULT_BASE_DISTANCE = 1.5; // 1.5 km base distance
const DEFAULT_RATE_PER_KM = 15; // ₹15 per km after 1.5 km
const NIGHT_SURCHARGE = 0.5; // 50% extra for night trips (10 PM - 5 AM)

interface FareSettings {
  baseFare: number;
  baseDistance: number;
  ratePerKm: number;
}

export const isNightTime = (): boolean => {
  const hour = new Date().getHours();
  return hour >= 22 || hour < 5; // 10 PM to 5 AM
};

const loadFareSettings = async (): Promise<FareSettings> => {
  try {
    const savedSettings = await AsyncStorage.getItem('fareSettings');
    if (savedSettings) {
      return JSON.parse(savedSettings);
    }
  } catch (error) {
    console.error('Error loading fare settings:', error);
  }
  
  return {
    baseFare: DEFAULT_MIN_CHARGE,
    baseDistance: DEFAULT_BASE_DISTANCE,
    ratePerKm: DEFAULT_RATE_PER_KM,
  };
};

export function useFareCalculator() {
  const [distance, setDistance] = useState(0);
  const [fare, setFare] = useState(0);
  const [isNight, setIsNight] = useState(false);
  const [fareSettings, setFareSettings] = useState<FareSettings>({
    baseFare: DEFAULT_MIN_CHARGE,
    baseDistance: DEFAULT_BASE_DISTANCE,
    ratePerKm: DEFAULT_RATE_PER_KM,
  });

  // Load settings when hook is initialized
  useEffect(() => {
    loadFareSettings().then(setFareSettings);
  }, []);

  const _calculateFareInternal = (distanceKm: number, isNightActive: boolean, settings?: FareSettings): number => {
    const currentSettings = settings || fareSettings;
    let fare: number;

    // Base fare calculation
    if (distanceKm <= currentSettings.baseDistance) {
      fare = currentSettings.baseFare;
    } else {
      fare = currentSettings.baseFare + currentSettings.ratePerKm * (distanceKm - currentSettings.baseDistance);
    }

    // Apply night surcharge if applicable
    if (isNightActive) {
      fare *= (1 + NIGHT_SURCHARGE);
    }

    // Round to nearest rupee
    return Math.round(fare);
  };

  const updateDistance = (newDistance: number) => {
    // Reload settings each time distance is updated to get latest values
    loadFareSettings().then(settings => {
      setFareSettings(settings);
      const currentIsNight = isNightTime();
      setIsNight(currentIsNight);
      setDistance(newDistance);
      setFare(_calculateFareInternal(newDistance, currentIsNight, settings));
    });
  };

  const resetMeter = () => {
    setDistance(0);
    setFare(0);
    setIsNight(false);
  };

  const calculateFareForDistance = async (distanceKm: number, isNightActive: boolean): Promise<number> => {
    const settings = await loadFareSettings();
    return _calculateFareInternal(distanceKm, isNightActive, settings);
  };

  return {
    distance,
    fare,
    isNight,
    updateDistance,
    resetMeter,
    calculateFareForDistance,
  };
}