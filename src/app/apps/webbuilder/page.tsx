import WebBuilderClient from "../web-builder/web-builder-client";
import { createDefaultPage } from "@/lib/web-builder/dsl";

export default function WebBuilderAliasPage() {
  const initial = createDefaultPage();
  return <WebBuilderClient initialPage={initial} />;
}
