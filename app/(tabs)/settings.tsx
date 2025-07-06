import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ScrollView } from 'react-native';
import { useState, useEffect } from 'react';
import { Save, RotateCcw, IndianRupee, MapPin, Clock } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

export default function SettingsScreen() {
  const [settings, setSettings] = useState<FareSettings>(DEFAULT_SETTINGS);
  const [tempSettings, setTempSettings] = useState<FareSettings>(DEFAULT_SETTINGS);
  const [hasChanges, setHasChanges] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    const hasChanges = 
      tempSettings.baseFare !== settings.baseFare ||
      tempSettings.baseDistance !== settings.baseDistance ||
      tempSettings.ratePerKm !== settings.ratePerKm;
    setHasChanges(hasChanges);
  }, [tempSettings, settings]);

  const loadSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem('fareSettings');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        setSettings(parsed);
        setTempSettings(parsed);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      // Validate inputs
      if (tempSettings.baseFare <= 0 || tempSettings.baseDistance <= 0 || tempSettings.ratePerKm <= 0) {
        Alert.alert('Invalid Input', 'All values must be greater than 0');
        return;
      }

      if (tempSettings.baseDistance > 10) {
        Alert.alert('Invalid Input', 'Base distance should not exceed 10 km');
        return;
      }

      await AsyncStorage.setItem('fareSettings', JSON.stringify(tempSettings));
      setSettings(tempSettings);
      setHasChanges(false);
      Alert.alert('Success', 'Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert('Error', 'Failed to save settings');
    }
  };

  const resetToDefaults = () => {
    console.log('Reset button clicked');
    // Use browser confirm for web compatibility
    const confirmed = confirm('Are you sure you want to reset all settings to Kerala defaults?');
    if (confirmed) {
      console.log('Reset confirmed, executing reset...');
      performReset();
    }
  };

  const performReset = async () => {
    try {
      console.log('Performing reset to defaults:', DEFAULT_SETTINGS);
      await AsyncStorage.setItem('fareSettings', JSON.stringify(DEFAULT_SETTINGS));
      setSettings({ ...DEFAULT_SETTINGS });
      setTempSettings({ ...DEFAULT_SETTINGS });
      setHasChanges(false);
      console.log('Reset completed successfully');
      Alert.alert('Success', 'Settings reset to Kerala defaults!');
    } catch (error) {
      console.error('Error resetting settings:', error);
      Alert.alert('Error', 'Failed to reset settings');
    }
  };

  const updateBaseFare = (value: string) => {
    const numValue = parseFloat(value) || 0;
    setTempSettings(prev => ({ ...prev, baseFare: numValue }));
  };

  const updateBaseDistance = (value: string) => {
    const numValue = parseFloat(value) || 0;
    setTempSettings(prev => ({ ...prev, baseDistance: numValue }));
  };

  const updateRatePerKm = (value: string) => {
    const numValue = parseFloat(value) || 0;
    setTempSettings(prev => ({ ...prev, ratePerKm: numValue }));
  };

  const calculateExampleFare = (distance: number): number => {
    let fare: number;
    if (distance <= tempSettings.baseDistance) {
      fare = tempSettings.baseFare;
    } else {
      fare = tempSettings.baseFare + tempSettings.ratePerKm * (distance - tempSettings.baseDistance);
    }
    return Math.round(fare);
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.loadingText}>Loading settings...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <Text style={styles.title}>Aye Auto</Text>
        <Text style={styles.subtitle}>Fare Settings</Text>
      </View>

      <View style={styles.settingsContainer}>
        <Text style={styles.sectionTitle}>Fare Configuration</Text>
        <Text style={styles.sectionDescription}>
          Customize the fare calculation according to your local auto rickshaw rates
        </Text>

        <View style={styles.settingCard}>
          <View style={styles.settingHeader}>
            <IndianRupee size={20} color="#FF6B35" />
            <Text style={styles.settingLabel}>Base Fare</Text>
          </View>
          <Text style={styles.settingDescription}>
            Minimum charge for the initial distance
          </Text>
          <View style={styles.inputContainer}>
            <Text style={styles.currencySymbol}>₹</Text>
            <TextInput
              style={[styles.input, {outline: 'none'}]}
              value={tempSettings.baseFare.toString()}
              onChangeText={updateBaseFare}
              keyboardType="numeric"
              placeholder="30"
              selectionColor="#FF6B35"
            />
          </View>
        </View>

        <View style={styles.settingCard}>
          <View style={styles.settingHeader}>
            <MapPin size={20} color="#FF6B35" />
            <Text style={styles.settingLabel}>Base Distance</Text>
          </View>
          <Text style={styles.settingDescription}>
            Distance covered by the base fare
          </Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={[styles.input, {outline: 'none'}]}
              value={tempSettings.baseDistance.toString()}
              onChangeText={updateBaseDistance}
              keyboardType="numeric"
              placeholder="1.5"
              selectionColor="#FF6B35"
            />
            <Text style={styles.unitSymbol}>km</Text>
          </View>
        </View>

        <View style={styles.settingCard}>
          <View style={styles.settingHeader}>
            <IndianRupee size={20} color="#FF6B35" />
            <Text style={styles.settingLabel}>Rate per KM</Text>
          </View>
          <Text style={styles.settingDescription}>
            Additional charge for each kilometer after base distance
          </Text>
          <View style={styles.inputContainer}>
            <Text style={styles.currencySymbol}>₹</Text>
            <TextInput
              style={[styles.input, {outline: 'none'}]}
              value={tempSettings.ratePerKm.toString()}
              onChangeText={updateRatePerKm}
              keyboardType="numeric"
              placeholder="15"
              selectionColor="#FF6B35"
            />
            <Text style={styles.unitSymbol}>/km</Text>
          </View>
        </View>
      </View>

      <View style={styles.previewContainer}>
        <Text style={styles.sectionTitle}>Fare Preview</Text>
        <Text style={styles.sectionDescription}>
          See how your settings affect fare calculation
        </Text>

        <View style={styles.previewCard}>
          <View style={styles.previewRow}>
            <Text style={styles.previewDistance}>2 km</Text>
            <Text style={styles.previewFare}>₹{calculateExampleFare(2)}</Text>
          </View>
          <View style={styles.previewRow}>
            <Text style={styles.previewDistance}>5 km</Text>
            <Text style={styles.previewFare}>₹{calculateExampleFare(5)}</Text>
          </View>
          <View style={styles.previewRow}>
            <Text style={styles.previewDistance}>10 km</Text>
            <Text style={styles.previewFare}>₹{calculateExampleFare(10)}</Text>
          </View>
        </View>
      </View>

      <View style={styles.actionContainer}>
        <TouchableOpacity 
          style={[styles.primaryButton, !hasChanges && styles.disabledButton]} 
          onPress={saveSettings}
          disabled={!hasChanges}
        >
          <Save size={20} color="#FFFFFF" />
          <Text style={styles.buttonText}>Save Settings</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.secondaryButton} 
          onPress={resetToDefaults}
          activeOpacity={0.8}
        >
          <RotateCcw size={18} color="#FF6B35" />
          <Text style={styles.secondaryButtonText}>Reset to Kerala Defaults</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.infoTitle}>💡 About Fare Settings</Text>
        <Text style={styles.infoText}>• Base fare is charged for the initial distance</Text>
        <Text style={styles.infoText}>• Additional distance is charged at the per-km rate</Text>
        <Text style={styles.infoText}>• Night surcharge (50%) applies from 10 PM to 5 AM</Text>
        <Text style={styles.infoText}>• Settings are saved locally on your device</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
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
  loadingText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  settingsContainer: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#1565C0',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    marginBottom: 20,
  },
  settingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  settingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  settingLabel: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#333333',
    marginLeft: 8,
  },
  settingDescription: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    marginBottom: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingHorizontal: 12,
  },
  currencySymbol: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#666666',
    marginRight: 4,
  },
  unitSymbol: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    marginLeft: 4,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#333333',
    paddingVertical: 12,
    textAlign: 'right',
  },
  previewContainer: {
    marginBottom: 30,
  },
  previewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  previewDistance: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#666666',
  },
  previewFare: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#FF6B35',
  },
  actionContainer: {
    marginBottom: 30,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6B35',
    borderRadius: 12,
    paddingVertical: 16,
    marginBottom: 12,
    gap: 8,
  },
  disabledButton: {
    backgroundColor: '#CCCCCC',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 14,
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
  infoContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
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