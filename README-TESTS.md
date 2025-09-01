# TaskManager - Playwright Test Suite

This directory contains a comprehensive end-to-end test suite built with Playwright that covers all functionality implemented in the TaskManager application.

## Test Coverage

### Authentication Tests (`auth.spec.ts`)
- Login/logout functionality
- User registration
- Password validation
- Session persistence
- Role-based access control
- Duplicate username handling

### Task Management Tests (`tasks.spec.ts`)
- Creating, editing, and deleting tasks
- Task filtering by status and priority
- Task sorting functionality
- Kanban board operations
- Drag and drop functionality
- Calendar view operations
- Task count display

### Admin Functionality Tests (`admin.spec.ts`)
- Admin panel access
- User management (role changes, deactivation)
- System statistics display
- User filtering and search
- Bulk operations
- Dashboard charts and metrics

### Data Persistence Tests (`persistence.spec.ts`)
- Data persistence across page refreshes
- User preference persistence
- Cross-session data consistency
- Offline functionality
- Multi-tab synchronization
- Error handling
- Data backup/restore

## Prerequisites

1. **Node.js** (v14 or higher)
2. **Playwright** browsers installed
3. **Backend server** running on port 5001
4. **Frontend server** running on port 3000

## Installation

```bash
# Install Playwright and dependencies
npm install --save-dev @playwright/test
npx playwright install
```

## Configuration

The test suite is configured in `playwright.config.ts` with:
- Multi-browser support (Chromium, Firefox, WebKit)
- Automatic server startup
- Screenshot/video capture on failures
- HTML reporting

## Running Tests

### All Tests
```bash
npm test
```

### Individual Test Suites
```bash
npm run test:auth          # Authentication tests
npm run test:tasks         # Task management tests  
npm run test:admin         # Admin functionality tests
npm run test:persistence   # Data persistence tests
```

### Specific Browser
```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

### With UI Mode
```bash
npx playwright test --ui
```

### Debug Mode
```bash
npx playwright test --debug
```

## Test Reports

After running tests, view the HTML report:
```bash
npm run test:report
```

## Test Structure

Each test file follows this pattern:
- **Setup**: Login and navigation to relevant pages
- **Test execution**: Interaction with UI elements
- **Assertions**: Verification of expected behavior
- **Cleanup**: Proper test isolation

## Key Features Tested

### User Authentication
- ✅ Login with valid/invalid credentials
- ✅ User registration with validation
- ✅ Session persistence across refreshes
- ✅ Role-based navigation restrictions
- ✅ Logout functionality

### Task Operations
- ✅ CRUD operations for tasks
- ✅ Task status transitions
- ✅ Priority assignment and filtering
- ✅ Search and sort functionality
- ✅ Bulk operations

### Project Management
- ✅ Kanban board interactions
- ✅ Drag and drop task movement
- ✅ Project creation and management
- ✅ Board view navigation

### Calendar Integration
- ✅ Event creation and management
- ✅ Calendar navigation (month/week/day views)
- ✅ Event persistence across sessions

### Admin Features
- ✅ User management interface
- ✅ Role assignment and permissions
- ✅ System statistics and metrics
- ✅ Dashboard analytics
- ✅ User search and filtering

### Data Reliability
- ✅ Data persistence across refreshes
- ✅ Cross-tab synchronization
- ✅ Offline/online behavior
- ✅ Error handling and recovery
- ✅ Data backup/export functionality

## Running in CI/CD

The test suite is configured for continuous integration with:
- Retries on failure (2x in CI)
- Parallel execution
- Comprehensive reporting
- Screenshot/video evidence on failures

## Troubleshooting

### Common Issues

1. **Server not starting**: Ensure backend/frontend dependencies are installed
2. **Port conflicts**: Check that ports 3000 and 5001 are available
3. **Browser not found**: Run `npx playwright install`
4. **Test timeouts**: Increase timeout in config for slow systems

### Debug Commands
```bash
# Check server status
curl http://localhost:3000
curl http://localhost:5001/api/health

# View browser console logs
npx playwright test --debug --project=chromium
```

## Extending Tests

To add new tests:
1. Create new `.spec.ts` file in the `tests/` directory
2. Follow existing patterns for setup/teardown
3. Add descriptive test names and good assertions
4. Update this README with new test coverage

## Best Practices

- **Isolation**: Each test is independent and can run alone
- **Data**: Use unique identifiers (timestamps) to avoid conflicts
- **Assertions**: Clear, specific expectations
- **Error handling**: Graceful failure and informative messages
- **Performance**: Efficient selectors and minimal wait times