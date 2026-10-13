import { DispatchSession } from "@/components/dispatcher/Session";
import "./dispatch.css";
export default function DispatcherLayout({ children }: { children: React.ReactNode }) {
  return <DispatchSession>{children}</DispatchSession>;
}
