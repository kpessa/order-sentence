import { SearchForm } from './SearchForm';

const meta = {
  title: 'Molecules/SearchForm',
  component: SearchForm,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;

export const Default = {
  args: {
    onSubmit: (value) => console.log('Search submitted:', value),
  },
};

export const CustomPlaceholder = {
  args: {
    placeholder: 'Enter drug name...',
    title: 'Drug Search',
    onSubmit: (value) => console.log('Drug search:', value),
  },
};
