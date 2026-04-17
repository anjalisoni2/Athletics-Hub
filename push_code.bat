@echo off
setlocal

echo Clearing existing Git configuration to start fresh...
if exist ".git" rd /s /q ".git"

echo Removing nested Git configuration in backend...
if exist "athletics_event_platform_backend\.git" rd /s /q "athletics_event_platform_backend\.git"

echo Initializing new Git repository...
git init

echo Setting up remote origin...
git remote add origin https://github.com/anjalisoni2/Athletics-Hub

echo Staging ALL files...
git add -A

echo Committing files...
git commit -m "Initial commit: Athletic Event Platform (Full Stack)"

echo Renaming branch to main...
git branch -M main

echo Force pushing to GitHub...
git push -f -u origin main

echo.
echo Process complete! Please check your GitHub repository.
pause
