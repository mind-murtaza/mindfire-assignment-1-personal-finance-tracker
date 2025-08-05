# Personal Finance Tracker - Frontend 💻

The React-based frontend for the Personal Finance Tracker application, built with modern tools and best practices.

## 🎯 Overview

The client application provides a responsive, interactive user interface for managing personal finances with real-time data visualization and seamless user experience.

## 🛠️ Technology Stack

### Core Technologies
- **React 19** - Latest React with concurrent features
- **TypeScript** - Type-safe development
- **Vite** - Lightning-fast build tool and dev server

### Styling & UI
- **Tailwind CSS** - Utility-first CSS framework
- **Tailwind Merge** - Conditional class merging
- **Lucide React** - Beautiful icon library

### Data Management
- **React Query (TanStack Query)** - Server state management
- **Axios** - HTTP client for API communication

### Routing & Navigation
- **React Router DOM v7** - Client-side routing

### Data Visualization
- **Chart.js** - Powerful charting library
- **React-Chart.js-2** - React wrapper for Chart.js

### Development Tools
- **ESLint** - Code linting with TypeScript support
- **PostCSS & Autoprefixer** - CSS processing

## 📁 Project Structure


## 🚀 Development

### Prerequisites
- Node.js 18+ 
- Yarn package manager

### Local Development

```bash
# Install dependencies
yarn install

# Start development server
yarn dev

# The app will be available at http://localhost:5173
```

### Available Scripts

```bash
yarn dev        # Start development server with hot reload
yarn build      # Build for production
yarn preview    # Preview production build locally
yarn lint       # Run ESLint
```

## 🎨 Key Features

### Dashboard
- **Financial Overview**: Real-time balance, income, and expense totals
- **Interactive Charts**: Monthly trends, category breakdowns
- **Quick Actions**: Add transactions, view recent activity

### Transaction Management
- **Add Transactions**: Income and expense entry with categories
- **Edit/Delete**: Modify existing transactions
- **Filtering**: Search and filter by date, category, amount
- **Categorization**: Custom category creation and management

### Data Visualization
- **Spending Trends**: Line charts showing spending over time
- **Category Breakdown**: Pie charts for expense categories
- **Monthly Reports**: Bar charts for monthly comparisons
- **Budget Tracking**: Progress indicators for budget goals

### User Interface
- **Responsive Design**: Mobile-first approach
- **Dark/Light Mode**: Theme switching (planned)
- **Accessibility**: WCAG 2.1 compliant
- **Performance**: Optimized with React 19 features

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the client directory:

```env
VITE_API_URL=http://localhost:4000/api
VITE_APP_NAME=Personal Finance Tracker
```

### Tailwind Configuration

The project uses Tailwind CSS v4 with custom configuration for:
- Brand colors
- Typography scale
- Component variants
- Responsive breakpoints

## 📱 Responsive Design

The application is built mobile-first with breakpoints:
- **Mobile**: 320px - 767px
- **Tablet**: 768px - 1023px  
- **Desktop**: 1024px+

## 🔗 API Integration

### Service Layer
The client communicates with the backend through a structured service layer:


### React Query Integration
Server state is managed using React Query for:
- Automatic caching
- Background updates
- Optimistic updates
- Error handling

## 🎯 Component Architecture

### Component Categories
- **Layout**: Header, Sidebar, Footer
- **UI**: Buttons, Inputs, Modals, Cards
- **Features**: Transaction forms, Chart components
- **Pages**: Dashboard, Transactions, Categories

### Design Patterns
- **Compound Components**: Complex UI interactions
- **Custom Hooks**: Business logic separation
- **Error Boundaries**: Graceful error handling
- **Suspense**: Loading states management

## 🚀 Performance Optimizations

- **Code Splitting**: Route-based lazy loading
- **Image Optimization**: WebP format with fallbacks
- **Bundle Analysis**: Vite bundle analyzer
- **Memoization**: React.memo for expensive components

## 🧪 Testing (Planned)

---

Built with ❤️ using React and TypeScript