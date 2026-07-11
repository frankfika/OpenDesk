import { describe, it, expect } from 'vitest'
import { validateShellCommand } from './builtins'

describe('validateShellCommand', () => {
  describe('blocked characters', () => {
    it('rejects command chaining with ;', () => {
      expect(validateShellCommand('ls; rm -rf /').valid).toBe(false)
    })
    it('rejects background &', () => {
      expect(validateShellCommand('ls & rm -rf /').valid).toBe(false)
    })
    it('rejects backticks', () => {
      expect(validateShellCommand('echo `whoami`').valid).toBe(false)
    })
    it('rejects $ expansion', () => {
      expect(validateShellCommand('echo $HOME').valid).toBe(false)
    })
  })

  describe('heredocs', () => {
    it('rejects heredocs (they hang waiting for stdin)', () => {
      expect(validateShellCommand('cat <<EOF').valid).toBe(false)
    })
  })

  describe('whitelist enforcement', () => {
    it('rejects commands not in the whitelist', () => {
      expect(validateShellCommand('bash -c "echo hi"').valid).toBe(false)
    })
    it('rejects arbitrary interpreters not in whitelist', () => {
      expect(validateShellCommand('zsh -c "rm -rf /"').valid).toBe(false)
    })
    it('allows common dev tools', () => {
      expect(validateShellCommand('ls -la').valid).toBe(true)
      expect(validateShellCommand('git status').valid).toBe(true)
      expect(validateShellCommand('cat README.md').valid).toBe(true)
      expect(validateShellCommand('npm install').valid).toBe(true)
    })
    it('checks every command in a pipeline', () => {
      // head is whitelisted, evil is not
      expect(validateShellCommand('cat foo | evil').valid).toBe(false)
    })
  })

  describe('dangerous pattern blocking', () => {
    it('rejects rm -rf /', () => {
      expect(validateShellCommand('rm -rf /').valid).toBe(false)
    })
    it('rejects fork bomb', () => {
      expect(validateShellCommand('rm :(){:|:&};:').valid).toBe(false)
    })
    it('rejects dd overwrites of /dev/zero', () => {
      expect(validateShellCommand('dd if=/dev/zero of=/dev/sda').valid).toBe(false)
    })
    it('rejects chmod -R 777 /', () => {
      expect(validateShellCommand('chmod -R 777 /').valid).toBe(false)
    })
  })
})
