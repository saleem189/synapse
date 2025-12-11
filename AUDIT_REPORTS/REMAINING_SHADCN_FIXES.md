# Remaining Shadcn/ui Compliance Fixes

**Date:** 2025-12-10  
**Status:** 📋 **Pending Fixes**

---

## Summary

After completing Priority 1 fixes, there are **9 remaining files** that still contain hard-coded colors, wrong hover effects, or need shadcn component replacements.

**Total Issues Remaining:** ~50+ instances

---

## Files Requiring Fixes

### 1. **voice-recorder.tsx** (5 instances)
**Issues:**
- Hard-coded primary colors (`bg-primary-[0-9]`, `text-primary-[0-9]`)
- Hard-coded surface colors (`bg-surface-[0-9]`, `text-surface-[0-9]`)

**Priority:** Medium  
**Estimated Time:** 5 minutes

---

### 2. **room-members-panel.tsx** (13 instances)
**Issues:**
- Hard-coded primary colors
- Hard-coded surface colors
- Possibly wrong hover effects

**Priority:** Medium  
**Estimated Time:** 10 minutes

---

### 3. **emoji-picker.tsx** (5 instances)
**Issues:**
- Hard-coded primary colors
- Hard-coded surface colors
- Possibly wrong hover effects

**Priority:** Medium  
**Estimated Time:** 5 minutes

---

### 4. **chat-room.tsx** (11 instances)
**Issues:**
- Hard-coded primary colors
- Hard-coded surface colors
- Possibly wrong hover effects

**Priority:** Medium  
**Estimated Time:** 10 minutes

---

### 5. **voice-message.tsx** (9 instances)
**Issues:**
- Hard-coded primary colors
- Hard-coded surface colors
- Possibly wrong hover effects

**Priority:** Medium  
**Estimated Time:** 8 minutes

---

### 6. **file-attachment.tsx** (19 instances)
**Issues:**
- Hard-coded primary colors
- Hard-coded surface colors
- Possibly wrong hover effects

**Priority:** High (frequently used component)  
**Estimated Time:** 15 minutes

---

### 7. **typing-indicator.tsx** (6 instances)
**Issues:**
- Hard-coded primary colors
- Hard-coded surface colors

**Priority:** Low  
**Estimated Time:** 5 minutes

---

### 8. **virtualized-message-list.tsx** (1 instance)
**Issues:**
- Hard-coded colors

**Priority:** Low  
**Estimated Time:** 2 minutes

---

### 9. **chat-room-search-dialog.tsx** (1 instance)
**Issues:**
- Hard-coded colors

**Priority:** Low  
**Estimated Time:** 2 minutes

---

### 10. **message-actions.tsx** (3 instances)
**Issues:**
- Hard-coded colors
- Possibly wrong hover effects

**Priority:** Medium  
**Estimated Time:** 5 minutes

---

## Fix Patterns

### Pattern 1: Hard-Coded Primary Colors
```tsx
// ❌ Before
className="bg-primary-600 text-primary-700 border-primary-500"

// ✅ After
className="bg-primary text-primary border-primary"
```

### Pattern 2: Hard-Coded Surface Colors
```tsx
// ❌ Before
className="bg-surface-100 dark:bg-surface-800 text-surface-900 dark:text-white"

// ✅ After
className="bg-muted text-foreground"
```

### Pattern 3: Wrong Hover Effects
```tsx
// ❌ Before
className="hover:bg-muted"

// ✅ After
className="hover:bg-accent hover:text-accent-foreground"
```

### Pattern 4: Hard-Coded Opacity Colors
```tsx
// ❌ Before
className="bg-primary-500/10 border-primary-400/30"

// ✅ After
className="bg-primary/10 border-primary/20"
```

---

## Total Estimated Time

**~70 minutes** for all remaining fixes

---

## Recommended Order

1. **file-attachment.tsx** (High priority, frequently used)
2. **chat-room.tsx** (High priority, main component)
3. **room-members-panel.tsx** (Medium priority)
4. **voice-message.tsx** (Medium priority)
5. **voice-recorder.tsx** (Medium priority)
6. **emoji-picker.tsx** (Medium priority)
7. **message-actions.tsx** (Medium priority)
8. **typing-indicator.tsx** (Low priority)
9. **virtualized-message-list.tsx** (Low priority)
10. **chat-room-search-dialog.tsx** (Low priority)

---

## Expected Outcomes

After completing these fixes:
- ✅ 100% shadcn/ui compliance
- ✅ All colors theme-aware
- ✅ Consistent hover effects
- ✅ Better maintainability
- ✅ Full multi-theme support

---

**Next Step:** Begin fixing files in recommended order.

