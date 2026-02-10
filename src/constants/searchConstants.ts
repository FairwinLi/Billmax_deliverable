/**
 * SEARCH CONSTANTS
 * 
 * Centralized constants used throughout the search functionality.
 * This makes it easier to maintain and update field names, operators, etc.
 */

import { Account } from '../data/mockData';

/**
 * Searchable text fields - fields that users can search in the table headers
 */
export const SEARCHABLE_FIELDS: (keyof Account)[] = [
  'accountNumber',
  'companyName',
  'contactName',
  'phoneNumber',
  'email',
];

/**
 * Account status options
 */
export const ACCOUNT_STATUSES = ['Open', 'Closed', 'Collections', 'Suspended'] as const;

/**
 * Default sort field
 */
export const DEFAULT_SORT_FIELD: keyof Account = 'accountNumber';

/**
 * CSV export headers
 */
export const CSV_HEADERS = [
  'Account #',
  'Company Name',
  'Contact Name',
  'Phone',
  'Email',
  'Status',
  'Date Added',
  'Balance'
] as const;

/**
 * Operators available for numeric fields (like balance)
 */
export const NUMERIC_OPERATORS = ['is', 'contains', '>', '<', '>=', '<='] as const;

/**
 * Operators available for date fields
 */
export const DATE_OPERATORS = ['is', 'contains', 'before', 'after'] as const;

/**
 * Operators available for text fields (default)
 */
export const TEXT_OPERATORS = ['is', 'contains', 'does not contain', 'starts with'] as const;

/**
 * Maximum number of suggestions to show
 */
export const MAX_SUGGESTIONS = 5;
