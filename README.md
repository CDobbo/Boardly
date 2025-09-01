# Boardly - Modern Project Management Platform

A powerful, full-stack project management platform built with React, Node.js, and SQLite. Boardly helps teams collaborate effectively with Kanban boards, drag-and-drop task management, team collaboration features, and real-time project analytics.

## Features

- 🔐 **Authentication**: Secure email/password authentication with JWT
- 📊 **Dashboard**: Real-time project statistics and performance metrics
- 🗂️ **Projects**: Create and manage multiple projects
- 📋 **Kanban Boards**: Visual task management with customizable columns
- 🖱️ **Drag & Drop**: Intuitive task reordering across columns
- 🔍 **Search & Filter**: Find tasks by status, priority, or assignee
- 👥 **Team Management**: Add team members to projects
- 📱 **Responsive Design**: Works on desktop and mobile devices
- 🎨 **Modern UI**: Built with Tailwind CSS and shadcn/ui components
- 💾 **Local Storage**: SQLite database for reliable local data storage

## Tech Stack

### Backend
- **Node.js** with Express.js
- **SQLite** database with better-sqlite3
- **JWT** for authentication
- **bcryptjs** for password hashing
- **Express Validator** for input validation

### Frontend
- **React** with TypeScript
- **Tailwind CSS** for styling
- **shadcn/ui** component library
- **Framer Motion** for animations
- **React Router** for navigation
- **@dnd-kit** for drag-and-drop functionality
- **Recharts** for data visualization
- **Axios** for API calls

## Installation & Setup

### Prerequisites
- Node.js 16+ and npm
- Git

### 1. Clone the Repository
```bash
git clone <repository-url>
cd Boardly
```

### 2. Install Dependencies

#### Root Dependencies
```bash
# Install root project dependencies
npm install
```

#### Backend Setup
```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Initialize the SQLite database
npm run init-db

# Start the development server
npm run dev
```

The backend server will start on `http://localhost:5005`

#### Frontend Setup
```bash
# Navigate to frontend directory (in a new terminal)
cd frontend

# Install dependencies
npm install

# Start the development server
npm start
```

The frontend application will start on `http://localhost:3000`

### 3. Environment Configuration

#### Backend (.env)
The backend includes a `.env.example` file with default settings:
```env
PORT=5005
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
DB_PATH=./database.sqlite
NODE_ENV=development
```

Copy this to `.env` and customize as needed:
```bash
cd backend
cp .env.example .env
```

**Important**: Change the `JWT_SECRET` to a secure random string in production!

#### Frontend (Optional)
Create a `.env` file in the frontend directory if you need to customize the API URL:
```env
REACT_APP_API_URL=http://localhost:5005/api
```

### 4. Build for Production

```bash
# Build frontend
cd frontend
npm run build

# The build output will be in frontend/build/
# Serve with any static file server
```

## Usage

### 1. Create an Account
- Visit `http://localhost:3000`
- Click "Sign up" to create a new account
- Enter your name, email, and password

### 2. Create Your First Project
- Click "New Project" from the dashboard or projects page
- Enter a project name and description
- Your project will be created with a default Kanban board

### 3. Manage Tasks
- Click on a project to view its Kanban board
- Add columns by clicking "Add Column"
- Create tasks by clicking "Add Task" in any column
- Drag tasks between columns to update their status
- Click on tasks to edit details (title, description, priority, due date)

### 4. View Analytics
- Return to the dashboard to view project statistics
- See task distribution by status, priority, and assignee
- Monitor overdue tasks and team performance

## Project Structure

```
Boardly/
├── backend/
│   ├── src/
│   │   ├── db/
│   │   │   └── init.js          # Database schema and initialization
│   │   ├── middleware/
│   │   │   ├── auth.js          # JWT authentication middleware
│   │   │   └── errorHandler.js  # Global error handling
│   │   ├── routes/
│   │   │   ├── auth.js          # Authentication endpoints
│   │   │   ├── projects.js      # Project management
│   │   │   ├── boards.js        # Board and column management
│   │   │   └── tasks.js         # Task CRUD operations
│   │   └── index.js             # Express server setup
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/          # React components
│   │   ├── pages/               # Page components
│   │   ├── services/            # API service functions
│   │   ├── hooks/               # Custom React hooks
│   │   └── types/               # TypeScript type definitions
│   ├── package.json
│   └── .env (optional)
└── README.md
```

## Development

### Running Tests
```bash
# Backend tests (if available)
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

### Database Management
The SQLite database file (`database.sqlite`) is created automatically when you first run the backend. It contains:
- Users and authentication data
- Projects and team memberships
- Kanban boards and columns
- Tasks and dependencies

### API Endpoints
The backend provides RESTful API endpoints:
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/projects` - List user's projects
- `POST /api/projects` - Create new project
- `GET /api/boards/:projectId` - Get project board
- `POST /api/tasks` - Create new task
- `PUT /api/tasks/:id` - Update task
- And more...

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes
4. Run tests: `npm test`
5. Commit changes: `git commit -am 'Add feature'`
6. Push to branch: `git push origin feature-name`
7. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For questions or issues, please open a GitHub issue or contact the development team.