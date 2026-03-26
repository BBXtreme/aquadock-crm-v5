import { DialogContent, type DialogContentProps } from "@/components/ui/dialog";

interface WideDialogContentProps extends DialogContentProps {
  size?: "default" | "lg" | "xl" | "2xl";
}

export function WideDialogContent({ children, size = "lg", className = "", ...props }: WideDialogContentProps) {
  const sizeClasses = {
    default: "max-w-md",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
    "2xl": "max-w-6xl",
  };

  return (
    <DialogContent className={`max-h-[92vh] overflow-y-auto ${sizeClasses[size]} ${className}`} {...props}>
      {children}
    </DialogContent>
  );
}
