import { ScrapedMemberData, ScrapingResult } from '../types/parliament';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export class ScraperService {
  static async scrapeAllSources(): Promise<ScrapingResult> {
    // Check if Supabase is properly configured
    if (!isSupabaseConfigured()) {
      console.warn('Supabase not configured properly');
      return {
        success: false,
        data: [],
        errors: [
          'Supabase is not configured properly. Please ensure you have:',
          '1. Created a .env file in your project root',
          '2. Added your VITE_SUPABASE_URL from your Supabase project settings',
          '3. Added your VITE_SUPABASE_ANON_KEY from your Supabase project settings',
          '4. Restarted your development server after adding the .env file'
        ],
        totalFound: 0
      };
    }

    try {
      const urls = [
        'https://www.abc.net.au/news/elections/qld/2024/results?sortBy=latest&filter=all&selectedRegion=all&selectedParty=all&partyWonBy=all&partyHeldBy=all',
        'https://results.elections.qld.gov.au/SGE2024'
      ];

      console.log('Calling Supabase Edge Function for scraping...');

      // Add timeout and better error handling for the edge function call
      const { data, error } = await Promise.race([
        supabase.functions.invoke('scrape-election-data', {
          body: { urls }
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout after 30 seconds')), 30000)
        )
      ]) as any;

      if (error) {
        console.error('Edge function error:', error);
        
        // Provide more specific error messages based on error type
        let errorMessage = `Edge function error: ${error.message}`;
        
        if (error.message?.includes('Failed to fetch') || error.message?.includes('fetch')) {
          errorMessage = 'Unable to connect to Supabase. Please check your internet connection and Supabase configuration.';
        } else if (error.message?.includes('Function not found')) {
          errorMessage = 'The scrape-election-data edge function was not found. Please ensure it is deployed to your Supabase project.';
        } else if (error.message?.includes('Unauthorized')) {
          errorMessage = 'Unauthorized access to edge function. Please check your Supabase anon key.';
        }
        
        return {
          success: false,
          data: [],
          errors: [errorMessage],
          totalFound: 0
        };
      }

      if (!data) {
        return {
          success: false,
          data: [],
          errors: ['No data returned from edge function'],
          totalFound: 0
        };
      }

      console.log(`Edge function returned ${data.totalFound} members`);

      return {
        success: data.success,
        data: data.data || [],
        errors: data.errors || [],
        totalFound: data.totalFound || 0
      };

    } catch (error) {
      console.error('Scraping service error:', error);
      
      let errorMessage = `Scraping service error: ${error}`;
      
      // Handle specific error types
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch')) {
          errorMessage = 'Network error: Unable to connect to Supabase. Please check your internet connection and ensure your Supabase URL and keys are correct.';
        } else if (error.message.includes('Request timeout')) {
          errorMessage = 'Request timeout: The edge function took too long to respond. Please try again.';
        } else {
          errorMessage = `Error: ${error.message}`;
        }
      }
      
      return {
        success: false,
        data: [],
        errors: [errorMessage],
        totalFound: 0
      };
    }
  }

  // Legacy methods for backward compatibility
  static async scrapeABCNews(): Promise<ScrapingResult> {
    return this.scrapeAllSources();
  }

  static async scrapeECQ(): Promise<ScrapingResult> {
    return this.scrapeAllSources();
  }
}