# Fix Prisma Generate Error
## EPERM: operation not permitted

---

## 🔴 **Problem**

The Prisma query engine DLL file is locked by another process, preventing regeneration.

**Error:**
```
EPERM: operation not permitted, rename '...\query_engine-windows.dll.node.tmp...' -> '...\query_engine-windows.dll.node'
```

---

## ✅ **Solutions (Try in Order)**

### Solution 1: Stop All Node Processes ⭐ **RECOMMENDED**

**Step 1:** Stop Next.js dev server
- Press `Ctrl+C` in the terminal running `npm run dev`
- Or close the terminal window

**Step 2:** Stop all Node processes
```powershell
# Kill all Node processes
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
```

**Step 3:** Close your IDE (VS Code/Cursor)
- Save all files
- Close the IDE completely
- This releases file locks

**Step 4:** Regenerate Prisma
```bash
npx prisma generate
```

**Step 5:** Restart your IDE and dev server

---

### Solution 2: Use Task Manager

1. Open **Task Manager** (`Ctrl+Shift+Esc`)
2. Go to **Details** tab
3. Find and end all `node.exe` processes
4. Try `npx prisma generate` again

---

### Solution 3: Delete Locked Files Manually

**⚠️ Only if Solutions 1 & 2 don't work**

1. Stop all Node processes (Solution 1)
2. Close IDE
3. Navigate to: `node_modules\.prisma\client\`
4. Delete:
   - `query_engine-windows.dll.node` (if exists)
   - Any `.tmp` files
5. Run: `npx prisma generate`

---

### Solution 4: Restart Computer

If nothing else works:
1. Save all work
2. Restart your computer
3. Run `npx prisma generate` immediately after restart

---

## 🔍 **Why This Happens**

- **Next.js dev server** keeps the Prisma client loaded in memory
- **IDE** may have file watchers that lock the DLL
- **Windows file locking** prevents overwriting files in use

---

## ✅ **Prevention**

Always stop the dev server before running:
```bash
npx prisma generate
npx prisma migrate dev
```

Or use a separate terminal that doesn't have the dev server running.

---

## 🎯 **Quick Fix Script**

Create `fix-prisma.ps1`:

```powershell
# Stop all Node processes
Write-Host "Stopping Node processes..."
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force

# Wait a moment
Start-Sleep -Seconds 2

# Generate Prisma client
Write-Host "Generating Prisma client..."
npx prisma generate

Write-Host "Done! You can now restart your dev server."
```

Run with: `.\fix-prisma.ps1`

---

## 📝 **After Fixing**

Once `npx prisma generate` succeeds:

1. ✅ The `Config` model will be available in Prisma client
2. ✅ All `prisma.config.*` calls will work
3. ✅ TypeScript errors in `config.service.ts` will be resolved

---

## 🚀 **Next Steps**

After successful generation:
1. Restart your IDE
2. Run `npm run dev`
3. Check that TypeScript errors are gone

