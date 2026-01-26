import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";

import { cn } from "@/lib/utils";

function Switch({
  className,
  size = "default",
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root> & {
  size?: "sm" | "default";
}) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      className={cn(
        "peer data-[state=checked]:bg-neutral-900 data-[state=unchecked]:bg-neutral-200 focus-visible:border-neutral-950 focus-visible:ring-neutral-950/50 dark:data-[state=unchecked]:bg-neutral-200/80 group/switch inline-flex shrink-0 items-center rounded-full border border-neutral-200 border-transparent shadow-xs transition-all outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 data-[size=default]:h-[1.15rem] data-[size=default]:w-8 data-[size=sm]:h-3.5 data-[size=sm]:w-6 dark:data-[state=checked]:bg-neutral-50 dark:data-[state=unchecked]:bg-neutral-800 dark:focus-visible:border-neutral-300 dark:focus-visible:ring-neutral-300/50 dark:dark:data-[state=unchecked]:bg-neutral-800/80 dark:border-neutral-800 cursor-pointer",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "bg-white dark:data-[state=unchecked]:bg-neutral-950 dark:data-[state=checked]:bg-neutral-50 pointer-events-none block rounded-full ring-0 transition-transform group-data-[size=default]/switch:size-4 group-data-[size=sm]/switch:size-3 data-[state=checked]:translate-x-[calc(100%-2px)] data-[state=unchecked]:translate-x-0 dark:bg-neutral-950 dark:dark:data-[state=unchecked]:bg-neutral-50 dark:dark:data-[state=checked]:bg-neutral-900",
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
