import React from 'react';
import { Shield, Lock, Database } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children, fallback }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading authentication...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return fallback || (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="text-center max-w-md mx-auto">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-amber-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Authentication Required
          </h3>
          <p className="text-gray-600 mb-6">
            You need to be signed in to access the parliamentary scraper and manage election data. 
            This ensures secure access to database operations.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-3">
              <Database className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="text-left">
                <h4 className="font-medium text-blue-900 mb-1">Why Authentication?</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Secure database operations with Row Level Security</li>
                  <li>• Prevent unauthorized data modifications</li>
                  <li>• Track data changes and maintain audit trails</li>
                </ul>
              </div>
            </div>
          </div>
          <p className="text-sm text-gray-500">
            Click the "Sign In" button in the top right corner to get started.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};