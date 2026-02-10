#!/bin/bash
set -e

echo "Building shared package..."
cd packages/shared
npm install
npm run build

echo "Building frontend..."
cd ../frontend
npm install
npm run build

echo "Build complete!"
