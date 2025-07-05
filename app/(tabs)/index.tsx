import { View, Text, StyleSheet, TouchableOpacity, Alert, TextInput } from 'react-native';
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
  const [manualDistance, setManualDistance] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  
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
    loadFareSettings();
    // Don't automatically request location on app start
    // Let user trigger it by clicking Start Meter
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
    let interval: ReturnType<typeof setInterval>;
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
      // Check if we're in a PWA (standalone mode)
      const isPWA = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
      
      if (isPWA) {
        // For PWA mode, we need to request permission more explicitly
        if ('geolocation' in navigator) {
          // Try to get location first, which will trigger permission request
          navigator.geolocation.getCurrentPosition(
            (position) => {
              console.log('PWA location permission granted');
              setHasPermission(true);
            },
            (error) => {
              console.error('PWA location permission denied:', error);
              setHasPermission(false);
              Alert.alert(
                'Location Permission Required', 
                'Please enable location access in your browser settings for this app to work properly. You may need to reload the app after enabling location.'
              );
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
          );
        } else {
          setHasPermission(false);
          Alert.alert('Location Not Supported', 'Your device does not support location services.');
        }
      } else {
        // Regular Safari - use Expo Location
        const { status } = await Location.requestForegroundPermissionsAsync();
        setHasPermission(status === 'granted');
        
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Location permission is required for the meter to work properly.');
        }
      }
    } catch (error) {
      console.error('Error requesting location permission:', error);
      setHasPermission(false);
    }
  };

  const handleStartMeter = async () => {
    console.log('Start meter clicked');
    
    // Check if we're in PWA mode
    const isPWA = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
    console.log('Is PWA:', isPWA);
    
    // For PWA mode, offer manual distance input as primary option
    if (isPWA) {
      Alert.alert(
        'Choose Meter Mode',
        'PWAs have limited location access. Choose how you want to track your trip:',
        [
          { 
            text: 'Manual Distance', 
            onPress: () => {
              setShowManualInput(true);
              setIsRunning(true);
            }
          },
          { 
            text: 'Try Location', 
            onPress: () => attemptLocationAccess()
          },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
      return;
    }
    
    // For Safari, try location directly
    attemptLocationAccess();
  };

  const attemptLocationAccess = async () => {
    try {
      if (typeof window !== 'undefined' && 'geolocation' in navigator) {
        console.log('Requesting location permission...');
        
        // Try to request permission first
        if ('permissions' in navigator) {
          try {
            const permission = await navigator.permissions.query({name: 'geolocation'});
            console.log('Permission state:', permission.state);
            
            if (permission.state === 'denied') {
              Alert.alert(
                'Location Access Blocked',
                'Location access has been blocked. Would you like to use manual distance input instead?',
                [
                  { text: 'Manual Mode', onPress: () => {
                    setShowManualInput(true);
                    setIsRunning(true);
                  }},
                  { text: 'Cancel', style: 'cancel' }
                ]
              );
              return;
            }
          } catch (permError) {
            console.log('Permission query failed:', permError);
          }
        }
        
        navigator.geolocation.getCurrentPosition(
          (position) => {
            console.log('Location permission granted:', position);
            setHasPermission(true);
            setIsRunning(true);
            startTracking();
          },
          (error) => {
            console.error('Location error:', error);
            Alert.alert(
              'Location Unavailable',
              'Unable to access location. Would you like to use manual distance input instead?',
              [
                { text: 'Manual Mode', onPress: () => {
                  setShowManualInput(true);
                  setIsRunning(true);
                }},
                { text: 'Cancel', style: 'cancel' }
              ]
            );
          },
          { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );
      } else {
        // Fallback to Expo Location for native
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          setHasPermission(true);
          setIsRunning(true);
          await startTracking();
        } else {
          Alert.alert('Permission Required', 'Please enable location permissions to use the meter.');
        }
      }
    } catch (error) {
      console.error('Error requesting location:', error);
      Alert.alert('Error', 'Failed to access location. Please try again.');
    }
  };

  const handleStopMeter = async () => {
    setIsRunning(false);
    await stopTracking();
    setShowManualInput(false);
  };

  const handleResetMeter = () => {
    setIsRunning(false);
    setElapsedTime(0);
    resetMeter();
    stopTracking();
    setShowManualInput(false);
    setManualDistance('');
  };

  const handleManualDistanceChange = (value: string) => {
    setManualDistance(value);
    const numValue = parseFloat(value) || 0;
    updateDistance(numValue);
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
            {showManualInput ? (
              <TextInput
                style={styles.manualInput}
                value={manualDistance}
                onChangeText={handleManualDistanceChange}
                placeholder="0.0"
                keyboardType="decimal-pad"
                autoFocus={true}
              />
            ) : (
              <Text style={styles.statValue}>{distance.toFixed(2)} km</Text>
            )}
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
            <Text style={styles.buttonText}>
              {hasPermission ? 'Start Meter' : 'Start Meter (Enable Location)'}
            </Text>
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
        {!hasPermission && (
          <Text style={[styles.rateText, styles.locationNote]}>
            📍 Click "Start Meter" to enable location tracking
            {window.matchMedia && window.matchMedia('(display-mode: standalone)').matches && 
              '\n💡 PWA Tip: If location doesn\'t work, try opening in Safari first'
            }
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
  locationNote: {
    color: '#2196F3',
    fontFamily: 'Inter-SemiBold',
    marginTop: 4,
  },
  manualInput: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#1565C0',
    textAlign: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#FF6B35',
    paddingVertical: 4,
    minWidth: 60,
  },
});