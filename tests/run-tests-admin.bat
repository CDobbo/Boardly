@echo off
echo Starting TaskManager Test Suite...
echo.

echo Starting Backend Server...
start /B "Backend" cmd /c "cd ../backend && npm start"

echo Waiting for backend to start...
timeout /t 10 /nobreak > nul

echo Starting Frontend Server...
start /B "Frontend" cmd /c "cd ../frontend && npm start"

echo Waiting for frontend to start...
timeout /t 30 /nobreak > nul

echo.
echo Running Playwright Tests...
cd ..
npx playwright test --reporter=html

echo.
echo Test run completed!
echo Opening test report...
npx playwright show-report

pause