import path from 'node:path'
import nextra from 'nextra'

const withNextra = nextra({
  // Serve all of content/ under /docs, leaving / free for the landing page.
  contentDirBasePath: '/docs',
  search: {
    codeblocks: false
  }
})

export default withNextra({
  reactStrictMode: true,
  // This site lives in a monorepo. Pin tracing to the repo root so Next's
  // traced paths line up with where Vercel's builder resolves them (it uses
  // the root lockfile + workspaces). Pinning to the docs/ dir instead makes
  // Vercel look for .next one directory too high and fail with ENOENT.
  outputFileTracingRoot: path.join(import.meta.dirname, '..')
})
