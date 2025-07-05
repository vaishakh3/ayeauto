import { useState } from 'react';

const GOOGLE_MAPS_API_KEY = 'AIzaSyAguWfPKzzLZrQlPbXWbfzvRYLNM8xwFrk';

interface PlaceSuggestion {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

interface DistanceResult {
  distance: number;
  duration: number;
}

export function useGooglePlaces() {
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const searchPlaces = async (query: string): Promise<PlaceSuggestion[]> => {
    if (!query.trim()) {
      setSuggestions([]);
      return [];
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
          query
        )}&key=${GOOGLE_MAPS_API_KEY}&components=country:in&types=establishment|geocode`
      );
      
      const data = await response.json();
      
      if (data.predictions) {
        setSuggestions(data.predictions);
        return data.predictions;
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching place suggestions:', error);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  const getPlaceCoordinates = async (placeId: string): Promise<{lat: number, lng: number} | null> => {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=geometry&key=${GOOGLE_MAPS_API_KEY}`
      );
      
      const data = await response.json();
      
      if (data.result && data.result.geometry) {
        return {
          lat: data.result.geometry.location.lat,
          lng: data.result.geometry.location.lng,
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching place coordinates:', error);
      return null;
    }
  };

  const geocodeAddress = async (address: string): Promise<{lat: number, lng: number} | null> => {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
          address
        )}&key=${GOOGLE_MAPS_API_KEY}&components=country:IN`
      );
      
      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        const location = data.results[0].geometry.location;
        return {
          lat: location.lat,
          lng: location.lng,
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error geocoding address:', error);
      return null;
    }
  };

  const calculateDistanceAndTime = async (
    origin: string,
    destination: string
  ): Promise<DistanceResult | null> => {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(
          origin
        )}&destinations=${encodeURIComponent(
          destination
        )}&key=${GOOGLE_MAPS_API_KEY}&units=metric&mode=driving&avoid=tolls`
      );
      
      const data = await response.json();
      
      if (
        data.rows &&
        data.rows[0] &&
        data.rows[0].elements &&
        data.rows[0].elements[0] &&
        data.rows[0].elements[0].status === 'OK'
      ) {
        const element = data.rows[0].elements[0];
        const distanceKm = element.distance.value / 1000; // Convert meters to km
        const durationMin = element.duration.value / 60; // Convert seconds to minutes
        
        return {
          distance: distanceKm,
          duration: durationMin,
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error calculating distance and time:', error);
      return null;
    }
  };

  const clearSuggestions = () => {
    setSuggestions([]);
  };

  return {
    suggestions,
    isLoading,
    searchPlaces,
    getPlaceCoordinates,
    geocodeAddress,
    calculateDistanceAndTime,
    clearSuggestions,
  };
}