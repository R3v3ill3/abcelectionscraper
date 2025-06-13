import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase environment variables not found. Please configure your .env file.');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);

export const isSupabaseConfigured = () => {
  const hasValidUrl = Boolean(supabaseUrl && 
    supabaseUrl !== 'https://placeholder.supabase.co' && 
    supabaseUrl.includes('supabase.co'));
  
  const hasValidKey = Boolean(supabaseAnonKey && 
    supabaseAnonKey !== 'placeholder-key' && 
    supabaseAnonKey.length > 20);
  
  return hasValidUrl && hasValidKey;
};

// Helper function to get configuration status for debugging
export const getSupabaseConfigStatus = () => {
  return {
    url: supabaseUrl ? 'Set' : 'Missing',
    key: supabaseAnonKey ? 'Set' : 'Missing',
    isConfigured: isSupabaseConfigured()
  };
};