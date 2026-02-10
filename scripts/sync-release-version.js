#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const nextVersion = process.argv[2];

if (!nextVersion) {
  console.error('Usage: node scripts/sync-release-version.js <next-version>');
  process.exit(1);
}

const rootDir = path.resolve(__dirname, '..');
const targetFiles = ['package.json', 'plugin.json'];

for (const fileName of targetFiles) {
  const filePath = path.join(rootDir, fileName);
  const fileContent = fs.readFileSync(filePath, 'utf8');
  const json = JSON.parse(fileContent);

  json.version = nextVersion;
  fs.writeFileSync(filePath, `${JSON.stringify(json, null, 2)}\n`, 'utf8');
  console.log(`Updated ${fileName} to version ${nextVersion}`);
}
