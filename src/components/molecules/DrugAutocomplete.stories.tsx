// @ts-expect-error - Storybook types issue with React 19 or current setup
import type { Meta, StoryObj } from '@storybook/react';
import { DrugAutocomplete } from '@/components/molecules/DrugAutocomplete';
// @ts-expect-error - Storybook types issue with React 19 or current setup
import { fn } from '@storybook/test';
import type { ComponentProps } from 'react';

const meta: Meta<typeof DrugAutocomplete> = {
  title: 'Molecules/DrugAutocomplete',
  component: DrugAutocomplete,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    onDrugSelected: { action: 'drugSelected' },
  },
  args: {
    onDrugSelected: fn(),
  },
};

export default meta;

export const Default: StoryObj<typeof DrugAutocomplete> = {
  render: (args: ComponentProps<typeof DrugAutocomplete>) => (
    <div style={{ width: '400px' }}>
      <DrugAutocomplete {...args} />
    </div>
  ),
  args: {},
};

export const WithInitialQuery: StoryObj<typeof DrugAutocomplete> = {
    render: (args: ComponentProps<typeof DrugAutocomplete>) => (
        <div style={{ width: '400px' }}>
          <DrugAutocomplete {...args} />
        </div>
      ),
}; 