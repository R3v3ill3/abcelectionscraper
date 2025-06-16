import React from 'react';
import { ChevronDown, MapPin } from 'lucide-react';
import { StateOption } from '../types/parliament';

interface StateSelectorProps {
  selectedState: StateOption;
  stateOptions: StateOption[];
  onStateChange: (state: StateOption) => void;
  disabled?: boolean;
}

export const StateSelector: React.FC<StateSelectorProps> = ({
  selectedState,
  stateOptions,
  onStateChange,
  disabled = false
}) => {
  const [isOpen, setIsOpen] = React.useState(false);

  const handleStateSelect = (state: StateOption) => {
    onStateChange(state);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className="flex items-center space-x-2 px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <MapPin className="w-4 h-4 text-gray-500" />
        <div className="text-left">
          <p className="text-sm font-medium text-gray-900">
            {selectedState.name}
          </p>
          <p className="text-xs text-gray-500">
            {selectedState.electionYear} Election
          </p>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && !disabled && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
            <div className="p-2">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide px-2 py-1 mb-1">
                Select State & Election
              </div>
              {stateOptions.map((state) => (
                <button
                  key={state.id}
                  onClick={() => handleStateSelect(state)}
                  className={`w-full flex items-center space-x-3 px-2 py-2 text-left text-sm rounded-md transition-colors ${
                    selectedState.id === state.id
                      ? 'bg-blue-100 text-blue-900'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <div className="flex-1">
                    <p className="font-medium">{state.name}</p>
                    <p className="text-xs text-gray-500">
                      {state.electionYear} Election • {state.code.toUpperCase()}
                    </p>
                  </div>
                  {selectedState.id === state.id && (
                    <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};