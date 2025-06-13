import React from 'react';
import { ScrapingProgress } from '../types/parliament';
import { AlertCircle, CheckCircle, Clock, Zap, Eye } from 'lucide-react';

interface ProgressBarProps {
  progress: ScrapingProgress;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ progress }) => {
  const getStatusIcon = () => {
    switch (progress.status) {
      case 'scraping':
        return <Zap className="w-5 h-5 text-blue-500 animate-pulse" />;
      case 'processing':
        return <Clock className="w-5 h-5 text-amber-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-emerald-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'review_pending':
        return <Eye className="w-5 h-5 text-amber-500 animate-pulse" />;
      default:
        return null;
    }
  };

  const getStatusColor = () => {
    switch (progress.status) {
      case 'scraping':
        return 'bg-blue-500';
      case 'processing':
        return 'bg-amber-500';
      case 'completed':
        return 'bg-emerald-500';
      case 'error':
        return 'bg-red-500';
      case 'review_pending':
        return 'bg-amber-500';
      default:
        return 'bg-gray-300';
    }
  };

  const getStatusTitle = () => {
    switch (progress.status) {
      case 'scraping':
        return 'Scraping Data';
      case 'processing':
        return 'Processing Results';
      case 'completed':
        return 'Scraping Complete';
      case 'error':
        return 'Scraping Failed';
      case 'review_pending':
        return 'Data Ready for Review';
      default:
        return '';
    }
  };

  const percentage = progress.total > 0 ? (progress.current / progress.total) * 100 : 0;

  if (progress.status === 'idle') {
    return null;
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${progress.status === 'review_pending' ? 'border-amber-300 bg-amber-50' : ''}`}>
      <div className="flex items-center space-x-3 mb-4">
        {getStatusIcon()}
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {getStatusTitle()}
          </h3>
          <p className="text-sm text-gray-600">{progress.message}</p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Progress</span>
          <span className="font-medium text-gray-900">
            {progress.current} of {progress.total}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${getStatusColor()}`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
        <div className="text-right">
          <span className="text-sm font-medium text-gray-900">
            {Math.round(percentage)}%
          </span>
        </div>
      </div>

      {progress.status === 'review_pending' && (
        <div className="mt-4 p-3 bg-amber-100 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-800 font-medium">
            Please review the scraped data in the table below before saving to the database.
          </p>
        </div>
      )}
    </div>
  );
};