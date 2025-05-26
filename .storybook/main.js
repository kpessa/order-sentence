/** @type { import('@storybook/nextjs').StorybookConfig } */
const config = {
  stories: [
    "../src/stories/**/*.stories.@(js|jsx|mdx)",
    "../src/components/**/*.stories.@(js|jsx|mdx)"
  ],
  addons: [
    "@storybook/addon-links",
    "@storybook/addon-essentials",
    "@storybook/addon-interactions",
  ],
  framework: {
    name: "@storybook/nextjs",
    options: {},
  },
  docs: {
    autodocs: "tag",
  },
  staticDirs: ["../public"],
};
export default config;
