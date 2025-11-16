// Theme types
export interface ThemeFeatureConfig {
  enabled: boolean;
  required?: boolean;
}

export interface ThemeConfig {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  features: {
    timeline: ThemeFeatureConfig;
    checklist?: ThemeFeatureConfig;
    budget?: ThemeFeatureConfig;
    memo?: ThemeFeatureConfig;
    map?: ThemeFeatureConfig;
  };
  ui: {
    layout: 'tabs' | 'sidebar' | 'accordion';
    colorScheme: 'light' | 'dark' | 'auto';
    customColors?: {
      primary?: string;
      secondary?: string;
      accent?: string;
    };
  };
}
