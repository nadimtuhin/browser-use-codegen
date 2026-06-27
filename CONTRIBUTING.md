# Contributing

## Setup

```bash
git clone https://github.com/nadimtuhin/browser-use-codegen.git
cd browser-use-codegen
npm install
npm run build
npm test
```

## Running tests

Unit tests only (no browser required):
```bash
npm test -- --testPathIgnorePatterns='e2e'
```

E2E tests require Chrome running with remote debugging on port 9222.

## Pull request checklist

- [ ] Tests pass
- [ ] Build passes (`npm run build`)
- [ ] No hardcoded credentials, emails, or internal URLs
