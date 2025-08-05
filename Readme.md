# Personal Finance Tracker 💰

A comprehensive personal finance tracking application built with the MERN stack, featuring income/expense management, data visualization, and financial insights.

## 🎯 Project Overview

This application allows users to:
- **Track Income & Expenses**: Add, edit, and delete financial transactions
- **Categorize Transactions**: Organize finances with custom categories
- **Visual Analytics**: Interactive charts and graphs showing spending patterns
- **Financial Dashboard**: Real-time overview of financial health
- **Secure Authentication**: JWT-based user authentication
- **Responsive Design**: Works seamlessly across devices

## 🏗️ Architecture & Monorepo Approach

### Why Monorepo?

We chose a **monorepo architecture** using **Yarn Workspaces** for several key advantages:

1. **Unified Development**: Single repository for both frontend and backend
2. **Shared Dependencies**: Efficient dependency management across packages
3. **Consistent Tooling**: Shared linting, formatting, and build configurations
4. **Simplified Deployment**: Single source of truth for the entire application
5. **Developer Experience**: Easier to maintain, test, and deploy as a cohesive unit

### Project Structure

```
personal-finance-tracker/
├── 📁 packages/
│   ├── 📁 client/          # React Frontend (Port: 5173)
│   └── 📁 server/          # Node.js Backend (Port: 4000)
├── 🐳 docker-compose.yml   # Container orchestration
├── 📦 package.json         # Root workspace configuration
└── 📖 README.md           # This file
```

## 🚀 Quick Start with Docker

### Prerequisites
- **Docker** and **Docker Compose** installed
- **Git** for cloning the repository

### One-Command Setup

```bash
# Clone the repository
git clone <repository-url>
cd personal-finance-tracker

# Start the entire application (first time - builds containers)
yarn dev:build

# For subsequent runs (uses cached containers)
yarn dev
```

**That's it!** 🎉 

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:4000

### Available Scripts

```bash
yarn dev          # Start development environment
yarn dev:build    # Rebuild containers and start
yarn down         # Stop all services
yarn build        # Build production containers
```

## 🔧 Manual Setup (Without Docker)

If you prefer to run services individually:

```bash
# Install dependencies for all packages
yarn install

# Terminal 1 - Start Backend
cd packages/server
yarn dev

# Terminal 2 - Start Frontend  
cd packages/client
yarn dev
```

## 🛠️ Technology Stack

### Frontend (`packages/client/`)
- **React 19** with **TypeScript**
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **Chart.js & React-Chart.js-2** for data visualization
- **React Router** for navigation
- **React Query** for server state management
- **Axios** for API communication

### Backend (`packages/server/`)
- **Node.js** with **Express.js**
- **MongoDB** with **Mongoose** ODM
- **JWT** authentication
- **Zod** for data validation
- **bcryptjs** for password hashing
- **Helmet** for security headers
- **CORS** for cross-origin requests

## 📚 Detailed Documentation

### 📖 Component Documentation
- **[Client Documentation](packages/client/README.md)** - Frontend architecture, components, and features
- **[Server Documentation](packages/server/README.md)** - API endpoints, database models, and backend logic

## 🌟 Key Features

### Financial Management
- ✅ Add/Edit/Delete transactions
- ✅ Custom category creation
- ✅ Transaction filtering and search
- ✅ Monthly/yearly summaries

### Data Visualization
- 📊 Interactive spending charts
- 📈 Income vs. expense trends
- 🥧 Category breakdown pie charts
- 📅 Monthly spending patterns

### User Experience
- 🔐 Secure user authentication
- 📱 Fully responsive design
- ⚡ Real-time updates
- 🎨 Clean, intuitive interface

## 🔒 Environment Variables

Create a `.env` file in `packages/server/`:

```env
MONGO_URI=mongodb://localhost:27017/finance-tracker
JWT_SECRET=your-secret-key
CORS_ORIGIN=http://localhost:5173
PORT=4000
```

## 🐳 Docker Benefits

Our Docker setup provides:
- **Consistent Environment**: Same setup across all development machines
- **Live Reloading**: Instant updates during development
- **Isolated Dependencies**: No conflicts with system packages
- **Easy Onboarding**: New developers up and running in minutes
- **Production Parity**: Development environment mirrors production

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**Happy Tracking!** 💰📈
