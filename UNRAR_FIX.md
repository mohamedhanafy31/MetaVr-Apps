# 🔧 Unrar Package Fix

## Issue
The Docker build was failing because `unrar` package is not available in Alpine Linux's default repositories.

**Error**: `ERROR: unable to select packages: unrar (no such package)`

## Root Cause
Alpine Linux doesn't include `unrar` in its standard package repositories. The package needs to be installed from a different source or we need to use an alternative tool.

## Fix Applied
Replaced `unrar` with `p7zip` (7z), which:
- ✅ Is available in Alpine Linux repositories
- ✅ Can extract RAR files (among many other formats)
- ✅ Is actively maintained
- ✅ Has similar functionality

### Changes Made

1. **Package installation**:
   ```dockerfile
   # Before:
   RUN apk add --no-cache wget unrar curl python3 py3-pip
   
   # After:
   RUN apk add --no-cache wget p7zip curl python3 py3-pip
   ```

2. **Extraction command**:
   ```dockerfile
   # Before:
   unrar x -o+ npc.rar .
   
   # After:
   7z x npc.rar -o. -y
   ```

### 7z Command Explanation
- `7z x` - Extract files
- `npc.rar` - Source archive
- `-o.` - Output to current directory
- `-y` - Assume yes to all prompts (non-interactive)

## Verification
After this fix:
- ✅ `p7zip` package will install successfully
- ✅ RAR file extraction will work
- ✅ Build process will continue

## Next Steps
1. Commit and push this fix:
   ```bash
   git add vite-project/Dockerfile.prod
   git commit -m "Fix: Replace unrar with p7zip for Alpine Linux compatibility"
   git push origin main
   ```

2. The build should now proceed past the package installation step!

## Alternative Solutions (if needed)
If `p7zip` doesn't work for some reason, alternatives include:
- `unrar-free` (limited functionality, might not work with all RAR files)
- Installing `unrar` from community repository (requires additional setup)
- Using Python's `rarfile` library (requires unrar binary anyway)

---

**Status**: Fix applied and ready for testing! 🚀

