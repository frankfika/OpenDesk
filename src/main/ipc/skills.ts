import { ipcMain, BrowserWindow } from 'electron'
import type { SkillLoadLevel, SkillLoadResult } from '../../shared/types'
import {
  scanAllSkills,
  loadSkill,
  exportSkill,
  importSkillFromFolder,
  importSkillFromGitHub,
  deleteGlobalSkill,
  saveNewSkill,
  saveSkillAsTemplate,
  executeSkillTool
} from '../skills'

const channels = [
  'skills:scan',
  'skills:list',
  'skills:load',
  'skills:executeTool',
  'skills:export',
  'skills:importFromFolder',
  'skills:importFromGitHub',
  'skills:delete',
  'skills:getBuiltins',
  'skills:create',
  'skills:saveAsTemplate'
]

function removeStaleListeners(): void {
  for (const ch of channels) {
    ipcMain.removeAllListeners(ch)
  }
}

export function registerSkillsHandlers(_win: BrowserWindow): void {
  removeStaleListeners()

  ipcMain.handle('skills:scan', () => scanAllSkills())
  ipcMain.handle('skills:list', () => scanAllSkills())

  ipcMain.handle('skills:load', (_e, skillId: string, level: SkillLoadLevel) => {
    const allSkills = scanAllSkills()
    const skill = allSkills.find((s) => s.id === skillId)
    if (!skill) {
      return { level, tokens: 0, content: '' } as SkillLoadResult
    }
    return loadSkill(skill, level)
  })

  ipcMain.handle('skills:executeTool', async (_e, skillId: string, toolName: string, args: Record<string, unknown>) => {
    const allSkills = scanAllSkills()
    const skill = allSkills.find((s) => s.id === skillId)
    if (!skill) {
      return { success: false, error: `Skill '${skillId}' not found` }
    }
    return executeSkillTool(skill, toolName, args)
  })

  ipcMain.handle('skills:export', async (_e, skillId: string, outputPath: string) => {
    const allSkills = scanAllSkills()
    const skill = allSkills.find((s) => s.id === skillId)
    if (!skill) {
      throw new Error(`Skill '${skillId}' not found`)
    }
    return exportSkill(skill.path, outputPath)
  })

  ipcMain.handle('skills:importFromFolder', async (_e, sourcePath: string) => {
    return importSkillFromFolder(sourcePath)
  })

  ipcMain.handle('skills:importFromGitHub', async (_e, repoUrl: string) => {
    return importSkillFromGitHub(repoUrl)
  })

  ipcMain.handle('skills:delete', async (_e, skillId: string) => {
    return deleteGlobalSkill(skillId)
  })

  ipcMain.handle('skills:getBuiltins', () => {
    return scanAllSkills().filter((s) => s.isBuiltIn)
  })

  ipcMain.handle('skills:create', async (_e, name: string, description: string, tags: string[]) => {
    return saveNewSkill(name, description, tags)
  })

  ipcMain.handle('skills:saveAsTemplate', async (_e, skillId: string) => {
    const allSkills = scanAllSkills()
    const skill = allSkills.find((s) => s.id === skillId)
    if (!skill) {
      throw new Error(`Skill '${skillId}' not found`)
    }
    return saveSkillAsTemplate(skill.path)
  })
}
