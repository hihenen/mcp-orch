# Contributing to MCP Orchestrator

Welcome to the MCP Orchestrator project! We're excited to have you contribute to building the future of Model Context Protocol orchestration.

## 🚨 Important: Contributor License Agreement Required

**All contributions require acceptance of our [Contributor License Agreement (CLA)](./CLA.md).**

### Quick Start for Contributors
1. Read and understand the [CLA.md](./CLA.md)
2. Add your name to [CONTRIBUTORS.md](./CONTRIBUTORS.md) with CLA acceptance
3. Include CLA confirmation in your first pull request
4. Start contributing!

---

## 🎯 Project Vision

MCP Orchestrator aims to be the leading open-source platform for managing and orchestrating Model Context Protocol servers. We're building:

- 🏗️ **Enterprise-grade infrastructure** for MCP server management
- 🔧 **Developer-friendly tools** for MCP integration
- 🌐 **Scalable architecture** for production deployments
- 🛡️ **Security-first approach** with encryption and access controls

---

## 📋 Ways to Contribute

### 🐛 Bug Reports
- Use GitHub Issues with the "bug" label
- Include detailed reproduction steps
- Provide environment information
- Add screenshots or logs when helpful

### 💡 Feature Requests
- Open a GitHub Issue with the "enhancement" label
- Describe the use case and expected behavior
- Include mockups or examples if applicable
- Discuss implementation approach

### 📝 Code Contributions
- Fork the repository
- Create a feature branch
- Follow our coding standards
- Include tests and documentation
- Submit a pull request

### 📚 Documentation
- Improve existing documentation
- Add examples and tutorials
- Translate documentation
- Fix typos and formatting

### 🧪 Testing
- Add test coverage for new features
- Improve existing test suites
- Test across different environments
- Report and fix test failures

---

## 🛠️ Development Setup

### Prerequisites
- **Python 3.11+** for backend development
- **Node.js 18+** for frontend development
- **Docker & Docker Compose** for local development
- **Git** for version control

### Local Development
```bash
# Clone the repository
git clone https://github.com/[username]/mcp-orch.git
cd mcp-orch

# Backend setup
cd src/mcp_orch
pip install -e .
python run_server.py

# Frontend setup
cd web
pnpm install
pnpm dev

# Full stack with Docker
docker-compose up
```

### Environment Configuration
1. Copy `mcp-config.example.json` to `mcp-config.json`
2. Configure database and authentication settings
3. Set up environment variables as documented

---

## 📏 Coding Standards

### Python Backend
- **Style**: Follow PEP 8 with Black formatting
- **Type Hints**: Required for all public functions
- **Documentation**: Docstrings for classes and public methods
- **Testing**: Pytest with >80% coverage target

### TypeScript Frontend
- **Style**: ESLint + Prettier configuration
- **Components**: Functional components with TypeScript
- **State Management**: Zustand for application state
- **UI Library**: shadcn/ui with Tailwind CSS

### Commit Messages
Follow conventional commit format:
```
type(scope): description

feat(auth): add JWT token refresh mechanism
fix(ui): resolve button alignment issue
docs(api): update authentication examples
```

### Branch Naming
- `feature/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation updates
- `refactor/description` - Code refactoring

---

## 🧪 Testing Guidelines

### Backend Testing
```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=mcp_orch

# Run specific test file
pytest tests/test_api.py
```

### Frontend Testing
```bash
# Run tests
pnpm test

# Run with watch mode
pnpm test:watch

# Run E2E tests
pnpm test:e2e
```

### Test Requirements
- **Unit tests** for business logic
- **Integration tests** for API endpoints
- **E2E tests** for critical user flows
- **Performance tests** for scalability

---

## 📖 Documentation Standards

### Code Documentation
- **Python**: Google-style docstrings
- **TypeScript**: JSDoc comments for complex functions
- **API**: OpenAPI/Swagger specifications
- **Architecture**: Mermaid diagrams for complex flows

### User Documentation
- **Installation guides** with multiple platforms
- **API documentation** with examples
- **Troubleshooting guides** for common issues
- **Best practices** for production deployment

---

## 🚀 Pull Request Process

### Before Submitting
1. ✅ **CLA signed** and confirmed
2. ✅ **Tests passing** locally
3. ✅ **Code reviewed** for quality
4. ✅ **Documentation updated** as needed
5. ✅ **Commits squashed** if necessary

### PR Template
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## CLA Confirmation
By submitting this pull request, I confirm that my contributions are made under the terms of the CLA.md
Signed: [Your Name] <email@example.com>
Date: [YYYY-MM-DD]
```

### Review Process
1. **Automated checks** must pass
2. **Peer review** by project maintainers
3. **Documentation review** if applicable
4. **Security review** for sensitive changes
5. **Final approval** by project maintainer

---

## 🏛️ Governance and Decision Making

### Project Maintainer Authority
- **Final decision** on feature acceptance
- **License and legal** decisions
- **Release planning** and versioning
- **Community guidelines** enforcement

### Community Input
- **GitHub Discussions** for major decisions
- **Issue voting** for feature prioritization
- **RFC process** for significant changes
- **Regular feedback** collection

### Code of Conduct
We follow the [Contributor Covenant](https://www.contributor-covenant.org/):
- **Be respectful** and inclusive
- **Collaborate effectively** with others
- **Focus on constructive** feedback
- **Report violations** to project maintainers

---

## 🆘 Getting Help

### Documentation
- [Installation Guide](./docs/설치_가이드.md)
- [API Documentation](./docs/API_인증_및_확장_로드맵.md)
- [Architecture Guide](./docs/technology-decision-framework.md)

### Community Support
- **GitHub Issues** for bugs and features
- **GitHub Discussions** for questions
- **Documentation** for common questions
- **Email**: yss1530@naver.com for sensitive issues
- **Development Support**: next.js@kakao.com for technical discussions

### Development Help
- **Code reviews** for learning
- **Pair programming** sessions (timezone-friendly with Seoul, Korea 🇰🇷)
- **Mentorship** for new contributors
- **Architecture discussions** for complex features
- **Cross-cultural collaboration** - International contributors welcome!

### 🌏 International Collaboration
The project maintainer (based in Seoul) actively welcomes global contributors:
- **Language Support**: GPT/AI translation tools used for smooth communication
- **Timezone Flexibility**: Asynchronous collaboration encouraged
- **Cultural Exchange**: Learn about Korean dev culture while contributing
- **Professional Networking**: Build connections across the AI/LLM community

---

## 📊 Project Status and Roadmap

### Current Focus Areas
1. **Core MCP Integration** - Stable server management
2. **Security Features** - Encryption and access controls
3. **UI/UX Improvements** - Better user experience
4. **Performance Optimization** - Scalability improvements
5. **Documentation** - Comprehensive guides

### Future Plans
- **Plugin System** for extensibility
- **Multi-tenant Support** for SaaS deployment
- **Advanced Analytics** for usage insights
- **API Gateway Features** for MCP routing

---

## 🎉 Recognition

### Contributor Benefits
- **Credit** in release notes and documentation
- **GitHub badge** showing contribution status
- **Early access** to new features
- **Direct communication** with maintainers

### Hall of Fame
Outstanding contributors will be featured in:
- Project README
- Release announcements
- Conference presentations
- Community spotlights

---

Thank you for contributing to MCP Orchestrator! Together, we're building the future of Model Context Protocol orchestration.

For questions about contributing, please open an issue or start a discussion on GitHub.