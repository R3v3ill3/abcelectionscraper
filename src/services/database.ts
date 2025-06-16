import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { ScrapedMemberData, MemberWithDetails, Party, Electorate, MP } from '../types/parliament';

export class DatabaseService {
  /**
   * Process scraped data and insert into normalized database structure
   */
  static async processAndInsertScrapedData(
    scrapedData: ScrapedMemberData[], 
    stateId: string, 
    electionDate: string
  ): Promise<{ success: boolean; error?: string; insertedCount?: number }> {
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Supabase not configured. Please set up your environment variables.' };
    }

    try {
      let insertedCount = 0;
      const skippedMembers: string[] = [];

      for (const memberData of scrapedData) {
        // 1. Find existing party (DO NOT CREATE NEW ONES)
        const partyResult = await this.findParty({
          name: memberData.party_name,
          short_name: memberData.party_short_name || this.generateShortName(memberData.party_name)
        });

        if (!partyResult.success || !partyResult.party) {
          console.error(`Party not found in database: ${memberData.party_name}. Skipping member: ${memberData.first_name} ${memberData.last_name}`);
          skippedMembers.push(`${memberData.first_name} ${memberData.last_name} (Party: ${memberData.party_name})`);
          continue;
        }

        // 2. Ensure electorate exists (upsert) with new schema including vote counts
        const electorateResult = await this.upsertElectorate({
          name: memberData.electorate_name,
          state_id: stateId,
          type: 'state',
          total_votes_cast: memberData.total_votes_cast,
          current_margin_votes: memberData.current_margin_votes,
          current_margin_percentage: memberData.current_margin_percentage,
          winner_two_party_preferred_percent: memberData.winner_two_party_preferred_percent,
          loser_two_party_preferred_percent: memberData.loser_two_party_preferred_percent,
          winner_two_party_preferred_votes: memberData.winner_two_party_preferred_votes,
          loser_two_party_preferred_votes: memberData.loser_two_party_preferred_votes,
          previous_margin_percentage: memberData.previous_margin_percentage,
          swing_at_last_election: memberData.swing_percentage,
          last_election_date: electionDate
        });

        if (!electorateResult.success || !electorateResult.electorate) {
          console.error(`Failed to upsert electorate: ${memberData.electorate_name}. Skipping member: ${memberData.first_name} ${memberData.last_name}`);
          skippedMembers.push(`${memberData.first_name} ${memberData.last_name} (Electorate: ${memberData.electorate_name})`);
          continue;
        }

        // 3. Insert MP record
        const mpResult = await this.insertMP({
          first_name: memberData.first_name,
          last_name: memberData.last_name,
          party_id: partyResult.party.id,
          electorate_id: electorateResult.electorate.id,
          start_date: electionDate
        });

        if (!mpResult.success) {
          console.error(`Failed to insert MP: ${memberData.first_name} ${memberData.last_name}`);
          skippedMembers.push(`${memberData.first_name} ${memberData.last_name} (MP insertion failed)`);
          continue;
        }

        // 4. Update electorate with current member
        if (mpResult.mp) {
          await this.updateElectorateCurrentMember(electorateResult.electorate.id, mpResult.mp.id);
        }

        insertedCount++;
      }

      // Report results including skipped members
      let resultMessage = `Successfully processed ${insertedCount} of ${scrapedData.length} members`;
      if (skippedMembers.length > 0) {
        resultMessage += `\n\nSkipped ${skippedMembers.length} members due to missing parties or other errors:\n${skippedMembers.join('\n')}`;
        console.warn('Skipped members:', skippedMembers);
      }

      return { 
        success: insertedCount > 0, 
        insertedCount,
        error: skippedMembers.length > 0 ? resultMessage : undefined
      };
    } catch (error) {
      console.error('Database processing error:', error);
      return { success: false, error: 'Failed to process and insert data into database' };
    }
  }

  /**
   * Find existing party (DO NOT CREATE NEW ONES)
   */
  private static async findParty(partyData: { name: string; short_name: string }): Promise<{ success: boolean; party?: Party; error?: string }> {
    try {
      // First try exact name match
      let { data: existingParty, error: selectError } = await supabase
        .from('parties')
        .select('*')
        .eq('name', partyData.name)
        .single();

      if (selectError && selectError.code !== 'PGRST116') { // PGRST116 = no rows returned
        return { success: false, error: selectError.message };
      }

      if (existingParty) {
        return { success: true, party: existingParty };
      }

      // If exact name match fails, try short name match
      const { data: partyByShortName, error: shortNameError } = await supabase
        .from('parties')
        .select('*')
        .eq('short_name', partyData.short_name)
        .single();

      if (shortNameError && shortNameError.code !== 'PGRST116') {
        return { success: false, error: shortNameError.message };
      }

      if (partyByShortName) {
        return { success: true, party: partyByShortName };
      }

      // If no exact matches, try fuzzy matching on existing parties
      const { data: allParties, error: allPartiesError } = await supabase
        .from('parties')
        .select('*');

      if (allPartiesError) {
        return { success: false, error: allPartiesError.message };
      }

      // Try to find a close match
      const fuzzyMatch = allParties?.find(party => 
        party.name.toLowerCase().includes(partyData.name.toLowerCase()) ||
        partyData.name.toLowerCase().includes(party.name.toLowerCase()) ||
        party.short_name === partyData.short_name
      );

      if (fuzzyMatch) {
        console.log(`Found fuzzy match for "${partyData.name}": "${fuzzyMatch.name}"`);
        return { success: true, party: fuzzyMatch };
      }

      // No party found - DO NOT CREATE NEW ONE
      return { 
        success: false, 
        error: `Party "${partyData.name}" not found in database. Available parties should be pre-loaded. Please check party name standardization or manually add the party to the database.` 
      };
    } catch (error) {
      return { success: false, error: 'Failed to find party in database' };
    }
  }

  /**
   * Upsert electorate (insert if not exists, update if found) with new schema including vote counts
   */
  private static async upsertElectorate(electorateData: {
    name: string;
    state_id: string;
    type: 'federal' | 'state';
    total_votes_cast?: number;
    current_margin_votes?: number;
    current_margin_percentage?: number;
    winner_two_party_preferred_percent?: number;
    loser_two_party_preferred_percent?: number;
    winner_two_party_preferred_votes?: number;
    loser_two_party_preferred_votes?: number;
    previous_margin_percentage?: number;
    swing_at_last_election?: number;
    last_election_date?: string;
  }): Promise<{ success: boolean; electorate?: Electorate; error?: string }> {
    try {
      // Check if electorate exists
      const { data: existingElectorate, error: selectError } = await supabase
        .from('electorates')
        .select('*')
        .eq('name', electorateData.name)
        .eq('state_id', electorateData.state_id)
        .single();

      if (selectError && selectError.code !== 'PGRST116') {
        return { success: false, error: selectError.message };
      }

      if (existingElectorate) {
        // Update existing electorate with new election data including vote counts
        const { data: updatedElectorate, error: updateError } = await supabase
          .from('electorates')
          .update({
            total_votes_cast: electorateData.total_votes_cast,
            current_margin_votes: electorateData.current_margin_votes,
            current_margin_percentage: electorateData.current_margin_percentage,
            winner_two_party_preferred_percent: electorateData.winner_two_party_preferred_percent,
            loser_two_party_preferred_percent: electorateData.loser_two_party_preferred_percent,
            winner_two_party_preferred_votes: electorateData.winner_two_party_preferred_votes,
            loser_two_party_preferred_votes: electorateData.loser_two_party_preferred_votes,
            previous_margin_percentage: electorateData.previous_margin_percentage,
            swing_at_last_election: electorateData.swing_at_last_election,
            last_election_date: electorateData.last_election_date
          })
          .eq('id', existingElectorate.id)
          .select()
          .single();

        if (updateError) {
          return { success: false, error: updateError.message };
        }

        return { success: true, electorate: updatedElectorate };
      }

      // Insert new electorate
      const { data: newElectorate, error: insertError } = await supabase
        .from('electorates')
        .insert([electorateData])
        .select()
        .single();

      if (insertError) {
        return { success: false, error: insertError.message };
      }

      return { success: true, electorate: newElectorate };
    } catch (error) {
      return { success: false, error: 'Failed to upsert electorate' };
    }
  }

  /**
   * Insert MP record
   */
  private static async insertMP(mpData: {
    first_name: string;
    last_name: string;
    party_id: string;
    electorate_id: string;
    start_date: string;
  }): Promise<{ success: boolean; mp?: MP; error?: string }> {
    try {
      const { data: newMP, error } = await supabase
        .from('mps')
        .insert([mpData])
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, mp: newMP };
    } catch (error) {
      return { success: false, error: 'Failed to insert MP' };
    }
  }

  /**
   * Update electorate's current member
   */
  private static async updateElectorateCurrentMember(electorateId: string, mpId: string): Promise<void> {
    try {
      await supabase
        .from('electorates')
        .update({ current_member_id: mpId })
        .eq('id', electorateId);
    } catch (error) {
      console.error('Failed to update electorate current member:', error);
    }
  }

  /**
   * Generate short name from full party name
   */
  private static generateShortName(fullName: string): string {
    const shortNames: { [key: string]: string } = {
      'Australian Labor Party': 'ALP',
      'Labor Party': 'ALP',
      'Liberal National Party': 'LNP',
      'Liberal Party': 'LIB',
      'The Greens': 'GRN',
      'Australian Greens': 'GRN',
      'One Nation': 'ON',
      'Pauline Hanson\'s One Nation': 'PHON',
      'Katter\'s Australian Party': 'KAP',
      'Independent': 'IND'
    };

    return shortNames[fullName] || fullName.split(' ').map(word => word[0]).join('').toUpperCase();
  }

  /**
   * Get all members with full details (joined across tables) - FILTERED BY STATE
   * Updated to include vote counts
   */
  static async getMembers(stateId: string): Promise<{ data: MemberWithDetails[]; error?: string }> {
    if (!isSupabaseConfigured()) {
      return { data: [], error: 'Supabase not configured' };
    }

    try {
      const { data, error } = await supabase
        .from('mps')
        .select(`
          *,
          parties:party_id (
            id,
            name,
            short_name,
            color,
            hex_code
          ),
          electorates:electorate_id!inner (
            id,
            name,
            type,
            current_member_id,
            total_votes_cast,
            swing_at_last_election,
            last_election_date,
            next_election_date,
            previous_margin_percentage,
            current_margin_votes,
            current_margin_percentage,
            winner_two_party_preferred_percent,
            loser_two_party_preferred_percent,
            winner_two_party_preferred_votes,
            loser_two_party_preferred_votes,
            states:state_id!inner (
              id,
              name,
              code
            )
          )
        `)
        .eq('electorates.state_id', stateId)
        .eq('electorates.type', 'state')
        .order('created_at', { ascending: false });

      if (error) {
        return { data: [], error: error.message };
      }

      // Transform the joined data into MemberWithDetails format
      const transformedData: MemberWithDetails[] = (data || []).map((mp: any) => ({
        id: mp.id,
        first_name: mp.first_name,
        last_name: mp.last_name,
        full_name: `${mp.first_name} ${mp.last_name}`,
        party_name: mp.parties?.name || 'Unknown',
        party_short_name: mp.parties?.short_name || 'UNK',
        party_color: mp.parties?.color,
        party_hex_code: mp.parties?.hex_code,
        electorate_name: mp.electorates?.name || 'Unknown',
        state_name: mp.electorates?.states?.name || 'Unknown',
        state_code: mp.electorates?.states?.code || 'UNK',
        total_votes_cast: mp.electorates?.total_votes_cast || 0,
        current_margin_votes: mp.electorates?.current_margin_votes || 0,
        current_margin_percentage: mp.electorates?.current_margin_percentage || 0,
        winner_two_party_preferred_percent: mp.electorates?.winner_two_party_preferred_percent || 0,
        loser_two_party_preferred_percent: mp.electorates?.loser_two_party_preferred_percent || 0,
        winner_two_party_preferred_votes: mp.electorates?.winner_two_party_preferred_votes || 0,
        loser_two_party_preferred_votes: mp.electorates?.loser_two_party_preferred_votes || 0,
        previous_margin_percentage: mp.electorates?.previous_margin_percentage || 0,
        swing_percentage: mp.electorates?.swing_at_last_election || 0,
        source_url: '', // Would need to be stored separately if needed
        scraped_at: mp.created_at || '',
        start_date: mp.start_date,
        end_date: mp.end_date,
        created_at: mp.created_at
      }));

      return { data: transformedData };
    } catch (error) {
      return { data: [], error: 'Failed to fetch data from database' };
    }
  }

  /**
   * Clear all MP data for a specific state (and related records)
   */
  static async clearMembers(stateId: string): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Supabase not configured' };
    }

    try {
      // Get all electorates for this state
      const { data: electorates, error: electoratesError } = await supabase
        .from('electorates')
        .select('id')
        .eq('state_id', stateId);

      if (electoratesError) {
        return { success: false, error: electoratesError.message };
      }

      const electorateIds = electorates?.map(e => e.id) || [];

      if (electorateIds.length > 0) {
        // Clear MPs for this state's electorates
        const { error: mpError } = await supabase
          .from('mps')
          .delete()
          .in('electorate_id', electorateIds);

        if (mpError) {
          return { success: false, error: mpError.message };
        }

        // Clear electorates current_member_id references for this state
        const { error: electorateError } = await supabase
          .from('electorates')
          .update({ current_member_id: null })
          .eq('state_id', stateId)
          .not('current_member_id', 'is', null);

        if (electorateError) {
          console.warn('Failed to clear electorate current member references:', electorateError);
        }
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: 'Failed to clear database' };
    }
  }

  // Legacy method for backward compatibility
  static async insertMembers(members: any[]): Promise<{ success: boolean; error?: string }> {
    // Convert legacy format to new format
    const scrapedData: ScrapedMemberData[] = members.map(member => ({
      first_name: member.first_name,
      last_name: member.last_name,
      party_name: member.party,
      electorate_name: member.electorate,
      total_votes_cast: member.margin_votes || 0, // Legacy mapping
      current_margin_votes: member.margin_votes || 0,
      current_margin_percentage: member.margin_percentage || 0,
      winner_two_party_preferred_percent: 0, // Not available in legacy format
      loser_two_party_preferred_percent: 0, // Not available in legacy format
      winner_two_party_preferred_votes: 0, // Not available in legacy format
      loser_two_party_preferred_votes: 0, // Not available in legacy format
      previous_margin_percentage: 0, // Not available in legacy format
      swing_percentage: member.swing_percentage || 0,
      source_url: member.source_url || '',
      scraped_at: member.scraped_at || new Date().toISOString()
    }));

    const result = await this.processAndInsertScrapedData(
      scrapedData, 
      '34e083cf-a179-4536-a934-86692f14609d', // Default to Queensland
      '2024-10-26' // Default election date
    );
    return { success: result.success, error: result.error };
  }
}