# College Attendance Management System

A comprehensive web application for managing college attendance, built with React (frontend) and Express.js + MySQL (backend).

## Features

- **Multi-role Authentication**: Admin, Faculty, and Student roles
- **Session Management**: Create and manage class sessions with OTP/QR code attendance
- **Attendance Tracking**: Mark attendance via OTP or bulk marking
- **Leave Management**: Submit and approve leave requests
- **Survey System**: Post-session feedback collection
- **Notifications**: Real-time notifications for all users
- **Dashboard Analytics**: Comprehensive dashboards for each role

## Tech Stack

### Frontend
- React 19 with TypeScript
- Vite for build tooling
- Zustand for state management
- Tailwind CSS for styling
- React Router for navigation
- Framer Motion for animations

### Backend
- Node.js with Express.js
- SQLite database (better-sqlite3)
- JWT authentication
- bcrypt for password hashing
- CORS enabled

## Setup Instructions

### Prerequisites
- Node.js (v20 or higher)
- MySQL server
- npm or yarn

### 1. Clone and Install Dependencies

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..
```

### 2. Database Setup

The application uses SQLite, which requires no additional setup. The database file will be created automatically.

1. Initialize the database:
   ```bash
   npm run init-db
   ```

This creates `backend/attendance.db` with all necessary tables and sample data.

### 3. Run the Application

#### Option 1: Run both frontend and backend together
```bash
npm run dev:full
```

#### Option 2: Run separately
```bash
# Terminal 1: Start backend
npm run dev:backend

# Terminal 2: Start frontend
npm run dev
```

### 4. Access the Application

- Frontend: http://localhost:3000 (or the port shown in your terminal)
- Backend API: http://localhost:5000

## Default Users

After running `npm run init-db`, you can login with:

- **Admin**: admin@college.edu / password
- **Faculty**: kumar@college.edu / password
- **Student**: student@college.edu / password

## API Documentation

The backend provides RESTful APIs for:
- Authentication (`/api/auth`)
- Users management (`/api/users`)
- Sessions management (`/api/sessions`)
- Attendance tracking (`/api/attendance`)
- Surveys (`/api/surveys`)
- Leave requests (`/api/leaves`)
- Notifications (`/api/notifications`)

## Project Structure

```
├── src/                    # Frontend React app
│   ├── components/         # Reusable components
│   ├── pages/             # Page components
│   ├── store.ts           # Zustand state management
│   └── ...
├── backend/               # Express.js backend
│   ├── server.js          # Main server file
│   ├── init-db.js         # Database initialization
│   ├── package.json       # Backend dependencies
│   └── .env               # Environment variables
├── package.json           # Frontend dependencies and scripts
└── README.md
```

## Development

- Frontend uses hot reload with Vite
- Backend uses `--watch` mode for development
- Database schema is defined in `backend/init-db.js`
- API endpoints are documented in `backend/server.js`

## Deployment

1. Build the frontend: `npm run build`
2. Deploy the `dist/` folder to your web server
3. Deploy the backend to your Node.js hosting service
4. Update database connection strings for production

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request
