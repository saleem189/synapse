# Synapse

> Modern real-time chat application with video/audio calling, built with Next.js 16 and React 19.

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)

---

## ✨ Features

- 💬 **Real-time Messaging** - Instant chat with Socket.io
- 📹 **Video & Audio Calls** - WebRTC-powered calls with screen sharing
- 📁 **File Sharing** - Upload and share images, videos, documents
- 👥 **Group Chats** - Create and manage group conversations
- 🔔 **Push Notifications** - Desktop and mobile notifications
- 🎨 **Modern UI** - Beautiful, accessible design with dark mode
- 🔐 **Secure** - End-to-end validation, rate limiting, authentication
- 📊 **Admin Dashboard** - User management, analytics, performance monitoring
- ⚡ **Fast** - Optimized with code splitting, caching, lazy loading

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18.x or higher
- PostgreSQL 14.x or higher
- Redis (optional, for production)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/synapse.git
   cd synapse
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env.local
   ```
   Edit `.env.local` with your configuration.

4. **Start PostgreSQL:**
   ```bash
   npm run docker:up
   ```

5. **Run database migrations:**
   ```bash
   npm run db:generate
   npm run db:migrate
   ```

6. **Seed database (optional):**
   ```bash
   npm run db:seed
   ```

7. **Start all services:**
   ```bash
   npm run dev:all
   ```

8. **Open in browser:**
   ```
   http://localhost:3000
   ```

---

## 📚 Documentation

Complete documentation is available at [https://your-username.github.io/synapse/](https://your-username.github.io/synapse/)

- **[Getting Started](./docs/development/getting-started.md)** - Development setup guide
- **[Codebase Guide](./docs/development/CODEBASE_GUIDE.md)** - **READ THIS FIRST!**
- **[API Reference](./docs/api/README.md)** - Complete API documentation
- **[Architecture](./docs/development/architecture.md)** - System design
- **[Deployment](./docs/deployment/README.md)** - Production deployment guide

---

## 🛠️ Tech Stack

### Frontend
- **Next.js 16** - React framework with App Router
- **React 19** - UI library with Server Components
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **shadcn/ui** - Accessible component library
- **Zustand** - State management
- **React Query** - Server state management

### Backend
- **Next.js API Routes** - RESTful API
- **Socket.io** - Real-time WebSocket server
- **Prisma** - Type-safe ORM
- **PostgreSQL** - Primary database
- **Redis** - Caching and queues
- **NextAuth** - Authentication
- **BullMQ** - Background job processing

### Real-time Features
- **Socket.io** - Bidirectional communication
- **Simple-Peer** - WebRTC video/audio calls

### DevOps & Monitoring
- **Sentry** - Error tracking & performance monitoring
- **Docker** - Containerization
- **GitHub Actions** - CI/CD

---

## 🎯 Architecture

Synapse uses a modern, scalable architecture:

```
┌─────────────────────────────────────────────┐
│           Client (Browser)                   │
│  React 19 | Socket.io | WebRTC              │
└──────────┬──────────┬────────────┬──────────┘
           │          │            │
   ┌───────▼──────────▼────────────▼─────────┐
   │      Application Layer                   │
   │  Next.js | Socket.io | Background Worker │
   └───────┬──────────────────────────────────┘
           │
   ┌───────▼──────────────────────────────────┐
   │         Data Layer                        │
   │  PostgreSQL | Redis | S3                 │
   └───────────────────────────────────────────┘
```

Key architectural patterns:
- **Dependency Injection** - Testable, modular services
- **Repository Pattern** - Clean data access layer
- **Feature-based Structure** - High cohesion, low coupling
- **Service Layer** - Business logic separation

See [Architecture Documentation](./docs/development/architecture.md) for details.

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details on:

- Code of conduct
- Development workflow
- Coding standards
- Pull request process
- Testing requirements

**Before contributing, read [Codebase Guide](./docs/development/CODEBASE_GUIDE.md)** to understand existing services and patterns.

---

## 📜 Scripts

### Development
```bash
npm run dev          # Start Next.js dev server
npm run server       # Start Socket.io server
npm run worker       # Start background worker
npm run dev:all      # Start all services
```

### Database
```bash
npm run db:migrate   # Run migrations
npm run db:seed      # Seed database
npm run db:studio    # Open Prisma Studio
npm run db:push      # Push schema changes
```

### Testing
```bash
npm run test         # Run tests
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Run tests with coverage
```

### Build & Production
```bash
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

### Analysis
```bash
npm run analyze      # Analyze bundle size
```

---

## 🔐 Security

Synapse implements multiple security layers:

- ✅ **Input Validation** - Zod schemas on all endpoints
- ✅ **Rate Limiting** - Protection against abuse (5-100 req/min)
- ✅ **Authentication** - NextAuth with JWT tokens
- ✅ **Authorization** - Role-based access control (RBAC)
- ✅ **SQL Injection Prevention** - Prisma ORM
- ✅ **XSS Prevention** - Input sanitization, CSP headers
- ✅ **CSRF Protection** - SameSite cookies
- ✅ **Security Headers** - HSTS, X-Frame-Options, CSP

See [Security Documentation](./docs/development/security.md) for details.

---

## 📊 Performance

- ⚡ **Code Splitting** - Dynamic imports for optimal loading
- 🗄️ **Caching** - Multi-layer caching (Redis, React Query, CDN)
- 🎯 **Lazy Loading** - Heavy components loaded on demand
- 📦 **Bundle Optimization** - Tree shaking, minification
- 🔍 **Monitoring** - Real-time performance dashboard

Performance grade: **A+ (99%)**

---

## 🌐 Deployment

### Quick Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-username/synapse)

### Manual Deploy

See [Deployment Guide](./docs/deployment/README.md) for:
- Environment variables
- Docker setup
- Production checklist
- Scaling strategies
- Monitoring setup

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

Built with:
- [Next.js](https://nextjs.org/)
- [React](https://react.dev/)
- [Socket.io](https://socket.io/)
- [Prisma](https://www.prisma.io/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- And many other amazing open-source projects

---

## 📞 Support

- **Documentation:** [https://your-username.github.io/synapse/](https://your-username.github.io/synapse/)
- **Issues:** [GitHub Issues](https://github.com/your-username/synapse/issues)
- **Discussions:** [GitHub Discussions](https://github.com/your-username/synapse/discussions)

---

## 🌟 Star Us!

If you find Synapse useful, please consider giving us a star on GitHub! ⭐

---

Made with ❤️ by the Synapse team

