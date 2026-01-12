import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type MobileDialogProps = {
  open: boolean;
  onOpenChange(open: boolean): void;
  children: React.ReactNode;
  className?: string;
};

export function MobileDialog({
  open,
  onOpenChange,
  children,
  className,
}: MobileDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "p-0",
          "h-[100dvh] max-h-[100dvh] w-full",
          "rounded-none",
          "animate-none", // 🚫 critical
          className
        )}
      >
        {children}
      </DialogContent>
    </Dialog>
  );
}
