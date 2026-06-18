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
  // This site lives in a monorepo; pin tracing to this folder so Next doesn't
  // pick the repo-root lockfile as the workspace root.
  outputFileTracingRoot: import.meta.dirname
})
