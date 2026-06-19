import { useEffect, useRef, useState, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import mermaid from 'mermaid'
import {
  Copy,
  Check,
  Download,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  FileCode,
  FileJson,
  Image,
  Globe,
  Type
} from 'lucide-react'
import CodeBlock from '../chat/CodeBlock'

export type ArtifactType = 'html' | 'react' | 'mermaid' | 'svg' | 'code' | 'markdown'

interface ArtifactRendererProps {
  type: ArtifactType
  content: string
  title?: string
  onClose?: () => void
}

/* ------------------------------------------------------------------ */
/*  HTML / React renderer (iframe + srcdoc)                            */
/* ------------------------------------------------------------------ */

function HtmlArtifact({ content, isReact = false }: { content: string; isReact?: boolean }) {
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const srcdoc = useCallback(() => {
    const cdnReact = 'https://unpkg.com/react@18/umd/react.production.min.js'
    const cdnReactDOM = 'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js'
    const cdnBabel = 'https://unpkg.com/@babel/standalone/babel.min.js'
    const cdnTailwind = 'https://cdn.tailwindcss.com'

    if (isReact) {
      // Wrap JSX in a full HTML page with Babel standalone
      return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<script src="${cdnReact}"><\/script>
<script src="${cdnReactDOM}"><\/script>
<script src="${cdnBabel}"><\/script>
<script src="${cdnTailwind}"><\/script>
<style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:24px;}</style>
</head>
<body>
<div id="root"></div>
<script type="text/babel">
${content}
<\/script>
</body>
</html>`
    }

    // Plain HTML — inject Tailwind CDN if not already present
    let html = content.trim()
    if (!html.includes('<html') && !html.includes('<!DOCTYPE')) {
      html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<script src="${cdnTailwind}"><\/script>
<style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:24px;}</style>
</head>
<body>${html}</body>
</html>`
    }
    return html
  }, [content, isReact])

  const handleOpenBrowser = useCallback(() => {
    const blob = new Blob([srcdoc()], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
    // Clean up blob URL after a delay
    setTimeout(() => URL.revokeObjectURL(url), 60000)
  }, [srcdoc])

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border)] bg-[var(--bg-sidebar)]/50">
        <span className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wide">
          {isReact ? 'React Component' : 'HTML Preview'}
        </span>
        <button
          onClick={handleOpenBrowser}
          className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] transition-all text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--border)]"
          title="Open in browser"
        >
          <ExternalLink size={12} />
          <span>Open</span>
        </button>
      </div>
      <div className="flex-1 min-h-0 p-3">
        <iframe
          ref={iframeRef}
          srcDoc={srcdoc()}
          sandbox="allow-scripts allow-same-origin"
          className="w-full h-full rounded-lg border border-[var(--border)] bg-white"
          title={isReact ? 'React preview' : 'HTML preview'}
        />
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Mermaid renderer                                                   */
/* ------------------------------------------------------------------ */

function MermaidArtifact({ content }: { content: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [svg, setSvg] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [scale, setScale] = useState(1)

  useEffect(() => {
    let cancelled = false
    mermaid.initialize({
      startOnLoad: false,
      theme: 'default',
      securityLevel: 'strict'
    })
    mermaid
      .render('mermaid-artifact-' + Date.now(), content.trim())
      .then(({ svg }) => {
        if (!cancelled) setSvg(svg)
      })
      .catch((err) => {
        if (!cancelled) setError(String(err?.message ?? err))
      })
    return () => {
      cancelled = true
    }
  }, [content])

  const handleDownload = useCallback(() => {
    const blob = new Blob([svg], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'diagram.svg'
    a.click()
    URL.revokeObjectURL(url)
  }, [svg])

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border)] bg-[var(--bg-sidebar)]/50">
        <span className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wide">
          Mermaid Diagram
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setScale((s) => Math.max(0.3, s - 0.2))}
            className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--border)] transition-colors"
            title="Zoom out"
          >
            <ZoomOut size={12} />
          </button>
          <span className="text-[11px] text-[var(--text-muted)] w-10 text-center">{Math.round(scale * 100)}%</span>
          <button
            onClick={() => setScale((s) => Math.min(3, s + 0.2))}
            className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--border)] transition-colors"
            title="Zoom in"
          >
            <ZoomIn size={12} />
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] transition-all text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--border)] ml-1"
            title="Download SVG"
          >
            <Download size={12} />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-4 flex items-center justify-center">
        {error ? (
          <div className="text-red-500 text-sm">{error}</div>
        ) : svg ? (
          <div
            ref={containerRef}
            dangerouslySetInnerHTML={{ __html: svg }}
            style={{
              transform: `scale(${scale})`,
              transformOrigin: 'center center',
              transition: 'transform 0.2s ease'
            }}
          />
        ) : (
          <div className="text-[var(--text-muted)] text-sm">Rendering diagram…</div>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  SVG renderer                                                       */
/* ------------------------------------------------------------------ */

function SvgArtifact({ content }: { content: string }) {
  const [scale, setScale] = useState(1)

  const handleDownload = useCallback(() => {
    const blob = new Blob([content], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'image.svg'
    a.click()
    URL.revokeObjectURL(url)
  }, [content])

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border)] bg-[var(--bg-sidebar)]/50">
        <span className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wide">SVG Image</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setScale((s) => Math.max(0.3, s - 0.2))}
            className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--border)] transition-colors"
            title="Zoom out"
          >
            <ZoomOut size={12} />
          </button>
          <span className="text-[11px] text-[var(--text-muted)] w-10 text-center">{Math.round(scale * 100)}%</span>
          <button
            onClick={() => setScale((s) => Math.min(3, s + 0.2))}
            className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--border)] transition-colors"
            title="Zoom in"
          >
            <ZoomIn size={12} />
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] transition-all text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--border)] ml-1"
            title="Download SVG"
          >
            <Download size={12} />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-4 flex items-center justify-center">
        <div
          dangerouslySetInnerHTML={{ __html: content }}
          style={{ transform: `scale(${scale})`, transformOrigin: 'center center', transition: 'transform 0.2s ease' }}
        />
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Code renderer                                                      */
/* ------------------------------------------------------------------ */

function CodeArtifact({ content, language = 'text' }: { content: string; language?: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (e) {
      console.error('Failed to copy:', e)
    }
  }, [content])

  const handleDownload = useCallback(() => {
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `artifact.${language || 'txt'}`
    a.click()
    URL.revokeObjectURL(url)
  }, [content, language])

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border)] bg-[var(--bg-sidebar)]/50">
        <span className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wide">
          {language || 'Code'}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] transition-all text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--border)]"
            title="Copy code"
          >
            {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] transition-all text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--border)]"
            title="Download"
          >
            <Download size={12} />
            <span>Download</span>
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-0">
        <CodeBlock code={content} language={language} />
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Markdown renderer                                                  */
/* ------------------------------------------------------------------ */

function MarkdownArtifact({ content }: { content: string }) {
  const handlePrint = useCallback(() => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    printWindow.document.write(`
      <html><head><title>Artifact</title>
      <style>
        body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:720px;margin:40px auto;line-height:1.6;color:#111;padding:0 20px;}
        h1,h2,h3{font-weight:600;margin-top:1.5em;margin-bottom:0.5em;}
        pre{background:#f4f4f5;padding:12px;border-radius:6px;overflow-x:auto;}
        code{font-family:monospace;font-size:0.9em;}
        blockquote{border-left:3px solid #e4e4e7;padding-left:1em;margin-left:0;color:#52525b;}
        table{border-collapse:collapse;width:100%;margin:1em 0;}
        th,td{border:1px solid #e4e4e7;padding:6px 10px;text-align:left;}
        th{background:#f4f4f5;}
      </style></head><body>
      ${content}
      </body></html>
    `)
    printWindow.document.close()
    printWindow.print()
  }, [content])

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border)] bg-[var(--bg-sidebar)]/50">
        <span className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wide">Markdown</span>
        <button
          onClick={handlePrint}
          className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] transition-all text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--border)]"
          title="Print / Save as PDF"
        >
          <ExternalLink size={12} />
          <span>Print</span>
        </button>
      </div>
      <div className="flex-1 overflow-auto p-4 prose-od text-[14px] leading-relaxed">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main dispatcher                                                    */
/* ------------------------------------------------------------------ */

export default function ArtifactRenderer({ type, content, title }: ArtifactRendererProps) {
  return (
    <div className="flex flex-col h-full bg-[var(--bg-content)]">
      {title && (
        <div className="px-4 py-2 border-b border-[var(--border)] bg-[var(--bg-sidebar)]/30">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] truncate">{title}</h3>
        </div>
      )}
      <div className="flex-1 min-h-0">
        {type === 'html' && <HtmlArtifact content={content} />}
        {type === 'react' && <HtmlArtifact content={content} isReact />}
        {type === 'mermaid' && <MermaidArtifact content={content} />}
        {type === 'svg' && <SvgArtifact content={content} />}
        {type === 'code' && <CodeArtifact content={content} />}
        {type === 'markdown' && <MarkdownArtifact content={content} />}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Type icon helper                                                   */
/* ------------------------------------------------------------------ */

export function ArtifactTypeIcon({ type, size = 14 }: { type: ArtifactType; size?: number }) {
  switch (type) {
    case 'html':
      return <Globe size={size} />
    case 'react':
      return <FileCode size={size} />
    case 'mermaid':
      return <Image size={size} />
    case 'svg':
      return <Image size={size} />
    case 'code':
      return <FileCode size={size} />
    case 'markdown':
      return <Type size={size} />
    default:
      return <FileJson size={size} />
  }
}
