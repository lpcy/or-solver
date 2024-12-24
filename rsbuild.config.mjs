import { defineConfig } from '@rsbuild/core';
import { pluginSvelte } from '@rsbuild/plugin-svelte';

export default defineConfig({
  plugins: [pluginSvelte()],
  html: {
    inject: 'body',
  },
  output: {
    inlineScripts: true,
    inlineStyles: true,
  },
});
