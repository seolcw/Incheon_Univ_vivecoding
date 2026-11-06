import type { ReactNode } from "react";
import { RouteStage } from "@/components/route-stage";

export default function Template({ children }: { children: ReactNode }) {
  return <RouteStage>{children}</RouteStage>;
}
