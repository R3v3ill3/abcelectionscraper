import React, { useState } from 'react';
import { Database, Download, RefreshCw, Eye, LogIn } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { UserMenu } from './UserMenu';
import { AuthModal } from './AuthModal';

interface HeaderProps {
  onScrape: () => void;
  onExport: () => void;
  isScraping: boolean;
  totalRecords: number;
  isReviewPending?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ 
  onScrape, 
  onExport, 
  isScraping, 
  totalRecords, 
  isReviewPending = false 
}) => {
  const { user } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  return (
    <>
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-12 h-12 bg-blue-600 rounded-xl">
                <Database className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Parliamentary Scraper</h1>
                <p className="text-sm text-gray-600">Australian Election Data Tool</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-right hidden sm:block">
                <p className="text-2xl font-bold text-gray-900">{totalRecords.toLocaleString()}</p>
                <p className="text-sm text-gray-600">
                  {isReviewPending ? 'Records for Review' : 'Total Records'}
                </p>
              </div>
              
              {isReviewPending && (
                <div className="flex items-center space-x-2 px-3 py-2 bg-amber-100 border border-amber-300 rounded-lg">
                  <Eye className="w-4 h-4 text-amber-600" />
                  <span className="text-sm font-medium text-amber-800">Review Mode</span>
                </div>
              )}
              
              <div className="flex space-x-3">
                <button
                  onClick={onExport}
                  disabled={totalRecords === 0}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export {isReviewPending ? 'Preview' : 'Data'}
                </button>
                
                <button
                  onClick={onScrape}
                  disabled={isScraping || isReviewPending || !user}
                  className="inline-flex items-center px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title={!user ? 'Sign in to start scraping' : ''}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${isScraping ? 'animate-spin' : ''}`} />
                  {isScraping ? 'Scraping...' : 'Start Scrape'}
                </button>
              </div>

              {/* Authentication Section */}
              {user ? (
                <UserMenu />
              ) : (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="inline-flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-colors"
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  Sign In
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
      />
    </>
  );
};