---
name: doc-writer
description: Helps write and improve technical documentation, READMEs, and API docs
version: 1.0.0
author: opendesk-team
tags: [documentation, writing, readme, api-docs]
---

## Instructions

When the user asks for help with documentation, follow this structured approach:

### 1. Understand the Context
- What type of documentation is needed? (README, API docs, inline comments, etc.)
- Who is the target audience? (developers, end users, contributors)
- What is the scope? (single function, module, entire project)

### 2. Documentation Types

#### README.md
Structure:
- Title and one-line description
- Features / Overview
- Installation instructions
- Usage examples
- Configuration (if applicable)
- Contributing guidelines
- License

#### API Documentation
- Function signatures with types
- Parameter descriptions
- Return value descriptions
- Error conditions
- Usage examples

#### Inline Comments
- Explain "why" not "what" (the code shows what)
- Document complex algorithms
- Note assumptions and constraints
- Mark TODOs and FIXMEs clearly

### 3. Writing Style
- Use clear, concise language
- Active voice preferred
- Consistent terminology
- Progressive disclosure (overview first, details later)
- Code examples should be complete and runnable

### 4. Review Checklist
Before finalizing documentation, verify:
- [ ] All code examples compile/run correctly
- [ ] Links are valid
- [ ] Screenshots/images are up to date
- [ ] No placeholder text remains
- [ ] Spelling and grammar checked
- [ ] Consistent formatting

### 5. Output Format

For new documentation:
```markdown
## <Document Type>

### Draft
<the documentation content>

### Notes
- Any assumptions made
- Sections that need user input
- Suggested next steps
```

For improving existing documentation:
```markdown
## Improvements

### Issues Found
1. <issue and location>

### Suggested Changes
<specific improvements>

### Rewritten Section (if applicable)
<improved version>
```

## Rules

- Always ask clarifying questions if the documentation scope is unclear
- Provide multiple options when style choices are subjective
- Include examples for every concept introduced
- Keep paragraphs short (3-4 sentences max)
- Use formatting (lists, tables, code blocks) to improve readability
