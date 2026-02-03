import { NodeType, EdgeType } from '@codemapr/shared';

export interface FlowchartTheme {
  name: string;
  description: string;
  colors: {
    background: string;
    surface: string;
    primary: string;
    secondary: string;
    accent: string;
    text: {
      primary: string;
      secondary: string;
      muted: string;
    };
    nodes: Record<NodeType, {
      background: string;
      border: string;
      text: string;
      accent: string;
      hover: string;
    }>;
    edges: Record<EdgeType, {
      stroke: string;
      strokeHover: string;
      label: string;
    }>;
    complexity: {
      low: string;
      medium: string;
      high: string;
      critical: string;
    };
  };
  shadows: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  animations: {
    duration: {
      fast: string;
      normal: string;
      slow: string;
    };
    easing: {
      ease: string;
      easeIn: string;
      easeOut: string;
      easeInOut: string;
    };
  };
}

export const lightTheme: FlowchartTheme = {
  name: 'Light',
  description: 'Clean and bright theme for daytime coding',
  colors: {
    background: '#f8fafc',
    surface: '#ffffff',
    primary: '#3b82f6',
    secondary: '#64748b',
    accent: '#06b6d4',
    text: {
      primary: '#0f172a',
      secondary: '#475569',
      muted: '#94a3b8',
    },
    nodes: {
      [NodeType.FUNCTION]: {
        background: '#dbeafe',
        border: '#3b82f6',
        text: '#1e40af',
        accent: '#2563eb',
        hover: '#bfdbfe',
      },
      [NodeType.CLASS]: {
        background: '#dcfce7',
        border: '#16a34a',
        text: '#15803d',
        accent: '#22c55e',
        hover: '#bbf7d0',
      },
      [NodeType.COMPONENT]: {
        background: '#fef3c7',
        border: '#f59e0b',
        text: '#d97706',
        accent: '#f59e0b',
        hover: '#fde68a',
      },
      [NodeType.SERVICE_CALL]: {
        background: '#fce7f3',
        border: '#ec4899',
        text: '#be185d',
        accent: '#ec4899',
        hover: '#fbcfe8',
      },
      [NodeType.DATABASE]: {
        background: '#f3e8ff',
        border: '#8b5cf6',
        text: '#7c3aed',
        accent: '#8b5cf6',
        hover: '#e9d5ff',
      },
      [NodeType.API_ENDPOINT]: {
        background: '#e0e7ff',
        border: '#6366f1',
        text: '#4f46e5',
        accent: '#6366f1',
        hover: '#c7d2fe',
      },
      [NodeType.FILE]: {
        background: '#f1f5f9',
        border: '#64748b',
        text: '#334155',
        accent: '#64748b',
        hover: '#e2e8f0',
      },
      [NodeType.MODULE]: {
        background: '#fed7aa',
        border: '#ea580c',
        text: '#c2410c',
        accent: '#ea580c',
        hover: '#fdba74',
      },
    },
    edges: {
      [EdgeType.FUNCTION_CALL]: {
        stroke: '#3b82f6',
        strokeHover: '#2563eb',
        label: '#1e40af',
      },
      [EdgeType.IMPORT]: {
        stroke: '#16a34a',
        strokeHover: '#15803d',
        label: '#15803d',
      },
      [EdgeType.EXTENDS]: {
        stroke: '#f59e0b',
        strokeHover: '#d97706',
        label: '#d97706',
      },
      [EdgeType.IMPLEMENTS]: {
        stroke: '#8b5cf6',
        strokeHover: '#7c3aed',
        label: '#7c3aed',
      },
      [EdgeType.HTTP_REQUEST]: {
        stroke: '#ec4899',
        strokeHover: '#be185d',
        label: '#be185d',
      },
      [EdgeType.DATABASE_QUERY]: {
        stroke: '#7c3aed',
        strokeHover: '#6d28d9',
        label: '#6d28d9',
      },
    },
    complexity: {
      low: '#22c55e',
      medium: '#f59e0b',
      high: '#ef4444',
      critical: '#dc2626',
    },
  },
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  },
  animations: {
    duration: {
      fast: '150ms',
      normal: '300ms',
      slow: '500ms',
    },
    easing: {
      ease: 'cubic-bezier(0.4, 0, 0.2, 1)',
      easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
      easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
      easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    },
  },
};

export const darkTheme: FlowchartTheme = {
  name: 'Dark',
  description: 'Sleek dark theme for night coding sessions',
  colors: {
    background: '#0f172a',
    surface: '#1e293b',
    primary: '#60a5fa',
    secondary: '#94a3b8',
    accent: '#06b6d4',
    text: {
      primary: '#f8fafc',
      secondary: '#cbd5e1',
      muted: '#64748b',
    },
    nodes: {
      [NodeType.FUNCTION]: {
        background: '#1e3a8a',
        border: '#60a5fa',
        text: '#dbeafe',
        accent: '#3b82f6',
        hover: '#1e40af',
      },
      [NodeType.CLASS]: {
        background: '#14532d',
        border: '#4ade80',
        text: '#dcfce7',
        accent: '#22c55e',
        hover: '#166534',
      },
      [NodeType.COMPONENT]: {
        background: '#92400e',
        border: '#fbbf24',
        text: '#fef3c7',
        accent: '#f59e0b',
        hover: '#a16207',
      },
      [NodeType.SERVICE_CALL]: {
        background: '#831843',
        border: '#f472b6',
        text: '#fce7f3',
        accent: '#ec4899',
        hover: '#9d174d',
      },
      [NodeType.DATABASE]: {
        background: '#581c87',
        border: '#a78bfa',
        text: '#f3e8ff',
        accent: '#8b5cf6',
        hover: '#6b21a8',
      },
      [NodeType.API_ENDPOINT]: {
        background: '#3730a3',
        border: '#818cf8',
        text: '#e0e7ff',
        accent: '#6366f1',
        hover: '#4338ca',
      },
      [NodeType.FILE]: {
        background: '#374151',
        border: '#9ca3af',
        text: '#f3f4f6',
        accent: '#6b7280',
        hover: '#4b5563',
      },
      [NodeType.MODULE]: {
        background: '#9a3412',
        border: '#fb923c',
        text: '#fed7aa',
        accent: '#ea580c',
        hover: '#c2410c',
      },
    },
    edges: {
      [EdgeType.FUNCTION_CALL]: {
        stroke: '#60a5fa',
        strokeHover: '#3b82f6',
        label: '#dbeafe',
      },
      [EdgeType.IMPORT]: {
        stroke: '#4ade80',
        strokeHover: '#22c55e',
        label: '#dcfce7',
      },
      [EdgeType.EXTENDS]: {
        stroke: '#fbbf24',
        strokeHover: '#f59e0b',
        label: '#fef3c7',
      },
      [EdgeType.IMPLEMENTS]: {
        stroke: '#a78bfa',
        strokeHover: '#8b5cf6',
        label: '#f3e8ff',
      },
      [EdgeType.HTTP_REQUEST]: {
        stroke: '#f472b6',
        strokeHover: '#ec4899',
        label: '#fce7f3',
      },
      [EdgeType.DATABASE_QUERY]: {
        stroke: '#a78bfa',
        strokeHover: '#8b5cf6',
        label: '#f3e8ff',
      },
    },
    complexity: {
      low: '#4ade80',
      medium: '#fbbf24',
      high: '#f87171',
      critical: '#ef4444',
    },
  },
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.3)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.3), 0 2px 4px -2px rgb(0 0 0 / 0.3)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.3), 0 4px 6px -4px rgb(0 0 0 / 0.3)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.3), 0 8px 10px -6px rgb(0 0 0 / 0.3)',
  },
  animations: {
    duration: {
      fast: '150ms',
      normal: '300ms',
      slow: '500ms',
    },
    easing: {
      ease: 'cubic-bezier(0.4, 0, 0.2, 1)',
      easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
      easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
      easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    },
  },
};

export const oceanTheme: FlowchartTheme = {
  name: 'Ocean',
  description: 'Calming blue-green theme inspired by the ocean',
  colors: {
    background: '#f0fdfa',
    surface: '#ffffff',
    primary: '#0891b2',
    secondary: '#0f766e',
    accent: '#06b6d4',
    text: {
      primary: '#134e4a',
      secondary: '#0f766e',
      muted: '#5eead4',
    },
    nodes: {
      [NodeType.FUNCTION]: {
        background: '#cffafe',
        border: '#0891b2',
        text: '#164e63',
        accent: '#0891b2',
        hover: '#a5f3fc',
      },
      [NodeType.CLASS]: {
        background: '#ccfbf1',
        border: '#0d9488',
        text: '#134e4a',
        accent: '#0d9488',
        hover: '#99f6e4',
      },
      [NodeType.COMPONENT]: {
        background: '#e6fffa',
        border: '#319795',
        text: '#2c7a7b',
        accent: '#319795',
        hover: '#b2f5ea',
      },
      [NodeType.SERVICE_CALL]: {
        background: '#e0f2fe',
        border: '#0284c7',
        text: '#075985',
        accent: '#0284c7',
        hover: '#bae6fd',
      },
      [NodeType.DATABASE]: {
        background: '#f0f9ff',
        border: '#0369a1',
        text: '#0c4a6e',
        accent: '#0369a1',
        hover: '#dbeafe',
      },
      [NodeType.API_ENDPOINT]: {
        background: '#ecfeff',
        border: '#0891b2',
        text: '#164e63',
        accent: '#0891b2',
        hover: '#cffafe',
      },
      [NodeType.FILE]: {
        background: '#f1f5f9',
        border: '#475569',
        text: '#334155',
        accent: '#475569',
        hover: '#e2e8f0',
      },
      [NodeType.MODULE]: {
        background: '#fef7ed',
        border: '#ea580c',
        text: '#c2410c',
        accent: '#ea580c',
        hover: '#fed7aa',
      },
    },
    edges: {
      [EdgeType.FUNCTION_CALL]: {
        stroke: '#0891b2',
        strokeHover: '#0e7490',
        label: '#164e63',
      },
      [EdgeType.IMPORT]: {
        stroke: '#0d9488',
        strokeHover: '#0f766e',
        label: '#134e4a',
      },
      [EdgeType.EXTENDS]: {
        stroke: '#059669',
        strokeHover: '#047857',
        label: '#064e3b',
      },
      [EdgeType.IMPLEMENTS]: {
        stroke: '#0284c7',
        strokeHover: '#0369a1',
        label: '#0c4a6e',
      },
      [EdgeType.HTTP_REQUEST]: {
        stroke: '#06b6d4',
        strokeHover: '#0891b2',
        label: '#164e63',
      },
      [EdgeType.DATABASE_QUERY]: {
        stroke: '#0369a1',
        strokeHover: '#075985',
        label: '#0c4a6e',
      },
    },
    complexity: {
      low: '#10b981',
      medium: '#f59e0b',
      high: '#ef4444',
      critical: '#dc2626',
    },
  },
  shadows: {
    sm: '0 1px 2px 0 rgb(6 182 212 / 0.1)',
    md: '0 4px 6px -1px rgb(6 182 212 / 0.1), 0 2px 4px -2px rgb(6 182 212 / 0.1)',
    lg: '0 10px 15px -3px rgb(6 182 212 / 0.1), 0 4px 6px -4px rgb(6 182 212 / 0.1)',
    xl: '0 20px 25px -5px rgb(6 182 212 / 0.1), 0 8px 10px -6px rgb(6 182 212 / 0.1)',
  },
  animations: {
    duration: {
      fast: '150ms',
      normal: '300ms',
      slow: '500ms',
    },
    easing: {
      ease: 'cubic-bezier(0.4, 0, 0.2, 1)',
      easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
      easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
      easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    },
  },
};

export const themes = {
  light: lightTheme,
  dark: darkTheme,
  ocean: oceanTheme,
};

export type ThemeName = keyof typeof themes;