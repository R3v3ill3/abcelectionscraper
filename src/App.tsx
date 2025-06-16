import React, { useState } from 'react';
import { Header } from './components/Header';
import { ProgressBar } from './components/ProgressBar';
import { DataTable } from './components/DataTable';
import { ConfigurationPanel } from './components/ConfigurationPanel';
import { AuthGuard } from './components/AuthGuard';
import { AuthProvider } from './contexts/AuthContext';
import { useParliamentaryData } from './hooks/useParliamentaryData';

function AppContent() {
  const [isClearing, setIsClearing] = useState(false);
  const { 
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
    exportData 
  } = useParliamentaryData();

  const handleClearDatabase = async () => {
    setIsClearing(true);
    try {
      const result = await clearDatabase();
      if (!result.success) {
        alert(`Failed to clear database: ${result.error}`);
      }
    } catch (error) {
      alert('Failed to clear database');
    } finally {
      setIsClearing(false);
    }
  };

  const handleSaveReviewedData = async () => {
    const result = await saveReviewedDataToDatabase();
    if (!result.success) {
      alert(`Failed to save data: ${result.error}`);
    }
  };

  const isScraping = progress.status === 'scraping' || progress.status === 'processing';
  const isReviewPending = progress.status === 'review_pending';

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        onScrape={startScraping}
        onExport={exportData}
        isScraping={isScraping}
        totalRecords={members.length}
        isReviewPending={isReviewPending}
        selectedStateOption={selectedStateOption}
        onStateChange={setSelectedStateOption}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-3 space-y-8">
            <ProgressBar progress={progress} />
            
            {/* Wrap data operations in AuthGuard */}
            <AuthGuard>
              <DataTable 
                members={members} 
                isLoading={isLoading} 
                isReviewMode={isReviewPending}
                selectedState={selectedStateOption}
              />
            </AuthGuard>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <ConfigurationPanel
              onClearDatabase={handleClearDatabase}
              isClearing={isClearing}
              scrapedDataForReview={scrapedDataForReview}
              onSaveReviewedData={handleSaveReviewedData}
              onCancelReview={cancelReview}
              selectedStateOption={selectedStateOption}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;