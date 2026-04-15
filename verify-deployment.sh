#!/bin/bash
# ============================================================
# SmartVenue AI - Deployment Verification Script
# Verifies all improvements are working correctly
# ============================================================

set -e

echo "🔍 SmartVenue AI - Deployment Verification"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASSED=0
FAILED=0

# Function to check status
check_status() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ PASSED${NC}: $1"
        ((PASSED++))
    else
        echo -e "${RED}✗ FAILED${NC}: $1"
        ((FAILED++))
    fi
}

echo "📦 Step 1: Checking Dependencies"
echo "-----------------------------------"

# Check Node.js version
node --version > /dev/null 2>&1
check_status "Node.js installed"

# Check npm version
npm --version > /dev/null 2>&1
check_status "npm installed"

# Check if backend dependencies are installed
if [ -d "backend/node_modules" ]; then
    echo -e "${GREEN}✓ PASSED${NC}: Backend dependencies installed"
    ((PASSED++))
else
    echo -e "${RED}✗ FAILED${NC}: Backend dependencies not installed"
    ((FAILED++))
fi

# Check if frontend dependencies are installed
if [ -d "frontend/node_modules" ]; then
    echo -e "${GREEN}✓ PASSED${NC}: Frontend dependencies installed"
    ((PASSED++))
else
    echo -e "${RED}✗ FAILED${NC}: Frontend dependencies not installed"
    ((FAILED++))
fi

echo ""
echo "🧪 Step 2: Running Backend Tests"
echo "-----------------------------------"

cd backend

# Run backend tests
npm test > /dev/null 2>&1
check_status "Backend tests"

# Check test coverage
if npm test -- --coverage --silent 2>&1 | grep -q "All files"; then
    echo -e "${GREEN}✓ PASSED${NC}: Backend test coverage generated"
    ((PASSED++))
else
    echo -e "${YELLOW}⚠ WARNING${NC}: Backend test coverage check skipped"
fi

cd ..

echo ""
echo "🎨 Step 3: Running Frontend Tests"
echo "-----------------------------------"

cd frontend

# Run frontend tests
npm test > /dev/null 2>&1
check_status "Frontend tests"

cd ..

echo ""
echo "🔒 Step 4: Security Checks"
echo "-----------------------------------"

# Check for hardcoded secrets
if grep -r "password.*=.*['\"]" backend/src --exclude-dir=node_modules --exclude-dir=tests | grep -v "password:" | grep -v "Password" > /dev/null; then
    echo -e "${RED}✗ FAILED${NC}: Potential hardcoded passwords found"
    ((FAILED++))
else
    echo -e "${GREEN}✓ PASSED${NC}: No hardcoded passwords"
    ((PASSED++))
fi

# Check for API keys in code
if grep -r "api.*key.*=.*['\"][a-zA-Z0-9]" backend/src frontend/src --exclude-dir=node_modules --exclude-dir=tests | grep -v "VITE_" | grep -v "process.env" > /dev/null; then
    echo -e "${YELLOW}⚠ WARNING${NC}: Potential API keys in code (verify they use env vars)"
else
    echo -e "${GREEN}✓ PASSED${NC}: No hardcoded API keys"
    ((PASSED++))
fi

# Check for console.log in production code
if grep -r "console\.log" backend/src frontend/src --exclude-dir=node_modules --exclude-dir=tests --exclude="logger.js" | grep -v "console.error" | grep -v "console.warn" | grep -v "console.info" > /dev/null; then
    echo -e "${YELLOW}⚠ WARNING${NC}: console.log found in code (should use logger)"
else
    echo -e "${GREEN}✓ PASSED${NC}: No console.log in production code"
    ((PASSED++))
fi

echo ""
echo "♿ Step 5: Accessibility Checks"
echo "-----------------------------------"

# Check for ARIA labels
if grep -r "aria-label" frontend/src --exclude-dir=node_modules | wc -l | grep -q "[1-9]"; then
    echo -e "${GREEN}✓ PASSED${NC}: ARIA labels present"
    ((PASSED++))
else
    echo -e "${RED}✗ FAILED${NC}: No ARIA labels found"
    ((FAILED++))
fi

# Check for semantic HTML
if grep -r "<header\|<nav\|<main\|<section\|<article" frontend/src --exclude-dir=node_modules | wc -l | grep -q "[1-9]"; then
    echo -e "${GREEN}✓ PASSED${NC}: Semantic HTML used"
    ((PASSED++))
else
    echo -e "${RED}✗ FAILED${NC}: No semantic HTML found"
    ((FAILED++))
fi

# Check for alt text
if grep -r "alt=" frontend/src --exclude-dir=node_modules | wc -l | grep -q "[1-9]"; then
    echo -e "${GREEN}✓ PASSED${NC}: Alt text present"
    ((PASSED++))
else
    echo -e "${YELLOW}⚠ WARNING${NC}: Limited alt text found"
fi

echo ""
echo "🔥 Step 6: Firebase Integration"
echo "-----------------------------------"

# Check for Firebase service file
if [ -f "backend/src/services/firebaseService.js" ]; then
    echo -e "${GREEN}✓ PASSED${NC}: Firebase service exists"
    ((PASSED++))
else
    echo -e "${RED}✗ FAILED${NC}: Firebase service missing"
    ((FAILED++))
fi

# Check for Firebase config
if [ -f "frontend/src/config/firebase.js" ]; then
    echo -e "${GREEN}✓ PASSED${NC}: Firebase config exists"
    ((PASSED++))
else
    echo -e "${RED}✗ FAILED${NC}: Firebase config missing"
    ((FAILED++))
fi

# Check for Firebase Admin config
if [ -f "backend/src/config/firebaseAdmin.js" ]; then
    echo -e "${GREEN}✓ PASSED${NC}: Firebase Admin config exists"
    ((PASSED++))
else
    echo -e "${RED}✗ FAILED${NC}: Firebase Admin config missing"
    ((FAILED++))
fi

echo ""
echo "📝 Step 7: Documentation"
echo "-----------------------------------"

# Check for README
if [ -f "README.md" ]; then
    echo -e "${GREEN}✓ PASSED${NC}: README.md exists"
    ((PASSED++))
else
    echo -e "${RED}✗ FAILED${NC}: README.md missing"
    ((FAILED++))
fi

# Check for IMPROVEMENTS.md
if [ -f "IMPROVEMENTS.md" ]; then
    echo -e "${GREEN}✓ PASSED${NC}: IMPROVEMENTS.md exists"
    ((PASSED++))
else
    echo -e "${RED}✗ FAILED${NC}: IMPROVEMENTS.md missing"
    ((FAILED++))
fi

# Check for PRODUCTION_READY.md
if [ -f "PRODUCTION_READY.md" ]; then
    echo -e "${GREEN}✓ PASSED${NC}: PRODUCTION_READY.md exists"
    ((PASSED++))
else
    echo -e "${RED}✗ FAILED${NC}: PRODUCTION_READY.md missing"
    ((FAILED++))
fi

echo ""
echo "🏗️ Step 8: Build Verification"
echo "-----------------------------------"

# Try to build frontend
cd frontend
if npm run build > /dev/null 2>&1; then
    echo -e "${GREEN}✓ PASSED${NC}: Frontend builds successfully"
    ((PASSED++))
else
    echo -e "${RED}✗ FAILED${NC}: Frontend build failed"
    ((FAILED++))
fi
cd ..

echo ""
echo "📊 Step 9: Test Coverage"
echo "-----------------------------------"

# Check if test files exist
BACKEND_TESTS=$(find backend/src/tests -name "*.test.js" 2>/dev/null | wc -l)
FRONTEND_TESTS=$(find frontend/src/tests -name "*.test.jsx" -o -name "*.test.js" 2>/dev/null | wc -l)

if [ "$BACKEND_TESTS" -ge 5 ]; then
    echo -e "${GREEN}✓ PASSED${NC}: Backend has $BACKEND_TESTS test files"
    ((PASSED++))
else
    echo -e "${RED}✗ FAILED${NC}: Backend has only $BACKEND_TESTS test files (need 5+)"
    ((FAILED++))
fi

if [ "$FRONTEND_TESTS" -ge 3 ]; then
    echo -e "${GREEN}✓ PASSED${NC}: Frontend has $FRONTEND_TESTS test files"
    ((PASSED++))
else
    echo -e "${RED}✗ FAILED${NC}: Frontend has only $FRONTEND_TESTS test files (need 3+)"
    ((FAILED++))
fi

echo ""
echo "🎯 Step 10: Code Quality"
echo "-----------------------------------"

# Check for JSDoc comments
if grep -r "@param\|@returns\|@module" backend/src --exclude-dir=node_modules --exclude-dir=tests | wc -l | grep -q "[1-9]"; then
    echo -e "${GREEN}✓ PASSED${NC}: JSDoc documentation present"
    ((PASSED++))
else
    echo -e "${YELLOW}⚠ WARNING${NC}: Limited JSDoc documentation"
fi

# Check for TypeScript/JSX
if find frontend/src -name "*.jsx" | wc -l | grep -q "[1-9]"; then
    echo -e "${GREEN}✓ PASSED${NC}: JSX files present"
    ((PASSED++))
else
    echo -e "${RED}✗ FAILED${NC}: No JSX files found"
    ((FAILED++))
fi

echo ""
echo "=========================================="
echo "📊 VERIFICATION SUMMARY"
echo "=========================================="
echo ""
echo -e "${GREEN}✓ Passed: $PASSED${NC}"
echo -e "${RED}✗ Failed: $FAILED${NC}"
echo ""

TOTAL=$((PASSED + FAILED))
PERCENTAGE=$((PASSED * 100 / TOTAL))

echo "Success Rate: $PERCENTAGE%"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 ALL CHECKS PASSED! Ready for deployment!${NC}"
    exit 0
elif [ $PERCENTAGE -ge 90 ]; then
    echo -e "${YELLOW}⚠️  Most checks passed. Review warnings before deployment.${NC}"
    exit 0
else
    echo -e "${RED}❌ Some critical checks failed. Please fix before deployment.${NC}"
    exit 1
fi
