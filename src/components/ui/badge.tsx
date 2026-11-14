import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap num",
  {
    variants: {
      variant: {
        default: "bg-muted text-foreground",
        outline: "border text-muted-foreground",
        up: "bg-up/12 text-up",
        down: "bg-down/12 text-down",
        flat: "bg-muted text-muted-foreground",
        warning: "bg-primary/15 text-primary",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

function Badge({ className, variant, ...props }: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
