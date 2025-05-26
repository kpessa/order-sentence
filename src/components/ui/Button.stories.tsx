import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '@/components/ui/button'; // Path alias should work now

// Meta information for the component
const meta: Meta<typeof Button> = {
  title: 'ShadcnUI/Button',
  component: Button,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'], // Enables automatic documentation generation
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'],
    },
    size: {
      control: 'select',
      options: ['default', 'sm', 'lg', 'icon'],
    },
    asChild: { control: 'boolean' },
    children: { control: 'text' },
  },
};

export default meta;

// Default story
export const Default: StoryObj<typeof Button> = {
  args: {
    children: 'Button',
    variant: 'default',
    size: 'default',
  },
};

export const Destructive: StoryObj<typeof Button> = {
  args: {
    children: 'Destructive',
    variant: 'destructive',
  },
};

export const Outline: StoryObj<typeof Button> = {
  args: {
    children: 'Outline',
    variant: 'outline',
  },
};

export const Secondary: StoryObj<typeof Button> = {
  args: {
    children: 'Secondary',
    variant: 'secondary',
  },
};

export const Ghost: StoryObj<typeof Button> = {
  args: {
    children: 'Ghost',
    variant: 'ghost',
  },
};

export const Link: StoryObj<typeof Button> = {
  args: {
    children: 'Link',
    variant: 'link',
  },
};

export const Large: StoryObj<typeof Button> = {
  args: {
    children: 'Large Button',
    size: 'lg',
  },
};

export const Small: StoryObj<typeof Button> = {
  args: {
    children: 'Small Button',
    size: 'sm',
  },
};

export const Icon: StoryObj<typeof Button> = {
  args: {
    children: '❤', // Example icon, you might use an SVG or icon component
    variant: 'outline',
    size: 'icon',
  },
};

// Example of using asChild with a Link (conceptual)
// You would need to import Link from 'next/link' or similar
// export const AsChildLink: StoryObj<typeof Button> = {
//   args: {
//     asChild: true,
//     children: <a href="#">Link Button</a>, // Storybook might not render NextLink directly well
//   },
// }; 