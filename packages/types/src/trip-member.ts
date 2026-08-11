export interface TripMember {
  id: string;
  itinerary_id: string;
  name: string;
  created_at: string;
}

export interface CreateTripMemberInput {
  name: string;
}
