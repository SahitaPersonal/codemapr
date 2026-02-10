#!/bin/bash

# Build script for frontend deployment
echo "Building CodeMapr Frontend..."

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

# Build frontend
echo "Building frontend..."
cd ../frontend
npm install
npm run build

echo "Build complete!"
