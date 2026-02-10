/**
 * SHARED TYPE DEFINITIONS
 * 
 * These types are used across multiple search pages to ensure consistency.
 * Having them in one place makes it easier to maintain and update.
 */

import { Account } from '../data/mockData';

/**
 * Logic operators for combining multiple filters
 * - And: All filters must match (like "this AND that")
 * - Or: Any filter can match (like "this OR that")
 */
export type LogicOperator = 'And' | 'Or';

/**
 * Filter operators - different ways to compare values
 * - Text operators: is, contains, does not contain, starts with
 * - Numeric operators: >, <, >=, <=
 * - Date operators: before, after
 */
export type FilterOperator = 
  | 'is' 
  | 'contains' 
  | 'does not contain' 
  | 'starts with' 
  | '>' 
  | '<' 
  | '>=' 
  | '<=' 
  | 'before' 
  | 'after';

/**
 * Advanced filter structure - represents one filter rule
 * Users can create multiple filters and combine them with AND/OR logic
 */
export interface AdvancedFilter {
  id: string;                    // Unique ID to track this filter
  logic: LogicOperator;          // How to combine with other filters (And/Or)
  field: keyof Account;          // Which account field to filter (accountNumber, companyName, etc.)
  operator: FilterOperator;       // How to compare (is, contains, >, etc.)
  values: string[];              // The values to search for (can have multiple)
  inputValue: string;            // Temporary text user is typing before adding as a filter value
  startDate?: string;            // For date filters: earliest date
  endDate?: string;             // For date filters: latest date
}

/**
 * Search filters structure - stores what the user has typed in each search field
 * This is separate from "executed" filters because we don't search until user presses Enter
 * 
 * Note: status is optional because SecondarySearchPage doesn't use it,
 * but PrimarySearchPage always provides it (initialized as empty array)
 */
export type SearchFilters = {
  accountNumber: string;         // What user typed in account number search box
  companyName: string;           // What user typed in company name search box
  contactName: string;           // What user typed in contact name search box
  phoneNumber: string;           // What user typed in phone number search box
  email: string;                 // What user typed in email search box
  status?: string[];            // Which status checkboxes are checked (Open, Closed, etc.) - optional for secondary page
  caseSensitive: {               // Whether each field should match exact case (A vs a)
    accountNumber: boolean;
    companyName: boolean;
    contactName: boolean;
    phoneNumber: boolean;
    email: boolean;
  };
};

/**
 * Search filters for PrimarySearchPage - status is required
 */
export type PrimarySearchFilters = SearchFilters & {
  status: string[];  // Required in primary page
};
