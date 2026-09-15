const fs = require('fs');
const path = require('path');
const {execSync} = require('child_process');

function getCommitHash() {
    // 1. Vercel deployment environment variable
    if (process.env.VERCEL_GIT_COMMIT_SHA) {
        return process.env.VERCEL_GIT_COMMIT_SHA.substring(0, 7);
    }
    // 2. GitHub Actions environment variable
    if (process.env.GITHUB_SHA) {
        return process.env.GITHUB_SHA.substring(0, 7);
    }
    // 3. Local git repository fallback
    try {
        const hash = execSync('git rev-parse --short HEAD', {
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'ignore']
        }).trim();
        if (hash) return hash;
    } catch (e) {
        // Git command failed or not in a git repo
    }
    return 'dev-local';
}

function getReleaseVersion() {
    // 1. If GitHub Actions is triggered by a release tag
    if (process.env.GITHUB_REF_TYPE === 'tag' && process.env.GITHUB_REF_NAME) {
        const tag = process.env.GITHUB_REF_NAME.trim();
        return tag.startsWith('v') ? tag : `v${tag}`;
    }
    // 2. Git tag from repository
    try {
        const tag = execSync('git describe --tags --abbrev=0', {
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'ignore']
        }).trim();
        if (tag) return tag.startsWith('v') ? tag : `v${tag}`;
    } catch (e) {
        // No tags found or git command failed
    }
    // 3. Fallback to package.json version
    try {
        const pkgPath = path.join(__dirname, '../../package.json');
        if (fs.existsSync(pkgPath)) {
            const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
            if (pkg.version) return pkg.version.startsWith('v') ? pkg.version : `v${pkg.version}`;
        }
    } catch (e) {}

    return 'v1.0.0';
}

const releaseVersion = getReleaseVersion();
const commitHash = getCommitHash();
const indexPath = path.join(__dirname, '../../index.html');

if (fs.existsSync(indexPath)) {
    let indexHtml = fs.readFileSync(indexPath, 'utf8');
    // Replace flags: { ... } or flags: "..."
    const flagsRegex = /flags:\s*(?:\{[^}]*\}|["'][^"']*["'])/;
    const flagsReplacement = `flags: {\n            release: "${releaseVersion}",\n            commit: "${commitHash}"\n        }`;
    let updatedHtml = indexHtml.replace(flagsRegex, flagsReplacement);

    // Replace cache busting query params
    updatedHtml = updatedHtml.replace(/elm\.js(\?v=[^"']*)?/g, `elm.js?v=${commitHash}`);
    updatedHtml = updatedHtml.replace(/map-view\.js(\?v=[^"']*)?/g, `map-view.js?v=${commitHash}`);
    updatedHtml = updatedHtml.replace(/style\.css(\?v=[^"']*)?/g, `style.css?v=${commitHash}`);

    fs.writeFileSync(indexPath, updatedHtml, 'utf8');
    console.log(`[Version Injector] Set version flag to release: "${releaseVersion}", commit: "${commitHash}" and asset cache-busters in index.html`);
} else {
    console.warn(`[Version Injector] index.html not found at: ${indexPath}`);
}
