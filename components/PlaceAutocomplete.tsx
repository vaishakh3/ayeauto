import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableWithoutFeedback,
} from 'react-native';
import { MapPin, Clock } from 'lucide-react-native';
import { useGooglePlaces } from '@/hooks/useGooglePlaces';

interface PlaceSuggestion {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

interface PlaceAutocompleteProps {
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  onPlaceSelect: (place: PlaceSuggestion) => void;
  icon: React.ReactNode;
  containerStyle?: any;
  zIndex?: number;
  onFocus?: () => void;
  onBlur?: () => void;
}

export default function PlaceAutocomplete({
  placeholder,
  value,
  onChangeText,
  onPlaceSelect,
  icon,
  containerStyle,
  zIndex = 1000,
  onFocus,
  onBlur,
}: PlaceAutocompleteProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [recentSearches] = useState<string[]>([
    'Mumbai Central Station',
    'Chhatrapati Shivaji Airport',
    'Gateway of India',
    'Bandra-Kurla Complex',
    'Colaba Causeway',
  ]);
  
  const inputRef = useRef<TextInput>(null);
  const { suggestions, isLoading, searchPlaces, clearSuggestions } = useGooglePlaces();

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (value.length > 2) {
        searchPlaces(value);
      } else {
        clearSuggestions();
      }
    }, 300);

    return () => clearTimeout(delayedSearch);
  }, [value]);

  const handlePlaceSelect = (place: PlaceSuggestion) => {
    onPlaceSelect(place);
    setShowSuggestions(false);
    // Don't blur immediately to prevent the need for double-click
    setTimeout(() => {
      setIsFocused(false);
      inputRef.current?.blur();
    }, 100);
  };

  const handleRecentSelect = (recent: string) => {
    onChangeText(recent);
    setShowSuggestions(false);
    // Don't blur immediately to prevent the need for double-click
    setTimeout(() => {
      setIsFocused(false);
      inputRef.current?.blur();
    }, 100);
  };

  const handleInputFocus = () => {
    setIsFocused(true);
    setShowSuggestions(true);
    onFocus?.();
  };

  const handleInputBlur = () => {
    // Longer delay to ensure selection completes before hiding
    setTimeout(() => {
      setIsFocused(false);
      setShowSuggestions(false);
      onBlur?.();
    }, 200);
  };

  const handleTextChange = (text: string) => {
    onChangeText(text);
    if (!showSuggestions && text.length > 0) {
      setShowSuggestions(true);
    }
  };

  const renderSuggestion = ({ item }: { item: PlaceSuggestion }) => (
    <TouchableOpacity
      style={styles.suggestionItem}
      onPress={() => handlePlaceSelect(item)}
      activeOpacity={0.8}
      delayPressIn={0}
    >
      <MapPin size={16} color="#666666" style={styles.suggestionIcon} />
      <View style={styles.suggestionContent}>
        <Text style={styles.suggestionMain} numberOfLines={1}>
          {item.structured_formatting.main_text}
        </Text>
        <Text style={styles.suggestionSecondary} numberOfLines={1}>
          {item.structured_formatting.secondary_text}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderRecentSearch = ({ item }: { item: string }) => (
    <TouchableOpacity
      style={styles.suggestionItem}
      onPress={() => handleRecentSelect(item)}
      activeOpacity={0.8}
      delayPressIn={0}
    >
      <Clock size={16} color="#999999" style={styles.suggestionIcon} />
      <View style={styles.suggestionContent}>
        <Text style={styles.suggestionMain} numberOfLines={1}>{item}</Text>
        <Text style={styles.suggestionSecondary}>Recent search</Text>
      </View>
    </TouchableOpacity>
  );

  const shouldShowSuggestions = showSuggestions && isFocused;
  const hasSearchResults = suggestions.length > 0;
  const showRecentSearches = value.length === 0;

  const dynamicZIndex = isFocused ? zIndex + 1000 : zIndex;
  return (
    <View style={[styles.container, containerStyle, { zIndex: dynamicZIndex }]}>
      <View style={[
        styles.inputContainer,
        isFocused && styles.inputContainerFocused,
        { zIndex: dynamicZIndex + 1 }
      ]}>
        <View style={styles.inputRow}>
          {icon}
          <TextInput
            ref={inputRef}
            style={[styles.input, {outline: 'none'}]}
            placeholder={placeholder}
            placeholderTextColor="#999999"
            value={value}
            onChangeText={handleTextChange}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            autoCorrect={false}
            autoCapitalize="words"
            selectionColor="#FF6B35"
          />
          {isLoading && (
            <ActivityIndicator size="small" color="#FF6B35" style={styles.loader} />
          )}
        </View>
      </View>

      {shouldShowSuggestions && (
        <View style={[styles.suggestionsContainer, { zIndex: dynamicZIndex + 2 }]}>
          {hasSearchResults ? (
            <ScrollView
              style={styles.suggestionsList}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled={true}
              scrollEnabled={true}
            >
              {suggestions.map((item) => (
                <View key={item.place_id}>
                  {renderSuggestion({ item })}
                </View>
              ))}
            </ScrollView>
          ) : showRecentSearches ? (
            <View>
              <Text style={styles.sectionTitle}>Recent Searches</Text>
              <ScrollView
                style={styles.suggestionsList}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled={true}
                scrollEnabled={true}
              >
                {recentSearches.map((item, index) => (
                  <View key={`recent-${index}`}>
                    {renderRecentSearch({ item })}
                  </View>
                ))}
              </ScrollView>
            </View>
          ) : value.length > 2 ? (
            <View style={styles.noResultsContainer}>
              <Text style={styles.noResultsText}>No results found</Text>
              <Text style={styles.noResultsSubtext}>Try a different search term</Text>
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  inputContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  inputContainerFocused: {
    borderColor: '#FF6B35',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#333333',
    paddingVertical: 16,
    paddingLeft: 12,
    outlineWidth: 0,
    borderWidth: 0,
  },
  loader: {
    marginLeft: 8,
  },
  suggestionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    maxHeight: 300,
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  suggestionsList: {
    maxHeight: 250,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  suggestionIcon: {
    marginRight: 12,
  },
  suggestionContent: {
    flex: 1,
  },
  suggestionMain: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#333333',
    marginBottom: 2,
  },
  suggestionSecondary: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#1565C0',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F8F9FA',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  noResultsContainer: {
    padding: 24,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#666666',
    marginBottom: 4,
  },
  noResultsSubtext: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#999999',
  },
});