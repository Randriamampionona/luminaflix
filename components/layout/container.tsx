import { cn } from "@/lib/utils";

/**
 * UI STANDARD: the single horizontal constraint used by the navbar, every
 * page, the hero content and the footer. Change it here, nowhere else.
 */
export const CONTAINER_CLASS = "mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8";

type ContainerProps<T extends React.ElementType> = {
  as?: T;
  className?: string;
  children: React.ReactNode;
} & Omit<React.ComponentPropsWithoutRef<T>, "as" | "className" | "children">;

export function Container<T extends React.ElementType = "div">({
  as,
  className,
  children,
  ...props
}: ContainerProps<T>) {
  const Component = as ?? "div";
  return (
    <Component className={cn(CONTAINER_CLASS, className)} {...props}>
      {children}
    </Component>
  );
}
