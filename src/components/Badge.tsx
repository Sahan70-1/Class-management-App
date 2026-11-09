import { type ReactNode } from "react";

export function Badge({
  children,
  tone = "neutral",
  dot = false,
}: {
  children: ReactNode;
  tone?: string;
  dot?: boolean;
}) {
  return (
    <span className={"badge " + tone}>
      {dot && <i />}
      {children}
    </span>
  );
}
