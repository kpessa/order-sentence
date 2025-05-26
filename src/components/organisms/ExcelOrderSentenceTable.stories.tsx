import type { Meta, StoryObj } from '@storybook/react';
import { ExcelOrderSentenceTable } from '@/components/organisms/ExcelOrderSentenceTable';

const meta: Meta<typeof ExcelOrderSentenceTable> = {
  title: 'Organisms/ExcelOrderSentenceTable',
  component: ExcelOrderSentenceTable,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  argTypes: {
    rxcui: {
      control: 'text',
      description: 'RxCUI of the selected drug to filter sentences.',
    },
    drugName: {
      control: 'text',
      description: 'Name of the selected drug (for display).',
    },
  },
};

export default meta;

export const ForAtorvastatin: StoryObj<typeof ExcelOrderSentenceTable> = {
  args: {
    rxcui: '153165',
    drugName: 'Atorvastatin',
  },
};

export const ForLisinopril: StoryObj<typeof ExcelOrderSentenceTable> = {
  args: {
    rxcui: '123',
    drugName: 'Lisinopril',
  },
};

export const NoDataFound: StoryObj<typeof ExcelOrderSentenceTable> = {
  args: {
    rxcui: '999999',
    drugName: 'NonExistentDrug',
  },
};

export const WithGlobalFilter: StoryObj<typeof ExcelOrderSentenceTable> = {
    args: {
      rxcui: '153165',
      drugName: 'Atorvastatin',
    },
  }; 