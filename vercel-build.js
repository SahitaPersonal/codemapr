#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

function run(command, cwd) {
  console.log(`\n>>> Running: ${command}`);
  console.log(`>>> In directory: ${cwd}\n`);
  try {
    execSync(command, { 
      cwd, 
      stdio: 'inherit',
      env: { ...process.env }
    });
  } catch (error) {
    console.error(`Failed to run: ${command}`);
    process.exit(1);
  }
}

const rootDir = process.cwd();
const sharedDir = path.join(rootDir, 'packages', 'shared');
const frontendDir = path.join(rootDir, 'packages', 'frontend');

console.log('=== Building CodeMapr for Vercel ===');
console.log('Root directory:', rootDir);

// Build shared package
console.log('\n1. Building shared package...');
run('npm install', sharedDir);
run('npm run build', sharedDir);

// Build frontend
console.log('\n2. Building frontend...');
run('npm install', frontendDir);
run('npm run build', frontendDir);

console.log('\n=== Build Complete! ===');
