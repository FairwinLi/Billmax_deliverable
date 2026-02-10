/**
 * MOCK DATA
 * 
 * This file contains sample account data that the application uses for demonstration.
 * In a real application, this data would come from a database or API.
 * 
 * The data includes 50 sample accounts with realistic information like company names,
 * contact details, account status, and balances. This allows us to test the search
 * and filtering features without needing a real backend.
 */

/**
 * Defines the structure of an account record.
 * Every account has these properties, which represent the information we can search and filter by.
 */
export interface Account {
  id: string;                    // Unique identifier for the account
  accountNumber: string;          // The account number (searchable)
  companyName: string;            // Company name (searchable)
  contactName: string;            // Contact person's name (searchable)
  phoneNumber: string;            // Phone number (searchable)
  email: string;                 // Email address (searchable)
  status: 'Open' | 'Closed' | 'Collections' | 'Suspended';  // Account status (filterable)
  balance: number;                // Account balance (filterable by range)
  createdDate: string;           // When account was created (filterable by date)
  lastActivity: string;          // Last activity date (filterable by date)
  dateAdded: string;             // When account was added to system (filterable by date)
}

/**
 * DATA GENERATION
 * 
 * The functions below create realistic sample data by randomly combining
 * names, companies, and other information. This gives us varied data to test with.
 */

// Possible account statuses
const statuses: Account['status'][] = ['Open', 'Closed', 'Collections', 'Suspended'];

// Lists of names and companies to randomly combine
const firstNames = ['John', 'Jane', 'Michael', 'Sarah', 'David', 'Emily', 'Robert', 'Lisa', 'William', 'Jennifer'];
const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];
const companies = ['Acme Corp', 'TechStart Inc', 'Global Solutions', 'Innovation Labs', 'Bright Future Co', 'Digital Dynamics', 'Prime Enterprises', 'Nexus Group', 'Summit Partners', 'Vertex Systems'];

/**
 * Creates a random date between two dates.
 * This is used to generate realistic dates for account creation and activity.
 * 
 * @param start - Earliest possible date
 * @param end - Latest possible date
 * @returns A date string in YYYY-MM-DD format
 */
function generateRandomDate(start: Date, end: Date): string {
  const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return date.toISOString().split('T')[0];
}

/**
 * Generates 50 sample accounts with random but realistic data.
 * Each account has a unique ID, random account number, company, contact person,
 * and other details. This provides enough data to test search and filtering features.
 * 
 * The data is generated once when the application loads and stored in memory.
 */
export const mockAccounts: Account[] = Array.from({ length: 50 }, (_, i) => {
  // Randomly pick a first and last name
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  
  return {
    id: `ACC${String(i + 1).padStart(5, '0')}`,  // Unique ID like ACC00001, ACC00002, etc.
    accountNumber: String(10000000 + Math.floor(Math.random() * 90000000)),  // 8-digit account number
    companyName: companies[Math.floor(Math.random() * companies.length)],  // Random company
    contactName: `${firstName} ${lastName}`,  // Full name from random first + last
    phoneNumber: `(${Math.floor(100 + Math.random() * 900)}) ${Math.floor(100 + Math.random() * 900)}-${Math.floor(1000 + Math.random() * 9000)}`,  // Phone format: (XXX) XXX-XXXX
    email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,  // Email from name
    status: statuses[Math.floor(Math.random() * statuses.length)],  // Random status
    balance: Math.floor(Math.random() * 100000) - 20000,  // Balance between -$20,000 and $80,000
    createdDate: generateRandomDate(new Date(2020, 0, 1), new Date(2024, 0, 1)),  // Date between 2020-2024
    lastActivity: generateRandomDate(new Date(2023, 0, 1), new Date(2026, 2, 7)),  // Date between 2023-2026
    dateAdded: generateRandomDate(new Date(2019, 0, 1), new Date(2025, 0, 1)),  // Date between 2019-2025
  };
});