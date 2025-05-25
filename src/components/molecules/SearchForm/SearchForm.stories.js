import { SearchForm } from './SearchForm';

export default {
  title: 'Molecules/SearchForm',
  component: SearchForm,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

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
