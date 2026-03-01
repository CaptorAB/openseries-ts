# Publishing Guide

This project supports publishing to two registries: **GitHub Packages** and **public npm** (via OIDC trusted publishing).

## GitHub Packages (default)

No extra setup. Use `target: github` when running the workflow.

## Public npm (OIDC trusted publishing)

Publishing to npm uses OIDC—no long-lived tokens. One-time setup on npmjs.com is required.

### Prerequisites

- npm account ([signup](https://www.npmjs.com/signup))
- Two-factor authentication enabled on your npm account
- npm CLI 11.5.1+ and Node 22.14+ (the workflow uses Node 22)

### One-time setup on npmjs.com

1. **Publish the package once manually** (creates it on npm):
   ```bash
   npm publish --access public --registry=https://registry.npmjs.org
   ```
   You'll need to log in with `npm login` first. This creates the package; all future publishes can use OIDC.

2. **Configure trusted publisher**:
   - Go to [npmjs.com](https://www.npmjs.com/) → Your account → **Packages** → **@captorab/openseries-ts**
   - Or open `https://www.npmjs.com/package/@captorab/openseries-ts/access`
   - Open **Trusted publishing** → **GitHub Actions**
   - Set:
     - **Workflow filename**: `publish.yml` (exact, including `.yml`)
     - **Repository**: `CaptorAB/openseries-ts`
     - **Owner**: `CaptorAB`
   - Save (Update Package Settings)

3. **Optional: restrict token access** (recommended):
   - In package **Settings** → **Publishing access**
   - Enable **Require two-factor authentication and disallow tokens**
   - OIDC publishes continue to work

### Running the workflow

1. Actions → **Publish** → Run workflow
2. Choose **target**: `npm`
3. Choose **bump**: patch / minor / major
4. Run

The workflow uses OIDC; no `NPM_TOKEN` secret is needed.
