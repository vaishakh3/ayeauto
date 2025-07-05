import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useState, useCallback, useEffect } from 'react';
import { Search, MapPin, Navigation, Clock } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFareCalculator, isNightTime } from '@/hooks/useFareCalculator';
import PlaceAutocomplete from '@/components/PlaceAutocomplete';
import { useGooglePlaces } from '@/hooks/useGooglePlaces';

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

export default function TripPlannerScreen() {
  const [source, setSource] = useState('');
  const [destination, setDestination] = useState('');
  const [estimatedDistance, setEstimatedDistance] = useState(0);
  const [estimatedTime, setEstimatedTime] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [focusedInput, setFocusedInput] = useState<'source' | 'destination' | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fareSettings, setFareSettings] = useState<FareSettings>(DEFAULT_SETTINGS);
  
  const { calculateFareForDistance } = useFareCalculator();
  const { calculateDistanceAndTime } = useGooglePlaces();

  const isNightForTrip = isNightTime();
  const [estimatedFare, setEstimatedFare] = useState(0);

  // Load fare settings when component mounts
  useEffect(() => {
    loadFareSettings();
  }, []);

  // Listen for settings changes and update fare automatically
  useEffect(() => {
    const interval = setInterval(async () => {
      const savedSettings = await AsyncStorage.getItem('fareSettings');
      if (savedSettings) {
        const newSettings = JSON.parse(savedSettings);
        // Check if settings have changed
        if (JSON.stringify(newSettings) !== JSON.stringify(fareSettings)) {
          setFareSettings(newSettings);
          // If we have results showing, recalculate the fare
          if (showResults && estimatedDistance > 0) {
            const updatedFare = await calculateFareForDistance(estimatedDistance, isNightForTrip);
            setEstimatedFare(updatedFare);
          }
        }
      }
    }, 1000); // Check every second

    return () => clearInterval(interval);
  }, [fareSettings, showResults, estimatedDistance, isNightForTrip, calculateFareForDistance]);

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

  useEffect(() => {
    const updateFare = async () => {
      const fare = await calculateFareForDistance(estimatedDistance, isNightForTrip);
      setEstimatedFare(fare);
    };
    updateFare();
  }, [estimatedDistance, isNightForTrip]);

  const handleSourceSelect = useCallback((place: any) => {
    setSource(place.description);
  }, []);

  const handleDestinationSelect = useCallback((place: any) => {
    setDestination(place.description);
  }, []);

  const handleSourceFocus = useCallback(() => {
    setFocusedInput('source');
  }, []);

  const handleSourceBlur = useCallback(() => {
    setFocusedInput(null);
  }, []);

  const handleDestinationFocus = useCallback(() => {
    setFocusedInput('destination');
  }, []);

  const handleDestinationBlur = useCallback(() => {
    setFocusedInput(null);
  }, []);

  const handleEstimateTrip = async () => {
    if (!source.trim() || !destination.trim()) {
      Alert.alert('Missing Information', 'Please enter both source and destination.');
      return;
    }

    setIsLoading(true);
    try {
      // Reload settings to get latest values
      await loadFareSettings();
      
      const result = await calculateDistanceAndTime(source, destination);
      
      if (result) {
        setEstimatedDistance(result.distance);
        setEstimatedTime(result.duration);
        setShowResults(true);
      } else {
        Alert.alert(
          'Unable to Calculate Distance', 
          'Could not find a route between the selected locations. Please check the addresses and try again.'
        );
      }
    } catch (error) {
      console.error('Error calculating trip:', error);
      Alert.alert(
        'Error', 
        'Failed to calculate distance. Please check your internet connection and try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearTrip = () => {
    setSource('');
    setDestination('');
    setEstimatedDistance(0);
    setEstimatedTime(0);
    setShowResults(false);
  };

  const calculateBreakdownValues = () => {
    const baseFareAmount = fareSettings.baseFare;
    const additionalDistance = Math.max(0, estimatedDistance - fareSettings.baseDistance);
    const additionalFareAmount = additionalDistance * fareSettings.ratePerKm;
    const subtotal = baseFareAmount + additionalFareAmount;
    const nightSurcharge = isNightForTrip ? subtotal * 0.5 : 0;
    
    return {
      baseFareAmount,
      additionalDistance,
      additionalFareAmount,
      subtotal,
      nightSurcharge,
    };
  };

  const breakdown = calculateBreakdownValues();

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Aye Auto</Text>
          <Text style={styles.subtitle}>Trip Planner</Text>
        </View>

        <View style={styles.formContainer}>
          <PlaceAutocomplete
            placeholder="Enter pickup location"
            value={source}
            onChangeText={setSource}
            onPlaceSelect={handleSourceSelect}
            icon={<MapPin size={20} color="#4CAF50" />}
            containerStyle={[
              styles.autocompleteContainer,
              styles.sourceContainer,
            ]}
            zIndex={focusedInput === 'source' ? 2000 : 1000}
            onFocus={handleSourceFocus}
            onBlur={handleSourceBlur}
          />

          <PlaceAutocomplete
            placeholder="Enter destination"
            value={destination}
            onChangeText={setDestination}
            onPlaceSelect={handleDestinationSelect}
            icon={<Navigation size={20} color="#F44336" />}
            containerStyle={[
              styles.autocompleteContainer,
              styles.destinationContainer,
            ]}
            zIndex={focusedInput === 'destination' ? 2000 : 1000}
            onFocus={handleDestinationFocus}
            onBlur={handleDestinationBlur}
          />

          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={styles.estimateButton} 
              onPress={handleEstimateTrip}
              disabled={isLoading}
            >
              <Search size={20} color="#FFFFFF" />
              <Text style={styles.buttonText}>
                {isLoading ? 'Calculating...' : 'Estimate Trip'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.clearButton} 
              onPress={handleClearTrip}
            >
              <Text style={styles.clearButtonText}>Clear</Text>
            </TouchableOpacity>
          </View>
        </View>

        {showResults && (
          <View style={styles.resultsContainer}>
            <Text style={styles.resultsTitle}>Trip Estimate</Text>
            
            <View style={styles.fareCard}>
              <Text style={styles.fareLabel}>Estimated Fare</Text>
              <Text style={styles.fareAmount}>₹{estimatedFare.toFixed(2)}</Text>
            </View>

            <View style={styles.detailsContainer}>
              <View style={styles.detailCard}>
                <MapPin size={16} color="#FF6B35" />
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Distance</Text>
                  <Text style={styles.detailValue}>{estimatedDistance.toFixed(2)} km</Text>
                </View>
              </View>

              <View style={styles.detailCard}>
                <Clock size={16} color="#FF6B35" />
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Time</Text>
                  <Text style={styles.detailValue}>{Math.round(estimatedTime)} min</Text>
                </View>
              </View>
            </View>

            <View style={styles.breakdownContainer}>
              <Text style={styles.breakdownTitle}>Fare Breakdown</Text>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownText}>Base fare (first {fareSettings.baseDistance} km)</Text>
                <Text style={styles.breakdownAmount}>₹{breakdown.baseFareAmount.toFixed(2)}</Text>
              </View>
              {breakdown.additionalDistance > 0 && (
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownText}>
                    Additional ({breakdown.additionalDistance.toFixed(2)} km @ ₹{fareSettings.ratePerKm}/km)
                  </Text>
                  <Text style={styles.breakdownAmount}>
                    ₹{breakdown.additionalFareAmount.toFixed(2)}
                  </Text>
                </View>
              )}
              {isNightForTrip && (
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownText}>Night surcharge (50%)</Text>
                  <Text style={styles.breakdownAmount}>₹{breakdown.nightSurcharge.toFixed(2)}</Text>
                </View>
              )}
              <View style={[styles.breakdownRow, styles.totalRow]}>
                <Text style={styles.totalText}>Total</Text>
                <Text style={styles.totalAmount}>₹{estimatedFare.toFixed(2)}</Text>
              </View>
            </View>
          </View>
        )}

        <View style={styles.infoContainer}>
          <Text style={styles.infoTitle}>💡 Tips</Text>
          <Text style={styles.infoText}>• Night surcharge (50% extra) applies from 10 PM to 5 AM</Text>
          <Text style={styles.infoText}>• Fares may vary based on traffic conditions</Text>
          <Text style={styles.infoText}>• Always confirm with the driver before starting</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 40,
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
  formContainer: {
    marginBottom: 30,
  },
  autocompleteContainer: {
    marginBottom: 16,
  },
  sourceContainer: {
    // Source input specific styles
  },
  destinationContainer: {
    // Destination input specific styles
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    zIndex: 1,
  },
  estimateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6B35',
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
  },
  clearButton: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  clearButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#666666',
  },
  resultsContainer: {
    marginBottom: 30,
  },
  resultsTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#1565C0',
    marginBottom: 16,
    textAlign: 'center',
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
    fontSize: 36,
    fontFamily: 'Inter-Bold',
    color: '#FF6B35',
  },
  detailsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  detailCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#666666',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#1565C0',
  },
  breakdownContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  breakdownTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1565C0',
    marginBottom: 12,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  breakdownText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    flex: 1,
  },
  breakdownAmount: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#333333',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingTop: 8,
    marginTop: 4,
    marginBottom: 0,
  },
  totalText: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#1565C0',
  },
  totalAmount: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#FF6B35',
  },
  infoContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  infoTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1565C0',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    marginBottom: 4,
  },
});