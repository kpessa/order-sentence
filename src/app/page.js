import { SearchForm } from '@/components/molecules/SearchForm/SearchForm';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function Home() {
  const handleSearch = (searchTerm) => {
    console.log('Searching for:', searchTerm);
    // Add your search logic here
  };

  return (
    <main className="container mx-auto p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold">Next.js Template</h1>
          <p className="text-muted-foreground text-lg">
            A complete setup with Next.js, Tailwind CSS, shadcn/ui, and Storybook
          </p>
        </div>
        
        <div className="grid gap-6 md:grid-cols-2">
          <SearchForm 
            title="Example Search"
            placeholder="Try searching something..."
            onSubmit={handleSearch}
          />
          
          <Card>
            <CardHeader>
              <CardTitle>Quick Start</CardTitle>
              <CardDescription>
                Your template is ready for fast prototyping
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button variant="default">Default</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Check out Storybook at{' '}
                <code className="bg-muted px-1 py-0.5 rounded">
                  pnpm run storybook
                </code>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
