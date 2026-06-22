const fs = require('fs')
const path = require('path')

const src = path.resolve(__dirname, '../src/main/skills/builtins')
const dest = path.resolve(__dirname, '../out/skills/builtins')

if (!fs.existsSync(src)) {
  console.warn(`Built-in skills source not found: ${src}`)
  process.exit(0)
}

fs.mkdirSync(path.dirname(dest), { recursive: true })
fs.cpSync(src, dest, { recursive: true, force: true })
console.log(`Copied built-in skills to ${dest}`)
