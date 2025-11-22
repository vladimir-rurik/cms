# Contributing to Universal CMS Core

Want to help build Universal CMS Core? Awesome! Here's how to get started.

## Getting Started

### What you need
- Node.js 18.0.0+
- npm 9.0.0+
- Git

### Quick setup

1. **Fork and clone**
   ```bash
   git clone https://github.com/YOUR_USERNAME/core.git
   cd core
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Verify setup**
   ```bash
   npm run build
   npm test
   ```

## How we work

### Code style
We use ESLint and Prettier. Run `npm run lint:fix` to auto-fix most issues.

### TypeScript rules
- Use TypeScript for everything
- Write explicit types when they're not obvious
- Document public APIs with JSDoc

### Testing
Write tests for your code. We aim for 90%+ coverage.

```bash
npm test                 # Run tests
npm run test:coverage   # Run with coverage
```

## Making changes

1. **Create a branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```

2. **Make your changes**
   - Write clean, readable code
   - Add tests for new features
   - Update docs if needed

3. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add amazing feature

   - What it does
   - How it works

   Closes #123"
   ```

   Use conventional commit messages:
   - `feat:` for new features
   - `fix:` for bug fixes
   - `docs:` for documentation changes
   - `test:` for test changes

4. **Submit a pull request**
   ```bash
   git push origin feature/amazing-feature
   ```

## Building components

### New components

```typescript
export class NewComponent extends BaseComponent {
  async render(context: RenderContext): Promise<RenderResult> {
    // Your component logic
  }
}
```

### New services

```typescript
export class NewService {
  constructor(dependencies?: any) {
    // Service setup
  }
}

// Register it
container.register('NewService', NewService, ServiceLifetime.Singleton);
```

## Before you submit

Make sure:
- All tests pass: `npm test`
- Code is clean: `npm run lint`
- Build succeeds: `npm run build`
- Documentation is updated
- Git history is clean

## Bug reports

Found a bug? Tell us:
- What happened
- How to reproduce it
- What you expected to happen
- Your environment (Node.js version, OS, etc.)

## Feature requests

Have an idea for a feature? Great!
- Check if someone already requested it
- Describe what it should do
- Explain why it's useful
- Suggest how it might work

## Release process

We handle releases automatically through GitHub Actions. When you merge to main:
1. Tests run automatically
2. If version changed, it publishes to NPM
3. GitHub release is created

## Community

Be cool to each other. We're all here to build something useful.

- Be respectful and constructive
- Help newcomers learn
- Focus on what's best for the community

## Recognition

Contributors get credit in:
- README.md contributor list
- Release notes
- GitHub stats

Thanks for helping out!

---

Questions? Open an issue or start a discussion.