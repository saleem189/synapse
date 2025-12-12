# First Contribution

Make your first contribution to Synapse in 30 minutes.

---

## What You'll Do

- Find a good first issue
- Create a feature branch
- Make a small code change
- Write a test
- Submit a pull request

**Time:** ~30 minutes

---

## Prerequisites

- Development environment set up ([Setup Guide](./setup.md))
- Basic Git knowledge
- Synapse running locally

---

## Step 1: Find an Issue

**Look for "good first issue" label:**

https://github.com/saleem189/synapse/issues?q=is:open+label:"good+first+issue"

**Good starter issues:**
- Documentation improvements
- Bug fixes with clear reproduction steps
- Small UI enhancements
- Adding tests to existing code

**Claim the issue:**
- Comment: "I'd like to work on this"
- Wait for maintainer approval

---

## Step 2: Create Feature Branch

```bash
# Update main branch
git checkout master
git pull upstream master

# Create feature branch
git checkout -b fix/issue-description
```

**Branch naming:**
- `feat/` - New feature
- `fix/` - Bug fix
- `docs/` - Documentation
- `test/` - Tests only
- `refactor/` - Code refactoring

**Examples:**
- `fix/message-timestamp-format`
- `feat/room-search`
- `docs/api-authentication`

---

## Step 3: Make Changes

**Example: Fix a small bug**

Let's say you're fixing message timestamps not displaying correctly.

**1. Locate the code:**
```bash
# Search for relevant files
grep -r "formatDate" components/
```

**2. Make the fix:**
```typescript
// components/chat/message-time.tsx

// Before (bug)
export function MessageTime({ timestamp }: Props) {
  return <span>{timestamp}</span>; // Shows raw ISO string
}

// After (fixed)
import { formatRelativeTime } from '@/lib/utils/date';

export function MessageTime({ timestamp }: Props) {
  return <span>{formatRelativeTime(timestamp)}</span>; // Shows "2 minutes ago"
}
```

---

## Step 4: Write a Test

Add a test for your fix:

```typescript
// __tests__/components/message-time.test.tsx
import { render, screen } from '@testing-library/react';
import { MessageTime } from '@/components/chat/message-time';

describe('MessageTime', () => {
  it('should format timestamp as relative time', () => {
    const timestamp = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago
    
    render(<MessageTime timestamp={timestamp.toISOString()} />);
    
    expect(screen.getByText(/5 minutes ago/i)).toBeInTheDocument();
  });
});
```

---

## Step 5: Run Checks

**Lint your code:**
```bash
npm run lint
```

**Type check:**
```bash
npm run type-check
```

**Run tests:**
```bash
npm run test
```

**All must pass!** ✅

---

## Step 6: Commit Changes

**Use conventional commits:**

```bash
git add .
git commit -m "fix: display relative time for message timestamps

- Changed MessageTime component to use formatRelativeTime
- Added test for relative time formatting
- Fixes #123"
```

**Commit message format:**
```
<type>: <description>

<optional body>

<optional footer>
```

**Types:**
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation
- `test:` - Tests
- `refactor:` - Code refactoring
- `chore:` - Maintenance

---

## Step 7: Push to Your Fork

```bash
git push origin fix/message-timestamp-format
```

---

## Step 8: Create Pull Request

**On GitHub:**

1. Go to your fork: `https://github.com/YOUR_USERNAME/synapse`
2. Click "Compare & pull request"
3. Fill in PR template:

```markdown
## Description
Fixes message timestamps showing raw ISO strings instead of relative time.

## Changes
- Updated MessageTime component to use formatRelativeTime utility
- Added unit test for timestamp formatting
- Updated relevant documentation

## Testing
- [ ] Ran `npm run lint` - passed
- [ ] Ran `npm run type-check` - passed
- [ ] Ran `npm run test` - passed
- [ ] Tested manually in browser - working

## Screenshots (if UI change)
Before: [attach screenshot]
After: [attach screenshot]

Fixes #123
```

4. Click "Create pull request"

---

## Step 9: Code Review

**What happens next:**

1. **Automated checks run** (lint, type-check, tests)
2. **Maintainer reviews** your code
3. **Feedback** - you may need to make changes
4. **Approval** - PR gets merged!

**Responding to feedback:**

```bash
# Make requested changes
# ...

# Commit changes
git add .
git commit -m "refactor: address code review feedback"

# Push to same branch
git push origin fix/message-timestamp-format
```

**PR updates automatically!**

---

## Step 10: After Merge

**Celebrate!** 🎉 You're now a Synapse contributor!

**Sync your fork:**

```bash
git checkout master
git pull upstream master
git push origin master
```

---

## Best Practices

### Before Starting

- ✅ Claim issue first (comment "I'll work on this")
- ✅ Read related documentation
- ✅ Ask questions if unclear

### While Working

- ✅ Keep changes focused (one issue per PR)
- ✅ Write clear commit messages
- ✅ Add tests for new code
- ✅ Update documentation

### During Review

- ✅ Respond to feedback promptly
- ✅ Be open to suggestions
- ✅ Ask for clarification if needed

---

## Common Pitfalls

### Scope Creep

**Problem:** PR tries to fix multiple unrelated issues

**Solution:** Keep PRs focused on single issue

### Missing Tests

**Problem:** PR doesn't include tests

**Solution:** Always add tests for new features/fixes

### Breaking Changes

**Problem:** Changes break existing functionality

**Solution:** Run full test suite before submitting

---

## Getting Help

**Stuck?** Ask for help!

- Comment on the issue
- Open a discussion
- Ask in PR comments

**We're here to help!** 🤝

---

## Next Steps

- **[Codebase Guide](../../development/CODEBASE_GUIDE.md)** - Understand existing code
- **[Architecture](../../development/01-ARCHITECTURE-OVERVIEW.md)** - System design
- **[DI Container](../../development/02-DEPENDENCY-INJECTION.md)** - Service patterns

---

## Related

- **[Contributing Guide](../../../CONTRIBUTING.md)**
- **[Coding Standards](../../../CONTRIBUTING.md#coding-standards)**
- **[Development Workflow](../../CONTRIBUTING.md#development-workflow)**

