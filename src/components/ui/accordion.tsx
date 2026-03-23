import * as React from "react";

import { cn } from "@/lib/utils";
import { ChevronDownIcon } from "lucide-react";

function Accordion({ type, collapsible = false, className, children, ...props }: any) {
  return (
    <div className={cn("w-full", className)} {...props}>
      {children}
    </div>
  );
}

function AccordionItem({ className, children, ...props }: any) {
  const [open, setOpen] = React.useState(false);

  return (
    <div className={cn("border-b", className)} {...props}>
      {React.Children.map(children, (child) =>
        React.cloneElement(child as React.ReactElement, { open, setOpen })
      )}
    </div>
  );
}

function AccordionTrigger({ className, children, open, setOpen, ...props }: any) {
  return (
    <button
      className={cn(
        "flex flex-1 items-center justify-between py-4 font-medium transition-all hover:underline",
        className,
      )}
      onClick={() => setOpen(!open)}
      {...props}
    >
      {children}
      <ChevronDownIcon className={`h-4 w-4 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
    </button>
  );
}

function AccordionContent({ className, children, open, setOpen, ...props }: any) {
  return (
    <div
      className={cn(
        "overflow-hidden text-sm transition-all",
        open ? "max-h-96" : "max-h-0",
        className,
      )}
      {...props}
    >
      <div className="pb-4 pt-0">{children}</div>
    </div>
  );
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
