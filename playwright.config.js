export default {
  testDir: './tests',
  timeout: 60000,
  reporter: [['list']],
  use: { baseURL: 'http://localhost:3340' },
  webServer: {
    command: 'pnpm exec next dev -p 3340',
    url: 'http://localhost:3340/en',
    reuseExistingServer: true,
    timeout: 180000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
}
