import { describe, it, expect } from 'vitest'
import {
  genId,
  isComplexTask,
  determineFileType,
  detectTrigger,
  getTriggerQuery,
  getMentionPrefix,
  QUICK_COMMANDS
} from './chat-utils'

describe('chat-utils', () => {
  describe('genId', () => {
    it('should generate unique strings', () => {
      const id1 = genId()
      const id2 = genId()
      expect(id1).toBeTypeOf('string')
      expect(id2).toBeTypeOf('string')
      expect(id1).not.toEqual(id2)
      expect(id1.length).toBeGreaterThan(10)
    })
  })

  describe('isComplexTask', () => {
    it('should detect code blocks as complex', () => {
      expect(isComplexTask('Here is some code: ```js\nconst x = 1;\n```')).toBe(true)
    })

    it('should detect @file references as complex', () => {
      expect(isComplexTask('Check @file:main.ts')).toBe(true)
    })

    it('should detect long content as complex', () => {
      expect(isComplexTask('a'.repeat(301))).toBe(true)
    })

    it('should detect complex keywords', () => {
      expect(isComplexTask('Please review this code')).toBe(true)
      expect(isComplexTask('Can you refactor this?')).toBe(true)
      expect(isComplexTask('需要重构这段代码')).toBe(true)
      expect(isComplexTask('分析一下这个bug')).toBe(true)
    })

    it('should not flag simple questions as complex', () => {
      expect(isComplexTask('Hello')).toBe(false)
      expect(isComplexTask('What is 2+2?')).toBe(false)
      expect(isComplexTask('Hi there')).toBe(false)
    })
  })

  describe('determineFileType', () => {
    it('should detect images', () => {
      const imageFile = new File([''], 'test.png', { type: 'image/png' })
      expect(determineFileType(imageFile)).toBe('image')
    })

    it('should detect PDFs', () => {
      const pdfFile = new File([''], 'doc.pdf', { type: 'application/pdf' })
      expect(determineFileType(pdfFile)).toBe('pdf')
    })

    it('should detect code files', () => {
      expect(determineFileType(new File([''], 'main.ts', { type: 'text/plain' }))).toBe('code')
      expect(determineFileType(new File([''], 'app.py', { type: 'text/plain' }))).toBe('code')
      expect(determineFileType(new File([''], 'script.sh', { type: 'text/plain' }))).toBe('code')
    })

    it('should default to text', () => {
      expect(determineFileType(new File([''], 'readme.txt', { type: 'text/plain' }))).toBe('text')
      expect(determineFileType(new File([''], 'data.csv', { type: 'text/plain' }))).toBe('text')
    })
  })

  describe('detectTrigger', () => {
    it('should detect @ mention', () => {
      expect(detectTrigger('Hello @world', 12)).toBe('mention')
    })

    it('should detect # thread reference', () => {
      expect(detectTrigger('See #thread', 10)).toBe('thread')
    })

    it('should detect / command', () => {
      expect(detectTrigger('Type /clear', 10)).toBe('command')
    })

    it('should return null at position 0', () => {
      expect(detectTrigger('@world', 0)).toBe(null)
    })

    it('should prefer last trigger', () => {
      expect(detectTrigger('@name #thread', 12)).toBe('thread')
    })
  })

  describe('getTriggerQuery', () => {
    it('should extract query after trigger', () => {
      expect(getTriggerQuery('Hello @world', 12)).toBe('world')
      expect(getTriggerQuery('Check #topic', 12)).toBe('topic')
      expect(getTriggerQuery('Run /clear', 10)).toBe('clear')
    })

    it('should return empty string when no trigger', () => {
      expect(getTriggerQuery('Hello world', 11)).toBe('')
    })
  })

  describe('getMentionPrefix', () => {
    it('should return correct prefixes', () => {
      expect(getMentionPrefix('workspace')).toBe('@workspace:')
      expect(getMentionPrefix('file')).toBe('@file:')
      expect(getMentionPrefix('thread')).toBe('#thread:')
      expect(getMentionPrefix('unknown')).toBe('')
    })
  })

  describe('QUICK_COMMANDS', () => {
    it('should have expected commands', () => {
      expect(QUICK_COMMANDS.length).toBeGreaterThan(0)
      expect(QUICK_COMMANDS.some((c) => c.id === 'clear')).toBe(true)
      expect(QUICK_COMMANDS.some((c) => c.id === 'model')).toBe(true)
      expect(QUICK_COMMANDS.some((c) => c.id === 'screenshot')).toBe(true)
    })
  })
})
