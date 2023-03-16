import { existsSync, promises as fsp } from 'node:fs'
import path from 'pathe'
import {
  getGitDiff,
  parseCommits,
  generateMarkDown,
  loadChangelogConfig,
} from 'changelogen'

export async function generateChangelog (cwd: string, newVersion: string) {
  const config = await loadChangelogConfig(cwd, {
    newVersion,
  })
  const output = path.resolve(cwd, 'CHANGELOG.md')

  const rawCommits = await getGitDiff(config.from, config.to)

  // Parse commits as conventional commits
  const commits = parseCommits(rawCommits, config).filter(
    (c) =>
      config.types[c.type] &&
      !(c.type === 'chore' && c.scope === 'deps' && !c.isBreaking)
  )

  // Generate markdown
  const markdown = await generateMarkDown(commits, config)

  let changelogMD: string
  if (existsSync(output)) {
    changelogMD = await fsp.readFile(output, 'utf8')
  } else {
    changelogMD = '# Changelog\n\n'
  }

  const lastEntry = changelogMD.match(/^###?\s+.*$/m)

  if (lastEntry) {
    changelogMD =
      changelogMD.slice(0, lastEntry.index) +
      markdown +
      '\n\n' +
      changelogMD.slice(lastEntry.index)
  } else {
    changelogMD += '\n' + markdown + '\n\n'
  }

  await fsp.writeFile(output, changelogMD)
}
