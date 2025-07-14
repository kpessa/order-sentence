# Deployment Test Checklist

Use this checklist to verify your deployment is working correctly after pushing to production.

## 🚀 Pre-Deployment Verification

- [ ] GitHub Actions workflow badge is green in README
- [ ] Vercel deployment badge shows successful deployment
- [ ] No errors in GitHub Actions logs
- [ ] Vercel build logs show successful completion

## 🔍 Basic Functionality Tests

### 1. Application Loading
- [ ] Homepage loads without errors
- [ ] No console errors in browser developer tools
- [ ] All static assets load correctly (CSS, JS, fonts)
- [ ] Responsive design works on mobile/tablet/desktop

### 2. Health Check
- [ ] Visit `/api/health` endpoint
- [ ] Verify response shows `"status": "healthy"`
- [ ] Check all environment variables are configured
- [ ] Confirm API services show as operational

## 💊 Core Feature Tests

### 3. Drug Search Functionality
- [ ] Click on drug search input field
- [ ] Type "aspirin" - autocomplete should appear
- [ ] Select a drug from dropdown
- [ ] Verify drug details load correctly
- [ ] Test with partial drug names (e.g., "metf" for metformin)
- [ ] Verify no CORS errors in console

### 4. Excel Upload & Processing
- [ ] Navigate to Excel Viewer page (`/excel-viewer`)
- [ ] Upload a test Excel file with order sentences
- [ ] Verify file parses correctly
- [ ] Check data table displays with proper columns
- [ ] Test column filtering functionality
- [ ] Test column sorting functionality
- [ ] Verify data persists after page refresh

### 5. OpenFDA Integration
- [ ] Select a drug in the search
- [ ] Click to view FDA data
- [ ] Verify OpenFDA label information loads
- [ ] Check for proper error handling if drug not found
- [ ] Confirm no API timeout errors

### 6. DailyMed API Proxy
- [ ] Select a drug with SPL data
- [ ] Verify DailyMed data loads without CORS errors
- [ ] Check XML parsing works correctly
- [ ] Confirm dosage form prioritization works

## 🔐 Security & Performance

### 7. Security Headers
- [ ] Open browser developer tools → Network tab
- [ ] Reload the page
- [ ] Check response headers include:
  - [ ] X-Content-Type-Options: nosniff
  - [ ] X-Frame-Options: DENY
  - [ ] X-XSS-Protection: 1; mode=block
  - [ ] Referrer-Policy: strict-origin-when-cross-origin

### 8. Performance Metrics
- [ ] Initial page load < 3 seconds
- [ ] Drug search responds < 1 second
- [ ] Excel processing handles 1000+ rows smoothly
- [ ] No memory leaks with Redux DevTools

## 🔄 State Management

### 9. Redux Persistence
- [ ] Search for a drug
- [ ] Upload an Excel file
- [ ] Refresh the page
- [ ] Verify selected drug is still shown
- [ ] Verify Excel data is still available
- [ ] Check IndexedDB in Application tab contains data

## 🐛 Error Handling

### 10. Error Boundaries
- [ ] Disconnect internet and try drug search
- [ ] Verify error boundary shows user-friendly message
- [ ] Test "Try Again" button functionality
- [ ] Confirm app doesn't crash completely

## 📊 Monitoring

### 11. Vercel Analytics (if enabled)
- [ ] Check Vercel dashboard for Web Vitals
- [ ] Verify no 4xx or 5xx errors
- [ ] Monitor API function execution times
- [ ] Check for any runtime errors

## ✅ Final Verification

### 12. Cross-Browser Testing
- [ ] Chrome/Edge - All features work
- [ ] Firefox - All features work  
- [ ] Safari - All features work
- [ ] Mobile browsers - Responsive and functional

### 13. API Rate Limits
- [ ] Perform multiple rapid searches
- [ ] Verify no rate limit errors
- [ ] Confirm retry logic works if limits hit

## 🚨 If Tests Fail

1. **Check Vercel Function Logs**: Dashboard → Functions → View logs
2. **Review Environment Variables**: Settings → Environment Variables
3. **Verify API Endpoints**: Use browser network tab
4. **Check Browser Console**: Look for specific error messages
5. **Test Locally**: Run `pnpm dev` to compare behavior

## 📝 Sign-Off

- [ ] All critical features tested and working
- [ ] No blocking issues found
- [ ] Performance meets expectations
- [ ] Security headers properly configured

**Tested by**: ___________________  
**Date**: ___________________  
**Environment**: Production / Preview  
**Notes**: ___________________