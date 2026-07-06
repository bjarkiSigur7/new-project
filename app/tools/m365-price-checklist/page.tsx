import type { Metadata } from "next";
import { PriceChecklist } from "@/components/tools/price-checklist";

export const metadata: Metadata = {
  title: "July 2026 M365 repricing checklist",
  description:
    "Free calculator for MSPs and CSP partners: see how Microsoft's July 1, 2026 list-price increase hits your per-seat margin, SKU by SKU, and what to reprice at each NCE renewal.",
};

export default function PriceChecklistPage() {
  return <PriceChecklist />;
}
