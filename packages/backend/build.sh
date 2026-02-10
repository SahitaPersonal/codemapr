#!/bin/bash

# Build script for backend deployment
echo "Building CodeMapr Backend..."

# Go to root directory
cd ../..

# Install root dependencies
echo "Installing root dependencies..."
npm install

# Build shared package first
echo "Building shared package..."
cd packages/shared
npm install
npm run build

# Build backend
echo "Building backend..."
cd ../backend
npm install
npm run build

echo "Build complete!"
