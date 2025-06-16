import React from 'react';
import { AlertTriangle, CheckCircle, Settings, ExternalLink, Save, X, Eye, Shield } from 'lucide-react';
import { isSupabaseConfigured } from '../lib/supabase';
import { ScrapedMemberData, StateOption } from '../types/parliament';
import { useAuth } from '../contexts/AuthContext';

interface ConfigurationPanelProps {
  onClearDatabase: () => void;
  isClearing: boolean;
  scrapedDataForReview: ScrapedMemberData[] | null;
  onSaveReviewedData: () => void;
  onCancelReview: () => void;
  selectedStateOption: StateOption;
}

export const ConfigurationPanel: React.FC<ConfigurationPanelProps> = ({ 
  onClearDatabase, 
  isClearing,
  scrapedDataForReview,
  onSaveReviewedData,
  onCancelReview,
  selectedStateOption
}) => {
  const supabaseConfigured = isSupabaseConfigured();
  const isReviewMode = scrapedDataForReview !== null;
  const { user } = useAuth();

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center space-x-3 mb-6">
        <Settings className="w-5 h-5 text-gray-600" />
        <h2 className="text-lg font-semibold text-gray-900">Configuration</h2>
      </div>

      <div className="space-y-6">
        {/* Authentication Status */}
        <div className="flex items-start space-x-3">
          {user ? (
            <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5" />
          ) : (
            <Shield className="w-5 h-5 text-amber-500 mt-0.5" />
          )}
          <div className="flex-1">
            <h3 className="font-medium text-gray-900">Authentication</h3>
            <p className="text-sm text-gray-600 mt-1">
              {user 
                ? `Signed in as ${user.email}`
                : 'Not authenticated'
              }
            </p>
            {!user && (
              <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800">
                  Sign in to access scraping and database operations. This ensures secure access 
                  with proper Row Level Security policies.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Review Mode Status */}
        {isReviewMode && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start space-x-3">
              <Eye className="w-5 h-5 text-amber-500 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-medium text-amber-900">Data Review Mode</h3>
                <p className="text-sm text-amber-800 mt-1">
                  {scrapedDataForReview.length} records from {selectedStateOption.name} are ready for review. 
                  Please examine the data in the table above before saving to the database.
                </p>
                <div className="flex space-x-3 mt-4">
                  <button
                    onClick={onSaveReviewedData}
                    disabled={!user}
                    className="inline-flex items-center px-3 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 text-white text-sm font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-colors"
                    title={!user ? 'Sign in to save data' : ''}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save to Database
                  </button>
                  <button
                    onClick={onCancelReview}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel Review
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Supabase Status */}
        <div className="flex items-start space-x-3">
          {supabaseConfigured ? (
            <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5" />
          )}
          <div className="flex-1">
            <h3 className="font-medium text-gray-900">Database Connection</h3>
            <p className="text-sm text-gray-600 mt-1">
              {supabaseConfigured 
                ? 'Connected to Supabase database'
                : 'Supabase database not configured'
              }
            </p>
            {!supabaseConfigured && (
              <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800">
                  To connect your Supabase database, click the "Connect to Supabase" button in the top right corner,
                  then run the database migration to create the required table.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Data Sources */}
        <div>
          <h3 className="font-medium text-gray-900 mb-3">Data Sources</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">ABC News {selectedStateOption.name} Elections</p>
                <p className="text-sm text-gray-600">{selectedStateOption.name} {selectedStateOption.electionYear} election results</p>
              </div>
              <a
                href={`https://www.abc.net.au/news/elections/${selectedStateOption.code}/${selectedStateOption.electionYear}/results`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>

        {/* Database Actions */}
        {supabaseConfigured && (
          <div className="pt-6 border-t border-gray-200">
            <h3 className="font-medium text-gray-900 mb-3">Database Actions</h3>
            <button
              onClick={onClearDatabase}
              disabled={isClearing || isReviewMode || !user}
              className="inline-flex items-center px-4 py-2 border border-red-300 rounded-lg text-sm font-medium text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title={!user ? 'Sign in to clear data' : ''}
            >
              {isClearing ? 'Clearing...' : `Clear ${selectedStateOption.name} Data`}
            </button>
            <p className="text-xs text-gray-500 mt-2">
              {!user 
                ? 'Sign in to access database management features.'
                : isReviewMode 
                  ? 'Complete or cancel the review process before clearing data.'
                  : `This will permanently delete all scraped data for ${selectedStateOption.name} from the database.`
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
};