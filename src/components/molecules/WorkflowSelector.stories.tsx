// @ts-expect-error - Storybook types issue with React 19 or current setup
import type { Meta, StoryObj } from '@storybook/react';
import { WorkflowSelector } from '@/components/molecules/WorkflowSelector';

const meta: Meta<typeof WorkflowSelector> = {
  title: 'Molecules/WorkflowSelector',
  component: WorkflowSelector,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  args: {
    // onWorkflowSelected: fn(), // Example: mock the handler prop if it exists and is required
  },
};

export default meta;

export const Default: StoryObj<typeof WorkflowSelector> = {
  args: {
    selectedDrug: null,
  },
};

export const WithDrugSelected: StoryObj<typeof WorkflowSelector> = {
  args: {
    selectedDrug: {
      name: 'Aspirin 81 MG Tablet',
      rxcui: '206100',
      tty: 'SBD',
      isIngredient: false,
    },
  },
};
