import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export const CustomButton = ({ 
  children, 
  variant = 'default', 
  size = 'default',
  className,
  ...props 
}) => {
  return (
    <Button 
      variant={variant} 
      size={size} 
      className={cn(className)}
      {...props}
    >
      {children}
    </Button>
  );
};
