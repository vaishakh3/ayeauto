import { useState, useEffect } from 'react';

const GOOGLE_MAPS_API_KEY = 'AIzaSyAguWfPKzzLZrQlPbXWbfzvRYLNM8xwFrk';

interface PlaceSuggestion {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

// Declare global google object
declare global {
  interface Window {
    google: any;
    initGoogleMaps: () => void;
  }
}

interface DistanceResult {
  distance: number;
  duration: number;
}

export function useGooglePlaces() {
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleMapsLoaded, setIsGoogleMapsLoaded] = useState(false);

  useEffect(() => {
    // Load Google Maps JavaScript API
    const loadGoogleMaps = () => {
      if (window.google && window.google.maps) {
        setIsGoogleMapsLoaded(true);
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        setIsGoogleMapsLoaded(true);
      };
      document.head.appendChild(script);
    };

    if (typeof window !== 'undefined') {
      loadGoogleMaps();
    }
  }, []);

  const searchPlaces = async (query: string): Promise<PlaceSuggestion[]> => {
    if (!query.trim() || !isGoogleMapsLoaded) {
      setSuggestions([]);
      return [];
    }

    setIsLoading(true);
    try {
      return new Promise((resolve) => {
        const service = new window.google.maps.places.AutocompleteService();
        
        service.getPlacePredictions(
          {
            input: query,
            componentRestrictions: { country: 'in' },
            types: ['establishment', 'geocode']
          },
          (predictions: any, status: any) => {
            if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
              const formattedPredictions = predictions.map((prediction: any) => ({
                place_id: prediction.place_id,
                description: prediction.description,
                structured_formatting: {
                  main_text: prediction.structured_formatting.main_text,
                  secondary_text: prediction.structured_formatting.secondary_text || '',
                }
              }));
              setSuggestions(formattedPredictions);
              setIsLoading(false);
              resolve(formattedPredictions);
            } else {
              setSuggestions([]);
              setIsLoading(false);
              resolve([]);
            }
          }
        );
      });
    } catch (error) {
      console.error('Error fetching place suggestions:', error);
      setIsLoading(false);
      return [];
    }
  };

  const getPlaceCoordinates = async (placeId: string): Promise<{lat: number, lng: number} | null> => {
    if (!isGoogleMapsLoaded) return null;

    try {
      return new Promise((resolve) => {
        const service = new window.google.maps.places.PlacesService(
          document.createElement('div')
        );
        
        service.getDetails(
          {
            placeId: placeId,
            fields: ['geometry']
          },
          (place: any, status: any) => {
            if (status === window.google.maps.places.PlacesServiceStatus.OK && place && place.geometry) {
              resolve({
                lat: place.geometry.location!.lat(),
                lng: place.geometry.location!.lng(),
              });
            } else {
              resolve(null);
            }
          }
        );
      });
    } catch (error) {
      console.error('Error fetching place coordinates:', error);
      return null;
    }
  };

  const geocodeAddress = async (address: string): Promise<{lat: number, lng: number} | null> => {
    if (!isGoogleMapsLoaded) return null;

    try {
      return new Promise((resolve) => {
        const geocoder = new window.google.maps.Geocoder();
        
        geocoder.geocode(
          {
            address: address,
            componentRestrictions: { country: 'IN' }
          },
          (results: any, status: any) => {
            if (status === window.google.maps.GeocoderStatus.OK && results && results[0]) {
              const location = results[0].geometry.location;
              resolve({
                lat: location.lat(),
                lng: location.lng(),
              });
            } else {
              resolve(null);
            }
          }
        );
      });
    } catch (error) {
      console.error('Error geocoding address:', error);
      return null;
    }
  };

  const calculateDistanceAndTime = async (
    origin: string,
    destination: string
  ): Promise<DistanceResult | null> => {
    if (!isGoogleMapsLoaded) return null;

    try {
      return new Promise((resolve) => {
        const service = new window.google.maps.DistanceMatrixService();
        
        service.getDistanceMatrix(
          {
            origins: [origin],
            destinations: [destination],
            travelMode: window.google.maps.TravelMode.DRIVING,
            unitSystem: window.google.maps.UnitSystem.METRIC,
            avoidHighways: false,
            avoidTolls: true
          },
          (response: any, status: any) => {
            if (status === window.google.maps.DistanceMatrixStatus.OK && response) {
              const element = response.rows[0].elements[0];
              if (element.status === 'OK') {
                const distanceKm = element.distance!.value / 1000; // Convert meters to km
                const durationMin = element.duration!.value / 60; // Convert seconds to minutes
                
                resolve({
                  distance: distanceKm,
                  duration: durationMin,
                });
              } else {
                resolve(null);
              }
            } else {
              resolve(null);
            }
          }
        );
      });
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
    isGoogleMapsLoaded,
  };
}