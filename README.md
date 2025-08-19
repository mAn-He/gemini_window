# Gemini Desktop

**An Enterprise-Grade AI Research Assistant with Advanced Security, Multi-Agent Architecture, and Intelligent Canvas**

A sophisticated Electron desktop application that harnesses Google's Gemini AI with production-ready features including HITL security, conversation memory, comprehensive error handling, and automated testing. Built with React, TypeScript, LangGraph.js, and enterprise-grade architectural patterns.

---

## ✨ Core Features

### 🤖 **Advanced Multi-Agent System**
- **Supervisor Agent**: Intelligent task router with conversation context awareness
- **Deep Research Agent (TTD-DR)**: Multi-step research with automatic retry and error recovery
- **MLE Agent**: Specialized coding assistant for development tasks
- **Conversation Memory**: Persistent context management across sessions

### 🔒 **Enterprise Security (HITL)**
- **Human-in-the-Loop Consent System**: User approval for sensitive operations
- **Policy-Based Permissions**: Configurable security policies for different operation types
- **Audit Trail**: Complete logging of all consent decisions
- **Risk Assessment**: Automatic risk evaluation for file access, API calls, and code execution

### 🎨 **Interactive AI Canvas**
- **Conversational Design**: Natural language commands for visual creation
- **Real-time Synchronization**: Fabric.js canvas with Gemini AI integration
- **State Persistence**: Automatic saving and restoration of canvas work
- **Object Management**: Add, modify, and remove elements through chat

### 🔄 **Robust Error Handling**
- **Automatic Retry Logic**: Exponential backoff for transient failures
- **Graceful Degradation**: Fallback mechanisms for all critical operations
- **Timeout Management**: Configurable timeouts with automatic recovery
- **Rate Limit Handling**: Intelligent throttling and queue management

### 📚 **Comprehensive State Management**
- **Immer Integration**: Immutable state updates with optimal performance
- **Session Management**: Multi-session support with history tracking
- **API Key Management**: Secure storage and rotation of credentials
- **Consent History**: Complete record of user security decisions

---

## 📊 Implementation Status

### ✅ **Phase 1: Core Infrastructure** - Complete
- **IPC Type Safety**: Full TypeScript definitions for all IPC channels (`src/types/api.d.ts`)
- **State Management**: Zustand + Immer with `useShallow` optimizations
- **Tool Integration**: Tavily, Arxiv, and Gemini-powered web tools

### ✅ **Phase 2: Advanced Features** - Complete
- **Deep Research Engine**: LangGraph state machine with denoising loop
- **MCP Integration**: Robust server lifecycle management
- **HITL Security Model**: Complete consent management system
- **Error Recovery**: RetryManager with configurable policies

### ✅ **Phase 3: Production Ready** - Complete
- **Gemini Canvas**: Full CRUD operations via natural language
- **Multi-Agent Routing**: Dynamic intent classification and task distribution
- **Conversation Context**: Persistent memory across agent interactions
- **Test Coverage**: Comprehensive Jest test suites

### ✅ **Additional Enhancements** - Complete
- **Retry Mechanisms**: All external API calls protected with retry logic
- **Session Management**: Complete conversation history tracking
- **Security Policies**: Configurable consent policies per operation type
- **Production Testing**: Unit tests for all critical components

---

## 🛠️ Tech Stack

### **Frontend**
- React 18 + TypeScript 5.6
- Tailwind CSS + Framer Motion
- Fabric.js for Canvas
- Zustand + Immer for State Management
- Monaco Editor for Code Display

### **Backend** 
- Electron 33 + Node.js 18+
- Google Generative AI SDK (Gemini 2.5 Pro)
- LangChain.js / LangGraph.js for Agent Architecture
- Tavily & Arxiv for Research Tools

### **Security & Reliability**
- HITL Consent Service
- RetryManager with Exponential Backoff
- Session-based Conversation Memory
- Comprehensive Error Boundaries

### **Development & Testing**
- Electron Vite (Build Tool)
- Jest + Testing Library (Unit Testing)
- TypeScript for Type Safety
- ESLint + Prettier (Code Quality)

---

## 🚀 Quick Start

### 📋 Prerequisites
- Node.js 18+ (Required)
- Git
- API Keys:
  - Google AI (Gemini) API Key
  - Tavily API Key

### 🔧 Installation

```bash
# 1. Clone the repository
git clone https://github.com/your-username/gemini-desktop.git
cd gemini-desktop

# 2. Install dependencies (including dev dependencies)
npm install

# 3. Set up environment variables
# Create a .env file in the root directory:
cat > .env << EOF
GEMINI_API_KEY=your-google-ai-api-key-here
TAVILY_API_KEY=your-tavily-api-key-here
EOF

# 4. Run tests to verify installation
npm test

# 5. Start development server
npm run dev
```

### 📦 Build & Distribution

```bash
# Build for production
npm run build

# Run tests with coverage
npm run test:coverage

# Package for distribution (Windows/Mac/Linux)
npm run package

# The packaged application will be in the dist-electron folder
```

---

## 🧪 Testing

The project includes comprehensive test coverage:

```bash
# Run all tests
npm test

# Run tests in watch mode (for development)
npm run test:watch

# Generate coverage report
npm run test:coverage

# Run tests in CI mode
npm run test:ci
```

### Test Coverage Areas:
- ✅ RetryManager: Retry logic, timeout handling, batch operations
- ✅ ConsentService: Security policies, user approvals, audit logging
- ✅ State Management: Zustand store, conversation history, session management
- ✅ Agent Communication: IPC channels, message passing, error handling

---

## 🔒 Security Features

### Human-in-the-Loop (HITL) Consent System
The application implements a comprehensive consent management system for sensitive operations:

- **File System Access**: Requires explicit user approval
- **External API Calls**: Configurable approval policies
- **Code Execution**: Always requires user consent
- **Data Export**: Protected with consent verification

### Security Policies
```typescript
// Example: Configuring security policies
{
  'file_access': { requiresConfirmation: true, autoApprove: false },
  'api_call': { requiresConfirmation: true, maxAutoApprovals: 10 },
  'code_execution': { requiresConfirmation: true, autoApprove: false }
}
```

---

## 🏗️ Architecture

### Multi-Agent System
```
User Input
    ↓
Supervisor Agent (Router)
    ├─→ Deep Research Agent (Complex Research)
    │     ├─→ Clarify Query
    │     ├─→ Plan Research
    │     ├─→ Draft Report
    │     ├─→ Critique & Refine
    │     └─→ Tool Execution
    ├─→ MLE Agent (Coding Tasks)
    └─→ General Chat (Simple Queries)
```

### State Management Flow
```
Zustand Store (with Immer)
    ├─→ Canvas State (Fabric.js)
    ├─→ Conversation History
    ├─→ Session Management
    ├─→ API Configuration
    └─→ Consent History
```

---

## 📝 API Documentation

### IPC Channels

| Channel | Direction | Purpose |
|---------|-----------|---------|
| `run-supervisor` | Renderer → Main | Execute supervisor agent |
| `run-canvas-ai` | Renderer → Main | Process canvas commands |
| `fs:read` | Renderer → Main | Read file with consent |
| `api:call` | Renderer → Main | External API with consent |
| `agent-update` | Main → Renderer | Agent status updates |
| `canvas:update` | Main → Renderer | Canvas modifications |
| `consent:update` | Main → Renderer | Consent decisions |
| `mcp-status` | Main → Renderer | MCP server status |

---

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Write tests for new features
4. Ensure all tests pass (`npm test`)
5. Commit your changes (`git commit -m 'feat: Add AmazingFeature'`)
6. Push to the branch (`git push origin feature/AmazingFeature`)
7. Open a Pull Request

### Commit Convention
We use conventional commits:
- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `test:` Test additions or modifications
- `refactor:` Code refactoring
- `chore:` Maintenance tasks

---

## 🐛 Troubleshooting

### Common Issues

**Issue**: API rate limits
**Solution**: The RetryManager automatically handles rate limits with exponential backoff

**Issue**: MCP server fails to start
**Solution**: Ensure `@modelcontextprotocol/server-filesystem` is installed

**Issue**: Canvas not updating
**Solution**: Check browser console for errors, verify Gemini API key

**Issue**: Tests failing
**Solution**: Run `npm install` to ensure all dev dependencies are installed

---

## 📈 Performance Optimization

- **Lazy Loading**: Agents are initialized on-demand
- **State Optimization**: Immer ensures minimal re-renders
- **Retry Logic**: Prevents unnecessary API calls
- **Session Caching**: Conversation history is efficiently managed
- **Selective Persistence**: Only essential state is saved to disk

---

## 🔮 Roadmap

- [ ] Plugin system for custom tools
- [ ] Voice input/output support
- [ ] Collaborative canvas sharing
- [ ] Advanced visualization tools
- [ ] Custom agent creation interface
- [ ] Cloud synchronization
- [ ] Mobile companion app

---

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- Google Gemini Team for the powerful AI model
- LangChain.js community for the agent framework
- Electron team for the desktop platform
- All contributors and testers

---

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/your-username/gemini-desktop/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-username/gemini-desktop/discussions)
- **Email**: support@gemini-desktop.example.com

---

**Built with ❤️ by the Gemini Desktop Team**