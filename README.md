# Account Search Prototype

A functional prototype for searching and filtering account records, built as a technical interview assignment.

## How to Run This Prototype

### Prerequisites
- Node.js (version 16 or higher recommended)
- npm (comes with Node.js)

### Installation Steps

1. **Install Dependencies**
   ```bash
   npm install
   ```
   This downloads all the required libraries and packages the application needs to run.

2. **Start the Development Server**
   ```bash
   npm run dev
   ```
   This starts a local web server on your computer. You should see a message like:
   ```
   VITE v6.x.x  ready in xxx ms
   
   ➜  Local:   http://localhost:5173/
   ```

3. **Open in Browser**
   - The application should automatically open in your default browser
   - If not, manually navigate to the URL shown in the terminal (usually `http://localhost:5173/`)

4. **Stop the Server**
   - Press `Ctrl + C` in the terminal to stop the development server

### Building for Production

To create a production-ready build:
```bash
npm run build
```

This creates an optimized version of the application in the `build` folder that can be deployed to a web server.

## Brief Explanation of the Approach

### Overall Architecture

This prototype is built as a **single-page application (SPA)** using React and TypeScript. Think of it like a smart web page that can update itself without needing to reload the entire page. The application is divided into clear sections that each handle a specific job:

1. **Data Layer** (`data/mockData.ts`)
   - Contains 50 sample account records
   - In a real application, this would come from a database or API
   - Provides realistic test data for all search and filter features

2. **Utility Functions** (`utils/searchUtils.ts`)
   - Helper functions that do the actual work of searching, sorting, and validating
   - Keeps the main page code clean and organized
   - Can be reused across different parts of the application

3. **Page Components** (`pages/`)
   - **PrimarySearchPage**: The main search interface with a filter panel
   - **SecondarySearchPage**: Advanced search with complex filter building
   - Each page is self-contained and handles its own state

4. **Routing** (`routes.ts`)
   - Manages navigation between the two pages
   - Like a map that tells the application which page to show

### Key Design Decisions

#### 1. Non-Real-Time Search
**Why:** The requirements specified that search should NOT be real-time. Users must press Enter or click a search button to execute searches.

**How it works:**
- The application maintains two sets of filters:
  - **Current filters**: What the user is typing (not yet applied)
  - **Executed filters**: What was actually used for the current results
- This separation allows users to type freely without triggering searches, then execute when ready

#### 2. Component-Based Architecture
**Why:** React encourages breaking code into reusable components. This makes the code easier to understand, test, and maintain.

**How it works:**
- Each major feature (search table, filter panel, etc.) is organized into logical sections
- Functions are grouped by purpose (state management, search execution, filter evaluation, etc.)
- Clear comments explain what each section does

#### 3. Type Safety with TypeScript
**Why:** TypeScript helps catch errors before the code runs and makes the code more self-documenting.

**How it works:**
- Every piece of data has a defined "type" (like Account, SearchFilters, etc.)
- The compiler checks that we're using data correctly
- This prevents bugs like trying to use a number as text

#### 4. In-Memory Data
**Why:** The requirements specified that mock data is sufficient - no backend needed.

**How it works:**
- All account data is generated when the application loads
- Data is stored in memory (JavaScript variables)
- Search and filtering happens entirely in the browser

#### 5. Filter System Design
**Why:** Users need flexible ways to find accounts - simple searches and complex multi-criteria filters.

**How it works:**
- **Simple filters**: Direct search inputs in table headers (press Enter to search)
- **Advanced filters**: Complex conditions with AND/OR logic, multiple values, date ranges
- Filters can be combined - all active filters work together to narrow results

### How the Search Works

1. **User Input**: User types in search boxes or sets up filters
2. **Validation**: System checks if the input is valid (e.g., account numbers can't have letters)
3. **Execution**: When user presses Enter or clicks Search, the filters are applied
4. **Filtering**: Each account is checked against all active filters
5. **Sorting**: Results are sorted by the selected field
6. **Display**: Matching accounts are shown in the results table

### Code Organization

The code is organized to be:
- **Readable**: Clear variable names, comments explaining what each section does
- **Maintainable**: Functions are focused on single tasks, easy to find and modify
- **Extensible**: New features can be added without breaking existing functionality
- **Well-documented**: Comments explain the "why" and "how" in plain language

## Features

### Primary Search Page
- Simple search interface with dropdown field selector
- Search by: Account Number, Company Name, Contact Name, Phone Number, or Email
- Real-time filtering as you type (updates when you press Enter)
- Expandable filter panel with:
  - Account status checkboxes (Open, Closed, Collections, Suspended)
  - Balance range filters (min/max)
  - Date range filters for last activity
- Results displayed in a clean data table
- Result count shown in real-time
- Export and Save options

### Secondary Search Page (Advanced)
- Multi-criteria search with dynamic rows
- Add/remove search criteria as needed
- Logic operator selection (AND/OR)
  - AND: Match ALL criteria
  - OR: Match ANY criteria
- Account status filter checkboxes
- Navigation between simple and advanced search

## Technologies Used

- **React** - UI library for building interactive interfaces
- **TypeScript** - Adds type safety to JavaScript
- **React Router** - Handles navigation between pages
- **Tailwind CSS** - Styling framework for modern, responsive design
- **Lucide React** - Icon library
- **Vite** - Fast build tool and development server

## Search Capabilities

The prototype supports searching across multiple fields:
- Account Number
- Company Name
- Contact Name
- Phone Number
- Email
- Account Status (via checkboxes)
- Balance Range
- Date Range (last activity)

All searches are case-insensitive by default (unless "Case sensitive" is checked) and support partial matches.

## Design Decisions

- **No backend**: Used in-memory mock data as specified in requirements
- **Non-real-time filtering**: Updates results when user presses Enter or clicks Search button
- **Visual feedback**: Status badges color-coded for quick scanning
- **Clear navigation**: Easy switching between simple and advanced search modes
- **Accessibility**: Proper form labels and keyboard navigation support
- **Responsive design**: Works on different screen sizes

## File Structure

```
src/
├── data/
│   └── mockData.ts          # Sample account data (50 records)
├── pages/
│   ├── PrimarySearchPage.tsx    # Main search page with filter panel
│   └── SecondarySearchPage.tsx  # Advanced search page
├── utils/
│   └── searchUtils.ts       # Search, sort, and validation functions
├── components/              # Reusable UI components
├── routes.ts               # Page routing configuration
└── App.tsx                 # Main application component
```

## Notes

- This is a prototype/demonstration - not production-ready code
- All data is mock/in-memory - no persistence between page refreshes
- Some features (like Export to Excel/PDF, Save Options) show UI but have limited functionality
- The focus is on demonstrating search and filtering capabilities, not full feature implementation
