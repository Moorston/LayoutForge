/**
 * Shared type definitions for mimoService modules.
 */

export interface DesignTokens {
  colors?: Record<string, string>;
  typography?: Record<string, string>;
  spacing?: {
    unit?: string;
    scale?: string[];
  };
  effects?: Record<string, string>;
}

export interface ReplicationResult {
  html: string;
  css: string;
  explanation: string;
  detectedImages: Array<{
    description: string;
    coordinates?: {
      ymin: number;
      xmin: number;
      ymax: number;
      xmax: number;
    };
    dataUrl?: string;
  }>;
  detectedCharts?: Array<{
    type: "bar" | "line" | "pie" | "area";
    title: string;
    description: string;
    data: Array<Record<string, unknown>>;
    coordinates: {
      ymin: number;
      xmin: number;
      ymax: number;
      xmax: number;
    };
  }>;
  /** Design tokens extracted in template mode (CSS custom properties). */
  designTokens?: DesignTokens;
  /** Whether this result was generated in template mode. */
  isTemplate?: boolean;
}

export type SceneCategory =
  | "portrait"
  | "scenery"
  | "animal"
  | "object"
  | "abstract"
  | "other";

export interface ImageSceneClassification {
  category: SceneCategory;
  labelZh: string;
  brief: string;
}
