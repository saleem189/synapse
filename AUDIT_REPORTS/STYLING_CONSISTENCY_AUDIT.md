# Styling Consistency Audit

**Date:** 2025-12-10  
**Status:** 🔍 **Audit Complete - Fixes In Progress**

---

## 🔍 Issues Found

### 1. **Focus Rings - Inconsistent** ❌
- ❌ `ring-primary-500` (hard-coded)
- ❌ `ring-primary-300` (hard-coded)
- ❌ `ring-primary-800` (hard-coded)
- ✅ `ring-ring` (CSS variable) - **CORRECT**

**Files with inconsistent focus rings:**
- `components/chat/settings-modal.tsx` - Uses `ring-primary-300` and `ring-primary-800`
- `components/chat/message-item.tsx` - Uses `ring-primary-500`
- `components/chat/chat-sidebar.tsx` - Uses `ring-ring` ✅

### 2. **Borders - Inconsistent** ❌
- ❌ `border-surface-200` (hard-coded)
- ❌ `border-surface-700` (hard-coded)
- ❌ `border-primary-500` (hard-coded)
- ❌ `border-primary-200` (hard-coded)
- ✅ `border-border` (CSS variable) - **CORRECT**
- ✅ `border-input` (CSS variable) - **CORRECT**

**Files with inconsistent borders:**
- `components/chat/settings-modal.tsx` - Many `border-surface-*` and `border-primary-*`
- `components/chat/chat-sidebar.tsx` - Some `border-surface-*`
- `components/chat/message-item.tsx` - Some `border-primary-*`

### 3. **Background Colors - Inconsistent** ❌
- ❌ `bg-white` (hard-coded)
- ❌ `bg-gray-*` (hard-coded)
- ❌ `bg-surface-*` (hard-coded)
- ✅ `bg-background` (CSS variable) - **CORRECT**
- ✅ `bg-card` (CSS variable) - **CORRECT**
- ✅ `bg-muted` (CSS variable) - **CORRECT**

**280 instances found across 37 files**

### 4. **Text Colors - Inconsistent** ❌
- ❌ `text-gray-*` (hard-coded)
- ❌ `text-surface-*` (hard-coded)
- ✅ `text-foreground` (CSS variable) - **CORRECT**
- ✅ `text-muted-foreground` (CSS variable) - **CORRECT**

---

## 📋 Standardization Rules

### **Focus Rings:**
- ✅ Always use: `focus-visible:ring-1 focus-visible:ring-ring` or `focus:ring-2 focus:ring-ring`
- ❌ Never use: `ring-primary-*`, `ring-gray-*`, `ring-accent-*`

### **Borders:**
- ✅ Always use: `border-border` or `border-input`
- ❌ Never use: `border-surface-*`, `border-gray-*`, `border-primary-*` (unless for semantic purposes)

### **Backgrounds:**
- ✅ Always use: `bg-background`, `bg-card`, `bg-muted`, `bg-secondary`
- ❌ Never use: `bg-white`, `bg-gray-*`, `bg-surface-*`

### **Text Colors:**
- ✅ Always use: `text-foreground`, `text-muted-foreground`, `text-card-foreground`
- ❌ Never use: `text-gray-*`, `text-surface-*`

---

## 🎯 Priority Fixes

### **High Priority:**
1. Settings Modal - Many hard-coded colors
2. Message Input - Focus rings and borders
3. Create Room Modal - Colors and borders
4. Room Settings Modal - Colors

### **Medium Priority:**
5. Admin components - Colors
6. Other modals - Colors
7. Link preview - Colors

### **Low Priority:**
8. Charts and graphs - Colors
9. Admin sidebar - Colors

---

**Report Generated:** 2025-12-10

