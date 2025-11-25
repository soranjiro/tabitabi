export interface PreviewStep {
  time: string;
  label: string;
  icon: string;
  location?: string;
}

export interface ThemeColors {
  primary: string;
  secondary: string;
  background: string;
  text: string;
  accent: string;
  border?: string;
}

export interface PreviewItinerary {
  title: string;
  themeId: string;
  themeName: string;
  description: string;
  layout: "list" | "timeline" | "card";
  colors: ThemeColors;
  steps: PreviewStep[];
  features: string[];
}
