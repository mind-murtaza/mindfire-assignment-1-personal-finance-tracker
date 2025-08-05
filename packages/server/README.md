# Personal Finance Tracker - Backend 🚀

A robust Node.js/Express backend API for the Personal Finance Tracker application, featuring JWT authentication, MongoDB integration, and comprehensive financial data management.

## 🎯 Overview

The backend provides a secure, scalable RESTful API for managing user authentication, financial transactions, categories, and generating analytical data for the frontend application.

## 🛠️ Technology Stack

### Core Technologies
- **Node.js** - JavaScript runtime environment
- **Express.js** - Fast, unopinionated web framework
- **MongoDB** - NoSQL database for flexible data storage
- **Mongoose** - Elegant MongoDB object modeling

### Security & Authentication
- **JWT (jsonwebtoken)** - Stateless authentication
- **bcryptjs** - Password hashing and verification
- **Helmet** - Security middleware for Express
- **CORS** - Cross-Origin Resource Sharing

### Data Validation & Processing
- **Zod** - TypeScript-first schema validation
- **dotenv** - Environment variable management

### Development Tools
- **Nodemon** - Auto-restart during development
- **TypeScript** - Type-safe development (planned)

## 📁 Project Structure

```
packages/server/
├── 📁 src/
│   ├── 📁 api/
│   │   ├── 📁 middlewares/    # Custom middleware functions
│   │   └── 📁 routes/         # API route definitions
│   ├── 📁 config/             # Configuration files
│   ├── 📁 controllers/        # Business logic controllers
│   ├── 📁 db/                 # Database connection and setup
│   ├── 📁 models/             # Mongoose schemas and models
│   ├── 📁 services/           # Business service layer
│   └── 📁 utils/              # Utility functions and helpers
├── 📄 .env                    # Environment variables
├── 📄 package.json            # Dependencies and scripts
└── 📄 Dockerfile.dev          # Development Docker configuration
```

## 🚀 Development

### Prerequisites
- Node.js 18+
- MongoDB (local installation or MongoDB Atlas)
- Yarn package manager

### Local Development

```bash
# Install dependencies
yarn install

# Start development server with auto-reload
yarn dev

# The API will be available at http://localhost:4000
```

### Available Scripts

```bash
yarn dev        # Start development server with nodemon
yarn start      # Start production server
yarn build      # Build TypeScript (when implemented)
```

## 🔐 Environment Configuration

Create a `.env` file in the server directory:

```env
# Database
MONGO_URI=mongodb://localhost:27017/finance-tracker

# Authentication
JWT_SECRET=your-super-secret-jwt-key-here

# Server Configuration
PORT=4000
NODE_ENV=development

# Frontend
CORS_ORIGIN=http://localhost:5173
```

## 📊 Database Models


## 🛣️ API Endpoints


## 🔒 Security Features

### Authentication Middleware
- JWT token validation
- Route protection for authenticated users
- Token refresh mechanism (planned)

### Data Validation
- Zod schemas for request validation
- Input sanitization
- Type checking for all endpoints

### Security Headers
- Helmet.js for security headers
- CORS configuration
- Rate limiting (planned)

## 🏗️ Architecture Patterns

### MVC Pattern
- **Models**: Data structure and database interaction
- **Views**: JSON responses (no template engine)
- **Controllers**: Business logic and request handling

### Service Layer
- Separation of business logic from controllers
- Reusable service functions
- Database abstraction

### Middleware Pipeline
```javascript
Request → CORS → Helmet → Body Parser → Auth → Routes → Error Handler → Response
```

## 📈 Analytics & Reporting

### Financial Calculations
- Total income/expense calculations
- Category-wise spending analysis
- Monthly trend analysis
- Balance calculations

### Data Aggregation
- MongoDB aggregation pipelines
- Real-time statistics generation
- Flexible date range queries

## 🔧 Database Operations

### Connection Management
- Mongoose connection handling
- Connection pooling
- Graceful shutdown procedures

### Data Relationships

## 🚀 Performance Optimizations

- **Database Indexing**: Optimized queries
- **Pagination**: Large dataset handling
- **Caching**: Response caching (planned)

## 🧪 Testing (Planned)



## 📊 Monitoring & Logging

- Request/response logging
- Error tracking and reporting
- Performance monitoring (planned)
- Health check endpoints


## 🐳 Docker Support

The application includes Docker support for development:

```dockerfile
# Development setup with live reloading
FROM node:22-alpine
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile
CMD ["yarn", "dev"]
```

## 📝 Error Handling

Comprehensive error handling including:
- Validation errors
- Database connection errors
- Authentication failures
- Not found resources
- Server errors

---

Built with ⚡ using Node.js and Express