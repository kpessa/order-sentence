import type { Meta, StoryObj } from '@storybook/react';
import { DrugAutocomplete } from '@/components/molecules/DrugAutocomplete';
import { fn } from '@storybook/test';

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
  render: (args) => (
    <div style={{ width: '400px' }}>
      <DrugAutocomplete {...args} />
    </div>
  ),
  args: {},
};

export const WithInitialQuery: StoryObj<typeof DrugAutocomplete> = {
    render: (args) => (
        <div style={{ width: '400px' }}>
          <DrugAutocomplete {...args} />
        </div>
      ),
}; 