/**
 * Persona file loader for OpenClaw-style configuration
 * Supports SOUL.md, USER.md, IDENTITY.md, AGENTS.md, MEMORY.md
 * Also handles BOOTSTRAP.md for first-time setup
 */

import fs from 'fs';
import path from 'path';

export interface PersonaConfig {
  agents?: string;
  soul?: string;
  user?: string;
  identity?: string;
  memory?: string;
  dailyMemory: string[];
  legacyClaude?: string;
  bootstrap?: string;
  isBootstrapMode: boolean;
}

export const PERSONA_FILES = [
  'AGENTS.md',
  'SOUL.md',
  'USER.md',
  'IDENTITY.md',
  'MEMORY.md',
  'BOOTSTRAP.md',
] as const;

export type PersonaFile = (typeof PERSONA_FILES)[number];

/**
 * Load a single persona file from a base path
 */
export function loadPersonaFile(basePath: string, filename: string): string | undefined {
  const filePath = path.join(basePath, filename);
  if (fs.existsSync(filePath)) {
    return fs.readFileSync(filePath, 'utf-8');
  }
  return undefined;
}

/**
 * Load daily memory files from the memory/ directory
 * @param memoryDir Path to the memory directory
 * @param days Number of days to load (default: 2 - today and yesterday)
 * @returns Array of memory file contents, newest first
 */
export function loadDailyMemory(memoryDir: string, days: number = 2): string[] {
  const memories: string[] = [];
  const today = new Date();

  // Ensure directory exists
  if (!fs.existsSync(memoryDir)) {
    return memories;
  }

  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const filePath = path.join(memoryDir, `${dateStr}.md`);

    if (fs.existsSync(filePath)) {
      memories.push(fs.readFileSync(filePath, 'utf-8'));
    }
  }

  return memories;
}

/**
 * Check if new persona format files exist (vs legacy CLAUDE.md)
 */
export function hasNewPersonaFormat(globalPath: string, groupPath: string): boolean {
  // Check for any of the new persona files (excluding optional ones)
  const requiredFiles: PersonaFile[] = ['SOUL.md', 'USER.md', 'IDENTITY.md'];
  for (const file of requiredFiles) {
    if (fs.existsSync(path.join(globalPath, file))) return true;
    if (fs.existsSync(path.join(groupPath, file))) return true;
  }
  return false;
}

/**
 * Load all persona configuration from global and group paths
 * Global files serve as defaults, group files override
 *
 * BOOTSTRAP MODE: If BOOTSTRAP.md exists and SOUL.md doesn't, we're in
 * first-time setup. Load BOOTSTRAP.md to trigger the initialization flow.
 */
export function loadPersonaConfig(globalPath: string, groupPath: string): PersonaConfig {
  // Check for bootstrap mode: BOOTSTRAP.md exists but SOUL.md doesn't
  const bootstrapFile = loadPersonaFile(globalPath, 'BOOTSTRAP.md');
  const soulFile = loadPersonaFile(globalPath, 'SOUL.md') || loadPersonaFile(groupPath, 'SOUL.md');
  const isBootstrapMode = !!(bootstrapFile && !soulFile);

  return {
    agents:
      loadPersonaFile(globalPath, 'AGENTS.md') ||
      loadPersonaFile(groupPath, 'AGENTS.md'),
    soul: soulFile,
    user:
      loadPersonaFile(globalPath, 'USER.md') ||
      loadPersonaFile(groupPath, 'USER.md'),
    identity:
      loadPersonaFile(globalPath, 'IDENTITY.md') ||
      loadPersonaFile(groupPath, 'IDENTITY.md'),
    memory:
      loadPersonaFile(globalPath, 'MEMORY.md') ||
      loadPersonaFile(groupPath, 'MEMORY.md'),
    dailyMemory: loadDailyMemory(path.join(groupPath, 'memory')),
    legacyClaude: loadPersonaFile(globalPath, 'CLAUDE.md'),
    bootstrap: bootstrapFile,
    isBootstrapMode,
  };
}

/**
 * Build the system prompt from persona configuration
 * Files are assembled in a specific order for proper weighting
 *
 * In BOOTSTRAP MODE: Only load BOOTSTRAP.md, ignore everything else
 * This forces the AI to discover its identity through conversation
 */
export function buildSystemPrompt(
  config: PersonaConfig,
  groupClaude?: string,
): string {
  // BOOTSTRAP MODE: Only load bootstrap file
  if (config.isBootstrapMode && config.bootstrap) {
    return config.bootstrap;
  }

  const sections: string[] = [];

  // 1. AGENTS.md (highest priority - work rules)
  if (config.agents) {
    sections.push(`# Work Instructions\n\n${config.agents}`);
  }

  // 2. SOUL.md (personality)
  if (config.soul) {
    sections.push(`# Personality\n\n${config.soul}`);
  }

  // 3. USER.md (user context)
  if (config.user) {
    sections.push(`# User Profile\n\n${config.user}`);
  }

  // 4. IDENTITY.md
  if (config.identity) {
    sections.push(`# Identity\n\n${config.identity}`);
  }

  // 5. MEMORY.md (long-term)
  if (config.memory) {
    sections.push(`# Long-term Memory\n\n${config.memory}`);
  }

  // 6. Daily memory (recent activity)
  if (config.dailyMemory.length > 0) {
    const dailySection = config.dailyMemory
      .map((m, i) => {
        const label = i === 0 ? 'Today' : i === 1 ? 'Yesterday' : `${i} days ago`;
        return `## ${label}\n\n${m}`;
      })
      .join('\n\n');
    sections.push(`# Recent Activity\n\n${dailySection}`);
  }

  // 7. Legacy CLAUDE.md (if no new format files)
  if (!config.soul && config.legacyClaude) {
    sections.push(config.legacyClaude);
  }

  // 8. Group CLAUDE.md (always last - group-specific context)
  if (groupClaude) {
    sections.push(groupClaude);
  }

  return sections.join('\n\n---\n\n');
}

/**
 * Get list of loaded persona files for logging
 */
export function getLoadedFiles(config: PersonaConfig): string[] {
  // Bootstrap mode
  if (config.isBootstrapMode) {
    return ['BOOTSTRAP.md (first-time setup)'];
  }

  const loaded: string[] = [];
  if (config.agents) loaded.push('AGENTS.md');
  if (config.soul) loaded.push('SOUL.md');
  if (config.user) loaded.push('USER.md');
  if (config.identity) loaded.push('IDENTITY.md');
  if (config.memory) loaded.push('MEMORY.md');
  if (config.dailyMemory.length > 0) loaded.push(`memory/${config.dailyMemory.length}d`);
  if (config.legacyClaude && !config.soul) loaded.push('CLAUDE.md (legacy)');
  return loaded;
}
