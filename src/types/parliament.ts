// Database schema types matching Supabase structure
export interface State {
  id: string;
  name: string;
  code: string;
  created_at?: string;
}

export interface Party {
  id: string;
  name: string;
  short_name: string;
  color?: string;
  hex_code?: string;
  created_at?: string;
}

export interface Electorate {
  id: string;
  name: string;
  state_id: string;
  type: 'federal' | 'state';
  current_member_id?: string;
  total_votes_cast?: number; // Renamed from two_party_preferred_margin
  swing_at_last_election?: number;
  last_election_date?: string;
  next_election_date?: string;
  created_at?: string;
  previous_margin_percentage?: number; // Renamed from two_party_preferred_percent
  current_margin_votes?: number; // New field
  current_margin_percentage?: number; // New field
  winner_two_party_preferred_percent?: number; // New field
  loser_two_party_preferred_percent?: number; // New field
  winner_two_party_preferred_votes?: number; // New field for raw vote counts
  loser_two_party_preferred_votes?: number; // New field for raw vote counts
}

export interface MP {
  id: string;
  first_name: string;
  last_name: string;
  party_id?: string;
  electorate_id?: string;
  start_date: string;
  end_date?: string;
  created_at?: string;
}

// Scraped data structure (before normalization) - Updated with new fields
export interface ScrapedMemberData {
  first_name: string;
  last_name: string;
  party_name: string;
  party_short_name?: string;
  electorate_name: string;
  total_votes_cast: number; // Total votes cast in electorate
  current_margin_votes: number; // Current election margin in votes
  current_margin_percentage: number; // Current election margin as percentage
  winner_two_party_preferred_percent: number; // Winner's TPP percentage
  loser_two_party_preferred_percent: number; // Loser's TPP percentage
  winner_two_party_preferred_votes: number; // Winner's TPP raw vote count
  loser_two_party_preferred_votes: number; // Loser's TPP raw vote count
  previous_margin_percentage: number; // Previous election margin percentage
  swing_percentage: number; // Swing compared to previous election
  source_url: string;
  scraped_at: string;
}

// Combined data for display (after joining tables) - Updated with new fields
export interface MemberWithDetails {
  id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  party_name: string;
  party_short_name: string;
  party_color?: string;
  party_hex_code?: string;
  electorate_name: string;
  state_name: string;
  state_code: string;
  total_votes_cast: number; // Total votes cast in electorate
  current_margin_votes: number; // Current election margin in votes
  current_margin_percentage: number; // Current election margin as percentage
  winner_two_party_preferred_percent: number; // Winner's TPP percentage
  loser_two_party_preferred_percent: number; // Loser's TPP percentage
  winner_two_party_preferred_votes: number; // Winner's TPP raw vote count
  loser_two_party_preferred_votes: number; // Loser's TPP raw vote count
  previous_margin_percentage: number; // Previous election margin percentage
  swing_percentage: number; // Swing compared to previous election
  source_url: string;
  scraped_at: string;
  start_date: string;
  end_date?: string;
  created_at?: string;
}

export interface ScrapingProgress {
  current: number;
  total: number;
  status: 'idle' | 'scraping' | 'processing' | 'completed' | 'error' | 'review_pending';
  message: string;
}

export interface ScrapingResult {
  success: boolean;
  data: ScrapedMemberData[];
  errors: string[];
  totalFound: number;
}

// Legacy type for backward compatibility
export interface ParliamentaryMember {
  id?: string;
  first_name: string;
  last_name: string;
  full_name: string;
  party: string;
  electorate: string;
  margin_votes: number;
  margin_percentage: number;
  swing_percentage: number;
  source_url: string;
  scraped_at: string;
  created_at?: string;
}