import '../src/app/globals.css';
import { MemoryRouterProvider } from 'next-router-mock/MemoryRouterProvider/next-13.5'; // Adjust version if needed

/** @type { import('@storybook/react').Preview } */
const preview = {
  parameters: {
    actions: { argTypesRegex: "^on[A-Z].*" },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    nextjs: {
      appDirectory: true,
      // You can provide default router parameters here if needed for all stories
      // router: {
      //   pathname: '/',
      // },
    },
  },
  decorators: [
    (Story) => (
      <MemoryRouterProvider>
        <Story />
      </MemoryRouterProvider>
    ),
  ],
};

export default preview;
