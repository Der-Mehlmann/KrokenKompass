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

const commitHash = getCommitHash();
const indexPath = path.join(__dirname, '../../index.html');

if (fs.existsSync(indexPath)) {
    let indexHtml = fs.readFileSync(indexPath, 'utf8');
    // Replace flags: "..." or flags: '...'
    const updatedHtml = indexHtml.replace(/flags:\s*["'][^"']*["']/, `flags: "${commitHash}"`);
    fs.writeFileSync(indexPath, updatedHtml, 'utf8');
    console.log(`[Version Injector] Set version flag in index.html to: "${commitHash}"`);
} else {
    console.warn(`[Version Injector] index.html not found at: ${indexPath}`);
}
