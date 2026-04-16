#!/usr/bin/env node

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { Readable } = require('node:stream');
const { pipeline } = require('node:stream/promises');
const { spawnSync } = require('node:child_process');

const SOURCE_REPO = process.env.SOURCE_REPO || 'jackwener/OpenCLI';
const TARGET_REPO = process.env.TARGET_REPO || 'XucroYuri/OpenCLI-Studio';

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd || process.cwd(),
    encoding: 'utf8',
    stdio: options.capture === false ? 'inherit' : ['ignore', 'pipe', 'pipe'],
  });
  if (result.status !== 0) {
    const stderr = (result.stderr || '').trim();
    throw new Error(`${command} ${args.join(' ')} failed${stderr ? `\n${stderr}` : ''}`);
  }
  return (result.stdout || '').trim();
}

function ghJson(apiPath) {
  const raw = run('gh', ['api', apiPath]);
  return raw ? JSON.parse(raw) : [];
}

function getAllReleases(repo) {
  const releases = [];
  for (let page = 1; ; page += 1) {
    const batch = ghJson(`repos/${repo}/releases?per_page=100&page=${page}`);
    if (!Array.isArray(batch) || batch.length === 0) break;
    releases.push(...batch);
    if (batch.length < 100) break;
  }
  return releases;
}

function getDefaultBranch(repo) {
  const repoInfo = ghJson(`repos/${repo}`);
  if (repoInfo && typeof repoInfo.default_branch === 'string' && repoInfo.default_branch.length > 0) {
    return repoInfo.default_branch;
  }
  return 'main';
}

async function downloadToFile(url, filePath) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'opencli-studio-release-sync',
      Accept: 'application/octet-stream',
    },
  });
  if (!response.ok || !response.body) {
    throw new Error(`Failed to download ${url}: ${response.status} ${response.statusText}`);
  }
  await pipeline(Readable.fromWeb(response.body), fs.createWriteStream(filePath));
}

async function main() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'opencli-release-sync-'));
  try {
    console.log(`Sync releases from ${SOURCE_REPO} -> ${TARGET_REPO}`);

    const sourceReleases = getAllReleases(SOURCE_REPO).reverse();
    const targetReleases = getAllReleases(TARGET_REPO);
    const targetDefaultBranch = getDefaultBranch(TARGET_REPO);
    const targetByTag = new Map(targetReleases.map(release => [release.tag_name, release]));

    console.log(`Source releases: ${sourceReleases.length}`);
    console.log(`Target releases: ${targetReleases.length}`);

    for (const release of sourceReleases) {
      const tag = release.tag_name;
      const title = release.name || release.tag_name;
      const notesFile = path.join(tempRoot, `${tag}.md`);
      fs.writeFileSync(notesFile, release.body || '', 'utf8');

      let targetRelease = targetByTag.get(tag);
      if (!targetRelease) {
        const createArgs = ['release', 'create', tag, '--repo', TARGET_REPO, '--target', targetDefaultBranch, '--title', title, '--notes-file', notesFile];
        if (release.prerelease) createArgs.push('--prerelease');
        if (release.draft) createArgs.push('--draft');
        run('gh', createArgs, { capture: false });
        const created = ghJson(`repos/${TARGET_REPO}/releases/tags/${tag}`);
        targetRelease = created;
        targetByTag.set(tag, created);
      } else {
        console.log(`Release ${tag} already exists, checking assets...`);
      }

      const existingAssets = new Set((targetRelease.assets || []).map(asset => asset.name));
      for (const asset of release.assets || []) {
        if (existingAssets.has(asset.name)) {
          console.log(`  skip asset ${asset.name}`);
          continue;
        }

        const assetDir = path.join(tempRoot, tag);
        fs.mkdirSync(assetDir, { recursive: true });
        const assetPath = path.join(assetDir, asset.name);

        console.log(`  download ${asset.name}`);
        await downloadToFile(asset.browser_download_url, assetPath);

        console.log(`  upload ${asset.name}`);
        run('gh', ['release', 'upload', tag, assetPath, '--repo', TARGET_REPO], { capture: false });
      }

      const refreshed = ghJson(`repos/${TARGET_REPO}/releases/tags/${tag}`);
      targetByTag.set(tag, refreshed);
    }

    console.log('Release sync completed.');
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

main().catch(error => {
  console.error(error.message || error);
  process.exit(1);
});
