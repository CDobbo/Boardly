# GitHub Actions Workflows

This directory contains automated CI/CD workflows for the Boardly project.

## Active Workflows

### 🔨 Build Validation (`build-validation.yml`)
**Triggers:** 
- Automatically on every push to main branch
- Manually via GitHub Actions tab

**Purpose:** Ensures both frontend and backend compile successfully

**Jobs:**
- **Frontend Build**: TypeScript compilation, ESLint, React build
- **Backend Build**: Syntax validation, database init test
- **Security Check**: npm audit for vulnerabilities
- **Build Status**: Summary of all checks

### 🔍 Dependency Check (`dependency-check.yml`)
**Triggers:** 
- Weekly on Mondays at 4 AM UTC
- Manually via GitHub Actions tab

**Purpose:** Check for outdated packages and security vulnerabilities

**Jobs:**
- Scans frontend dependencies
- Scans backend dependencies
- Reports security vulnerabilities
- Lists outdated packages
- Provides update commands

## Status Badge

Add this to your main README.md to show build status:

```markdown
![Build Status](https://github.com/YOUR_USERNAME/Boardly/actions/workflows/build-validation.yml/badge.svg)
```

## Manual Workflow Triggers

You can manually run any workflow:
1. Go to the "Actions" tab in your GitHub repository
2. Select the workflow you want to run
3. Click "Run workflow"
4. Select the branch (usually main)
5. Click "Run workflow" button

## Local Testing

To test workflows locally, you can use [act](https://github.com/nektos/act):

```bash
# Install act
# Windows: choco install act
# Mac: brew install act

# Run build validation workflow
act -W .github/workflows/build-validation.yml

# Run dependency check
act -W .github/workflows/dependency-check.yml
```

## Workflow Notifications

GitHub will send email notifications when:
- A workflow fails
- Security vulnerabilities are detected
- Manual workflow runs complete

You can configure these in your GitHub notification settings.

## Customization

### Making Checks Stricter
Currently, ESLint and TypeScript errors don't fail the build. To make them strict:
1. Edit `build-validation.yml`
2. Remove `|| true` and `continue-on-error: true` lines
3. Commit and push

### Changing Schedule
To change when dependency checks run:
1. Edit `dependency-check.yml`
2. Modify the cron expression (use [crontab.guru](https://crontab.guru) for help)
3. Commit and push

## Understanding the Outputs

### Build Validation
- ✅ **Green check**: Everything compiled successfully
- ⚠️ **Yellow warning**: Build passed but there are warnings
- ❌ **Red X**: Build failed - check logs for errors

### Dependency Check
- Lists all packages that have newer versions
- Shows security vulnerabilities by severity (Low/Moderate/High/Critical)
- Provides exact commands to update packages

## Troubleshooting

### Common Issues

1. **Build fails locally but passes in GitHub**: 
   - Check Node.js version (GitHub uses v18)
   - Try `npm ci` instead of `npm install`

2. **Workflow not triggering**:
   - Check you're pushing to the main branch
   - Verify the workflow file syntax is valid

3. **Want to stop weekly checks**:
   - Comment out or remove the `schedule` section in `dependency-check.yml`

## Future Enhancements

Consider adding when needed:
- [ ] Automated deployment workflow
- [ ] Database backup workflow  
- [ ] Performance testing
- [ ] Changelog generation from commits