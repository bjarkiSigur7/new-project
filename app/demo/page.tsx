import type { Metadata } from "next";
import { DemoMoneyScreen } from "@/components/demo/demo-money-screen";

export const metadata: Metadata = {
  title: "Live demo — the money screen",
  description:
    "TrueUp's money screen on six fictional MSP clients: live Microsoft 365 seat counts diffed against QuickBooks recurring invoice lines, showing the dollars licensed but never billed.",
};

export default function DemoPage() {
  return <DemoMoneyScreen />;
}
