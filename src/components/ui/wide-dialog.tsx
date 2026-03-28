// src/components/ui/wide-dialog.tsx
import { DialogContent, DialogDescription } from "@/components/ui/dialog";

interface WideDialogContentProps extends React.ComponentProps<typeof DialogContent> {
  size?: "default" | "lg" | "xl" | "2xl";
  description?: string;
}

export function WideDialogContent({
  children,
  size = "lg",
  className = "",
  description,
  ...props
}: WideDialogContentProps) {
  const sizeClasses = {
    default: "max-w-md",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
    "2xl": "max-w-6xl",
  };

  return (
    <DialogContent className={`max-h-[92vh] overflow-y-auto ${sizeClasses[size]} ${className}`} {...props}>
      {description && <DialogDescription>{description}</DialogDescription>}
      {children}
    </DialogContent>
  );
}
