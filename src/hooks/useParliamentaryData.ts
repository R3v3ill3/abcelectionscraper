import { useState, useEffect } from 'react';
import { MemberWithDetails, ScrapingProgress, ScrapedMemberData, StateOption } from '../types/parliament';
import { ScraperService } from '../services/scraper';
import { DatabaseService } from '../services/database';

// Available state options for scraping
export const STATE_OPTIONS: StateOption[] = [
  {
    id: '34e083cf-a179-4536-a934-86692f14609d', // Queensland UUID from database
    name: 'Queensland',
    code: 'qld',
    electionYear: '2024',
    electionDate: '2024-10-26'
  },
  {
    id: '5c397f74-047c-4548-a97e-757b168715ab', // Western Australia UUID from database
    name: 'Western Australia',
    code: 'wa',
    electionYear: '2025',
    electionDate: '2025-03-08'
  }
];

export const useParliamentaryData = () => {
  const [members, setMembers] = useState<MemberWithDetails[]>([]);
  const [scrapedDataForReview, setScrapedDataForReview] = useState<ScrapedMemberData[] | null>(null);
  const [selectedStateOption, setSelectedStateOption] = useState<StateOption>(STATE_OPTIONS[0]); // Default to Queensland
  const [progress, setProgress] = useState<ScrapingProgress>({
    current: 0,
    total: 0,
    status: 'idle',
    message: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  const loadExistingData = async () => {
    setIsLoading(true);
    try {
      const { data } = await DatabaseService.getMembers(selectedStateOption.id);
      setMembers(data);
    } catch (error) {
      console.error('Failed to load existing data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const startScraping = async () => {
    setProgress({
      current: 0,
      total: 3,
      status: 'scraping',
      message: `Initializing scraping process for ${selectedStateOption.name}...`
    });

    try {
      // Step 1: Scrape ABC News for selected state
      setProgress(prev => ({
        ...prev,
        current: 1,
        message: `Scraping ABC News ${selectedStateOption.name} ${selectedStateOption.electionYear} Election Results...`
      }));

      // Step 2: Process data
      setProgress(prev => ({
        ...prev,
        current: 2,
        message: 'Processing and combining results...'
      }));

      // Get all data for the selected state
      setProgress(prev => ({
        ...prev,
        status: 'processing',
        message: 'Processing and combining results...'
      }));

      const result = await ScraperService.scrapeElections(selectedStateOption.code, selectedStateOption.electionYear);

      if (result.success) {
        // Convert scraped data to display format for review with new schema including vote counts
        const reviewData: MemberWithDetails[] = result.data.map((member, index) => ({
          id: `temp-${index}`, // Temporary ID for display
          first_name: member.first_name,
          last_name: member.last_name,
          full_name: `${member.first_name} ${member.last_name}`,
          party_name: member.party_name,
          party_short_name: member.party_short_name || 'UNK',
          party_color: undefined,
          party_hex_code: undefined,
          electorate_name: member.electorate_name,
          state_name: selectedStateOption.name,
          state_code: selectedStateOption.code.toUpperCase(),
          total_votes_cast: member.total_votes_cast,
          current_margin_votes: member.current_margin_votes,
          current_margin_percentage: member.current_margin_percentage,
          winner_two_party_preferred_percent: member.winner_two_party_preferred_percent,
          loser_two_party_preferred_percent: member.loser_two_party_preferred_percent,
          winner_two_party_preferred_votes: member.winner_two_party_preferred_votes,
          loser_two_party_preferred_votes: member.loser_two_party_preferred_votes,
          previous_margin_percentage: member.previous_margin_percentage,
          swing_percentage: member.swing_percentage,
          source_url: member.source_url,
          scraped_at: member.scraped_at,
          start_date: selectedStateOption.electionDate,
          end_date: undefined,
          created_at: member.scraped_at
        }));

        // Set data for review instead of saving directly
        setScrapedDataForReview(result.data);
        setMembers(reviewData); // Display scraped data in table for review
        
        setProgress({
          current: 3,
          total: 3,
          status: 'review_pending',
          message: `Found ${result.totalFound} members from ${selectedStateOption.name}. Please review the data before saving to database.`
        });
      } else {
        setProgress({
          current: 2,
          total: 3,
          status: 'error',
          message: `Scraping failed: ${result.errors.join(', ')}`
        });
      }
    } catch (error) {
      setProgress({
        current: 0,
        total: 3,
        status: 'error',
        message: `Unexpected error: ${error}`
      });
    }
  };

  const saveReviewedDataToDatabase = async () => {
    if (!scrapedDataForReview) return { success: false, error: 'No data to save' };

    setProgress(prev => ({
      ...prev,
      status: 'processing',
      message: 'Saving reviewed data to database...'
    }));

    try {
      const dbResult = await DatabaseService.processAndInsertScrapedData(
        scrapedDataForReview, 
        selectedStateOption.id, 
        selectedStateOption.electionDate
      );
      
      if (dbResult.success) {
        // Clear review data and reload from database
        setScrapedDataForReview(null);
        await loadExistingData();
        
        setProgress({
          current: 3,
          total: 3,
          status: 'completed',
          message: `Successfully saved ${dbResult.insertedCount || 0} of ${scrapedDataForReview.length} members to database`
        });

        return { success: true };
      } else {
        setProgress({
          current: 3,
          total: 3,
          status: 'error',
          message: `Database save failed: ${dbResult.error}`
        });

        return { success: false, error: dbResult.error };
      }
    } catch (error) {
      setProgress({
        current: 3,
        total: 3,
        status: 'error',
        message: `Unexpected error saving to database: ${error}`
      });

      return { success: false, error: 'Failed to save to database' };
    }
  };

  const cancelReview = async () => {
    setScrapedDataForReview(null);
    setProgress({
      current: 0,
      total: 0,
      status: 'idle',
      message: ''
    });
    
    // Reload existing data from database
    await loadExistingData();
  };

  const clearDatabase = async () => {
    try {
      const result = await DatabaseService.clearMembers(selectedStateOption.id);
      if (result.success) {
        setMembers([]);
        return { success: true };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      return { success: false, error: 'Failed to clear database' };
    }
  };

  const exportData = () => {
    const dataToExport = scrapedDataForReview ? 
      // Export scraped data if in review mode with new schema including vote counts
      scrapedDataForReview.map(member => ({
        first_name: member.first_name,
        last_name: member.last_name,
        full_name: `${member.first_name} ${member.last_name}`,
        party_name: member.party_name,
        party_short_name: member.party_short_name || 'UNK',
        electorate_name: member.electorate_name,
        state_name: selectedStateOption.name,
        total_votes_cast: member.total_votes_cast,
        current_margin_votes: member.current_margin_votes,
        current_margin_percentage: member.current_margin_percentage,
        winner_two_party_preferred_percent: member.winner_two_party_preferred_percent,
        loser_two_party_preferred_percent: member.loser_two_party_preferred_percent,
        winner_two_party_preferred_votes: member.winner_two_party_preferred_votes,
        loser_two_party_preferred_votes: member.loser_two_party_preferred_votes,
        previous_margin_percentage: member.previous_margin_percentage,
        swing_percentage: member.swing_percentage,
        source_url: member.source_url,
        scraped_at: member.scraped_at
      })) :
      // Export database data if not in review mode
      members;

    if (dataToExport.length === 0) return;

    const csv = [
      // Headers with new schema including vote counts
      'First Name,Last Name,Full Name,Party,Party Short Name,Electorate,State,Total Votes Cast,Current Margin Votes,Current Margin %,Winner TPP %,Loser TPP %,Winner TPP Votes,Loser TPP Votes,Previous Margin %,Swing %,Source URL,Scraped At',
      // Data rows
      ...dataToExport.map(member => 
        `"${member.first_name}","${member.last_name}","${member.full_name || `${member.first_name} ${member.last_name}`}","${member.party_name}","${member.party_short_name}","${member.electorate_name}","${member.state_name || selectedStateOption.name}",${member.total_votes_cast || 0},${member.current_margin_votes || 0},${member.current_margin_percentage || 0},${member.winner_two_party_preferred_percent || 0},${member.loser_two_party_preferred_percent || 0},${member.winner_two_party_preferred_votes || 0},${member.loser_two_party_preferred_votes || 0},${member.previous_margin_percentage || 0},${member.swing_percentage || 0},"${member.source_url || ''}","${member.scraped_at}"`
      )
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedStateOption.code}-mps-${scrapedDataForReview ? 'scraped' : 'database'}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Reload data when selected state changes
  useEffect(() => {
    loadExistingData();
  }, [selectedStateOption.id]);

  return {
    members,
    scrapedDataForReview,
    selectedStateOption,
    setSelectedStateOption,
    progress,
    isLoading,
    startScraping,
    saveReviewedDataToDatabase,
    cancelReview,
    clearDatabase,
    exportData,
    refreshData: loadExistingData
  };
};