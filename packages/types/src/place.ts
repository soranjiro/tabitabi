export interface PlaceSuggestion {
  placeId: string;
  text: string;
  mainText?: string;
  secondaryText?: string;
  types?: string[];
}

export interface PlaceStructuredData {
  placeId: string;
  displayName: string;
  formattedAddress?: string;
  latitude?: number;
  longitude?: number;
  googleMapsUri?: string;
  types?: string[];
  addressComponents?: Array<{
    longText?: string;
    shortText?: string;
    types?: string[];
    languageCode?: string;
  }>;
  source: 'google_places';
  fetchedAt: string;
}

export interface PlaceAutocompleteResponse {
  suggestions: PlaceSuggestion[];
}

export interface PlaceDetailsResponse {
  place: PlaceStructuredData;
}
