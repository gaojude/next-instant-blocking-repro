// Prod variant: builds and serves a production build, then runs the same spec.
// exposeTestingApiInProductionBuild (next.config.mjs) makes instant() work here.
// The leak does NOT reproduce in prod — so this config PASSES.
export default {
  testDir: './tests',
  timeout: 120000,
  reporter: [['list']],
  use: { baseURL: 'http://localhost:3343' },
  webServer: {
    command: 'pnpm exec next build && pnpm exec next start -p 3343',
    url: 'http://localhost:3343/en',
    reuseExistingServer: true,
    timeout: 180000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
}
