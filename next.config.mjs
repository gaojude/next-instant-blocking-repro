/** @type {import('next').NextConfig} */
export default {
  cacheComponents: true,
  experimental: {
    exposeTestingApiInProductionBuild: true,
    prefetchInlining: false,
    instantNavigationDevToolsToggle: true,
  },
};
