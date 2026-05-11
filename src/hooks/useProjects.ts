/**
 * Hook for managing saved projects with localStorage persistence.
 */

import { useState, useEffect, useCallback } from "react";
import type { ReplicationResult } from "@/services/mimoService";

const STORAGE_KEY = "layout_forge_saved_projects";

export interface SavedProject {
  id: string;
  name: string;
  timestamp: number;
  html: string;
  css: string;
  originalImage: string;
  explanation: string;
}

export function useProjects() {
  const [savedProjects, setSavedProjects] = useState<SavedProject[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && saved !== "undefined") {
      try {
        setSavedProjects(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load library", e);
      }
    }
  }, []);

  const saveProject = useCallback(
    (name: string, html: string, css: string, originalImage: string, result: ReplicationResult) => {
      const newProject: SavedProject = {
        id: crypto.randomUUID(),
        name,
        timestamp: Date.now(),
        html,
        css,
        originalImage,
        explanation: result.explanation,
      };

      const newProjects = [newProject, ...savedProjects];
      setSavedProjects(newProjects);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newProjects));
    },
    [savedProjects],
  );

  const deleteProject = useCallback(
    (id: string) => {
      const newProjects = savedProjects.filter((p) => p.id !== id);
      setSavedProjects(newProjects);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newProjects));
    },
    [savedProjects],
  );

  return { savedProjects, saveProject, deleteProject } as const;
}
