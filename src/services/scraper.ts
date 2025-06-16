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
          '1. Connected to Supabase using the "Connect to Supabase" button',
          '2. Verified your Supabase project has the edge function deployed',
          '3. Checked that your environment variables are properly set'
        ],
        totalFound: 0
      };
    }

    try {
      const urls = [
        'https://www.abc.net.au/news/elections/qld/2024/results?sortBy=latest&filter=all&selectedRegion=all&selectedParty=all&partyWonBy=all&partyHeldBy=all',
        'https://results.elections.qld.gov.au/SGE2024'
      ];

      console.log('Calling Supabase Edge Function: scrape-election-data');
      console.log('Function URL:', `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/scrape-election-data`);

      // Add timeout and better error handling for the edge function call
      const { data, error } = await Promise.race([
        supabase.functions.invoke('scrape-election-data', {
          body: { urls }
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout after 45 seconds')), 45000)
        )
      ]) as any;

      if (error) {
        console.error('Edge function error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        
        // Provide more specific error messages based on error type
        let errorMessage = `Edge function error: ${error.message}`;
        
        if (error.message?.includes('Failed to fetch') || error.message?.includes('fetch')) {
          errorMessage = 'Unable to connect to Supabase Edge Function. This could mean:\n' +
                        '1. The edge function is not deployed to your Supabase project\n' +
                        '2. Your internet connection is unstable\n' +
                        '3. Your Supabase configuration is incorrect';
        } else if (error.message?.includes('Function not found') || error.code === 'FunctionsRelayError') {
          errorMessage = 'The "scrape-election-data" edge function was not found. This means:\n' +
                        '1. The function may not be deployed to your Supabase project\n' +
                        '2. The function name might be incorrect\n' +
                        '3. There may be a deployment issue with the function';
        } else if (error.message?.includes('Unauthorized') || error.code === 'PGRST301') {
          errorMessage = 'Unauthorized access to edge function. Please check:\n' +
                        '1. Your Supabase anon key is correct\n' +
                        '2. The edge function has proper permissions\n' +
                        '3. Your Supabase project settings';
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
          errors: ['No data returned from edge function - this may indicate the function executed but returned empty results'],
          totalFound: 0
        };
      }

      console.log(`Edge function returned successfully with ${data.totalFound || 0} members`);

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
          errorMessage = 'Network error: Unable to connect to Supabase Edge Function. This suggests:\n' +
                        '1. The edge function may not be deployed\n' +
                        '2. Network connectivity issues\n' +
                        '3. Supabase service may be temporarily unavailable';
        } else if (error.message.includes('Request timeout')) {
          errorMessage = 'Request timeout: The edge function took too long to respond (>45 seconds). This could mean:\n' +
                        '1. The scraping process is taking longer than expected\n' +
                        '2. The edge function may be experiencing issues\n' +
                        '3. Network latency problems';
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