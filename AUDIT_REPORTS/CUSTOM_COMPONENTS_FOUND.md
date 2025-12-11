# Custom Components Found

**Date:** 2025-12-10  
**Status:** 🔍 **Issues Found**

---

## Summary

Found **39 instances** of custom `<button>` elements that should be replaced with shadcn `Button` component.

---

## ❌ Custom Button Implementations

### High Priority (User-Facing)

1. **`components/chat/message-input.tsx`** - 4 instances
   - Line 352: Cancel reply button
   - Line 387: Remove file button (image)
   - Line 402: Remove file button (file)
   - Line 426: Remove file button (file card)
   - Line 535: **Send button** (main action)

2. **`components/chat/chat-room-header.tsx`** - 5 instances
   - Line 113: Pinned messages toggle button
   - Line 131: Search toggle button
   - Line 143: Audio call button
   - Line 156: Video call button
   - Line 169: Info toggle button

3. **`components/chat/settings-modal.tsx`** - 8 instances
   - Line 161: Profile tab button
   - Line 173: Notifications tab button
   - Line 185: Appearance tab button
   - Line 227: Avatar upload button
   - Line 238: Remove avatar button
   - Line 345: Light theme button
   - Line 360: Dark theme button
   - Line 375: System theme button
   - Line 400: Solid style button
   - Line 413: Glassmorphic style button
   - Line 443: Sign out button

4. **`components/chat/message-reactions.tsx`** - 3 instances
   - Line 84: Reaction button
   - Line 109: Add reaction button
   - Line 135: Emoji picker button

5. **`components/chat/emoji-picker.tsx`** - 2 instances
   - Line 36: Open emoji picker button
   - Line 63: Emoji selection button

6. **`components/chat/voice-recorder.tsx`** - 3 instances
   - Line 241: Stop recording button
   - Line 248: Cancel recording button
   - Line 260: Start recording button

7. **`components/chat/voice-message.tsx`** - 1 instance
   - Line 93: Play/pause button

8. **`components/chat/file-attachment.tsx`** - 3 instances
   - Line 168: Fullscreen button
   - Line 175: Download button
   - Line 250: Close fullscreen button

9. **`components/chat/message-item.tsx`** - 1 instance
   - Line 125: Reply button

10. **`components/chat/message-actions.tsx`** - 1 instance
    - Line 86: More options button

11. **`components/chat/room-menu.tsx`** - 1 instance
    - Line 176: Menu trigger button

12. **`components/chat/room-members-panel.tsx`** - 3 instances
    - Line 174: Remove admin button
    - Line 218: Make admin button
    - Line 226: Remove member button

---

## ⚠️ Hard-Coded Colors (Admin Components)

### Admin Components Using Hard-Coded Colors

1. **`components/admin/admin-sidebar.tsx`**
   - Line 45: `bg-surface-900` (should use `bg-background`)
   - Line 47: `border-surface-700` (should use `border-border`)
   - Line 70: `bg-primary-600` (should use `bg-primary`)
   - Line 71: `text-surface-300`, `bg-surface-800` (should use CSS variables)

2. **`components/admin/message-activity-chart.tsx`**
   - Line 102: `bg-primary-500` (should use `bg-primary`)
   - Line 104: `text-primary-600`, `text-primary-400` (should use `text-primary`)
   - Line 103: `text-surface-500` (should use `text-muted-foreground`)

3. **`components/admin/realtime-chart.tsx`**
   - Line 82: `bg-primary-500` (should use `bg-primary`)
   - Line 100: `bg-primary-500` (should use `bg-primary`)
   - Line 101: `bg-primary-400/60` (should use `bg-primary/60`)

---

## ✅ Acceptable Custom Elements

1. **File Input with Label** (`message-input.tsx` line 491-499)
   - ✅ This is standard HTML pattern for file uploads
   - ✅ Hidden input with styled label is acceptable
   - No change needed

2. **Shadcn UI Components** (`components/ui/*.tsx`)
   - ✅ These are shadcn components themselves
   - No change needed

---

## 📋 Action Plan

### Priority 1: Replace Custom Buttons with Shadcn Button
- Replace all 39 custom `<button>` elements with shadcn `Button` component
- Use appropriate variants (`default`, `outline`, `ghost`, `destructive`)
- Use appropriate sizes (`sm`, `default`, `lg`, `icon`)

### Priority 2: Fix Hard-Coded Colors in Admin Components
- Replace `bg-primary-\d+` with `bg-primary`
- Replace `text-primary-\d+` with `text-primary`
- Replace `bg-surface-*` with `bg-background` or `bg-muted`
- Replace `text-surface-*` with `text-foreground` or `text-muted-foreground`
- Replace `border-surface-*` with `border-border`

---

## 🎯 Expected Outcome

After fixes:
- ✅ 100% shadcn Button usage
- ✅ No hard-coded colors
- ✅ Consistent design system
- ✅ Better accessibility
- ✅ Better maintainability

---

**Report Generated:** 2025-12-10

