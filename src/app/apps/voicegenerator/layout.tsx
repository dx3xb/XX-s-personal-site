import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "VoiceGen",
};

export default function VoiceGeneratorLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <>{children}</>;
}
