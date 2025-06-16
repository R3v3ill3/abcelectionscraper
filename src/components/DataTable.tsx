import React, { useState } from 'react';
import { MemberWithDetails, StateOption } from '../types/parliament';
import { Search, ArrowUpDown, ExternalLink, Eye } from 'lucide-react';

interface DataTableProps {
  members: MemberWithDetails[];
  isLoading: boolean;
  isReviewMode?: boolean;
  selectedState: StateOption;
}

type SortField = keyof MemberWithDetails;
type SortDirection = 'asc' | 'desc';

export const DataTable: React.FC<DataTableProps> = ({ 
  members, 
  isLoading, 
  isReviewMode = false,
  selectedState
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('current_margin_percentage');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const filteredAndSortedMembers = React.useMemo(() => {
    let filtered = members.filter(member =>
      member.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.party_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.party_short_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.electorate_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    filtered.sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' 
          ? aValue - bValue
          : bValue - aValue;
      }
      
      return 0;
    });

    return filtered;
  }, [members, searchTerm, sortField, sortDirection]);

  const formatSwing = (swing: number) => {
    const sign = swing >= 0 ? '+' : '';
    return `${sign}${swing.toFixed(1)}%`;
  };

  const getSwingColor = (swing: number) => {
    if (swing > 0) return 'text-emerald-600';
    if (swing < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getPartyColor = (hexCode?: string) => {
    if (hexCode) {
      return { backgroundColor: hexCode, color: '#fff' };
    }
    return {};
  };

  const formatVotes = (votes: number) => {
    return votes.toLocaleString();
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-4 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div className="flex items-center space-x-3">
            <h2 className="text-xl font-semibold text-gray-900">
              {selectedState.name} State MPs ({members.length})
            </h2>
            {isReviewMode && (
              <div className="flex items-center space-x-2 px-2 py-1 bg-amber-100 border border-amber-300 rounded-md">
                <Eye className="w-3 h-3 text-amber-600" />
                <span className="text-xs font-medium text-amber-800">Preview Data</span>
              </div>
            )}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search members, parties, or electorates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[300px]"
            />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('full_name')}
              >
                <div className="flex items-center space-x-1">
                  <span>Name</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('party_name')}
              >
                <div className="flex items-center space-x-1">
                  <span>Party</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('electorate_name')}
              >
                <div className="flex items-center space-x-1">
                  <span>Electorate</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('total_votes_cast')}
              >
                <div className="flex items-center space-x-1">
                  <span>Total Votes</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('current_margin_votes')}
              >
                <div className="flex items-center space-x-1">
                  <span>Margin (Votes)</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('current_margin_percentage')}
              >
                <div className="flex items-center space-x-1">
                  <span>Margin (%)</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('winner_two_party_preferred_percent')}
              >
                <div className="flex items-center space-x-1">
                  <span>Winner TPP</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('winner_two_party_preferred_votes')}
              >
                <div className="flex items-center space-x-1">
                  <span>Winner Votes</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('loser_two_party_preferred_votes')}
              >
                <div className="flex items-center space-x-1">
                  <span>Loser Votes</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('swing_percentage')}
              >
                <div className="flex items-center space-x-1">
                  <span>Swing</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              {isReviewMode && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Source
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredAndSortedMembers.map((member, index) => (
              <tr key={member.id || index} className={`hover:bg-gray-50 transition-colors ${isReviewMode ? 'bg-amber-50' : ''}`}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="font-medium text-gray-900">{member.full_name}</div>
                  <div className="text-sm text-gray-500">
                    {member.first_name} {member.last_name}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span 
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                    style={member.party_hex_code ? getPartyColor(member.party_hex_code) : {}}
                  >
                    {member.party_hex_code ? (
                      <span className="text-white">{member.party_short_name}</span>
                    ) : (
                      <span className="bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full">
                        {member.party_short_name}
                      </span>
                    )}
                  </span>
                  <div className="text-xs text-gray-500 mt-1">{member.party_name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{member.electorate_name}</div>
                  <div className="text-xs text-gray-500">{member.state_name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {formatVotes(member.total_votes_cast)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {formatVotes(member.current_margin_votes)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {member.current_margin_percentage.toFixed(1)}%
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {member.winner_two_party_preferred_percent.toFixed(1)}%
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-emerald-600">
                  {formatVotes(member.winner_two_party_preferred_votes)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-600">
                  {formatVotes(member.loser_two_party_preferred_votes)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <span className={getSwingColor(member.swing_percentage)}>
                    {formatSwing(member.swing_percentage)}
                  </span>
                </td>
                {isReviewMode && (
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {member.source_url && (
                      <a
                        href={member.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredAndSortedMembers.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <p className="text-gray-500">No {selectedState.name} MPs found.</p>
          {searchTerm && (
            <p className="text-sm text-gray-400 mt-1">
              Try adjusting your search term.
            </p>
          )}
        </div>
      )}
    </div>
  );
};