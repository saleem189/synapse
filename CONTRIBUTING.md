# Contributing to Synapse

First off, thank you for considering contributing to Synapse! It's people like you that make Synapse such a great tool.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Project Structure](#project-structure)
- [Testing Guidelines](#testing-guidelines)
- [Documentation](#documentation)
- [Community](#community)

---

## Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code. Please report unacceptable behavior to the project maintainers.

### Our Pledge

We are committed to making participation in this project a harassment-free experience for everyone, regardless of level of experience, gender, gender identity and expression, sexual orientation, disability, personal appearance, body size, race, ethnicity, age, religion, or nationality.

---

## Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 18.x or higher
- **npm** or **pnpm** (we recommend pnpm for faster installs)
- **PostgreSQL** 14.x or higher (or use Docker)
- **Redis** (optional, for rate limiting in production)
- **Git** for version control

### Setting Up Your Development Environment

1. **Fork the repository** on GitHub

2. **Clone your fork:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/synapse.git
   cd synapse
   ```

3. **Add upstream remote:**
   ```bash
   git remote add upstream https://github.com/ORIGINAL_OWNER/synapse.git
   ```

4. **Install dependencies:**
   ```bash
   npm install
   # or
   pnpm install
   ```

5. **Set up environment variables:**
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local` and fill in your configuration:
   - Database credentials
   - NextAuth secrets
   - Sentry DSN (optional)
   - File upload settings

6. **Start PostgreSQL** (using Docker):
   ```bash
   npm run docker:up
   ```

7. **Generate Prisma client:**
   ```bash
   npm run db:generate
   ```

8. **Run database migrations:**
   ```bash
   npm run db:migrate
   ```

9. **Seed the database** (optional):
   ```bash
   npm run db:seed
   ```

10. **Start the development servers:**
    ```bash
    npm run dev:all
    ```
    This starts:
    - Next.js dev server (port 3000)
    - Socket.io server (port 3001)
    - Background worker

---

## Development Workflow

### Branch Strategy

We use a simplified Git Flow:

- `main` - Production-ready code
- `develop` - Integration branch for features
- `feature/*` - New features
- `fix/*` - Bug fixes
- `hotfix/*` - Critical production fixes
- `docs/*` - Documentation updates

### Creating a New Feature

1. **Sync with upstream:**
   ```bash
   git checkout develop
   git pull upstream develop
   ```

2. **Create a feature branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make your changes** following our [coding standards](#coding-standards)

4. **Test your changes:**
   ```bash
   npm run test
   npm run lint
   ```

5. **Commit your changes** following our [commit guidelines](#commit-guidelines)

6. **Push to your fork:**
   ```bash
   git push origin feature/your-feature-name
   ```

7. **Create a Pull Request** to the `develop` branch

---

## Coding Standards

We follow strict coding standards to maintain code quality. Please review the following before contributing:

### Project Rules

Our project uses cursor rules located in `.cursor/rules/`. Please review these files:

- **`architecture-rules.mdc`** - File organization and architecture patterns
- **`coding-standards.mdc`** - React, TypeScript, and Next.js best practices
- **`security-rules.mdc`** - Security requirements and input validation
- **`database-rules.mdc`** - Prisma schema and query optimization
- **`design-system.mdc`** - UI/UX and Tailwind CSS guidelines
- **`state-management.mdc`** - State management patterns (Zustand, React Query)
- **`performance-rules.mdc`** - Performance optimization requirements
- **`testing-rules.mdc`** - Testing strategy and patterns
- **`workflow-rules.mdc`** - Commit messages and documentation

### TypeScript

- ✅ **Use TypeScript for all new code**
- ✅ **Enable strict mode** - The project runs in strict mode
- ❌ **Never use `any`** - Use `unknown` if type is truly not known
- ✅ **Define interfaces for component props**
- ✅ **Use type inference** where appropriate

**Example:**
```typescript
// ❌ Bad
function processData(data: any) {
  return data.map((item: any) => item.value);
}

// ✅ Good
interface DataItem {
  id: string;
  value: number;
}

function processData(data: DataItem[]): number[] {
  return data.map((item) => item.value);
}
```

### React Components

- ✅ **Use functional components** with hooks
- ✅ **Follow React 19 patterns** (useFormState, useFormStatus)
- ✅ **Use Server Actions** for data mutations
- ✅ **Check for existing components** before creating new ones
- ✅ **Use proper naming conventions** (PascalCase for components)

**Example:**
```typescript
// ✅ Good component structure
interface MessageCardProps {
  message: Message;
  onDelete: (id: string) => void;
}

export function MessageCard({ message, onDelete }: MessageCardProps) {
  return (
    <Card>
      <CardHeader>{message.content}</CardHeader>
      <CardActions>
        <Button onClick={() => onDelete(message.id)}>Delete</Button>
      </CardActions>
    </Card>
  );
}
```

### API Routes

All API routes must:

1. **Validate input using Zod schemas**
2. **Check authentication and authorization**
3. **Apply rate limiting** (for sensitive operations)
4. **Use centralized error handling**
5. **Track performance metrics**

**Example:**
```typescript
import { validateRequest } from "@/lib/middleware/validate-request";
import { rateLimit, RateLimitPresets } from "@/lib/middleware/rate-limit";
import { handleError, UnauthorizedError } from "@/lib/errors";
import { mySchema } from "@/lib/validations";

export async function POST(request: NextRequest) {
  try {
    // 1. Authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return handleError(new UnauthorizedError('You must be logged in'));
    }

    // 2. Rate limiting (for sensitive operations)
    const limitResult = await rateLimit(request, RateLimitPresets.standard);
    if (!limitResult.success) {
      return limitResult.response;
    }

    // 3. Validation
    const validation = await validateRequest(request, mySchema);
    if (!validation.success) {
      return validation.response;
    }
    const data = validation.data;

    // 4. Business logic
    const result = await processData(data);

    return NextResponse.json({ result });
  } catch (error) {
    return handleError(error);
  }
}
```

### File Naming

- **Components:** `PascalCase.tsx` (e.g., `MessageCard.tsx`)
- **Utilities:** `kebab-case.ts` (e.g., `date-formatter.ts`)
- **Hooks:** `use-kebab-case.ts` (e.g., `use-media-query.ts`)
- **Types:** `kebab-case.ts` (e.g., `user-types.ts`)
- **Tests:** `*.test.ts` or `*.test.tsx`

### Imports

Organize imports in this order:

1. External libraries (React, Next.js, etc.)
2. Absolute imports from `@/`
3. Relative imports
4. Styles

**Example:**
```typescript
// 1. External
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

// 2. Absolute
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

// 3. Relative
import { MessageCard } from "./message-card";
import { formatDate } from "../utils/date";

// 4. Styles (if any)
import "./styles.css";
```

### CSS and Styling

- ✅ **Use Tailwind CSS** for all styling
- ✅ **Use design tokens** from theme (no arbitrary values like `text-[#123456]`)
- ✅ **Support dark mode** using `dark:` prefix
- ✅ **Mobile-first** responsive design
- ✅ **Use `cn()` utility** for conditional classes

**Example:**
```typescript
import { cn } from "@/lib/utils";

<div
  className={cn(
    "rounded-lg border p-4",
    "dark:border-gray-700",
    "hover:shadow-lg transition-shadow",
    isActive && "bg-primary text-primary-foreground"
  )}
>
```

---

## Commit Guidelines

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification.

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, no logic change)
- `refactor:` - Code refactoring
- `perf:` - Performance improvements
- `test:` - Adding or updating tests
- `chore:` - Build process or auxiliary tool changes

### Examples

```bash
feat(auth): add two-factor authentication

Implemented TOTP-based 2FA using the speakeasy library.
Users can now enable 2FA in their account settings.

Closes #123
```

```bash
fix(api): handle null values in message response

Fixed a bug where null sender avatars caused client crashes.
Added null checks and default values.

Fixes #456
```

```bash
docs(contributing): add API documentation guidelines

Updated contribution guide with API documentation requirements
and examples of good API documentation.
```

---

## Pull Request Process

### Before Submitting

1. ✅ **Run linter:**
   ```bash
   npm run lint
   ```

2. ✅ **Run tests:**
   ```bash
   npm run test
   ```

3. ✅ **Check for type errors:**
   ```bash
   npm run build
   ```

4. ✅ **Test your changes manually**

5. ✅ **Update documentation** if needed

### PR Title Format

Use the same format as commit messages:

```
feat(component): add new feature
fix(api): resolve issue with endpoint
docs: update README
```

### PR Description Template

```markdown
## Description
Brief description of what this PR does

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## How Has This Been Tested?
Describe the tests you ran and how to reproduce them

## Checklist
- [ ] My code follows the project's coding standards
- [ ] I have performed a self-review of my code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have updated the documentation accordingly
- [ ] My changes generate no new warnings or errors
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes

## Screenshots (if applicable)
Add screenshots to demonstrate visual changes

## Related Issues
Closes #(issue number)
```

### Review Process

1. **Automated checks** must pass (CI/CD, linting, tests)
2. **At least one approval** from a maintainer
3. **All conversations resolved**
4. **Documentation updated** if needed
5. **No merge conflicts**

---

## Project Structure

Understanding the project structure will help you navigate the codebase:

```
synapse/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Auth routes (login, register)
│   ├── (chat)/                   # Chat interface routes
│   ├── admin/                    # Admin dashboard
│   ├── call/[callId]/           # Video call interface
│   └── api/                      # API routes
│       ├── auth/                 # Authentication endpoints
│       ├── messages/             # Message CRUD
│       ├── rooms/                # Room management
│       ├── admin/                # Admin operations
│       └── upload/               # File upload
├── components/                   # React components
│   ├── ui/                       # shadcn/ui components
│   ├── chat/                     # Chat-specific components
│   ├── admin/                    # Admin components
│   └── providers.tsx             # Context providers
├── features/                     # Feature-based modules
│   └── video-call/               # Video call feature
│       ├── components/           # Feature components
│       ├── hooks/                # Feature hooks
│       └── types.ts              # Feature types
├── lib/                          # Core utilities
│   ├── services/                 # Business logic services (10+ services!)
│   ├── repositories/             # Data access layer
│   ├── di/                       # Dependency injection container
│   │   ├── container.ts          # DI container implementation
│   │   └── providers.ts          # Service registration
│   ├── middleware/               # Request middleware
│   │   ├── validate-request.ts   # Input validation
│   │   └── rate-limit.ts         # Rate limiting
│   ├── utils/                    # Utility functions
│   ├── errors/                   # Error handling
│   ├── auth.ts                   # NextAuth configuration
│   └── validations.ts            # Zod schemas
├── hooks/                        # Shared React hooks
├── prisma/                       # Database schema & migrations
├── backend/                      # Socket.io & background worker
│   ├── server.js                 # Socket.io server (CRITICAL: memory management!)
│   └── worker.ts                 # Background job processor
├── public/                       # Static assets
├── docs/                         # Documentation
│   ├── development/
│   │   ├── CODEBASE_GUIDE.md     # ⭐ READ THIS FIRST!
│   │   └── architecture.md
│   └── api/
└── .cursor/rules/               # Project coding rules
```

### Key Directories

- **`app/`** - Next.js 14+ App Router with Server Components
- **`components/`** - Reusable UI components (check here before creating new ones!)
- **`features/`** - Feature-based modules (self-contained features)
- **`lib/services/`** - **⭐ 10+ existing services - CHECK HERE FIRST!**
- **`lib/di/`** - **⭐ Dependency Injection - ALWAYS use this!**
- **`lib/repositories/`** - Data access (use instead of direct Prisma)
- **`lib/middleware/`** - Request validation, rate limiting
- **`lib/utils/`** - Pure utility functions
- **`backend/`** - Real-time server (Socket.io) and background jobs

### ⚠️ IMPORTANT: Before Writing Code

**READ THIS FIRST:** [`docs/development/CODEBASE_GUIDE.md`](../docs/development/CODEBASE_GUIDE.md)

This guide shows:
- ✅ What services already exist (10+ services!)
- ✅ How to use the DI container
- ✅ API route patterns (all routes follow same structure)
- ✅ Socket.io memory leak prevention (CRITICAL!)
- ✅ Backend patterns you MUST follow

**Most functionality already exists - don't recreate it!**

---

## Testing Guidelines

### Running Tests

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Writing Tests

We use Jest for testing. Always use `DatabaseTransactions` instead of `RefreshDatabase`.

**Example:**
```typescript
import { describe, it, expect, beforeEach } from '@jest/globals';
import { DatabaseTransactions } from '@/lib/test-utils';

describe('MessageService', () => {
  beforeEach(async () => {
    await DatabaseTransactions.start();
  });

  afterEach(async () => {
    await DatabaseTransactions.rollback();
  });

  it('should create a new message', async () => {
    const message = await messageService.createMessage({
      content: 'Test message',
      roomId: 'room-123',
      senderId: 'user-123',
    });

    expect(message.content).toBe('Test message');
    expect(message.roomId).toBe('room-123');
  });
});
```

### Test Coverage Requirements

- **New features:** Minimum 80% coverage
- **Bug fixes:** Add test case that reproduces the bug
- **Critical paths:** 100% coverage (authentication, payment, etc.)

---

## Documentation

### Code Documentation

- **Use JSDoc/TSDoc** for all exported functions and components
- **Explain the "why"**, not just the "what"
- **Document complex algorithms** with step-by-step comments
- **Add examples** for utility functions

**Example:**
```typescript
/**
 * Formats a date relative to now (e.g., "2 hours ago", "yesterday")
 * Falls back to absolute date if more than 7 days old
 * 
 * @param date - The date to format
 * @param locale - The locale for formatting (default: 'en-US')
 * @returns Formatted date string
 * 
 * @example
 * formatRelativeTime(new Date()) // "just now"
 * formatRelativeTime(subHours(new Date(), 2)) // "2 hours ago"
 */
export function formatRelativeTime(date: Date, locale = 'en-US'): string {
  // Implementation
}
```

### README Updates

If you add a new feature, update the README with:
- Brief description
- How to use it
- Configuration options (if any)
- Screenshots or GIFs (for UI features)

### API Documentation

For new API endpoints, document in `/docs/api/`:
- Endpoint path and method
- Request/response schemas
- Authentication requirements
- Rate limits
- Example requests/responses

---

## Community

### Getting Help

- **GitHub Issues:** For bug reports and feature requests
- **GitHub Discussions:** For questions and general discussion
- **Discord:** Join our community server (link in README)

### Reporting Bugs

When reporting bugs, please include:

1. **Description:** Clear description of the bug
2. **Steps to Reproduce:** Numbered steps to reproduce
3. **Expected Behavior:** What should happen
4. **Actual Behavior:** What actually happens
5. **Environment:**
   - OS and version
   - Node.js version
   - Browser (if applicable)
6. **Screenshots/Logs:** If applicable

Use this template:

```markdown
**Bug Description**
A clear and concise description of the bug.

**To Reproduce**
1. Go to '...'
2. Click on '...'
3. See error

**Expected Behavior**
What you expected to happen.

**Screenshots**
Add screenshots if applicable.

**Environment**
- OS: [e.g., Windows 11, macOS 13]
- Node: [e.g., 18.17.0]
- Browser: [e.g., Chrome 120]

**Additional Context**
Any other context about the problem.
```

### Requesting Features

For feature requests, please:

1. **Search existing issues** - Maybe it's already requested
2. **Describe the problem** - What problem does this solve?
3. **Describe the solution** - How would you like it to work?
4. **Consider alternatives** - What other approaches did you consider?
5. **Show examples** - Are there examples in other apps?

---

## Recognition

Contributors who make significant contributions will be:

- ✨ Added to the Contributors section in README
- 🎖️ Recognized in release notes
- 💎 Granted "Contributor" badge in Discord (if applicable)

---

## Questions?

If you have questions about contributing, please:

1. Check existing documentation
2. Search closed issues
3. Ask in GitHub Discussions
4. Reach out to maintainers

---

## License

By contributing, you agree that your contributions will be licensed under the same license as the project (see LICENSE file).

---

Thank you for contributing to Synapse! 🎉

Your contributions make this project better for everyone.
