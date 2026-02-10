import { Account } from '../data/mockData';

/**
 * VALIDATION UTILITIES
 * 
 * These functions check if what the user typed makes sense for the field they're searching.
 * Think of it like a spell-checker, but for data types instead of words.
 * 
 * For example:
 * - Account numbers should only have numbers (12345678), not letters (abc123)
 * - Phone numbers can have formatting (spaces, dashes, parentheses) but not letters
 * 
 * This prevents errors and helps users find what they're looking for.
 */

/**
 * Checks if the search input is valid for the given field type.
 * 
 * Different fields have different rules because they contain different types of data:
 * - Account numbers are always numbers (like 12345678)
 * - Phone numbers can have formatting but not letters (like (555) 123-4567)
 * - Email addresses can be searched partially (like "john" to find "john@example.com")
 * 
 * @param field - The account field being searched (accountNumber, phoneNumber, etc.)
 * @param value - The text the user typed in
 * @returns Object with 'valid' (true/false) and optional 'error' message to show the user
 */
export function validateSearchInput(field: keyof Account, value: string): { valid: boolean; error?: string } {
  // Empty values are always valid (user hasn't entered anything yet, so nothing to validate)
  if (!value) return { valid: true };

  switch (field) {
    case 'accountNumber':
      // Account numbers should only contain digits (0-9), no letters allowed
      // Example: "12345678" is valid, "abc123" is not valid
      if (/[a-zA-Z]/.test(value)) {
        return { valid: false, error: 'Account number cannot contain letters' };
      }
      break;
    case 'phoneNumber':
      // Phone numbers can have spaces, dashes, parentheses for formatting
      // But they cannot contain letters
      // Example: "(555) 123-4567" is valid, "(555) abc-4567" is not valid
      if (/[a-zA-Z]/.test(value.replace(/[\s\-\(\)]/g, ''))) {
        return { valid: false, error: 'Phone number cannot contain letters' };
      }
      break;
    case 'email':
      // For search purposes, we allow partial email matches
      // Users can search for "john" to find "john@example.com"
      // No strict validation needed here
      break;
  }

  return { valid: true };  // If we made it here, the input is valid!
}

/**
 * SORTING UTILITIES
 * 
 * These functions organize the search results in a meaningful way.
 * Users can sort by different fields to find accounts more easily.
 * 
 * Think of it like organizing a filing cabinet - you can sort by name, date, number, etc.
 */

/**
 * Sorts accounts by a specific field (like account number, company name, etc.).
 * 
 * Different types of data are sorted differently:
 * - Numbers are sorted numerically (1, 2, 10, 20 - not 1, 10, 2, 20)
 * - Text is sorted alphabetically (Apple, Banana, Cherry)
 * - Dates are sorted chronologically (newest first or oldest first)
 * 
 * @param accounts - The list of accounts to sort
 * @param field - Which field to sort by (accountNumber, companyName, balance, etc.)
 * @returns A new sorted array (the original array is not changed)
 */
export function sortAccountsByField(accounts: Account[], field: keyof Account): Account[] {
  // Create a copy so we don't modify the original array
  // This is like making a photocopy before sorting - the original stays untouched
  return [...accounts].sort((a, b) => {
    const aValue = a[field];  // Get the value from account A
    const bValue = b[field];  // Get the value from account B

    switch (field) {
      case 'accountNumber':
        // Sort numbers in ascending order: 100 comes before 200
        // Convert to numbers so "10" comes before "2" (not "2" before "10" like text sorting)
        return Number(aValue) - Number(bValue);
      
      case 'phoneNumber':
        // Sort phone numbers as numbers, ignoring formatting
        // Remove all non-digits (spaces, dashes, parentheses) to get just the numbers
        // Example: "(555) 123-4567" becomes "5551234567" for comparison
        const aDigits = String(aValue).replace(/\D/g, '');  // Remove all non-digits
        const bDigits = String(bValue).replace(/\D/g, '');  // Remove all non-digits
        // Compare as numbers (treating as 10-digit numbers)
        return Number(aDigits) - Number(bDigits);
      
      case 'balance':
        // Sort balance in descending order (highest to lowest)
        // Higher balances come first, so we reverse the comparison (b - a instead of a - b)
        // Example: $5000 comes before $1000
        return Number(bValue) - Number(aValue);
      
      case 'dateAdded':
        // Sort dates in chronological order (most recent to least recent)
        // Dates are stored as YYYY-MM-DD strings (like "2024-01-15"), which are naturally sortable
        // To get most recent first, we compare b to a (newer dates come first)
        const aDate = String(aValue);
        const bDate = String(bValue);
        // Compare dates: if bDate > aDate, b is more recent, so return positive to put b first
        // In sort function: positive return means b comes before a
        if (bDate > aDate) return 1;   // b is newer, put b first
        if (bDate < aDate) return -1;   // a is newer, put a first
        return 0;                       // dates are equal
      
      case 'companyName':
      case 'contactName':
      case 'email':
        // Sort text alphabetically: "Apple" comes before "Banana"
        // localeCompare handles special characters and different languages correctly
        return String(aValue).localeCompare(String(bValue));
      
      default:
        // For other fields, don't change the order (keep original order)
        return 0;
    }
  });
}

/**
 * SEARCH UTILITIES
 * 
 * These functions help find accounts that match what the user is looking for.
 * They handle different search scenarios like case-sensitive vs case-insensitive searches.
 */

/**
 * Finds accounts that closely match a search term (fuzzy matching).
 * 
 * This is like a smart search that finds things even when you don't type them exactly right.
 * For example, if you type "Ane" it might suggest "Acme" because they're similar.
 * 
 * HOW IT WORKS:
 * 1. Gives each account a "score" based on how similar it is to what you typed
 * 2. Higher scores = better matches (exact matches get the highest score)
 * 3. Returns the top 5 best matches
 * 
 * This is used for the "Did you mean..." suggestions when no results are found.
 * 
 * @param searchTerm - What the user typed (like "Ane")
 * @param accounts - All available accounts to search through
 * @param field - Which field to check (like "companyName" or "email")
 * @returns Top 5 closest matching accounts (the best suggestions)
 */
export function findClosestMatches(searchTerm: string, accounts: Account[], field: keyof Account): Account[] {
  if (!searchTerm) return [];  // If user didn't type anything, no suggestions

  // Score each account based on how well it matches what the user typed
  // Think of it like a test where each account gets points for being similar
  const scored = accounts.map(account => {
    const fieldValue = String(account[field]).toLowerCase();  // Get the account's value, make lowercase
    const search = searchTerm.toLowerCase();                   // What user typed, make lowercase
    
    let score = 0;  // Start with zero points
    
    // Exact match gets the highest score (1000 points)
    // Example: User types "Acme" and account has "Acme" - perfect match!
    if (fieldValue === search) {
      score += 1000;
    }
    
    // Starts with the search term gets a high score (500 points)
    // Example: User types "Acme" and account has "Acme Corp" - very good match
    if (fieldValue.startsWith(search)) {
      score += 500;
    }
    
    // Contains the search term gets a medium score (200 points)
    // Example: User types "Acme" and account has "The Acme Company" - good match
    if (fieldValue.includes(search)) {
      score += 200;
    }
    
    // Check if search term characters appear in order (for typos like "Ane" matching "Acme")
    // This helps catch typos where letters are missing or swapped
    let searchIndex = 0;
    let consecutiveMatches = 0;
    let maxConsecutive = 0;
    
    for (let i = 0; i < fieldValue.length && searchIndex < search.length; i++) {
      if (fieldValue[i] === search[searchIndex]) {
        consecutiveMatches++;
        maxConsecutive = Math.max(maxConsecutive, consecutiveMatches);
        searchIndex++;
      } else {
        consecutiveMatches = 0;
      }
    }
    
    // If all characters of search term appear in order, give bonus points
    // Example: "Ane" matches "Acme" because A, n, e appear in order
    if (searchIndex === search.length) {
      score += 150 + (maxConsecutive * 20); // Bonus for characters appearing in order
    }
    
    // Calculate character similarity - how many letters match?
    // Count how many letters from the search term appear in the account value
    let matchingChars = 0;
    const searchChars = new Set(search);  // Get unique letters from search term
    for (let char of fieldValue) {
      if (searchChars.has(char)) {
        matchingChars++;  // This letter matches!
      }
    }
    
    // Bonus for having lots of matching letters
    score += (matchingChars / search.length) * 50;
    
    // Check each word separately (in case of multi-word company names)
    const words = fieldValue.split(/\s+/);  // Split into words
    for (const word of words) {
      if (word.startsWith(search)) {
        score += 100;  // Bonus if a word starts with the search term
      }
      if (word.includes(search)) {
        score += 50;   // Bonus if a word contains the search term
      }
    }
    
    // Penalize if the lengths are very different
    // "Acme" and "Acme Corporation" are similar, but "Acme" and "A" are less similar
    const lengthDiff = Math.abs(fieldValue.length - search.length);
    if (lengthDiff > 10) {
      score -= lengthDiff * 2;  // Big penalty for very different lengths
    } else {
      score -= lengthDiff;      // Small penalty for slightly different lengths
    }
    
    return { account, score, fieldValue };  // Return the account with its score
  });

  // Sort by score (highest first), then remove any with zero or negative scores
  const sorted = scored
    .sort((a, b) => b.score - a.score)  // Sort: highest score first
    .filter(item => item.score > 0);    // Only keep accounts with positive scores
  
  // Remove duplicates - if multiple accounts have the same value, only show one
  // Example: If two accounts both have "Acme Corp", only suggest it once
  const seen = new Set<string>();
  const unique: typeof scored = [];
  
  for (const item of sorted) {
    if (!seen.has(item.fieldValue)) {
      seen.add(item.fieldValue);  // Mark this value as seen
      unique.push(item);           // Add to unique list
      if (unique.length >= 5) break; // Stop once we have 5 unique suggestions
    }
  }

  // Return just the account objects (not the scores)
  return unique.map(item => item.account);
}

