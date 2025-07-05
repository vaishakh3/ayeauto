import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { Play, Square, RotateCcw } from 'lucide-react-native';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFareCalculator } from '@/hooks/useFareCalculator';
import { useLocationTracking } from '@/hooks/useLocationTracking';

interface FareSettings {
  baseFare: number;
  baseDistance: number;
  ratePerKm: number;
}

const DEFAULT_SETTINGS: FareSettings = {
  baseFare: 30,
  baseDistance: 1.5,
  ratePerKm: 15,
};

export default function MeterScreen() {
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [hasPermission, setHasPermission] = useState(false);
  const [fareSettings, setFareSettings] = useState<FareSettings>(DEFAULT_SETTINGS);
  
  const { 
    distance, 
    fare, 
    isNight,
    resetMeter, 
    updateDistance 
  } = useFareCalculator();
  
  const { 
    startTracking, 
    stopTracking, 
    currentLocation,
    distanceTraveled 
  } = useLocationTracking();

  useEffect(() => {
    requestLocationPermission();
    loadFareSettings();
  }, []);

  const loadFareSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem('fareSettings');
      if (savedSettings) {
        setFareSettings(JSON.parse(savedSettings));
      }
    } catch (error) {
      console.error('Error loading fare settings:', error);
    }
  };

  // Listen for settings changes when the screen comes into focus
  useEffect(() => {
    const interval = setInterval(() => {
      loadFareSettings();
    }, 1000); // Check for settings changes every second

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning) {
      interval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  useEffect(() => {
    if (distanceTraveled > 0) {
      updateDistance(distanceTraveled);
    }
  }, [distanceTraveled]);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setHasPermission(status === 'granted');
      
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required for the meter to work properly.');
      }
    } catch (error) {
      console.error('Error requesting location permission:', error);
    }
  };

  const handleStartMeter = async () => {
    if (!hasPermission) {
      Alert.alert('Permission Required', 'Please enable location permissions to use the meter.');
      return;
    }
    
    setIsRunning(true);
    await startTracking();
  };

  const handleStopMeter = async () => {
    setIsRunning(false);
    await stopTracking();
  };

  const handleResetMeter = () => {
    setIsRunning(false);
    setElapsedTime(0);
    resetMeter();
    stopTracking();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Aye Auto</Text>
        <Text style={styles.subtitle}>Auto Meter App</Text>
      </View>

      <View style={styles.displayContainer}>
        <View style={styles.fareCard}>
          <Text style={styles.fareLabel}>Current Fare</Text>
          <Text style={styles.fareAmount}>₹{fare.toFixed(2)}</Text>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Distance</Text>
            <Text style={styles.statValue}>{distance.toFixed(2)} km</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Time</Text>
            <Text style={styles.statValue}>{formatTime(elapsedTime)}</Text>
          </View>
        </View>
      </View>

      <View style={styles.controlsContainer}>
        {!isRunning ? (
          <TouchableOpacity 
            style={[styles.primaryButton, styles.startButton]} 
            onPress={handleStartMeter}
          >
            <Play size={24} color="#FFFFFF" />
            <Text style={styles.buttonText}>Start Meter</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={[styles.primaryButton, styles.stopButton]} 
            onPress={handleStopMeter}
          >
            <Square size={24} color="#FFFFFF" />
            <Text style={styles.buttonText}>Stop Meter</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity 
          style={[styles.secondaryButton]} 
          onPress={handleResetMeter}
        >
          <RotateCcw size={20} color="#FF6B35" />
          <Text style={styles.secondaryButtonText}>Reset</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.rateInfo}>
        <Text style={styles.rateTitle}>Rate Information</Text>
        <Text style={styles.rateText}>Base fare: ₹{fareSettings.baseFare.toFixed(2)} (first {fareSettings.baseDistance} km)</Text>
        <Text style={styles.rateText}>Additional: ₹{fareSettings.ratePerKm.toFixed(2)} per km</Text>
        <Text style={styles.rateText}>Night surcharge: 50% extra (10 PM - 5 AM)</Text>
        {isNight && (
          <Text style={[styles.rateText, styles.nightIndicator]}>
            🌙 Night rate active
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 20,
    paddingTop: 60,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#1565C0',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  displayContainer: {
    marginBottom: 40,
  },
  fareCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  fareLabel: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#666666',
    marginBottom: 8,
  },
  fareAmount: {
    fontSize: 48,
    fontFamily: 'Inter-Bold',
    color: '#FF6B35',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#666666',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#1565C0',
  },
  controlsContainer: {
    marginBottom: 30,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 16,
    marginBottom: 12,
    gap: 8,
  },
  startButton: {
    backgroundColor: '#4CAF50',
  },
  stopButton: {
    backgroundColor: '#F44336',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#FF6B35',
    gap: 8,
  },
  buttonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FF6B35',
  },
  rateInfo: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  rateTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#1565C0',
    marginBottom: 8,
  },
  rateText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    marginBottom: 2,
  },
  nightIndicator: {
    color: '#FF6B35',
    fontFamily: 'Inter-SemiBold',
    marginTop: 4,
  },
});