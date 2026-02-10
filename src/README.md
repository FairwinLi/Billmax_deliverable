# Account Search Prototype

A functional prototype for searching and filtering account records.

### Primary Search Page
- Simple search interface
- Search by: Account Number, Company Name, Contact Name, Phone Number, or Email, with case sensitive search
- Expandable filter panel with:
  - Account status checkboxes (Open, Closed, Collections, Suspended)
  - Balance range filters (min/max)
  - Date range filters for date added
- Results displayed in a clean data table
- Result count displayed with search results

### Secondary Search Page (Advanced)
- Multi-criteria search with dynamic rows
- Add/remove search criteria as needed
- Logic operator selection (AND/OR)
  - AND: Match ALL criteria
  - OR: Match ANY criteria
- Account status filter checkboxes
- Navigation between simple and advanced search

## Technologies Used

- React - UI library
- TypeScript - Type safety
- React Router - Client-side routing
- Tailwind CSS - Styling
- Lucide React - Icons

## How to Run

- Install Dependencies
   ```bash
   npm install
   ```

- Start the Development Server
   ```bash
   npm run dev
   ```

- Open in Browser
   - The application will be available at `http://localhost:5173/`
   - It should open automatically in your default browser

- Stop the Server
   - Press `Ctrl + C` in the terminal to stop the development server
  
## Search Capabilities

The prototype supports searching across multiple fields:
- Account Number
- Company Name
- Contact Name
- Phone Number
- Email
- Account Status (via checkboxes)
- Balance Range
- Date Range (date added)

## Basic Use Guide

### Primary Search Page

- Searching Accounts
   - Type your search term in any of the table header input fields (Account Number, Company Name, Contact Name, Phone Number, or Email)
   - Press `Enter` to execute the search
   - Results will update to show matching accounts
   - Use the "Case sensitive" checkbox to toggle exact case matching

- Using Filters
   - Click the "Filters" button to open the filter panel
   - Select account statuses using checkboxes (Open, Closed, Collections, Suspended)
   - Filters are applied when you press `Enter` or interact with filter controls

- Sorting Results
   - Click on any column header to sort by that field
   - Click again to reverse the sort order

- Navigating to Advanced Search
   - Click "Advanced Search" to switch to the secondary search page

### Secondary Search Page (Advanced)

- Building Complex Filters
   - Use the "Where [field] [operator] [value]" format to create filter conditions
   - Click "Add Filter" to add more filter rows
   - Click the + button to formally add your filter into the apply filters section.
   - Select AND/OR logic to combine multiple filters:
     - AND: Results must match ALL criteria
     - OR: Results must match ANY criteria
   - Remove filters by clicking the X button on any filter row, or simply not clicking the + button

- Searching
   - You can also search directly in table column headers (same as primary page)
   - Click the "Search" button to execute all filters and search criteria together

- Returning to Simple Search
   - Unclick the advanced search check box to only utilize simple default filters, and X out of the filters section to go back to searching through headers!

## How the Prototype Works

### Architecture Overview

The prototype is built as a single-page application (SPA) using React and TypeScript. It consists of three main layers:

- Data Layer (`data/mockData.ts`)
   - Contains 50 sample account records stored in memory
   - Each account has fields like account number, company name, contact info, status, balance, and dates
   - In a production application, this would connect to a database or API

- Utility Layer (`utils/searchUtils.ts`)
   - Handles the core search, filtering, and sorting logic
   - Validates user input and performs pattern matching
   - Keeps business logic separate from UI components for maintainability

- UI Layer (`pages/`)
   - PrimarySearchPage: Main interface with inline search inputs and an expandable filter panel
   - SecondarySearchPage: Advanced interface for building complex multi-criteria filters with AND/OR logic

### Search Execution Model

- Users type search terms and configure filters
- Search is executed when:
  - User presses `Enter` in a search field
  - User clicks the "Search" button (on advanced page)
  - User interacts with filter controls (checkboxes, date pickers, etc.)
- This approach prevents excessive filtering while users are still typing

### Filtering System

three types of filters:

- Checkbox Filter: Account status selection (Open, Closed, Collections, Suspended)
- Logic Operator Filter: AND/OR operators to combine multiple filter conditions
- Date-Based Filter: Date range selection for date added filtering

Additional filters include:
- Balance range (min/max numeric values)
- Text-based search with operators (contains, starts with, equals, etc.)

### State Management

- Search Filters: Tracks what users are currently typing (not yet applied)
- Executed Filters: Stores the filters that were actually used for the last search
- This separation allows users to modify their search without immediately updating results

## Unique Design Decisions

- TypeScript ensures data consistency and catches errors early (balance/phone # must be all numbers, date must be current and chronological, etc)
- Users must type in an item, and cannot filter through or add an empty filter without an error being thrown
- If a user's choice cannot be found, then suggestion and matching computation is done to suggest results that are similar to what you were searching up as alternatives in case of mistyping or if one is unsure about their search result.
- Case sensitive search was added in case users wanted to be able to search directly for sequences of numbers/letters in sequential order rather than if a number/letter existed--> allows for more refined search results
- To make filtering more concise, sort by will sort in ascending alphabetical and numerical order
- To make filtering more concise, the date range section is utilized to handle before/after/between calculations depending on what a user uploads for dates (only one right hand date = all after a certain point, only left hand date = all before a certain point, between checks date ranges, etc)
- Added "does not contain", "contains", "is", and "starts with" logic to allow for multiple different forms of searching depending on what a user knows about existing information strings (only knows beginning, what it contains, etc)