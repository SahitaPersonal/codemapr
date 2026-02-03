import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'CodeMapr - Interactive Code Visualization',
  description: 'Next-generation code visualization platform that automatically generates interactive flowcharts from your codebase',
  keywords: ['code visualization', 'flowcharts', 'code analysis', 'TypeScript', 'JavaScript', 'React', 'Node.js'],
  authors: [{ name: 'CodeMapr Team' }],
  viewport: 'width=device-width, initial-scale=1',
  themeColor: '#3b82f6',
  openGraph: {
    title: 'CodeMapr - Interactive Code Visualization',
    description: 'Transform your codebase into interactive flowcharts with AI-powered insights',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CodeMapr - Interactive Code Visualization',
    description: 'Transform your codebase into interactive flowcharts with AI-powered insights',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div id="root">{children}</div>
      </body>
    </html>
  );
}