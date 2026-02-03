'use client';

import React, { useState } from 'react';
import { Palette, Check, Sun, Moon, Waves } from 'lucide-react';
import { themes, ThemeName } from '../../lib/flowchartThemes';

interface ThemeSelectorProps {
  currentTheme: ThemeName;
  onThemeChange: (theme: ThemeName) => void;
}

export function ThemeSelector({ currentTheme, onThemeChange }: ThemeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const getThemeIcon = (themeName: ThemeName) => {
    switch (themeName) {
      case 'light':
        return <Sun size={16} />;
      case 'dark':
        return <Moon size={16} />;
      case 'ocean':
        return <Waves size={16} />;
      default:
        return <Palette size={16} />;
    }
  };

  const getThemePreview = (themeName: ThemeName) => {
    const theme = themes[themeName];
    return (
      <div className="flex gap-1">
        <div 
          className="w-3 h-3 rounded-full border"
          style={{ 
            backgroundColor: theme.colors.nodes.function.background,
            borderColor: theme.colors.nodes.function.border,
          }}
        />
        <div 
          className="w-3 h-3 rounded-full border"
          style={{ 
            backgroundColor: theme.colors.nodes.class.background,
            borderColor: theme.colors.nodes.class.border,
          }}
        />
        <div 
          className="w-3 h-3 rounded-full border"
          style={{ 
            backgroundColor: theme.colors.nodes.component.background,
            borderColor: theme.colors.nodes.component.border,
          }}
        />
      </div>
    );
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg shadow-md border hover:shadow-lg transition-shadow duration-200"
        title="Change Theme"
      >
        {getThemeIcon(currentTheme)}
        <span className="text-sm font-medium capitalize">{currentTheme}</span>
        <div className="ml-1">
          {getThemePreview(currentTheme)}
        </div>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute top-full right-0 mt-2 bg-white rounded-lg shadow-xl border p-2 min-w-[200px] z-20">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 px-2">
              Choose Theme
            </div>
            
            {Object.entries(themes).map(([themeName, theme]) => (
              <button
                key={themeName}
                onClick={() => {
                  onThemeChange(themeName as ThemeName);
                  setIsOpen(false);
                }}
                className={`
                  w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left
                  hover:bg-gray-50 transition-colors duration-150
                  ${currentTheme === themeName ? 'bg-blue-50 text-blue-700' : 'text-gray-700'}
                `}
              >
                <div className="flex items-center gap-2 flex-1">
                  {getThemeIcon(themeName as ThemeName)}
                  <div>
                    <div className="font-medium capitalize">{theme.name}</div>
                    <div className="text-xs text-gray-500">{theme.description}</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {getThemePreview(themeName as ThemeName)}
                  {currentTheme === themeName && (
                    <Check size={16} className="text-blue-600" />
                  )}
                </div>
              </button>
            ))}
            
            <div className="border-t border-gray-200 mt-2 pt-2">
              <div className="text-xs text-gray-500 px-2">
                Themes affect node colors, shadows, and overall visual style
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}