import { DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { ComponentPropsWithoutRef } from "react";
import { useEffect, useState } from "react";

type MobileFullScreenDialogContentProps = ComponentPropsWithoutRef<
  typeof DialogContent
>;

export function MobileFullScreenDialogContent({
  className,
  style,
  ...props
}: MobileFullScreenDialogContentProps) {
  const [viewportSize, setViewportSize] = useState<{
    height: number;
    width: number;
    offsetTop: number;
    offsetLeft: number;
  } | null>(null);

  useEffect(() => {
    const computeSize = () => {
      if (typeof window === "undefined") return;

      const vv = window.visualViewport;
      const height = vv?.height ?? window.innerHeight;
      const width = vv?.width ?? window.innerWidth;
      const offsetTop = vv?.offsetTop ?? 0;
      const offsetLeft = vv?.offsetLeft ?? 0;
      setViewportSize({ height, width, offsetTop, offsetLeft });
    };

    computeSize();

    const vv = typeof window !== "undefined" ? window.visualViewport : null;
    vv?.addEventListener("resize", computeSize);
    window.addEventListener("resize", computeSize);

    return () => {
      vv?.removeEventListener("resize", computeSize);
      window.removeEventListener("resize", computeSize);
    };
  }, []);

  const sizeStyle = viewportSize
    ? {
        height: `${viewportSize.height}px`,
        maxHeight: `${viewportSize.height}px`,
        width: `${viewportSize.width}px`,
        maxWidth: `${viewportSize.width}px`,
        top: `${viewportSize.offsetTop}px`,
        left: `${viewportSize.offsetLeft}px`,
      }
    : undefined;

  return (
    <DialogContent
      className={cn(
        "p-0",
        "rounded-none",
        "animate-none",
        "left-0 top-0 translate-x-0 translate-y-0 max-w-none",
        className,
      )}
      style={{ ...sizeStyle, ...style }}
      {...props}
    />
  );
}
