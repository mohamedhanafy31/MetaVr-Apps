#!/bin/bash

# MetaVR Dashboard - GitHub Setup Script
# This script helps you push the project to GitHub

echo "🚀 MetaVR Dashboard - GitHub Setup"
echo "================================="

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "📁 Initializing git repository..."
    git init
else
    echo "✅ Git repository already initialized"
fi

# Add all files
echo "📝 Adding files to git..."
git add .

# Check if there are changes to commit
if git diff --staged --quiet; then
    echo "ℹ️  No changes to commit"
else
    echo "💾 Creating initial commit..."
    git commit -m "Initial commit: MetaVR Dashboard with auto-download and deployment setup

- Complete Next.js dashboard with admin panel
- Auto-download Firebase credentials from Google Drive
- Netlify deployment configuration
- GitHub Actions CI/CD pipeline
- Production-ready build configuration
- Comprehensive documentation"
fi

# Check if remote origin exists
if git remote get-url origin >/dev/null 2>&1; then
    echo "✅ Remote origin already configured"
    echo "🔗 Current remote URL: $(git remote get-url origin)"
else
    echo ""
    echo "🔧 Please set up your GitHub repository:"
    echo "1. Go to https://github.com and create a new repository"
    echo "2. Copy the repository URL"
    echo "3. Run: git remote add origin YOUR_REPOSITORY_URL"
    echo "4. Run: git push -u origin main"
    echo ""
    echo "📋 Repository setup checklist:"
    echo "   [ ] Create GitHub repository"
    echo "   [ ] Add remote origin"
    echo "   [ ] Push code to GitHub"
    echo "   [ ] Set up GitHub secrets (see DEPLOYMENT.md)"
    echo "   [ ] Connect to Netlify"
    echo ""
fi

echo ""
echo "📚 Next steps:"
echo "1. Review DEPLOYMENT.md for detailed setup instructions"
echo "2. Set up environment variables in GitHub secrets"
echo "3. Configure Netlify deployment"
echo "4. Test the deployment"
echo ""
echo "🎉 Setup complete! Your project is ready for deployment."
