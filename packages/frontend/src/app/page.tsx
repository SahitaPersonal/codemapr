'use client';

import { useState } from 'react';
import { Upload, Code, Zap, Users, ArrowRight, Github, Star } from 'lucide-react';
import Link from 'next/link';

export default function HomePage() {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <header className="container mx-auto px-6 py-8">
        <nav className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
              <Code className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold text-gray-900">CodeMapr</span>
          </div>
          <div className="flex items-center space-x-6">
            <Link href="/docs" className="text-gray-600 hover:text-gray-900 transition-colors">
              Docs
            </Link>
            <Link href="/pricing" className="text-gray-600 hover:text-gray-900 transition-colors">
              Pricing
            </Link>
            <Link 
              href="https://github.com/SahitaPersonal/codemapr" 
              target="_blank"
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <Github className="w-5 h-5" />
              <span>GitHub</span>
            </Link>
            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
              Get Started
            </button>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-6 py-16">
        <div className="text-center max-w-4xl mx-auto">
          <div className="flex items-center justify-center space-x-2 mb-6">
            <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
              ✨ Now with AI-powered explanations
            </div>
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Transform Your Code Into
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              {' '}Interactive Flowcharts
            </span>
          </h1>
          
          <p className="text-xl text-gray-600 mb-8 leading-relaxed">
            Upload your JavaScript, TypeScript, React, or Node.js project and instantly visualize 
            your code structure with interactive flowcharts, cross-file tracing, and AI-powered insights.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4 mb-12">
            <button 
              className="bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
            >
              <Upload className="w-5 h-5" />
              <span>Upload Your Code</span>
              <ArrowRight className={`w-5 h-5 transition-transform duration-200 ${isHovered ? 'translate-x-1' : ''}`} />
            </button>
            
            <Link 
              href="/demo" 
              className="border-2 border-gray-300 text-gray-700 px-8 py-4 rounded-lg text-lg font-semibold hover:border-gray-400 hover:bg-gray-50 transition-colors"
            >
              View Live Demo
            </Link>
          </div>

          {/* Feature Preview */}
          <div className="bg-white rounded-2xl shadow-2xl p-8 mb-16">
            <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Code className="w-8 h-8 text-blue-600" />
                </div>
                <p className="text-gray-600 text-lg">Interactive Flowchart Preview</p>
                <p className="text-gray-500 text-sm mt-2">Coming soon - Upload your first project to see the magic!</p>
              </div>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <Code className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Multi-Language Support</h3>
            <p className="text-gray-600">
              Supports JavaScript, TypeScript, React.js, and Node.js projects with intelligent parsing and analysis.
            </p>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <Zap className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">AI-Powered Insights</h3>
            <p className="text-gray-600">
              Get GPT-4 powered explanations, security analysis, and optimization suggestions for your code.
            </p>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Real-Time Collaboration</h3>
            <p className="text-gray-600">
              Collaborate with your team in real-time with live cursors, annotations, and shared insights.
            </p>
          </div>
        </div>

        {/* Stats Section */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-16">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-blue-600 mb-2">10K+</div>
              <div className="text-gray-600">Files Analyzed</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-green-600 mb-2">500+</div>
              <div className="text-gray-600">Projects Visualized</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-purple-600 mb-2">50+</div>
              <div className="text-gray-600">Teams Using</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-orange-600 mb-2">99.9%</div>
              <div className="text-gray-600">Uptime</div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-12 text-white">
          <h2 className="text-3xl font-bold mb-4">Ready to Visualize Your Code?</h2>
          <p className="text-xl mb-8 text-blue-100">
            Join thousands of developers who are already using CodeMapr to understand their codebases better.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
            <button className="bg-white text-blue-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-100 transition-colors">
              Start Free Trial
            </button>
            <Link 
              href="https://github.com/SahitaPersonal/codemapr" 
              target="_blank"
              className="flex items-center space-x-2 text-blue-100 hover:text-white transition-colors"
            >
              <Star className="w-5 h-5" />
              <span>Star on GitHub</span>
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="container mx-auto px-6 py-12 border-t border-gray-200 mt-16">
        <div className="grid md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-6 h-6 bg-gradient-to-r from-blue-600 to-indigo-600 rounded flex items-center justify-center">
                <Code className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-bold text-gray-900">CodeMapr</span>
            </div>
            <p className="text-gray-600 text-sm">
              Transform your code into interactive flowcharts with AI-powered insights.
            </p>
          </div>
          
          <div>
            <h4 className="font-semibold text-gray-900 mb-3">Product</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li><Link href="/features" className="hover:text-gray-900">Features</Link></li>
              <li><Link href="/pricing" className="hover:text-gray-900">Pricing</Link></li>
              <li><Link href="/demo" className="hover:text-gray-900">Demo</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold text-gray-900 mb-3">Resources</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li><Link href="/docs" className="hover:text-gray-900">Documentation</Link></li>
              <li><Link href="/api" className="hover:text-gray-900">API Reference</Link></li>
              <li><Link href="/blog" className="hover:text-gray-900">Blog</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold text-gray-900 mb-3">Company</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li><Link href="/about" className="hover:text-gray-900">About</Link></li>
              <li><Link href="/contact" className="hover:text-gray-900">Contact</Link></li>
              <li><Link href="/privacy" className="hover:text-gray-900">Privacy</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-200 mt-8 pt-8 text-center text-sm text-gray-600">
          <p>&copy; 2024 CodeMapr. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}