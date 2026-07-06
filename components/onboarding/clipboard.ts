import { toast } from "sonner";

/** Copy text to the clipboard and toast the result. */
export async function copyText(text: string, successMessage: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(successMessage);
  } catch {
    toast.error("Couldn't access the clipboard — select the text and copy it manually.");
  }
}
