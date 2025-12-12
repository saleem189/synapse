# Synapse Documentation

**Real-time chat and video calling for modern applications**

---

## 🧠 About Synapse

**Synapse** *(Greek origin)* - **Pronunciation:** SIN-aps - **Meaning:** Connection between signals

A synapse is the junction where neurons transmit signals, enabling rapid communication. Synapse creates seamless connections between people for instant, real-time communication through messages, calls, and file sharing.

---

## Choose Your Path

<table>
<tr>
<td width="50%" valign="top">

### 📘 Product Documentation

**For users, integrators, and API consumers**

Learn how to use Synapse, integrate it into your applications, and deploy it to production.

#### Quick Start
- **[5-Minute Quickstart](./product/getting-started/quickstart.md)**
- **[Authentication Guide](./product/getting-started/authentication.md)**
- **[Send First Message](./product/guides/send-first-message.md)**

#### Core Concepts
- **[Rooms & Members](./product/concepts/rooms.md)**
- **[Messages](./product/concepts/messages.md)**
- **[Real-time Events](./product/concepts/realtime.md)**
- **[Video Calls](./product/concepts/video-calls.md)**
- **[Notifications](./product/concepts/notifications.md)**

#### Guides
- **[Send Messages](./product/guides/send-first-message.md)**
- **[Start Video Calls](./product/guides/start-video-call.md)**
- **[Real-time Updates](./product/guides/realtime-events.md)**
- **[Upload Files](./product/guides/upload-files.md)**

#### API Reference
- **[REST API](./product/api-reference/README.md)**
- **[WebSocket Events](./product/api-reference/websocket/README.md)**
- **[Errors & Rate Limits](./product/api-reference/errors.md)**

#### Deployment
- **[Self-Hosting Guide](./product/deployment/self-hosting.md)**
- **[Docker Setup](./product/deployment/docker.md)**
- **[Production Checklist](./product/deployment/production.md)**

**[→ Browse Product Docs](./product/README.md)**

</td>
<td width="50%" valign="top">

### 🛠️ Contributor Documentation

**For developers adding features and fixing bugs**

Learn the architecture, understand existing code, and contribute effectively.

#### Getting Started
- **[Development Setup](./contributors/getting-started/setup.md)** (15 min)
- **[First Contribution](./contributors/getting-started/first-contribution.md)** (30 min)
- **[Contributing Guide](../CONTRIBUTING.md)**

#### Architecture (Essential Reading)
- **[01 - Architecture Overview](./development/01-ARCHITECTURE-OVERVIEW.md)** ⭐ START HERE (20 min)
- **[02 - Dependency Injection](./development/02-DEPENDENCY-INJECTION.md)** (20 min)
- **[Codebase Guide](./development/CODEBASE_GUIDE.md)** (15 min)

#### Deep Dives
- **[03 - Socket.io & WebRTC](./development/03-SOCKET-IO-AND-WEBRTC.md)** (30 min)
  - ⚠️ CRITICAL: Memory leak prevention
- **[04 - Queue System](./development/04-QUEUE-SYSTEM.md)** (25 min)
- **[Complete Developer Guide](./development/COMPLETE-DEVELOPER-GUIDE.md)** (30 min)
  - Notifications, frontend, themes, API patterns

#### Common Tasks
- **[Add a Service](./development/02-DEPENDENCY-INJECTION.md#creating-new-services)**
- **[Add API Endpoint](./development/COMPLETE-DEVELOPER-GUIDE.md#api-patterns)**
- **[Add Socket.io Event](./development/03-SOCKET-IO-AND-WEBRTC.md#adding-new-events)**
- **[Add Background Job](./development/04-QUEUE-SYSTEM.md#creating-new-job-types)**

#### Before You Code
- ✅ Read [Architecture Overview](./development/01-ARCHITECTURE-OVERVIEW.md)
- ✅ Check [Codebase Guide](./development/CODEBASE_GUIDE.md) (don't recreate existing functionality!)
- ✅ Review [Coding Standards](../CONTRIBUTING.md#coding-standards)

**[→ Browse Contributor Docs](./contributors/README.md)**

</td>
</tr>
</table>

---

## Popular Pages

| Task | Documentation |
|------|---------------|
| **Run Synapse locally** | [Quickstart](./product/getting-started/quickstart.md) |
| **Make first API call** | [Authentication](./product/getting-started/authentication.md) |
| **Send messages** | [Send Messages Guide](./product/guides/send-first-message.md) |
| **Start video call** | [Video Call Guide](./product/guides/start-video-call.md) |
| **Set up dev environment** | [Development Setup](./contributors/getting-started/setup.md) |
| **Understand architecture** | [Architecture Overview](./development/01-ARCHITECTURE-OVERVIEW.md) |
| **Use DI container** | [Dependency Injection](./development/02-DEPENDENCY-INJECTION.md) |
| **Make first contribution** | [First Contribution](./contributors/getting-started/first-contribution.md) |

---

## Documentation Statistics

### Product Documentation (15 pages)
- ✅ Getting Started (Quickstart, Authentication)
- ✅ Practical Guides (Messages, Video Calls, Real-time, Files)
- ✅ Core Concepts (Rooms, Messages, Real-time, Video, Notifications)
- ✅ API Reference (REST & WebSocket)
- ✅ Deployment (Self-hosting, Docker, Production)

### Contributor Documentation (8 pages)
- ✅ Getting Started (Setup, First Contribution)
- ✅ Architecture Deep Dives (5 comprehensive guides)
- ✅ Developer Guide (Complete reference)

**Total:** 23 pages + existing legacy docs

---

## What's New

**December 12, 2025:**
- ✨ New Stripe/OpenAI-style product documentation
- ✨ Reorganized contributor documentation
- ✨ Clear separation: Product users vs Contributors
- ✨ Short, focused pages (5-15 min reads)
- ✨ Multi-language code examples
- ✨ Copy/paste working code snippets

---

## Documentation Approach

**Product Docs:**
- Short pages (5-15 min read)
- Copy/paste examples that work
- Multi-language (curl, JavaScript, Python)
- Consistent structure (What → How → Troubleshoot)
- Minimal emojis (professional)

**Contributor Docs:**
- Comprehensive technical depth
- Real code from codebase
- Visual diagrams
- DO/DON'T patterns
- Troubleshooting sections

---

## 🤝 Getting Help

- **[GitHub Issues](https://github.com/saleem189/synapse/issues)** - Report bugs or request features
- **[GitHub Discussions](https://github.com/saleem189/synapse/discussions)** - Ask questions
- **Pull Requests** - Contribute code or documentation

---

## 📝 Contributing to Docs

Documentation improvements are always welcome!

**Product Docs:** Follow Stripe/OpenAI style (short, examples-first)  
**Contributor Docs:** Be thorough, include code snippets, add troubleshooting

See: [Contributing Guide](../CONTRIBUTING.md)

---

Made with ❤️ by the Synapse community
