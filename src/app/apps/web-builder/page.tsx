import WebBuilderClient from "./web-builder-client";
import { createDefaultPage } from "@/lib/web-builder/dsl";

export default function WebBuilderPage() {
  const initial = createDefaultPage();
  return <WebBuilderClient initialPage={initial} />;
}
