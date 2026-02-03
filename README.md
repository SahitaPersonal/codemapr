# CodeFlow Pro

> Next-generation code visualization platform that automatically generates interactive flowcharts from your codebase

## 🚀 Features

- **Automatic Code Analysis** - Parse JavaScript, TypeScript, Node.js, and React.js projects
- **Interactive Flowcharts** - Visual code flow with drag, zoom, and click-to-navigate
- **Cross-File Tracing** - Follow function calls across multiple files and modules
- **AI-Powered Explanations** - GPT-4 powered code insights and optimization suggestions
- **Real-Time Collaboration** - Team-based code exploration with live cursors and annotations
- **Multi-Platform** - Web application and VSCode extension
- **Service Detection** - Visualize HTTP calls, database operations, and API integrations

## 🏗️ Architecture

This is a TypeScript monorepo with the following packages:

- **`packages/backend`** - NestJS API server with PostgreSQL and Redis
- **`packages/frontend`** - Next.js web application with React Flow
- **`packages/shared`** - Shared types and utilities
- **`packages/vscode-extension`** - VSCode extension (coming soon)

## 🛠️ Tech Stack

- **Backend**: NestJS, TypeScript, PostgreSQL, Redis, Bull Queue
- **Frontend**: Next.js, React, TypeScript, React Flow, Tailwind CSS
- **Analysis**: TypeScript Compiler API, Babel Parser
- **AI**: OpenAI GPT-4 API
- **Testing**: Jest, fast-check (Property-Based Testing)

## 🚦 Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Redis 6+
- npm 9+

### Installation

1. Clone the repository:
```bash
git clone https://github.com/your-username/codeflow-pro.git
cd codeflow-pro
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your database and API credentials
```

4. Start development servers:
```bash
npm run dev
```

This will start:
- Backend API: http://localhost:3001
- Frontend: http://localhost:3000
- API Docs: http://localhost:3001/api/docs

## 📖 Usage

1. **Upload your codebase** - Drag and drop your JavaScript/TypeScript project
2. **Wait for analysis** - The system parses your code and builds dependency graphs
3. **Explore flowcharts** - Navigate interactive visualizations of your code flow
4. **Get AI insights** - Click any code section for explanations and suggestions
5. **Collaborate** - Share with team members for real-time exploration

## 🧪 Testing

```bash
# Run all tests
npm test

# Run property-based tests
npm run test:pbt

# Run with coverage
npm run test:cov
```

## 📚 Documentation

- [API Documentation](http://localhost:3001/api/docs) - Swagger/OpenAPI docs
- [Architecture Guide](docs/architecture.md) - System design and components
- [Development Guide](docs/development.md) - Contributing and development setup

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- TypeScript team for the Compiler API
- React Flow for visualization components
- NestJS for the backend framework
- OpenAI for GPT-4 API