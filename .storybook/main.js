const path = require('path');

/** @type { import('@storybook/nextjs').StorybookConfig } */
const config = {
  stories: [
    "../src/stories/**/*.stories.@(js|jsx|mjs|ts|tsx)",
    "../src/components/ui/**/*.stories.@(js|jsx|mjs|ts|tsx)",
    "../src/components/atoms/**/*.stories.@(js|jsx|mjs|ts|tsx)",
    "../src/components/molecules/**/*.stories.@(js|jsx|mjs|ts|tsx)",
    "../src/components/organisms/**/*.stories.@(js|jsx|mjs|ts|tsx)",
    "../src/components/templates/**/*.stories.@(js|jsx|mjs|ts|tsx)",
  ],
  addons: [
    "@storybook/addon-links",
    "@storybook/addon-essentials",
    "@storybook/addon-interactions",
    {
      name: '@storybook/addon-styling-webpack',
      options: {
        // Any specific options for the addon can go here if needed
        // For Tailwind, it often auto-detects postcss.config.js and tailwind.config.js
      },
    },
  ],
  framework: {
    name: "@storybook/nextjs",
    options: {},
  },
  docs: {
    autodocs: "tag",
  },
  staticDirs: ["../public"],
  webpackFinal: async (config) => {
    if (config.resolve) {
      config.resolve.alias = {
        ...config.resolve.alias,
        '@': path.resolve(__dirname, "../src/"),
      };
    }
    return config;
  },
};
export default config;
