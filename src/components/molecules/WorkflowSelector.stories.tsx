import type { Meta, StoryObj } from '@storybook/react';
import { WorkflowSelector } from '@/components/molecules/WorkflowSelector';
import { SelectedDrugInfo } from '@/lib/types';
import { fn } from '@storybook/test';

const meta: Meta<typeof WorkflowSelector> = {
  title: 'Molecules/WorkflowSelector',
  component: WorkflowSelector,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    selectedDrug: {
      control: 'object',
      description: 'The drug object selected by the user. Null if no drug is selected.',
    },
  },
};

export default meta;

const mockSelectedDrug: SelectedDrugInfo = {
  name: 'Lisinopril',
  rxcui: '123',
  tty: 'IN',
  isIngredient: true,
};

export const NoDrugSelected: StoryObj<typeof WorkflowSelector> = {
  args: {
    selectedDrug: null,
  },
};

export const DrugSelected: StoryObj<typeof WorkflowSelector> = {
  args: {
    selectedDrug: mockSelectedDrug,
  },
}; 