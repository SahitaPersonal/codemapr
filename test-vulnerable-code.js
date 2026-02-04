// Test file with intentional security vulnerabilities for testing

const mysql = require('mysql');
const express = require('express');

// SQL Injection vulnerability
function getUserById(userId) {
  const query = "SELECT * FROM users WHERE id = " + userId; // Vulnerable to SQL injection
  return mysql.query(query);
}

// XSS vulnerability
function displayUserContent(userInput) {
  document.getElementById('content').innerHTML = userInput; // Vulnerable to XSS
}

// Command injection vulnerability
const { exec } = require('child_process');
function processFile(filename) {
  exec('cat ' + filename, (error, stdout, stderr) => { // Vulnerable to command injection
    console.log(stdout);
  });
}

// Hardcoded secrets
const API_KEY = "sk-1234567890abcdef"; // Hardcoded API key
const PASSWORD = "admin123"; // Hardcoded password
const SECRET_TOKEN = "jwt-secret-key-12345"; // Hardcoded JWT secret

// Insecure crypto
const crypto = require('crypto');
function hashPassword(password) {
  return crypto.createHash('md5').update(password).digest('hex'); // Weak hashing algorithm
}

// Unsafe eval
function executeCode(userCode) {
  eval(userCode); // Dangerous eval usage
}

// Insecure random
function generateToken() {
  return Math.random().toString(36); // Insecure random number generation
}

// Prototype pollution
function merge(target, source) {
  for (let key in source) {
    target[key] = source[key]; // Vulnerable to prototype pollution
  }
  return target;
}

module.exports = {
  getUserById,
  displayUserContent,
  processFile,
  hashPassword,
  executeCode,
  generateToken,
  merge
};