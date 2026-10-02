import fs from 'fs'
import path from 'path'

export function readRecipes(repoRoot) {
  const recipesDir = path.join(repoRoot, 'recipes')
  const platforms = fs.readdirSync(recipesDir).filter(d =>
    fs.statSync(path.join(recipesDir, d)).isDirectory()
  )

  const result = {}

  for (const platform of platforms) {
    const platformDir = path.join(recipesDir, platform)
    const files = fs.readdirSync(platformDir)
      .filter(f => {
        // Skip .conf, .ra, and other non-recipe files
        const ext = path.extname(f)
        return ext !== '.conf' && ext !== '.ra' && !f.includes('.')
      })

    const recipeFiles = []

    for (const file of files) {
      const content = fs.readFileSync(path.join(platformDir, file), 'utf-8')
      const cores = parseRecipeFile(content)
      if (cores.length > 0) {
        recipeFiles.push({ name: file, cores })
      }
    }

    if (recipeFiles.length > 0) {
      result[platform] = recipeFiles
    }
  }

  return result
}

function parseRecipeFile(content) {
  const cores = []
  const lines = content.split('\n')

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    // Format: {CORENAME} {COREDIR} {URL} {BRANCH} {ENABLED} {COMMAND} {MAKEFILE} {SUBDIR} {ARGS}
    // Args may contain spaces; split into max 9 parts, last part is the rest
    const parts = trimmed.split(/\s+/)

    if (parts.length < 5) continue

    const core = {
      corename: parts[0],
      coredir: parts[1] || '',
      url: parts[2] || '',
      branch: parts[3] || '',
      enabled: parts[4] || '',
      command: parts[5] || '',
      makefile: parts[6] || '',
      subdir: parts[7] || '',
      args: parts.slice(8).join(' ') || '',
    }

    // Check for multi-build targets (after |)
    if (core.args.includes('|')) {
      const [mainArgs, targets] = core.args.split('|')
      core.args = mainArgs.trim()
      core.multiTargets = targets.trim()
    }

    cores.push(core)
  }

  return cores
}
