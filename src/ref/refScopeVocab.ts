export type RefScopeVocab = {
  geographies: { id: string; label: string; children?: { id: string; label: string }[] }[];
  industries: { id: string; label: string; children?: { id: string; label: string }[] }[];
  products: { id: string; label: string; children?: { id: string; label: string }[] }[];
  themes: { id: string; label: string }[];
};

export const refScopeVocab: RefScopeVocab = {
  geographies: [
    { id: "GEO-IN", label: "India", children: [
      { id: "GEO-IN-KA", label: "Karnataka" },
      { id: "GEO-IN-TN", label: "Tamil Nadu" },
      { id: "GEO-IN-MH", label: "Maharashtra" },
    ]},
    { id: "GEO-EU", label: "European Union", children: [
      { id: "GEO-EU-DE", label: "Germany" },
      { id: "GEO-EU-FR", label: "France" },
      { id: "GEO-EU-NL", label: "Netherlands" },
    ]},
    { id: "GEO-US", label: "United States" },
  ],
  industries: [
    { id: "IND-AUTO", label: "Automotive", children: [
      { id: "IND-AUTO-T1", label: "Tier-1 suppliers" },
      { id: "IND-AUTO-T2", label: "Tier-2 suppliers" },
      { id: "IND-AUTO-OEM", label: "OEM" },
    ]},
    { id: "IND-STEEL", label: "Steel & Metals" },
    { id: "IND-LOG", label: "Logistics" },
  ],
  products: [
    { id: "PRD-CBAM-GOODS", label: "CBAM Goods", children: [
      { id: "PRD-CBAM-IRON", label: "Iron & steel" },
      { id: "PRD-CBAM-ALU", label: "Aluminium" },
      { id: "PRD-CBAM-CEM", label: "Cement" },
    ]},
    { id: "PRD-AUTO-PARTS", label: "Auto Parts", children: [
      { id: "PRD-AUTO-WH", label: "Wiring harness" },
      { id: "PRD-AUTO-SEAT", label: "Seat assemblies" },
      { id: "PRD-AUTO-PISTON", label: "Pistons" },
    ]},
  ],
  themes: [
    { id: "TH-EMISSIONS", label: "Emissions / GHG" },
    { id: "TH-ENERGY", label: "Energy" },
    { id: "TH-WATER", label: "Water" },
    { id: "TH-WASTE", label: "Waste & Circularity" },
    { id: "TH-HS", label: "Health & Safety" },
  ],
};
