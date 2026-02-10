/**
 * PRIMARY SEARCH PAGE
 * 
 * This is the main search page where users can search for accounts.
 * Think of it like a search engine for account records - users type in what they're looking for,
 * and the page shows matching accounts in a table.
 * 
 * KEY FEATURES:
 * 1. Search inputs in table headers - Users can type directly in the table columns to search
 * 2. Filter panel - A side panel with advanced filtering options (sorting, status, date ranges)
 * 3. Export/Save options - Users can export results or save their search settings
 * 4. Non-real-time search - Users press Enter or use filters to execute searches (not instant)
 * 
 * HOW IT WORKS:
 * - Users type search terms in the table header inputs
 * - When they press Enter, the search is executed
 * - The results table updates to show only matching accounts
 * - Users can open the filter panel to add more complex filters
 * - All filters are applied together to narrow down results
 */

import React, { useState, useMemo } from 'react';
import { ChevronDown, X, AlertCircle, Plus, Download, Filter } from 'lucide-react';
import { mockAccounts, Account } from '../data/mockData';
import { validateSearchInput, sortAccountsByField, findClosestMatches } from '../utils/searchUtils';
import { AdvancedFilter, PrimarySearchFilters, FilterOperator, LogicOperator } from '../types/searchTypes';

// Alias for convenience
type SearchFilters = PrimarySearchFilters;
import { 
  SEARCHABLE_FIELDS, 
  DEFAULT_SORT_FIELD, 
  CSV_HEADERS,
  NUMERIC_OPERATORS,
  DATE_OPERATORS,
  TEXT_OPERATORS
} from '../constants/searchConstants';

/**
 * MAIN COMPONENT
 * 
 * This is the primary search page component. It manages all the state (what the user has typed,
 * which filters are active, etc.) and renders the UI (table, filter panel, buttons).
 */
export function PrimarySearchPage() {
  /**
   * STATE MANAGEMENT
   * 
   * State is like the component's memory - it remembers what the user has done.
   * We use two sets of filters:
   * - searchFilters: What the user is currently typing (not yet applied)
   * - executedSearchFilters: What was actually used for the last search (what's showing now)
   * 
   * This separation allows users to type without immediately searching, then press Enter to execute.
   */

  // Current search inputs (what user is typing, not yet applied)
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({
    accountNumber: '',
    companyName: '',
    contactName: '',
    phoneNumber: '',
    email: '',
    status: [],
    caseSensitive: {
      accountNumber: false,
      companyName: false,
      contactName: false,
      phoneNumber: false,
      email: false,
    },
  });

  // Executed search filters (what was actually used for the current results)
  const [executedSearchFilters, setExecutedSearchFilters] = useState<SearchFilters>({
    accountNumber: '',
    companyName: '',
    contactName: '',
    phoneNumber: '',
    email: '',
    status: [],
    caseSensitive: {
      accountNumber: false,
      companyName: false,
      contactName: false,
      phoneNumber: false,
      email: false,
    },
  });

  // Sorting settings
  const [sortBy, setSortBy] = useState<keyof Account>(DEFAULT_SORT_FIELD);  // Which field to sort by
  const [executedSortBy, setExecutedSortBy] = useState<keyof Account>(DEFAULT_SORT_FIELD);  // What's actually applied

  // Error messages to show users if they enter invalid data
  const [validationError, setValidationError] = useState<string | null>(null);

  // Advanced filters (complex filtering rules in the filter panel)
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilter[]>([
    { id: '1', logic: 'And', field: 'accountNumber', operator: 'is', values: [], inputValue: '' },
  ]);
  const [executedAdvancedFilters, setExecutedAdvancedFilters] = useState<AdvancedFilter[]>([]);
  
  // UI State - controls which panels/dropdowns are visible
  const [showFilterPanel, setShowFilterPanel] = useState(false);        // Is the filter side panel open?
  const [showSaveDropdown, setShowSaveDropdown] = useState(false);       // Is the save options dropdown open?
  const [showExportDropdown, setShowExportDropdown] = useState(false);   // Is the export dropdown open?
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false); // Are advanced filters expanded?
  
  // Default Filter Enable/Disable checkboxes - users can enable/disable certain filters
  const [enabledDefaultFilters, setEnabledDefaultFilters] = useState({
    sortBy: false,    // Is sorting enabled?
    status: false,    // Is status filtering enabled?
  });
  
  // Filter-specific errors - tracks validation errors for individual advanced filters
  const [filterErrors, setFilterErrors] = useState<Record<string, string>>({});
  
  // Save options - settings for saving search views
  const [saveViewName, setSaveViewName] = useState('');
  const [saveSharedWith, setSaveSharedWith] = useState('Private');
  const [showOnSidebar, setShowOnSidebar] = useState(false);

  /**
   * HELPER FUNCTIONS
   * 
   * These functions handle user interactions - updating state when users type,
   * click checkboxes, add filters, etc.
   */

  /**
   * Updates a search filter when user types in a search box.
   * This updates the "current" filter but doesn't execute the search yet.
   */
  const updateSearchFilter = (field: keyof Omit<SearchFilters, 'caseSensitive' | 'status'>, value: string) => {
    setSearchFilters({ ...searchFilters, [field]: value });
    setValidationError(null);  // Clear any previous errors
  };

  /**
   * Toggles case sensitivity for a search field.
   * Case sensitive means "Apple" is different from "apple".
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
   * Toggles whether a default filter (like sorting) is enabled.
   * Users can enable/disable filters using checkboxes.
   */
  const toggleDefaultFilter = (field: keyof typeof enabledDefaultFilters) => {
    setEnabledDefaultFilters({
      ...enabledDefaultFilters,
      [field]: !enabledDefaultFilters[field],
    });
  };

  /**
   * Toggles a status filter checkbox (Open, Closed, Collections, Suspended).
   * Users can select multiple statuses to filter by.
   */
  const toggleStatusFilter = (status: string) => {
    setSearchFilters({
      ...searchFilters,
      status: searchFilters.status.includes(status)
        ? searchFilters.status.filter(s => s !== status)  // Remove if already selected
        : [...searchFilters.status, status]               // Add if not selected
    });
  };

  /**
   * Adds a new advanced filter row.
   * Users can add multiple filter conditions and combine them with AND/OR.
   * Validates that the last filter has at least one value before allowing a new one to be added.
   */
  const addAdvancedFilter = () => {
    // Check if the last filter has values before allowing a new one
    if (advancedFilters.length > 0) {
      const lastFilter = advancedFilters[advancedFilters.length - 1];
      
      // Validate date filters
      if (lastFilter.field === 'dateAdded') {
        if (!lastFilter.startDate && !lastFilter.endDate) {
          // Show error under the specific filter
          setFilterErrors(prev => ({ ...prev, [lastFilter.id]: 'Date filters must have at least a start date or end date. Please add a date before adding another condition.' }));
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
   * We always keep at least one filter row, so users can't remove the last one.
   */
  const removeAdvancedFilter = (id: string) => {
    if (advancedFilters.length > 1) {
      setAdvancedFilters(advancedFilters.filter((f) => f.id !== id));
    }
  };

  /**
   * Updates an existing advanced filter with new values.
   * This is called when users change the field, operator, or values in a filter.
   */
  const updateAdvancedFilter = (id: string, updates: Partial<AdvancedFilter>) => {
    setAdvancedFilters(advancedFilters.map((f) => (f.id === id ? { ...f, ...updates } : f)));
  };

  /**
   * Returns which operators are available for a given field.
   * Different fields support different operators (e.g., numbers support > and <, text supports "contains").
   */
  const getOperatorsForField = (field: keyof Account): FilterOperator[] => {
    switch (field) {
      case 'balance':
        return [...NUMERIC_OPERATORS];  // Numbers can use comparison operators
      case 'phoneNumber':
        return [...TEXT_OPERATORS];  // Text operators for phone
      case 'dateAdded':
        return [...DATE_OPERATORS];  // Date operators
      default:
        return [...TEXT_OPERATORS];  // Default text operators
    }
  };

  /**
   * Adds a value to an advanced filter.
   * Users can add multiple values to a single filter (e.g., status = "Open" OR "Closed").
   * This validates the input before adding it.
   */
  const addValueToFilter = (filterId: string) => {
    const filter = advancedFilters.find((f) => f.id === filterId);
    if (filter && filter.inputValue.trim()) {
      const value = filter.inputValue.trim();
      
      // Clear any existing error for this filter
      setFilterErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[filterId];
        return newErrors;
      });
      
      // Validate balance field - must be numeric
      if (filter.field === 'balance') {
        if (!/^\d+(\.\d+)?$/.test(value)) {
          setFilterErrors(prev => ({ ...prev, [filterId]: 'Balance must be a valid number' }));
          return;
        }
      }
      
      // Validate phone number field - must be numeric (after removing formatting)
      if (filter.field === 'phoneNumber') {
        if (!/^\d+$/.test(value.replace(/[\s\-()]/g, ''))) {
          setFilterErrors(prev => ({ ...prev, [filterId]: 'Phone number cannot contain letters' }));
          return;
        }
      }
      
      // Validate using existing validation function
      const validation = validateSearchInput(filter.field, value);
      if (!validation.valid) {
        setFilterErrors(prev => ({ ...prev, [filterId]: validation.error || 'Invalid input' }));
        return;
      }
      
      // If validation passes, add the value to the filter
      updateAdvancedFilter(filterId, {
        values: [...filter.values, value],
        inputValue: '',  // Clear the input box
      });
    }
  };

  /**
   * Removes a value from an advanced filter.
   * Users can click the X button on a filter value chip to remove it.
   */
  const removeValueFromFilter = (filterId: string, valueIndex: number) => {
    const filter = advancedFilters.find((f) => f.id === filterId);
    if (filter) {
      const newValues = filter.values.filter((_, idx) => idx !== valueIndex);
      updateAdvancedFilter(filterId, { values: newValues });
    }
  };

  /**
   * SEARCH EXECUTION
   * 
   * These functions handle actually running the search when the user presses Enter
   * or clicks the Apply Filters button.
   */

  /**
   * Executes the search when user presses Enter in a search box.
   * This validates the input, then applies the search filters to show results.
   */
  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault();  // Prevent form submission

    // Validate fields that need special validation
    const fieldsToValidate: (keyof Omit<SearchFilters, 'caseSensitive' | 'status'>)[] = [
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
          return;  // Stop if validation fails
        }
      }
    }

    // If validation passes, execute the search
    setValidationError(null);
    setExecutedSearchFilters(searchFilters);  // Apply the search filters
    setExecutedSortBy(sortBy);                // Apply the sort setting
  };

  /**
   * Applies all filters (including advanced filters) and executes the search.
   * This is called when the user clicks "Apply Filters" in the filter panel.
   */
  const handleApplyFilters = () => {
    // Only validate advanced filters if they are enabled/active
    if (showAdvancedFilters) {
      for (const filter of advancedFilters) {
        // Validate date ranges for date filters
        if (filter.field === 'dateAdded') {
          // Validate date range if both dates are provided
          if (filter.startDate && filter.endDate && filter.startDate > filter.endDate) {
            setValidationError('Start date cannot be after end date in advanced filters.');
            return;
          }
        }
        
        // Validate filter values
        for (const value of filter.values) {
          const validation = validateSearchInput(filter.field, value);
          if (!validation.valid) {
            setValidationError(validation.error || 'Invalid input in advanced filters');
            return;
          }
        }
      }
    }

    // Clear validation errors if all checks pass
    setValidationError(null);
    
    // Apply advanced filters if they're enabled
    setExecutedAdvancedFilters(showAdvancedFilters ? advancedFilters : []);
    handleSearch();  // Execute the search
    setShowFilterPanel(false);  // Close the filter panel
  };

  /**
   * EXPORT FUNCTIONALITY
   * 
   * This lets users download their search results as a CSV file (like an Excel spreadsheet).
   * CSV files can be opened in Excel, Google Sheets, or any spreadsheet program.
   */

  /**
   * Exports the current search results to a CSV file that the user can download.
   * 
   * HOW IT WORKS:
   * 1. Takes all the accounts currently shown in the results table
   * 2. Formats them as a CSV (comma-separated values) - like a spreadsheet with rows and columns
   * 3. Creates a file with today's date in the filename
   * 4. Automatically triggers the browser's download feature
   * 
   * Think of it like copying a table from a website and pasting it into Excel, but automated.
   */
  const handleExportResults = () => {
    // First row of CSV: column headers (like "Account #", "Company Name", etc.)
    const csvRows = [CSV_HEADERS.join(',')];

    // Add each account as a new row in the CSV file
    // Each account becomes one line in the spreadsheet
    filteredAccounts.forEach((account) => {
      const row = [
        account.accountNumber,
        `"${account.companyName}"`,  // Quotes around text fields prevent issues if they contain commas
        `"${account.contactName}"`,
        account.phoneNumber,
        account.email,
        account.status,
        account.dateAdded,
        account.balance,
      ];
      csvRows.push(row.join(','));  // Join all values with commas to make one CSV row
    });

    // Create the actual file that the browser can download
    const csvContent = csvRows.join('\n');  // Join all rows with newlines to make the complete file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });  // Create a file object
    const link = document.createElement('a');  // Create an invisible download link
    const url = URL.createObjectURL(blob);  // Create a temporary web address for the file

    // Set up the download link with the filename (includes today's date)
    link.setAttribute('href', url);
    link.setAttribute('download', `account_search_results_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';  // Hide the link (user doesn't need to see it)
    document.body.appendChild(link);
    link.click();  // Automatically click the link to trigger the download
    document.body.removeChild(link);  // Clean up: remove the invisible link
  };

  /**
   * FILTER EVALUATION
   * 
   * These functions check if an account matches the filter criteria.
   * Think of it like a test - each account has to pass the test to be shown in results.
   */

  /**
   * Checks if a single account matches a single advanced filter rule.
   * 
   * This is like asking: "Does this account match the filter rule the user created?"
   * For example: "Does this account have a balance greater than 1000?"
   * 
   * Returns true if the account matches, false if it doesn't.
   */
  const evaluateFilter = (account: Account, filter: AdvancedFilter): boolean => {
    // Handle date range filters specially (dates work differently than text or numbers)
    if (filter.field === 'dateAdded') {
      const accountDate = String(account[filter.field]);  // Get the account's date
      const start = filter.startDate || '';  // User's start date (if they set one)
      const end = filter.endDate || '';      // User's end date (if they set one)

      // Check if account date falls within the range the user specified
      if (start && !end) return accountDate >= start;  // Only start date: show accounts after this date
      if (!start && end) return accountDate <= end;    // Only end date: show accounts before this date
      if (start && end) return accountDate >= start && accountDate <= end;  // Both dates: show accounts between them
      return true;  // No date filter means show all accounts
    }

    // If no values specified in the filter, it matches everything (no filter applied)
    if (!filter.values.length) return true;

    const fieldValue = account[filter.field];  // Get the account's value for this field
    const filterValues = filter.values;        // Get what the user is searching for

    // Check based on the operator type (is, contains, >, <, etc.)
    switch (filter.operator) {
      case 'is':
        // Exact match: "Company Name is 'Acme Corp'" - must be exactly the same
        // Case-insensitive means "Acme" and "acme" are the same
        return filterValues.some((value) => String(fieldValue).toLowerCase() === value.toLowerCase());
      case 'contains':
        // Partial match: "Company Name contains 'Acme'" - finds "Acme Corp", "Acme Inc", etc.
        return filterValues.some((value) => String(fieldValue).toLowerCase().includes(value.toLowerCase()));
      case 'does not contain':
        // Exclusion: "Company Name does not contain 'Acme'" - excludes anything with "Acme"
        return filterValues.every((value) => !String(fieldValue).toLowerCase().includes(value.toLowerCase()));
      case 'starts with':
        // Beginning match: "Company Name starts with 'Acme'" - finds "Acme Corp" but not "The Acme Corp"
        return filterValues.some((value) => String(fieldValue).toLowerCase().startsWith(value.toLowerCase()));
      case '>':
        // Numeric comparison: "Balance > 1000" - shows accounts with balance greater than 1000
        return filterValues.some((value) => Number(fieldValue) > Number(value));
      case '<':
        // Numeric comparison: "Balance < 1000" - shows accounts with balance less than 1000
        return filterValues.some((value) => Number(fieldValue) < Number(value));
      case '>=':
        // Numeric comparison: "Balance >= 1000" - shows accounts with balance greater than or equal to 1000
        return filterValues.some((value) => Number(fieldValue) >= Number(value));
      case '<=':
        // Numeric comparison: "Balance <= 1000" - shows accounts with balance less than or equal to 1000
        return filterValues.some((value) => Number(fieldValue) <= Number(value));
      default:
        return true;  // Unknown operator matches all (safety fallback)
    }
  };

  /**
   * DATA PROCESSING
   * 
   * These sections process the account data to show filtered and sorted results.
   */

  /**
   * Counts how many active filters are currently set.
   * This is shown on the "Apply Filters" button (e.g., "Apply Filters (3)").
   * We use useMemo to only recalculate when relevant state changes.
   */
  const activeFilterCount = useMemo(() => {
    let count = 0;
    
    // Count sortBy if enabled
    if (enabledDefaultFilters.sortBy) {
      count++;
    }
    
    // Count status if enabled and has selections
    if (enabledDefaultFilters.status && searchFilters.status.length > 0) {
      count++;
    }
    
    // Count advanced filters that have values
    if (showAdvancedFilters) {
      advancedFilters.forEach((filter) => {
        if (filter.field === 'dateAdded') {
          // Date filters count if they have at least one date
          // If only startDate: shows entries after that date
          // If only endDate: shows entries before that date
          // If both: shows entries between those dates
          if (filter.startDate || filter.endDate) {
            count++;
          }
        } else if (filter.values.length > 0) {
          // Other filters count if they have values
          count++;
        }
      });
    }
    
    return count;
  }, [enabledDefaultFilters, searchFilters.status, advancedFilters, showAdvancedFilters]);

  /**
   * Filters the accounts based on all active search criteria.
   * This is the core search logic that determines which accounts to show.
   * 
   * HOW IT WORKS (in simple terms):
   * Think of this like a series of filters - each account must pass through all of them.
   * If an account fails any filter, it gets removed from the results.
   * 
   * STEP-BY-STEP:
   * 1. First checks advanced filters (complex rules from the filter panel) - uses AND/OR logic
   * 2. Then checks what the user typed in the table header search boxes
   * 3. Then checks if the account status matches any selected checkboxes
   * 4. Only accounts that pass ALL checks are shown in the results
   */
  let filteredAccounts = mockAccounts.filter((account) => {
    // STEP 1: Check advanced filters (from the filter panel)
    // These are the complex rules like "Where Company Name contains 'Acme' AND Balance > 1000"
    if (executedAdvancedFilters.length > 0) {
      let result = true;  // Start by assuming the account matches

      // Check each advanced filter rule one by one
      for (let i = 0; i < executedAdvancedFilters.length; i++) {
        const filter = executedAdvancedFilters[i];
        const matches = evaluateFilter(account, filter);  // Does this account match this filter?

        // First filter sets the starting point
        if (i === 0) {
          result = matches;  // First filter result becomes our starting point
        } else {
          // Combine with previous filters using AND/OR logic
          if (filter.logic === 'And') {
            result = result && matches;  // AND means BOTH must be true (like "this AND that")
          } else {
            result = result || matches;  // OR means EITHER can be true (like "this OR that")
          }
        }
      }

      // If the account doesn't match the advanced filters, remove it from results
      if (!result) return false;
    }

    // STEP 2: Check column search filters (what user typed in table header search boxes)
    // These are the simple searches like typing "Acme" in the Company Name column
    const searchFields = SEARCHABLE_FIELDS;

    // Check if account matches what the user typed in each search box
    const matchesSearch = searchFields.every((field) => {
      const searchValue = executedSearchFilters[field];
      if (!searchValue) return true;  // If search box is empty, it matches everything (no filter)

      const fieldValue = String(account[field]);  // Get the account's value for this field
      const caseSensitive = executedSearchFilters.caseSensitive[field];  // Is case-sensitive mode on?

      if (caseSensitive) {
        // Case-sensitive: "Apple" is different from "apple"
        // If user typed a number, check if the field starts with that number
        if (/^\d/.test(searchValue)) {
          return fieldValue.startsWith(searchValue);
        } else if (/^[a-zA-Z]/.test(searchValue)) {
          // If user typed a letter, check if the field starts with that letter
          return fieldValue.startsWith(searchValue);
        }
        // Otherwise, check if the field contains the search text
        return fieldValue.includes(searchValue);
      } else {
        // Case-insensitive: "Apple" and "apple" are the same
        // Convert both to lowercase and check if one contains the other
        return fieldValue.toLowerCase().includes(searchValue.toLowerCase());
      }
    });

    // STEP 3: Check status filter (if user selected any status checkboxes like "Open" or "Closed")
    if (executedSearchFilters.status.length > 0) {
      // If user selected specific statuses, only show accounts with those statuses
      if (!executedSearchFilters.status.includes(account.status)) {
        return false;  // Account status doesn't match, so remove it
      }
    }

    // If we made it here, the account passed all the filters!
    return matchesSearch;
  });

  // STEP 4: Sort the filtered results
  filteredAccounts = sortAccountsByField(filteredAccounts, executedSortBy);

  /**
   * "DID YOU MEAN" SUGGESTIONS
   * 
   * When no results are found, we suggest similar accounts that might match what the user is looking for.
   * This is like Google's "Did you mean..." feature - it helps users find what they need even if they:
   * - Made a typo (typed "Acme" instead of "Acme Corp")
   * - Used slightly different wording
   * - Aren't sure of the exact spelling
   * 
   * HOW IT WORKS:
   * 1. Only shows suggestions when there are zero results (nothing matched)
   * 2. Uses fuzzy matching to find accounts that are "close" to what the user typed
   * 3. Shows the top 5 closest matches as clickable suggestions
   */
  const suggestions = useMemo(() => {
    // Only show suggestions if there are no results and at least one search field has a value
    // If we found results, we don't need suggestions!
    if (filteredAccounts.length > 0) return null;
    
    // Use only executed filters (what was actually searched) to make suggestions stable
    // This prevents suggestions from jumping around when user is still typing
    const hasSearchTerm = Object.entries(executedSearchFilters).some(([key, value]) => {
      if (key === 'caseSensitive' || key === 'status') return false;
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
   * The return statement below renders the actual page that users see.
   * It's organized into sections: header, action buttons, results table, and filter panel.
   */

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-xl font-semibold text-gray-900">Account Search</h1>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Action Buttons Section */}
        {/* Contains buttons for: New Account, Edit Columns, Filters, Export, Save Options */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => alert('New Account form coming soon!')}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              New Account
            </button>
            <button
              type="button"
              onClick={() => alert('Edit Columns feature coming soon!')}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 bg-white text-gray-700 rounded-md hover:bg-gray-50 transition-colors text-sm font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
              Edit Columns
            </button>
          </div>

          <div className="flex gap-4">
            {/* Filter Button - Opens the filter side panel */}
            <button
              type="button"
              onClick={() => setShowFilterPanel(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-blue-600 hover:text-blue-700 transition-colors text-sm font-medium"
            >
              <Filter className="w-4 h-4" />
              Filters
            </button>

            {/* Export Dropdown - Options for exporting search results */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowExportDropdown(!showExportDropdown);
                  setShowSaveDropdown(false);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-blue-600 hover:text-blue-700 transition-colors text-sm font-medium"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
              {showExportDropdown && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setShowExportDropdown(false)}
                  />
                  <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-xl border border-gray-200 z-20 p-4">
                    <div className="space-y-4">
                      <button
                        type="button"
                        onClick={() => {
                          handleExportResults();
                          setShowExportDropdown(false);
                        }}
                        className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
                      >
                        Export File (CSV)
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Save Options Dropdown - Save current search settings for later */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowSaveDropdown(!showSaveDropdown);
                  setShowExportDropdown(false);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-blue-600 hover:text-blue-700 transition-colors text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                Save Options
              </button>
              {showSaveDropdown && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setShowSaveDropdown(false)}
                  />
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 z-20 p-4">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">Name</label>
                        <input
                          type="text"
                          value={saveViewName}
                          onChange={(e) => setSaveViewName(e.target.value)}
                          placeholder="View Name"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">Shared With</label>
                        <div className="relative">
                          <select
                            value={saveSharedWith}
                            onChange={(e) => setSaveSharedWith(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md appearance-none bg-white pr-10 text-sm"
                          >
                            <option value="Private">Private</option>
                            <option value="Team">Team</option>
                            <option value="Organization">Organization</option>
                            <option value="Public">Public</option>
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                        </div>
                      </div>

                      <div>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={showOnSidebar}
                            onChange={(e) => setShowOnSidebar(e.target.checked)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                          />
                          <span className="text-sm text-gray-700">Show on Sidebar</span>
                        </label>
                      </div>

                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (saveViewName.trim()) {
                              const searchConfig = {
                                id: Date.now().toString(),
                                name: saveViewName,
                                searchFilters: executedSearchFilters,
                                advancedFilters: executedAdvancedFilters,
                                sortBy,
                                sharedWith: saveSharedWith,
                                showOnSidebar,
                                timestamp: new Date().toISOString(),
                              };
                              
                              const existing = JSON.parse(localStorage.getItem('savedSearches') || '[]');
                              existing.push(searchConfig);
                              localStorage.setItem('savedSearches', JSON.stringify(existing));
                              
                              alert('View saved successfully!');
                              setShowSaveDropdown(false);
                              setSaveViewName('');
                              setSaveSharedWith('Private');
                              setShowOnSidebar(false);
                            } else {
                              alert('Please enter a name for this view');
                            }
                          }}
                          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Validation Error Message */}
        {/* Shows if user enters invalid data (e.g., letters in account number) */}
        {validationError && (
          <div className="mb-4 flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded-md px-4 py-3">
            <AlertCircle className="w-4 h-4" />
            <span>{validationError}</span>
          </div>
        )}

        {/* Search Results Table */}
        {/* The main table showing filtered account results */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Search Results ({filteredAccounts.length})
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {/* Table Header with Search Input - Account Number */}
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
                  {/* Table Header with Search Input - Company Name */}
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
                  {/* Table Header with Search Input - Contact Name */}
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
                  {/* Table Header with Search Input - Phone */}
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
                  {/* Table Header with Search Input - Email */}
                  <th className="px-4 py-3 text-left">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Email</div>
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
                  {/* Table Header - Status (no search input, filtered via filter panel) */}
                  <th className="px-4 py-3 text-left">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Status</div>
                  </th>
                  {/* Table Header - Date Added (no search input) */}
                  <th className="px-4 py-3 text-left">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date Added
                    </div>
                  </th>
                  {/* Table Header - Balance (no search input) */}
                  <th className="px-4 py-3 text-right">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</div>
                  </th>
                </tr>
              </thead>
              {/* Table Body - Shows the actual account data */}
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
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">{account.email}</td>
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

      {/* Filter Side Panel */}
      {/* Slides in from the right when user clicks "Filters" button */}
      {showFilterPanel && (
        <div className="fixed right-0 top-0 bottom-0 w-[500px] bg-white shadow-2xl z-50 overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
              <button
                type="button"
                onClick={() => setShowFilterPanel(false)}
                className="p-2 hover:bg-gray-100 rounded-md transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Default Filters Section */}
            {/* Simple filters like sorting and status checkboxes */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Default Filters</h3>
              <div className="space-y-4">
                {/* Sort By Filter */}
                <div className="border border-gray-200 rounded-md p-3">
                  <label className="flex items-center gap-2 mb-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enabledDefaultFilters.sortBy}
                      onChange={() => toggleDefaultFilter('sortBy')}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                    />
                    <span className="text-xs font-medium text-gray-700">Sort By</span>
                  </label>
                  {enabledDefaultFilters.sortBy && (
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
                  )}
                </div>

                {/* Status Filter */}
                <div className="border border-gray-200 rounded-md p-3">
                  <label className="flex items-center gap-2 mb-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enabledDefaultFilters.status}
                      onChange={() => toggleDefaultFilter('status')}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                    />
                    <span className="text-xs font-medium text-gray-700">Status</span>
                  </label>
                  {enabledDefaultFilters.status && (
                    <div className="space-y-2 mt-2">
                      {['Open', 'Closed', 'Collections', 'Suspended'].map((status) => (
                        <label key={status} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={searchFilters.status.includes(status)}
                            onChange={() => toggleStatusFilter(status)}
                            className="w-3.5 h-3.5 text-blue-600 border-gray-300 rounded"
                          />
                          <span className="text-sm text-gray-700">{status}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Advanced Filters Section */}
            {/* Complex filters with field, operator, and value selection */}
            <div className="mb-6">
              <label className="flex items-center gap-2 mb-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showAdvancedFilters}
                  onChange={(e) => setShowAdvancedFilters(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                />
                <h3 className="text-sm font-semibold text-gray-900">Advanced Filters</h3>
              </label>
              
              {showAdvancedFilters && (
                <div className="space-y-3">
                  {advancedFilters.map((filter, index) => (
                    <div key={filter.id} className="border border-gray-200 rounded-md p-3">
                      {/* Logic Operator (And/Or) - shown for filters after the first one */}
                      {index > 0 && (
                        <div className="mb-2">
                          <select
                            value={filter.logic}
                            onChange={(e) =>
                              updateAdvancedFilter(filter.id, { logic: e.target.value as LogicOperator })
                            }
                            className="w-20 px-2 py-1 border border-gray-300 rounded-md text-xs"
                          >
                            <option value="And">And</option>
                            <option value="Or">Or</option>
                          </select>
                        </div>
                      )}

                      {/* Field Selector - Which account field to filter */}
                      <div className="mb-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">Field</label>
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
                              updateAdvancedFilter(filter.id, {
                                field: newField,
                                operator: operators[0],
                                values: [],
                                inputValue: '',
                                startDate: '',
                                endDate: '',
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

                      {/* Operator Selector - How to compare (is, contains, >, etc.) */}
                      {filter.field !== 'dateAdded' && (
                        <div className="mb-2">
                          <label className="block text-xs font-medium text-gray-700 mb-1">Operator</label>
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
                      )}

                      {/* Date Range Inputs - For date fields */}
                      {filter.field === 'dateAdded' && (
                        <div className="space-y-2">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
                            <input
                              type="date"
                              value={filter.startDate || ''}
                              max={new Date().toISOString().split('T')[0]}
                              onChange={(e) => {
                                const selectedDate = e.target.value;
                                const today = new Date().toISOString().split('T')[0];
                                
                                if (selectedDate > today) {
                                  setFilterErrors(prev => ({ ...prev, [filter.id]: 'Date cannot be in the future' }));
                                  return;
                                }
                                
                                // Validate that start date is not after end date
                                if (filter.endDate && selectedDate > filter.endDate) {
                                  setFilterErrors(prev => ({ ...prev, [filter.id]: 'Start date cannot be after end date' }));
                                  return;
                                }
                                
                                // Clear errors and update
                                setFilterErrors(prev => {
                                  const newErrors = { ...prev };
                                  delete newErrors[filter.id];
                                  return newErrors;
                                });
                                updateAdvancedFilter(filter.id, { startDate: selectedDate });
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
                            <input
                              type="date"
                              value={filter.endDate || ''}
                              max={new Date().toISOString().split('T')[0]}
                              onChange={(e) => {
                                const selectedDate = e.target.value;
                                const today = new Date().toISOString().split('T')[0];
                                
                                if (selectedDate > today) {
                                  setFilterErrors(prev => ({ ...prev, [filter.id]: 'Date cannot be in the future' }));
                                  return;
                                }
                                
                                // Validate that end date is not before start date
                                if (filter.startDate && selectedDate < filter.startDate) {
                                  setFilterErrors(prev => ({ ...prev, [filter.id]: 'End date cannot be before start date' }));
                                  return;
                                }
                                
                                // Clear errors and update
                                setFilterErrors(prev => {
                                  const newErrors = { ...prev };
                                  delete newErrors[filter.id];
                                  return newErrors;
                                });
                                updateAdvancedFilter(filter.id, { endDate: selectedDate });
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                            />
                          </div>
                        </div>
                      )}

                      {/* Value Input - For non-date fields */}
                      {filter.field !== 'dateAdded' && (
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Value</label>
                          {/* Text input with value chips - all non-date fields use text input */}
                          <div className="flex gap-2">
                            <div className="flex-1">
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
                                  placeholder={filter.values.length === 0 ? 'Type and press Enter...' : ''}
                                  className="flex-1 min-w-[80px] outline-none text-sm"
                                />
                              </div>
                            </div>
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
                          </div>
                        </div>
                      )}

                      {/* Error Message Display */}
                      {filterErrors[filter.id] && (
                        <div className="flex items-center gap-1 mt-2 text-red-600 text-xs bg-red-50 px-2 py-1.5 rounded">
                          <AlertCircle className="w-3 h-3 flex-shrink-0" />
                          <span>{filterErrors[filter.id]}</span>
                        </div>
                      )}

                      {/* Remove Filter Button */}
                      <button
                        type="button"
                        onClick={() => removeAdvancedFilter(filter.id)}
                        disabled={advancedFilters.length === 1}
                        className={`mt-2 text-xs ${
                          advancedFilters.length === 1
                            ? 'text-gray-300 cursor-not-allowed'
                            : 'text-red-600 hover:text-red-700'
                        }`}
                      >
                        Remove Filter
                      </button>
                    </div>
                  ))}

                  {/* Add Condition Button */}
                  <button
                    type="button"
                    onClick={addAdvancedFilter}
                    className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    <Plus className="w-4 h-4" />
                    Add Condition
                  </button>
                </div>
              )}
            </div>

            {/* Apply Filters Button */}
            {/* Shows count of active filters and applies all filters when clicked */}
            <button
              type="button"
              onClick={handleApplyFilters}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              Apply Filters ({activeFilterCount})
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
