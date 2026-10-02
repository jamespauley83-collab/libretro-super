import fs from 'fs'
import path from 'path'

export function readCores(repoRoot) {
  const infoDir = path.join(repoRoot, 'dist', 'info')
  const files = fs.readdirSync(infoDir).filter(f => f.endsWith('.info'))
  const cores = []

  for (const file of files) {
    const content = fs.readFileSync(path.join(infoDir, file), 'utf-8')
    const core = parseInfoFile(content, file)
    cores.push(core)
  }

  cores.sort((a, b) => (a.corename || '').localeCompare(b.corename || ''))
  return cores
}

function parseInfoFile(content, filename) {
  const core = { _file: filename }
  const lines = content.split('\n')

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) continue

    const key = trimmed.slice(0, eqIdx).trim()
    let value = trimmed.slice(eqIdx + 1).trim()

    // Remove surrounding quotes
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1)
    }

    // Normalize "null" string to null
    if (value === 'null') value = null

    core[key] = value
  }

  // Recipe names come from filenames, not optional/non-unique display names.
  core.id = filename.replace(/(?:_libretro)?\.info$/, '')
  return core
}
