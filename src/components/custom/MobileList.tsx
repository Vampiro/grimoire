import { cn } from "@/lib/utils";

export function MobileList({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn("flex-1 overflow-y-auto", "overscroll-contain", className)}
    >
      {children}
    </div>
  );
}
