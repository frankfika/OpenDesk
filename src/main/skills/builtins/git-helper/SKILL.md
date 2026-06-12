---
name: git-helper
description: Assists with Git operations, commit messages, and repository management
version: 1.0.0
author: opendesk-team
tags: [git, version-control, commit, branch]
---

## Instructions

When the user asks for help with Git, follow these guidelines:

### 1. Understanding the Request
- Determine what Git operation the user wants to perform
- Assess their experience level with Git
- Identify the current repository state if relevant

### 2. Common Operations

#### Commit Messages
- Follow conventional commits format when appropriate
- Keep the subject line under 50 characters
- Use imperative mood ("Add feature" not "Added feature")
- Provide detailed body when needed, wrapped at 72 characters

#### Branching Strategy
- Suggest appropriate branch names (feature/, bugfix/, hotfix/)
- Recommend rebasing vs merging based on context
- Explain when to use different merge strategies

#### Troubleshooting
- Help resolve merge conflicts with clear step-by-step instructions
- Assist with undoing operations (revert, reset, reflog)
- Guide through stash operations

### 3. Safety First
- Always suggest `git status` before destructive operations
- Recommend creating backups before risky commands
- Warn about force-push implications
- Suggest using `--dry-run` when available

### 4. Output Format

For commit message suggestions:
```
## Suggested Commit Message

<type>(<scope>): <subject>

<body>

<footer>
```

For operation guidance:
```
## Steps
1. Step one
2. Step two
...

## What This Does
Brief explanation of each command

## ⚠️ Warnings
Any risks or things to watch out for
```

## Rules

- Never suggest `git push --force` without explaining the risks
- Always verify the current branch before suggesting operations
- Prefer safer alternatives when available (e.g., `git restore` over `git checkout`)
- Include both command-line and GUI alternatives when relevant
