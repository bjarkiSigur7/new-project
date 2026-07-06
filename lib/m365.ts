// Microsoft 365 SKU reference: Graph `subscribedSkus` skuPartNumber -> human name.
// Source: Microsoft "Product names and service plan identifiers for licensing".
// Unknown part numbers fall back to the raw part number in the UI.

export const SKU_NAMES: Record<string, string> = {
  O365_BUSINESS_ESSENTIALS: "Microsoft 365 Business Basic",
  O365_BUSINESS_PREMIUM: "Microsoft 365 Business Standard",
  SPB: "Microsoft 365 Business Premium",
  O365_BUSINESS: "Microsoft 365 Apps for Business",
  SMB_BUSINESS: "Microsoft 365 Apps for Business",
  OFFICESUBSCRIPTION: "Microsoft 365 Apps for Enterprise",
  STANDARDPACK: "Office 365 E1",
  ENTERPRISEPACK: "Office 365 E3",
  ENTERPRISEPREMIUM: "Office 365 E5",
  ENTERPRISEPREMIUM_NOPSTNCONF: "Office 365 E5 (without Audio Conferencing)",
  SPE_E3: "Microsoft 365 E3",
  SPE_E5: "Microsoft 365 E5",
  SPE_F1: "Microsoft 365 F3",
  DESKLESSPACK: "Office 365 F3",
  EXCHANGESTANDARD: "Exchange Online (Plan 1)",
  EXCHANGEENTERPRISE: "Exchange Online (Plan 2)",
  EXCHANGEDESKLESS: "Exchange Online Kiosk",
  MCOEV: "Microsoft Teams Phone Standard",
  MCOPSTN1: "Teams Calling Plan (Domestic)",
  MCOPSTN2: "Teams Calling Plan (International)",
  MCOMEETADV: "Microsoft 365 Audio Conferencing",
  TEAMS_ESSENTIALS_AAD: "Microsoft Teams Essentials",
  Microsoft_Teams_Rooms_Pro: "Microsoft Teams Rooms Pro",
  AAD_PREMIUM: "Microsoft Entra ID P1",
  AAD_PREMIUM_P2: "Microsoft Entra ID P2",
  ATP_ENTERPRISE: "Microsoft Defender for Office 365 (Plan 1)",
  THREAT_INTELLIGENCE: "Microsoft Defender for Office 365 (Plan 2)",
  ADV_COMMS: "Advanced Communications",
  Microsoft_365_Copilot: "Microsoft 365 Copilot",
  INTUNE_A: "Microsoft Intune Plan 1",
  EMS: "Enterprise Mobility + Security E3",
  EMSPREMIUM: "Enterprise Mobility + Security E5",
  POWER_BI_PRO: "Power BI Pro",
  POWER_BI_STANDARD: "Power BI (free)",
  PROJECT_P1: "Project Plan 1",
  PROJECTPROFESSIONAL: "Project Plan 3",
  PROJECTPREMIUM: "Project Plan 5",
  VISIO_PLAN1_DEPT: "Visio Plan 1",
  VISIOCLIENT: "Visio Plan 2",
  WIN10_PRO_ENT_SUB: "Windows 10/11 Enterprise E3",
  CPC_E_2C_4GB_128GB: "Windows 365 Enterprise 2 vCPU, 4 GB, 128 GB",
  DEFENDER_ENDPOINT_P1: "Microsoft Defender for Endpoint P1",
  MDATP_XPLAT: "Microsoft Defender for Endpoint P2",
  MICROSOFT_BUSINESS_CENTER: "Microsoft Business Center",
  FLOW_FREE: "Power Automate (free)",
  POWERAPPS_VIRAL: "Power Apps (trial)",
  CCIBOTS_PRIVPREV_VIRAL: "Copilot Studio (viral)",
  RIGHTSMANAGEMENT_ADHOC: "Rights Management (ad hoc)",
};

/** Human name for a Graph skuPartNumber, falling back to the raw part number. */
export function skuName(partNumber: string): string {
  return SKU_NAMES[partNumber] ?? partNumber;
}

/**
 * SKUs that are free/viral and never billable to a client.
 * Auto-marked "ignored" in the diff so they don't show as false leaks.
 */
export const NON_BILLABLE_SKUS = new Set([
  "POWER_BI_STANDARD",
  "FLOW_FREE",
  "POWERAPPS_VIRAL",
  "CCIBOTS_PRIVPREV_VIRAL",
  "RIGHTSMANAGEMENT_ADHOC",
  "MICROSOFT_BUSINESS_CENTER",
  "TEAMS_EXPLORATORY",
  "STREAM",
]);

/** True if a Graph tenant id looks like a valid GUID. */
export function isTenantGuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value.trim()
  );
}
