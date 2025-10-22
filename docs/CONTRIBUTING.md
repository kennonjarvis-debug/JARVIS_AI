# Contributing Guide

**Jarvis + AI DAWG - Contribution Guidelines**
**Last Updated:** 2025-10-08

---

## Welcome Contributors!

Thank you for your interest in contributing to Jarvis + AI DAWG. This guide will help you get started.

---

## Code of Conduct

- Be respectful and professional
- Provide constructive feedback
- Focus on the problem, not the person
- Welcome newcomers

---

## Getting Started

1. **Fork the repository**
2. **Clone your fork**
3. **Set up development environment** (see [GETTING_STARTED.md](./GETTING_STARTED.md))
4. **Create a feature branch**
5. **Make your changes**
6. **Submit a pull request**

---

## Development Workflow

### 1. Create Feature Branch

```bash
git checkout -b feature/my-feature
```

**Branch naming conventions:**
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring
- `test/` - Test additions/changes

### 2. Make Changes

- Write clean, readable code
- Follow existing code style
- Add tests for new features
- Update documentation as needed

### 3. Test Your Changes

```bash
# Run all tests
npm test

# Run type checking
npm run type-check

# Run linter
npm run lint
```

### 4. Commit Changes

**Commit message format:**
```
type(scope): brief description

Longer description if needed...

Fixes #issue-number
```

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation
- `style` - Code style (formatting)
- `refactor` - Code refactoring
- `test` - Tests
- `chore` - Maintenance

**Examples:**
```
feat(music): add vocal analysis command

Add new command to analyze vocal quality and performance.
Includes pitch detection, timing analysis, and tone assessment.

Fixes #123
```

```
fix(router): handle retry timeout correctly

Previously timeout errors weren't being caught properly.
Now retries work as expected with exponential backoff.

Fixes #456
```

### 5. Push Changes

```bash
git push origin feature/my-feature
```

### 6. Create Pull Request

- Go to GitHub
- Click "New Pull Request"
- Select your branch
- Fill out PR template
- Request reviews

---

## Code Style

### TypeScript

```typescript
// Use clear, descriptive names
✅ function generateMusicFromPrompt(prompt: string)
❌ function gen(p: string)

// Add type annotations
✅ async function getUser(id: string): Promise<User>
❌ async function getUser(id)

// Use interfaces for complex types
✅ interface ModuleCommand {
  module: string;
  action: string;
  params: Record<string, any>;
}
❌ type Command = { module: string; action: string; params: any }

// Handle errors properly
✅ try {
  const result = await doSomething();
  return result;
} catch (error: any) {
  logger.error('Failed to do something', { error: error.message });
  throw new Error(`Operation failed: ${error.message}`);
}
❌ const result = await doSomething();

// Use async/await over promises
✅ const data = await fetchData();
❌ fetchData().then(data => ...)
```

### Formatting

- **Indentation:** 2 spaces
- **Semicolons:** Yes
- **Quotes:** Single quotes
- **Line length:** 100 characters max
- **Trailing commas:** Yes

```typescript
// Good
const config = {
  port: 4000,
  url: 'http://localhost',
};

// Bad
const config = {
  port: 4000,
  url: "http://localhost"
}
```

---

## Testing

### Write Tests for New Features

```typescript
describe('MyFeature', () => {
  describe('myFunction', () => {
    it('should return expected result', async () => {
      // Arrange
      const input = 'test';
      
      // Act
      const result = await myFunction(input);
      
      // Assert
      expect(result).toBe('expected');
    });

    it('should handle errors', async () => {
      await expect(myFunction(null)).rejects.toThrow('Invalid input');
    });
  });
});
```

### Test Coverage

- Aim for > 80% coverage
- Test happy paths and error cases
- Test edge cases
- Mock external dependencies

```typescript
// Mock example
jest.mock('axios');
const mockAxios = axios as jest.Mocked<typeof axios>;

mockAxios.post.mockResolvedValue({ data: { success: true } });
```

---

## Documentation

### Code Comments

```typescript
// Good: Explain WHY, not WHAT
// Retry with exponential backoff to handle transient network issues
await retryWithBackoff(operation);

// Bad: Stating the obvious
// Call retry function
await retry(operation);
```

### JSDoc for Public APIs

```typescript
/**
 * Execute a module command with automatic retry logic
 * 
 * @param command - The command to execute
 * @param command.module - Module name
 * @param command.action - Action to perform
 * @param command.params - Action parameters
 * @returns Promise resolving to command result
 * @throws {Error} If all retry attempts fail
 * 
 * @example
 * ```typescript
 * const result = await executeCommand({
 *   module: 'music',
 *   action: 'generate-music',
 *   params: { prompt: 'lofi beat' }
 * });
 * ```
 */
async function executeCommand(command: ModuleCommand): Promise<any> {
  // Implementation
}
```

### Update Documentation

When making changes that affect:
- **API:** Update [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
- **Architecture:** Update [ARCHITECTURE.md](./ARCHITECTURE.md)
- **Modules:** Update [MODULE_SDK_GUIDE.md](../ai-dawg-v0.1/docs/MODULE_SDK_GUIDE.md)
- **Deployment:** Update [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)

---

## Pull Request Process

### Before Submitting

- [ ] All tests pass
- [ ] Code follows style guidelines
- [ ] Documentation updated
- [ ] Commit messages follow convention
- [ ] Branch is up to date with main

### PR Template

```markdown
## Description
Brief description of changes...

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
Describe how you tested the changes...

## Checklist
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No breaking changes (or documented)
- [ ] Follows code style guidelines

## Related Issues
Fixes #issue-number
```

### Review Process

1. **Automated checks run:**
   - Tests
   - Linting
   - Type checking
   - Build

2. **Code review:**
   - At least one approval required
   - Address reviewer feedback
   - Make requested changes

3. **Merge:**
   - Squash and merge (preferred)
   - Delete branch after merge

---

## Module Development

### Creating New Modules

1. **Create module file:**
```typescript
// ai-dawg-v0.1/src/modules/mymodule/index.ts
export class MyModule extends BaseModule {
  // Implementation
}
```

2. **Register module:**
```typescript
// ai-dawg-v0.1/src/modules/module-loader.ts
import { MyModule } from './mymodule';
```

3. **Add tests:**
```typescript
// ai-dawg-v0.1/tests/unit/modules/mymodule.test.ts
describe('MyModule', () => {
  // Tests
});
```

4. **Document commands:**
Update [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) with new commands.

---

## Common Pitfalls

### ❌ Don't

```typescript
// Hardcoded values
const API_KEY = 'abc123';

// Ignoring errors
try { await doSomething(); } catch {}

// Synchronous operations in async functions
const data = fs.readFileSync('file.txt');

// Mutating inputs
function addItem(list: string[], item: string) {
  list.push(item);  // Mutates input!
  return list;
}
```

### ✅ Do

```typescript
// Use environment variables
const API_KEY = process.env.API_KEY;

// Handle errors properly
try {
  await doSomething();
} catch (error: any) {
  logger.error('Operation failed', { error });
  throw error;
}

// Use async operations
const data = await fs.promises.readFile('file.txt');

// Avoid mutations
function addItem(list: string[], item: string): string[] {
  return [...list, item];  // Returns new array
}
```

---

## Release Process

### Versioning

We follow [Semantic Versioning](https://semver.org/):
- **Major (1.0.0):** Breaking changes
- **Minor (0.1.0):** New features (backward compatible)
- **Patch (0.0.1):** Bug fixes

### Release Steps

1. **Update version:**
```bash
npm version minor  # or major/patch
```

2. **Update CHANGELOG:**
```markdown
## [1.1.0] - 2025-10-08
### Added
- New music analysis command
- Support for MP3 files

### Fixed
- Retry logic timeout issue
```

3. **Create release tag:**
```bash
git tag v1.1.0
git push origin v1.1.0
```

4. **Deploy to production**

---

## Getting Help

- **Questions:** Create GitHub discussion
- **Bugs:** Create GitHub issue
- **Security Issues:** Email security@example.com (don't create public issue)
- **Feature Requests:** Create GitHub issue with "enhancement" label

---

## Recognition

Contributors are recognized in:
- README.md contributor section
- Release notes
- Git commit history

Thank you for contributing! 🎉

