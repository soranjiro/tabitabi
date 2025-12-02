export interface ThemeFeatureConfig {
  enabled: boolean;
  required?: boolean;
}

export interface ThemeUI {
  layout: 'single' | 'tabs' | 'sidebar' | 'accordion';
  colorScheme: 'light' | 'dark' | 'auto';
  customColors?: {
    primary?: string;
    secondary?: string;
    accent?: string;
    background?: string;
    text?: string;
  };
}

export interface ThemeComponents {
  ItineraryView?: any;
  StepList?: any;
  [key: string]: any;
}

export interface Theme {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  features: {
    steps?: ThemeFeatureConfig;
    timeline?: ThemeFeatureConfig;
    checklist?: ThemeFeatureConfig;
    budget?: ThemeFeatureConfig;
    memo?: ThemeFeatureConfig;
    map?: ThemeFeatureConfig;
    [key: string]: ThemeFeatureConfig | undefined;
  };
  ui: ThemeUI;
  components: ThemeComponents;
  styles?: string;
}

export interface ThemeConfig {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  features: {
    steps?: ThemeFeatureConfig;
    timeline?: ThemeFeatureConfig;
    checklist?: ThemeFeatureConfig;
    budget?: ThemeFeatureConfig;
    memo?: ThemeFeatureConfig;
    map?: ThemeFeatureConfig;
    [key: string]: ThemeFeatureConfig | undefined;
  };
  ui: ThemeUI;
  components?: ThemeComponents;
  styles?: string;
}
