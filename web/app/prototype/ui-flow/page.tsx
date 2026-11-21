import { notFound } from "next/navigation";
import FlowPrototype from "./prototype";

// Throwaway design workspace: three navigation structures, no API mutations.
// Kept off main; the chosen flow must be implemented and tested separately.
export default function Page() {
  if (process.env.NODE_ENV === "production") notFound();
  return <FlowPrototype />;
}
