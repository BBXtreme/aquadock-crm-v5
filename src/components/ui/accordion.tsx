// This component is adapted from the Radix UI Accordion component: https://www.radix-ui.com/docs/primitives/components/accordion src/components/ui/accordion.tsx
import { ChevronDownIcon } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

interface AccordionProps extends React.HTMLAttributes<HTMLDivElement> {
  type?: string;
  collapsible?: boolean;
}

interface AccordionTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  open: boolean;
  setOpen: (open: boolean) => void;
}

interface AccordionContentProps extends React.HTMLAttributes<HTMLDivElement> {
  open: boolean;
  setOpen: (open: boolean) => void;
}

function Accordion({ type, collapsible = false, className, children, ...props }: AccordionProps) {
  return (
    <div className={cn("w-full", className)} {...props}>
      {children}
    </div>
  );
}

function AccordionItem({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const [open, setOpen] = React.useState(false);

  return (
    <div className={cn("border-b", className)} {...props}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, { open, setOpen });
        }
        return child;
      })}
    </div>
  );
}

function AccordionTrigger({ className, children, open, setOpen, ...props }: AccordionTriggerProps) {
  return (
    <button
      type="button"
      className={cn(
        "flex flex-1 items-center justify-between py-4 font-medium transition-all hover:underline",
        className,
      )}
      onClick={() => setOpen(!open)}
      {...props}
    >
      {children}
      <ChevronDownIcon className={`h-4 w-4 shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
    </button>
  );
}

function AccordionContent({ className, children, open, setOpen, ...props }: AccordionContentProps) {
  return (
    <div className={cn("overflow-hidden text-sm transition-all", open ? "max-h-96" : "max-h-0", className)} {...props}>
      <div className="pb-4 pt-0">{children}</div>
    </div>
  );
}

export { Accordion, AccordionContent, AccordionItem, AccordionTrigger };
