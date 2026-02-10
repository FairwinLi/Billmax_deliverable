/**
 * SECONDARY SEARCH PAGE (ADVANCED SEARCH)
 * 
 * This is the advanced search page where users can create complex multi-criteria searches.
 * Think of it as a more powerful version of the primary search page - users can build
 * complex filter rules with AND/OR logic, multiple values per filter, and combine them
 * in sophisticated ways.
 * 
 * KEY DIFFERENCES FROM PRIMARY PAGE:
 * 1. Advanced filters are always visible (not in a side panel)
 * 2. Focus on building complex filter conditions with AND/OR logic
 * 3. Users can add multiple filter rows and combine them
 * 4. Has a dedicated "Search" button to execute searches
 * 5. Simpler interface focused on advanced filtering capabilities
 * 
 * HOW IT WORKS:
 * - Users build filter conditions using the "Where [field] [operator] [value]" format
 * - Multiple conditions can be combined with AND/OR logic
 * - Users can also search in table column headers (like primary page)
 * - Click "Search" button to execute all filters together
 * - Results show accounts matching all the criteria
 */

import React, { useState, useMemo } from 'react';
import { Link } from 'react-router';
import { ChevronDown, X, AlertCircle, Plus } from 'lucide-react';
import { mockAccounts, Account } from '../data/mockData';
import { validateSearchInput, sortAccountsByField, findClosestMatches } from '../utils/searchUtils';
import { AdvancedFilter, SearchFilters, FilterOperator, LogicOperator } from '../types/searchTypes';
import { 
  SEARCHABLE_FIELDS, 
  DEFAULT_SORT_FIELD,
  NUMERIC_OPERATORS,
  DATE_OPERATORS,
  TEXT_OPERATORS
} from '../constants/searchConstants';

/**
 * MAIN COMPONENT
 * 
 * This is the advanced search page component. It focuses on building complex filter
 * conditions that users can combine with AND/OR logic.
 */
export function SecondarySearchPage() {
  /**
   * STATE MANAGEMENT
   * 
   * Similar to primary page, but focused on advanced filters.
   * We track both "current" filters (what user is building) and "executed" filters (what's applied).
   */

  // Sorting and validation
  const [sortBy, setSortBy] = useState<keyof Account>(DEFAULT_SORT_FIELD);  // Which field to sort by
  const [validationError, setValidationError] = useState<string | null>(null);  // Error messages
  const [filterErrors, setFilterErrors] = useState<Record<string, string>>({});  // Filter-specific errors

  // Advanced filters - the complex filter conditions users are building
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilter[]>([
    { id: '1', logic: 'And', field: 'accountNumber', operator: 'is', values: [], inputValue: '' },
  ]);
  const [executedAdvancedFilters, setExecutedAdvancedFilters] = useState<AdvancedFilter[]>([]);  // Applied filters

  const [searchFilters, setSearchFilters] = useState<SearchFilters>({
    accountNumber: '',
    companyName: '',
    contactName: '',
    phoneNumber: '',
    email: '',
    caseSensitive: {
      accountNumber: false,
      companyName: false,
      contactName: false,
      phoneNumber: false,
      email: false,
    },
  });

  const [executedSearchFilters, setExecutedSearchFilters] = useState<SearchFilters>({
    accountNumber: '',
    companyName: '',
    contactName: '',
    phoneNumber: '',
    email: '',
    caseSensitive: {
      accountNumber: false,
      companyName: false,
      contactName: false,
      phoneNumber: false,
      email: false,
    },
  });

  /**
   * HELPER FUNCTIONS
   * 
   * These functions handle user interactions - updating filters, adding/removing conditions, etc.
   */

  /**
   * Updates a search filter when user types in a table header search box.
   */
  const updateSearchFilter = (field: keyof Omit<SearchFilters, 'caseSensitive'>, value: string) => {
    setSearchFilters({ ...searchFilters, [field]: value });
    setValidationError(null);
  };

  /**
   * Toggles case sensitivity for a search field.
   */
  const toggleCaseSensitive = (field: keyof SearchFilters['caseSensitive']) => {
    setSearchFilters({
      ...searchFilters,
      caseSensitive: {
        ...searchFilters.caseSensitive,
        [field]: !searchFilters.caseSensitive[field],
      },
    });
  };

  /**
   * Adds a new advanced filter row.
   * Users can add multiple conditions and combine them.
   * Validates that the last filter has at least one value before allowing a new one to be added.
   */
  const addAdvancedFilter = () => {
    // Check if the last filter has values before allowing a new one
    if (advancedFilters.length > 0) {
      const lastFilter = advancedFilters[advancedFilters.length - 1];
      
      // Validate date filters
      if (lastFilter.field === 'dateAdded') {
        if (lastFilter.values.length === 0) {
          // Show error under the specific filter
          setFilterErrors(prev => ({ ...prev, [lastFilter.id]: 'Date filters must have at least one date value. Please add a date before adding another condition.' }));
          return;
        }
      } else {
        // Validate non-date filters
        if (lastFilter.values.length === 0) {
          // Show error under the specific filter
          setFilterErrors(prev => ({ ...prev, [lastFilter.id]: 'Filters must have at least one value. Please add a value before adding another condition.' }));
          return;
        }
      }
    }
    
    // Clear any filter errors if validation passes
    setFilterErrors(prev => {
      const newErrors = { ...prev };
      // Clear error for the last filter if it exists
      if (advancedFilters.length > 0) {
        delete newErrors[advancedFilters[advancedFilters.length - 1].id];
      }
      return newErrors;
    });
    
    // Add the new filter
    setAdvancedFilters([
      ...advancedFilters,
      { id: Date.now().toString(), logic: 'And', field: 'accountNumber', operator: 'is', values: [], inputValue: '' },
    ]);
  };

  /**
   * Removes an advanced filter row.
   * Always keeps at least one filter row.
   */
  const removeAdvancedFilter = (id: string) => {
    if (advancedFilters.length > 1) {
      setAdvancedFilters(advancedFilters.filter((f) => f.id !== id));
    }
  };

  /**
   * Updates an existing advanced filter with new values.
   */
  const updateAdvancedFilter = (
    id: string,
    updates: Partial<AdvancedFilter>
  ) => {
    setAdvancedFilters(
      advancedFilters.map((f) => (f.id === id ? { ...f, ...updates } : f))
    );
  };

  /**
   * Returns which operators are available for a given field.
   * 
   * Different fields support different operators because they contain different types of data:
   * - Numbers (like balance) can use math operators: > (greater than), < (less than), etc.
   * - Dates (like dateAdded) can use time operators: before, after
   * - Text (like company name) can use text operators: contains, starts with, etc.
   * 
   * This is like having different tools for different jobs - you can't use "greater than" on text!
   */
  const getOperatorsForField = (field: keyof Account): FilterOperator[] => {
    switch (field) {
      case 'balance':
        // Balance is a number, so we can use math comparisons
        return [...NUMERIC_OPERATORS];
      case 'dateAdded':
        // Dates can be compared by time (before/after)
        return [...DATE_OPERATORS];
      default:
        // Text fields (company name, email, etc.) use text matching operators
        return [...TEXT_OPERATORS];
    }
  };

  /**
   * Adds a value to an advanced filter.
   * Users can add multiple values to a single filter (e.g., status = "Open" OR "Closed").
   */
  const addValueToFilter = (filterId: string) => {
    const filter = advancedFilters.find(f => f.id === filterId);
    if (filter && filter.inputValue.trim()) {
      // Clear any error for this filter when a value is added
      setFilterErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[filterId];
        return newErrors;
      });
      
      updateAdvancedFilter(filterId, {
        values: [...filter.values, filter.inputValue.trim()],
        inputValue: ''
      });
    }
  };

  /**
   * Removes a value from an advanced filter.
   * Users can click the X button on a filter value chip to remove it.
   */
  const removeValueFromFilter = (filterId: string, valueIndex: number) => {
    const filter = advancedFilters.find(f => f.id === filterId);
    if (filter) {
      const newValues = filter.values.filter((_, idx) => idx !== valueIndex);
      updateAdvancedFilter(filterId, { values: newValues });
    }
  };

  /**
   * SEARCH EXECUTION
   * 
   * Executes the search when user clicks the "Search" button.
   * Validates inputs and applies the search filters.
   */
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all search filters
    const fieldsToValidate: (keyof Omit<SearchFilters, 'caseSensitive'>)[] = [
      'accountNumber',
      'phoneNumber',
      'email',
    ];

    for (const field of fieldsToValidate) {
      const value = searchFilters[field];
      if (value) {
        const validation = validateSearchInput(field as keyof Account, value);
        if (!validation.valid) {
          setValidationError(validation.error || 'Invalid input');
          return;
        }
      }
    }

    setValidationError(null);
    setExecutedSearchFilters(searchFilters);
  };

  /**
   * Applies advanced filters (makes them active for search).
   * This is called when user clicks "Apply Filters" button.
   */
  const handleApplyFilters = () => {
    // Clear validation errors
    setValidationError(null);
    setFilterErrors({});
    
    // Apply advanced filters and execute the search
    setExecutedAdvancedFilters(advancedFilters);
    // Also execute column search filters to trigger search
    setExecutedSearchFilters(searchFilters);
  };

  /**
   * FILTER EVALUATION
   * 
   * Checks if an account matches a filter condition.
   */

  /**
   * Checks if a single account matches a single advanced filter rule.
   * Returns true if the account matches the filter, false otherwise.
   */
  const evaluateFilter = (account: Account, filter: AdvancedFilter): boolean => {
    if (!filter.values.length) return true;

    const fieldValue = account[filter.field];
    const filterValues = filter.values;

    switch (filter.operator) {
      case 'is':
        return filterValues.some(value => String(fieldValue).toLowerCase() === value.toLowerCase());
      case 'contains':
        return filterValues.some(value => String(fieldValue).toLowerCase().includes(value.toLowerCase()));
      case 'does not contain':
        return filterValues.every(value => !String(fieldValue).toLowerCase().includes(value.toLowerCase()));
      case 'starts with':
        return filterValues.some(value => String(fieldValue).toLowerCase().startsWith(value.toLowerCase()));
      case '>':
        return filterValues.some(value => Number(fieldValue) > Number(value));
      case '<':
        return filterValues.some(value => Number(fieldValue) < Number(value));
      case '>=':
        return filterValues.some(value => Number(fieldValue) >= Number(value));
      case '<=':
        return filterValues.some(value => Number(fieldValue) <= Number(value));
      case 'before':
        return filterValues.some(value => String(fieldValue) < value);
      case 'after':
        return filterValues.some(value => String(fieldValue) > value);
      default:
        return true;
    }
  };

  /**
   * DATA PROCESSING
   * 
   * Filters and sorts the accounts based on all active search criteria.
   * 
   * HOW IT WORKS:
   * 1. First applies advanced filters (if any) with AND/OR logic
   * 2. Then applies column search filters (what user typed in table headers)
   * 3. Only accounts that pass all checks are included in results
   */
  let filteredAccounts = mockAccounts.filter((account) => {
    // Advanced Filters
    if (executedAdvancedFilters.length > 0) {
      let result = true;
      
      for (let i = 0; i < executedAdvancedFilters.length; i++) {
        const filter = executedAdvancedFilters[i];
        const matches = evaluateFilter(account, filter);
        
        if (i === 0) {
          result = matches;
        } else {
          if (filter.logic === 'And') {
            result = result && matches;
          } else {
            result = result || matches;
          }
        }
      }
      
      if (!result) return false;
    }

    // Column search filters
    const searchFields: (keyof Omit<SearchFilters, 'caseSensitive'>)[] = [
      'accountNumber',
      'companyName',
      'contactName',
      'phoneNumber',
      'email',
    ];

    const matchesSearch = searchFields.every((field) => {
      const searchValue = executedSearchFilters[field];
      if (!searchValue) return true;

      const fieldValue = String(account[field]);
      const caseSensitive = executedSearchFilters.caseSensitive[field];

      if (caseSensitive) {
        if (/^\d/.test(searchValue)) {
          return fieldValue.startsWith(searchValue);
        } else if (/^[a-zA-Z]/.test(searchValue)) {
          return fieldValue.startsWith(searchValue);
        }
        return fieldValue.includes(searchValue);
      } else {
        return fieldValue.toLowerCase().includes(searchValue.toLowerCase());
      }
    });

    return matchesSearch;
  });

  // Sort the filtered results
  filteredAccounts = sortAccountsByField(filteredAccounts, sortBy);

  /**
   * "DID YOU MEAN" SUGGESTIONS
   * 
   * When no results are found, we suggest similar accounts that might match what the user is looking for.
   * This helps users find what they need even if they made a typo or used slightly different wording.
   */
  const suggestions = useMemo(() => {
    // Only show suggestions if there are no results and at least one search field has a value
    if (filteredAccounts.length > 0) return null;
    
    // Use only executed filters to make suggestions static until a new search is performed
    // This prevents suggestions from disappearing when user deletes text
    const hasSearchTerm = Object.entries(executedSearchFilters).some(([key, value]) => {
      if (key === 'caseSensitive') return false;
      return value && String(value).trim().length > 0;
    });
    
    // Also check advanced filters for text/numerical values
    const hasAdvancedFilterTerm = executedAdvancedFilters.some(filter => {
      // Skip date filters (they use startDate/endDate, not values)
      if (filter.field === 'dateAdded') {
        return false;
      }
      // Check if filter has any values
      return filter.values.length > 0 && filter.values.some(v => v && String(v).trim().length > 0);
    });
    
    if (!hasSearchTerm && !hasAdvancedFilterTerm) return null;
    
    // Find suggestions for each search field that has a value
    const fieldSuggestions: Record<string, Account[]> = {};
    
    // Check column search filters
    SEARCHABLE_FIELDS.forEach(field => {
      const searchValue = executedSearchFilters[field];
      if (searchValue && searchValue.trim().length > 0) {
        const matches = findClosestMatches(searchValue, mockAccounts, field);
        if (matches.length > 0) {
          fieldSuggestions[field] = matches;
        }
      }
    });
    
    // Check advanced filters for text/numerical fields
    executedAdvancedFilters.forEach(filter => {
      // Skip date filters
      if (filter.field === 'dateAdded') {
        return;
      }
      
      // Process each value in the filter
      filter.values.forEach(value => {
        if (value && String(value).trim().length > 0) {
          const field = filter.field as keyof Account;
          // Only add if we haven't already added suggestions for this field
          if (!fieldSuggestions[field]) {
            const matches = findClosestMatches(String(value), mockAccounts, field);
            if (matches.length > 0) {
              fieldSuggestions[field] = matches;
            }
          }
        }
      });
    });
    
    return Object.keys(fieldSuggestions).length > 0 ? fieldSuggestions : null;
  }, [filteredAccounts.length, executedSearchFilters, executedAdvancedFilters]);

  /**
   * UI RENDERING
   * 
   * The return statement below renders the advanced search page.
   * It's organized into: header, search controls, advanced filters section, and results table.
   */

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">Advanced Search</h1>
          <Link to="/" className="text-sm text-blue-600 hover:text-blue-800">
            ← Back to Simple Search
          </Link>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Search Controls Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <form onSubmit={handleSearch}>
            <div className="flex gap-3 items-end mb-4">
              {/* Sort By Dropdown */}
              <div className="w-56">
                <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as keyof Account)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md appearance-none bg-white pr-10 text-sm"
                  >
                    <option value="accountNumber">Account Number</option>
                    <option value="companyName">Company Name</option>
                    <option value="contactName">Contact Name</option>
                    <option value="phoneNumber">Phone Number</option>
                    <option value="email">Email</option>
                    <option value="dateAdded">Date Added</option>
                    <option value="balance">Balance</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                </div>
              </div>

              <div className="flex-1" />

              {/* Search Button */}
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                Search
              </button>
            </div>

            {/* Validation Error */}
            {validationError && (
              <div className="flex items-center gap-2 text-red-600 text-sm">
                <AlertCircle className="w-4 h-4" />
                <span>{validationError}</span>
              </div>
            )}
          </form>
        </div>

        {/* Advanced Filters Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Advanced Filters</h3>
          
          <div className="space-y-3 mb-4">
            {advancedFilters.map((filter, index) => (
              <div key={filter.id}>
                <div className="flex gap-3 items-center">
                  {/* Logic Operator */}
                  {index > 0 && (
                    <div className="w-20">
                      <select
                        value={filter.logic}
                        onChange={(e) =>
                          updateAdvancedFilter(filter.id, { logic: e.target.value as LogicOperator })
                        }
                        className="w-full px-2 py-2 border border-gray-300 rounded-md text-sm"
                      >
                        <option value="And">And</option>
                        <option value="Or">Or</option>
                      </select>
                    </div>
                  )}
                  {index === 0 && <div className="w-20 flex items-center">
                    <span className="text-sm font-medium text-gray-700">Where</span>
                  </div>}

                  {/* Field Selector */}
                  <div className="w-48">
                    <div className="relative">
                      <select
                        value={filter.field}
                          onChange={(e) => {
                            const newField = e.target.value as keyof Account;
                            const operators = getOperatorsForField(newField);
                            // Clear any error for this filter when field changes
                            setFilterErrors(prev => {
                              const newErrors = { ...prev };
                              delete newErrors[filter.id];
                              return newErrors;
                            });
                            // Reset values and inputValue when field changes
                            updateAdvancedFilter(filter.id, {
                              field: newField,
                              operator: operators[0],
                              values: [],
                              inputValue: '',
                            });
                          }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md appearance-none bg-white pr-10 text-sm"
                      >
                        <option value="accountNumber">Account Number</option>
                        <option value="companyName">Company Name</option>
                        <option value="contactName">Contact Name</option>
                        <option value="phoneNumber">Phone Number</option>
                        <option value="email">Email</option>
                        <option value="balance">Balance</option>
                        <option value="dateAdded">Date Added</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                    </div>
                  </div>

                  {/* Operator Selector */}
                  <div className="w-40">
                    <div className="relative">
                      <select
                        value={filter.operator}
                        onChange={(e) => {
                          const newOperator = e.target.value as FilterOperator;
                          const validOperators = getOperatorsForField(filter.field);
                          // Ensure the selected operator is valid for the current field
                          if (validOperators.includes(newOperator)) {
                            updateAdvancedFilter(filter.id, { operator: newOperator });
                          } else {
                            // If invalid, reset to first valid operator
                            updateAdvancedFilter(filter.id, { operator: validOperators[0] });
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md appearance-none bg-white pr-10 text-sm"
                      >
                        {getOperatorsForField(filter.field).map((op) => (
                          <option key={op} value={op}>
                            {op}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                    </div>
                  </div>

                  {/* Value Input with Chips Inside */}
                  <div className="flex-1">
                    {filter.field === 'dateAdded' ? (
                      <div>
                        <input
                          type="date"
                          value={filter.inputValue}
                          max={new Date().toISOString().split('T')[0]}
                          onChange={(e) => {
                            const selectedDate = e.target.value;
                            const today = new Date().toISOString().split('T')[0];
                            
                            if (selectedDate > today) {
                              setValidationError('Date cannot be in the future');
                              return;
                            } else {
                              setValidationError(null);
                              updateAdvancedFilter(filter.id, { inputValue: selectedDate });
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              addValueToFilter(filter.id);
                            }
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        />
                        {/* Show selected chips inside border */}
                        {filter.values.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2 p-2 border border-gray-300 rounded-md bg-gray-50 min-h-[38px]">
                            {filter.values.map((value, idx) => (
                              <div
                                key={idx}
                                className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs"
                              >
                                <span>{value}</span>
                                <button
                                  type="button"
                                  onClick={() => removeValueFromFilter(filter.id, idx)}
                                  className="hover:bg-blue-200 rounded-full p-0.5 transition-colors"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col">
                        {/* Combined input with chips */}
                        <div className="min-h-[38px] w-full px-2 py-1.5 border border-gray-300 rounded-md bg-white flex flex-wrap gap-1.5 items-center">
                          {filter.values.map((value, idx) => (
                            <div
                              key={idx}
                              className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs"
                            >
                              <span>{value}</span>
                              <button
                                type="button"
                                onClick={() => removeValueFromFilter(filter.id, idx)}
                                className="hover:bg-blue-200 rounded-full p-0.5 transition-colors"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                          <input
                            type="text"
                            value={filter.inputValue}
                            onChange={(e) => updateAdvancedFilter(filter.id, { inputValue: e.target.value })}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                addValueToFilter(filter.id);
                              }
                            }}
                            placeholder={filter.values.length === 0 ? "Type value and press Enter or click +" : ""}
                            className="flex-1 min-w-[120px] outline-none text-sm"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Add Chip Button */}
                  <button
                    type="button"
                    onClick={() => addValueToFilter(filter.id)}
                    disabled={!filter.inputValue.trim()}
                    className={`p-2 rounded-md transition-colors ${
                      !filter.inputValue.trim()
                        ? 'text-gray-300 cursor-not-allowed'
                        : 'text-gray-500 hover:text-green-600 hover:bg-green-50'
                    }`}
                  >
                    <Plus className="w-4 h-4" />
                  </button>

                  {/* Remove Button */}
                  <button
                    type="button"
                    onClick={() => removeAdvancedFilter(filter.id)}
                    disabled={advancedFilters.length === 1}
                    className={`p-2 rounded-md transition-colors ${
                      advancedFilters.length === 1
                        ? 'text-gray-300 cursor-not-allowed'
                        : 'text-gray-500 hover:text-red-600 hover:bg-red-50'
                    }`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                
                {/* Error Message Display - Shows under the specific filter */}
                {filterErrors[filter.id] && (
                  <div className="flex items-center gap-1 mt-2 text-red-600 text-xs bg-red-50 px-2 py-1.5 rounded">
                    <AlertCircle className="w-3 h-3 flex-shrink-0" />
                    <span>{filterErrors[filter.id]}</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Add Condition Button */}
          <div className="flex gap-3 mb-4">
            <button
              type="button"
              onClick={addAdvancedFilter}
              className="flex items-center gap-2 px-4 py-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              <Plus className="w-4 h-4" />
              Add Condition
            </button>
          </div>

          {/* Apply Filters Button */}
          <div className="pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleApplyFilters}
              className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm font-medium"
            >
              Apply Filters
            </button>
          </div>
        </div>

        {/* Results Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Search Results ({filteredAccounts.length})
            </h2>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                      Account #
                    </div>
                    <input
                      type="text"
                      value={searchFilters.accountNumber}
                      onChange={(e) => updateSearchFilter('accountNumber', e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch(e)}
                      placeholder="Search..."
                      className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                    />
                    <label className="flex items-center gap-1 mt-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={searchFilters.caseSensitive.accountNumber}
                        onChange={() => toggleCaseSensitive('accountNumber')}
                        className="w-3 h-3 text-blue-600 border-gray-300 rounded"
                      />
                      <span className="text-xs text-gray-600">Case sensitive</span>
                    </label>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                      Company Name
                    </div>
                    <input
                      type="text"
                      value={searchFilters.companyName}
                      onChange={(e) => updateSearchFilter('companyName', e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch(e)}
                      placeholder="Search..."
                      className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                    />
                    <label className="flex items-center gap-1 mt-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={searchFilters.caseSensitive.companyName}
                        onChange={() => toggleCaseSensitive('companyName')}
                        className="w-3 h-3 text-blue-600 border-gray-300 rounded"
                      />
                      <span className="text-xs text-gray-600">Case sensitive</span>
                    </label>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                      Contact Name
                    </div>
                    <input
                      type="text"
                      value={searchFilters.contactName}
                      onChange={(e) => updateSearchFilter('contactName', e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch(e)}
                      placeholder="Search..."
                      className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                    />
                    <label className="flex items-center gap-1 mt-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={searchFilters.caseSensitive.contactName}
                        onChange={() => toggleCaseSensitive('contactName')}
                        className="w-3 h-3 text-blue-600 border-gray-300 rounded"
                      />
                      <span className="text-xs text-gray-600">Case sensitive</span>
                    </label>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                      Phone
                    </div>
                    <input
                      type="text"
                      value={searchFilters.phoneNumber}
                      onChange={(e) => updateSearchFilter('phoneNumber', e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch(e)}
                      placeholder="Search..."
                      className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                    />
                    <label className="flex items-center gap-1 mt-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={searchFilters.caseSensitive.phoneNumber}
                        onChange={() => toggleCaseSensitive('phoneNumber')}
                        className="w-3 h-3 text-blue-600 border-gray-300 rounded"
                      />
                      <span className="text-xs text-gray-600">Case sensitive</span>
                    </label>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                      Email
                    </div>
                    <input
                      type="text"
                      value={searchFilters.email}
                      onChange={(e) => updateSearchFilter('email', e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch(e)}
                      placeholder="Search..."
                      className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                    />
                    <label className="flex items-center gap-1 mt-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={searchFilters.caseSensitive.email}
                        onChange={() => toggleCaseSensitive('email')}
                        className="w-3 h-3 text-blue-600 border-gray-300 rounded"
                      />
                      <span className="text-xs text-gray-600">Case sensitive</span>
                    </label>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date Added
                    </div>
                  </th>
                  <th className="px-4 py-3 text-right">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Balance
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAccounts.length === 0 ? (
                  <>
                    <tr>
                      <td colSpan={8} className="px-6 py-12">
                        <div className="text-center">
                          <div className="text-gray-500 mb-4">
                            No accounts found matching your criteria
                          </div>
                          {suggestions && (
                            <div className="mt-6">
                              <div className="text-sm font-medium text-gray-700 mb-4">Did you mean:</div>
                            <div className="space-y-3">
                              {Object.entries(suggestions).map(([field, accounts]) => {
                                const accountList = accounts as Account[];
                                const fieldLabel = field === 'accountNumber' ? 'Account Number' :
                                                  field === 'companyName' ? 'Company Name' :
                                                  field === 'contactName' ? 'Contact Name' :
                                                  field === 'phoneNumber' ? 'Phone Number' :
                                                  'Email';
                                
                                // Deduplicate by field value to show unique suggestions only
                                const uniqueValues = new Map<string, string>();
                                accountList.forEach(account => {
                                  const value = String(account[field as keyof Account]);
                                  const normalizedValue = value.toLowerCase().trim();
                                  if (!uniqueValues.has(normalizedValue)) {
                                    uniqueValues.set(normalizedValue, value);
                                  }
                                });
                                
                                const uniqueSuggestions = Array.from(uniqueValues.values());
                                
                                return (
                                  <div key={field} className="border border-gray-200 rounded-md p-3 bg-gray-50">
                                    <div className="text-xs font-medium text-gray-600 mb-2">{fieldLabel}:</div>
                                    <div className="flex flex-wrap gap-2">
                                      {uniqueSuggestions.map((value, index) => (
                                        <button
                                          key={`${field}-${value}-${index}`}
                                          type="button"
                                          onClick={() => {
                                            // Replace the current search value with the suggestion
                                            const newSearchFilters = {
                                              ...searchFilters,
                                              [field]: value,
                                            };
                                            setSearchFilters(newSearchFilters);
                                            
                                            // Execute the search immediately with the new value
                                            setExecutedSearchFilters({
                                              ...executedSearchFilters,
                                              ...newSearchFilters,
                                            });
                                            
                                            // Clear validation errors
                                            setValidationError(null);
                                          }}
                                          className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-md hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-colors text-left"
                                        >
                                          {value}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })}
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  </>
                ) : (
                  filteredAccounts.map((account) => (
                    <tr key={account.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {account.accountNumber}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                        {account.companyName}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                        {account.contactName}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                        {account.phoneNumber}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                        {account.email}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            account.status === 'Open'
                              ? 'bg-green-100 text-green-800'
                              : account.status === 'Closed'
                              ? 'bg-gray-100 text-gray-800'
                              : account.status === 'Collections'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {account.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                        {account.dateAdded}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-right text-gray-700">
                        ${account.balance.toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}