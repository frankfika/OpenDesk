/**
 * Multi-format export for chat artifacts.
 *
 * Renders Markdown-ish content into:
 *   - .docx   (Word)   via docx
 *   - .xlsx   (Excel)  via xlsx
 *   - .pptx   (PPTX)   via pptxgenjs
 *
 * The renderer is intentionally simple: it converts the artifact content to
 * plain text / table rows / bullet slides based on heuristics, so a user can
 * hand off a chat-derived artefact to colleagues without manual reformatting.
 *
 * Returns the absolute file path on success.
 */

import { writeFileSync } from 'fs'
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle
} from 'docx'
import * as XLSX from 'xlsx'
import PptxGenJS from 'pptxgenjs'

export type ExportFormat = 'docx' | 'xlsx' | 'pptx' | 'md'

interface ExportOptions {
  title?: string
  format: ExportFormat
  content: string
  outputPath: string
}

interface ParsedBlock {
  kind: 'h1' | 'h2' | 'h3' | 'p' | 'list' | 'table' | 'code'
  text: string
  rows?: string[][]
}

function parseMarkdown(content: string): ParsedBlock[] {
  const lines = content.split(/\r?\n/)
  const blocks: ParsedBlock[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    if (!line.trim()) {
      i++
      continue
    }

    // Headings
    const h3 = /^###\s+(.*)$/.exec(line)
    if (h3) {
      blocks.push({ kind: 'h3', text: h3[1].trim() })
      i++
      continue
    }
    const h2 = /^##\s+(.*)$/.exec(line)
    if (h2) {
      blocks.push({ kind: 'h2', text: h2[1].trim() })
      i++
      continue
    }
    const h1 = /^#\s+(.*)$/.exec(line)
    if (h1) {
      blocks.push({ kind: 'h1', text: h1[1].trim() })
      i++
      continue
    }

    // Code block
    if (line.startsWith('```')) {
      const buf: string[] = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) {
        buf.push(lines[i])
        i++
      }
      blocks.push({ kind: 'code', text: buf.join('\n') })
      i++
      continue
    }

    // Table (very loose: contiguous lines containing `|` are table rows)
    if (line.includes('|') && /\w+\s*\|/.test(line)) {
      const rows: string[][] = []
      while (i < lines.length && lines[i].includes('|')) {
        const row = lines[i]
          .split('|')
          .map((c) => c.trim())
          .filter((_, idx, arr) => !(idx === 0 && arr[0] === '') && !(idx === arr.length - 1 && arr[arr.length - 1] === ''))
        // Skip the markdown separator row like |---|---|
        if (row.every((c) => /^:?-+:?$/.test(c))) {
          i++
          continue
        }
        rows.push(row)
        i++
      }
      if (rows.length > 0) blocks.push({ kind: 'table', text: '', rows })
      continue
    }

    // List
    if (/^[-*+]\s+/.test(line) || /^\d+\.\s+/.test(line)) {
      const items: string[] = []
      while (i < lines.length && (/^[-*+]\s+/.test(lines[i]) || /^\d+\.\s+/.test(lines[i]))) {
        const m = /^[-*+]\s+(.*)$/.exec(lines[i]) || /^\d+\.\s+(.*)$/.exec(lines[i])
        if (m) {
          items.push(m[1].trim())
          i++
        } else break
      }
      blocks.push({ kind: 'list', text: items.join('\n'), rows: items.map((s) => [s]) })
      continue
    }

    // Plain paragraph: collect until blank line / heading / list / table
    const buf: string[] = [line]
    i++
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^#{1,3}\s+/.test(lines[i]) &&
      !/^[-*+]\s+/.test(lines[i]) &&
      !/^\d+\.\s+/.test(lines[i]) &&
      !lines[i].startsWith('```') &&
      !lines[i].includes('|')
    ) {
      buf.push(lines[i])
      i++
    }
    blocks.push({ kind: 'p', text: buf.join(' ').trim() })
  }

  return blocks
}

export async function exportArtifact(opts: ExportOptions): Promise<string> {
  const blocks = parseMarkdown(opts.content)
  const title = opts.title?.trim() || 'OpenDesk Export'

  switch (opts.format) {
    case 'md':
      writeFileSync(opts.outputPath, `# ${title}\n\n${opts.content}`, 'utf8')
      return opts.outputPath

    case 'docx':
      return await writeDocx(title, blocks, opts.outputPath)

    case 'xlsx':
      return writeXlsx(title, blocks, opts.outputPath)

    case 'pptx':
      return await writePptx(title, blocks, opts.outputPath)

    default: {
      const _exhaustive: never = opts.format
      throw new Error(`Unsupported export format: ${String(_exhaustive)}`)
    }
  }
}

async function writeDocx(title: string, blocks: ParsedBlock[], outputPath: string): Promise<string> {
  const children: (Paragraph | Table)[] = []

  children.push(
    new Paragraph({
      heading: HeadingLevel.TITLE,
      children: [new TextRun({ text: title, bold: true })]
    })
  )

  for (const b of blocks) {
    if (b.kind === 'h1') {
      children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: b.text, bold: true })] }))
    } else if (b.kind === 'h2') {
      children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: b.text, bold: true })] }))
    } else if (b.kind === 'h3') {
      children.push(new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun({ text: b.text, bold: true })] }))
    } else if (b.kind === 'p') {
      children.push(new Paragraph({ children: [new TextRun({ text: b.text })] }))
    } else if (b.kind === 'list') {
      const items = (b.rows ?? []).map((r) => r[0])
      for (const item of items) {
        children.push(
          new Paragraph({ children: [new TextRun({ text: `• ${item}` })], bullet: { level: 0 } })
        )
      }
    } else if (b.kind === 'table' && b.rows && b.rows.length > 0) {
      children.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: b.rows.map(
            (r, rowIdx) =>
              new TableRow({
                children: r.map(
                  (cell) =>
                    new TableCell({
                      children: [new Paragraph({ children: [new TextRun({ text: cell, bold: rowIdx === 0 })] })]
                    })
                )
              })
          )
        })
      )
    } else if (b.kind === 'code') {
      for (const line of b.text.split('\n')) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: line, font: 'Courier New' })]
          })
        )
      }
    }
  }

  const doc = new Document({ sections: [{ properties: {}, children }] })
  const buffer = await Packer.toBuffer(doc)
  writeFileSync(outputPath, buffer)
  return outputPath
}

function writeXlsx(title: string, blocks: ParsedBlock[], outputPath: string): string {
  const wsData: unknown[][] = []
  wsData.push([title])
  wsData.push([])

  for (const b of blocks) {
    if (b.kind === 'h1') wsData.push([b.text.toUpperCase()])
    else if (b.kind === 'h2') wsData.push([b.text])
    else if (b.kind === 'h3') wsData.push([`  ${b.text}`])
    else if (b.kind === 'p') wsData.push([b.text])
    else if (b.kind === 'list') {
      for (const r of b.rows ?? []) wsData.push([`• ${r[0]}`])
    } else if (b.kind === 'table' && b.rows) {
      for (const r of b.rows) wsData.push(r)
    } else if (b.kind === 'code') {
      for (const line of b.text.split('\n')) wsData.push([line])
    }
    wsData.push([])
  }

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet(wsData)
  ws['!cols'] = [{ wch: 40 }, { wch: 60 }]
  XLSX.utils.book_append_sheet(wb, ws, 'OpenDesk Export')
  XLSX.writeFile(wb, outputPath)
  return outputPath
}

async function writePptx(title: string, blocks: ParsedBlock[], outputPath: string): Promise<string> {
  const pptx = new PptxGenJS()
  pptx.layout = 'LAYOUT_16x9'

  // Title slide
  const titleSlide = pptx.addSlide()
  titleSlide.background = { color: '1D8C80' }
  titleSlide.addText(title, {
    x: 0.5, y: 1.5, w: 9, h: 2,
    fontSize: 36, color: 'FFFFFF', bold: true, align: 'center'
  })
  titleSlide.addText('Generated by OpenDesk', {
    x: 0.5, y: 3.5, w: 9, h: 0.5,
    fontSize: 14, color: 'FFFFFF', align: 'center'
  })

  // Group blocks: one slide per h1 / h2, or until threshold
  const slides: ParsedBlock[][] = []
  let current: ParsedBlock[] = []
  let budget = 0

  for (const b of blocks) {
    if ((b.kind === 'h1' || b.kind === 'h2') && current.length > 0) {
      slides.push(current)
      current = [b]
      budget = b.text.length + 200
    } else {
      current.push(b)
      budget += b.text.length
      if (budget > 1200) {
        slides.push(current)
        current = []
        budget = 0
      }
    }
  }
  if (current.length > 0) slides.push(current)

  for (const slideBlocks of slides) {
    const slide = pptx.addSlide()
    const heading = slideBlocks.find((b) => b.kind === 'h1' || b.kind === 'h2')
    const headingText = heading?.text ?? ''
    slide.addText(headingText, {
      x: 0.5, y: 0.3, w: 9, h: 0.6,
      fontSize: 24, color: '1D8C80', bold: true
    })

    const bullets: { text: string; options?: { bullet?: boolean } }[] = []
    for (const b of slideBlocks) {
      if (b === heading) continue
      if (b.kind === 'p') bullets.push({ text: b.text })
      else if (b.kind === 'list') {
        for (const r of b.rows ?? []) bullets.push({ text: r[0], options: { bullet: true } })
      } else if (b.kind === 'h3') bullets.push({ text: b.text })
      else if (b.kind === 'code') {
        bullets.push({ text: b.text.split('\n').join('  ·  ') })
      } else if (b.kind === 'table' && b.rows) {
        for (const r of b.rows) bullets.push({ text: r.join('  |  ') })
      }
    }

    slide.addText(
      bullets.length > 0
        ? bullets.map((b) => ({ text: b.text, options: { bullet: b.options?.bullet ?? false } }))
        : [{ text: '' }],
      { x: 0.5, y: 1.1, w: 9, h: 4, fontSize: 16, color: '333333', valign: 'top' }
    )
  }

  await pptx.writeFile({ fileName: outputPath })
  return outputPath
}

// Keep a BorderStyle import in scope for potential future use
void BorderStyle