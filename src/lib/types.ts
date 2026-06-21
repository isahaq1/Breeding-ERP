// Domain types for the Cattle Breeding & Tracking ERP

// Class of an animal. Female-line: Cow, Heifer. Male-line: Bull, Steer
// (castrated). Calf: young animal. A newborn's sex is recorded as its calf
// class — Heifer (female) or Bull (male). Breeding eligibility is derived:
// dams = Cow|Heifer, sires = Bull only.
export type CattleClass = "Cow" | "Bull" | "Heifer" | "Steer" | "Calf";

export type CattleStatus =
  | "Active"
  | "Pregnant"
  | "Lactating"
  | "Dry"
  | "Calf"
  | "Sold"
  | "Deceased";

export type HealthStatus =
  | "Healthy"
  | "Under Treatment"
  | "Quarantine"
  | "Critical";

export interface Cattle {
  id: string; // tag / ear-tag id e.g. "C-1042"
  name: string;
  breed: string;
  class: CattleClass;
  dob: string; // ISO date
  status: CattleStatus;
  health: HealthStatus;
  weightKg: number;
  damId?: string; // mother tag id
  sireId?: string; // father tag id
  pasture: string;
  acquisition: "Born on farm" | "Purchased";
  notes?: string;
}

export type BreedingMethod =
  | "Natural"
  | "Artificial Insemination"
  | "Embryo Transfer";
export type BreedingResult =
  | "Confirmed Pregnant"
  | "Open"
  | "Pending Check"
  | "Aborted";

export interface BreedingRecord {
  id: string;
  damId: string;
  sireId: string;
  method: BreedingMethod;
  serviceDate: string;
  expectedCalving: string;
  result: BreedingResult;
  technician: string;
}

export type CalvingEase = "Easy" | "Assisted" | "Difficult" | "C-Section";

export interface BirthRecord {
  id: string;
  calfId: string;
  damId: string;
  sireId: string;
  birthDate: string;
  class: CattleClass; // calf class at birth: Heifer (female) or Bull (male)
  birthWeightKg: number;
  calvingEase: CalvingEase;
  outcome: "Live" | "Stillborn";
  notes?: string;
}

export interface Vaccination {
  id: string;
  cattleId: string;
  vaccine: string;
  date: string;
  nextDue: string;
  administeredBy: string;
  status: "Completed" | "Due" | "Overdue" | "Scheduled";
}

export type HealthEventType =
  | "Illness"
  | "Injury"
  | "Treatment"
  | "Checkup"
  | "Deworming"
  | "Surgery";

export interface HealthRecord {
  id: string;
  cattleId: string;
  type: HealthEventType;
  diagnosis: string;
  treatment: string;
  date: string;
  vet: string;
  status: "Resolved" | "Ongoing" | "Monitoring";
  costUsd: number;
}

export interface FeedRecord {
  id: string;
  feedType: string;
  category: "Forage" | "Grain" | "Supplement" | "Mineral";
  stockKg: number;
  reorderKg: number;
  dailyUseKg: number;
  costPerKg: number;
  supplier: string;
}

export interface Pasture {
  id: string;
  name: string;
  areaHa: number;
  capacity: number;
  occupancy: number;
  grassQuality: "Excellent" | "Good" | "Fair" | "Poor";
  status: "Grazing" | "Resting" | "Maintenance";
}

export type SaleType = "Sale" | "Purchase" | "Transfer In" | "Transfer Out";

export interface SaleTransfer {
  id: string;
  cattleId: string;
  type: SaleType;
  counterparty: string;
  date: string;
  amountUsd: number;
  status: "Completed" | "Pending" | "Cancelled";
}

// ---- Farmer & Farm Management -----------------------------------------------

export interface GeoLocation {
  latitude: number;
  longitude: number;
  address?: string;
  areaHa?: number; // Total land area in hectares
}

export interface Farmer {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
  farmId: string; // Reference to primary farm
  registrationDate: string;
  idNumber?: string;
  notes?: string;
}

// ---- Breeding Semen Supply --------------------------------------------------

export type SemenStrawType = "0.25ml" | "0.5ml";
export type SemenStatus = "Available" | "Low Stock" | "Out of Stock" | "Expired";
export type SemenOrderStatus =
  | "Pending"
  | "Approved"
  | "Shipped"
  | "Delivered"
  | "Cancelled";
export type PaymentStatus = "Unpaid" | "Partial" | "Paid";

export type SemenSource = "Own Collection" | "Import" | "Purchase";

export interface SemenCatalog {
  id: string;
  bullName: string;
  bullRegNo: string; // NAAB/ICAR code e.g. "7H11234"
  breed: string;
  countryOfOrigin: string;
  collectionDate: string; // ISO date
  expiryDate: string; // ISO date
  supplier: string; // stud farm / AI centre
  supplierCountry: string;

  // Source tracking
  source?: SemenSource; // defaults to "Import" if absent
  ownBullId?: string; // cattle ID when source = "Own Collection"
  collectionId?: string; // SemenCollection.id when source = "Own Collection"
  importPermitNo?: string; // import permit / CITES number
  importCertNo?: string; // export health certificate number
  quarantineStatus?: "Cleared" | "In Quarantine" | "Rejected";

  // Semen quality (ICAR standard)
  progressiveMotilityPct: number; // % (0-100)
  morphologyPct: number; // % normal morphology
  concentrationMPerMl: number; // million/mL
  cellsPerDose: number; // million viable cells per straw
  strawType: SemenStrawType;

  // Genetic merit / EPDs (Expected Progeny Differences) — optional
  milkEpdKg?: number;
  fatEpdKg?: number;
  proteinEpdKg?: number;
  fertilityIndex?: number; // 0–100
  conformationScore?: number; // 0–10

  // Liquid nitrogen storage
  tankId: string;
  canisterId: string;
  gobletId: string;

  initialStraws: number; // total straws received
  pricePerStrawUsd: number;
  status: SemenStatus;
  certifications?: string; // e.g. "IETS approved, OIE health certified"
  notes?: string;
}

// ---- Semen Collection (own-bull harvests) -----------------------------------

export type CollectionMethod =
  | "Artificial Vagina (AV)"
  | "Electroejaculation"
  | "Manual Stimulation";

export type CollectionStatus =
  | "Accepted — Frozen"
  | "Accepted — Chilled"
  | "Rejected — Poor Quality"
  | "Pending QC";

export type QualityGrade = "A" | "B" | "C";

export interface SemenCollection {
  id: string; // SC-001
  bullId: string; // cattle ID (must be Bull class)
  collectionDate: string; // ISO date
  collectionMethod: CollectionMethod;
  technician: string;
  batchNo: string; // e.g. "BTH-2026-001"

  // Raw ejaculate measurements
  rawVolumeMl: number;
  initialMotilityPct: number;
  initialConcentrationMPerMl: number;
  initialMorphologyPct?: number;

  // Post-processing / cryopreservation
  diluentUsed?: string; // e.g. "Tris-egg-yolk", "EggYolk-Citrate"
  extensionRatio?: number; // e.g. 1:4
  progressiveMotilityPct?: number; // post-thaw motility %
  morphologyPct?: number; // post-thaw morphology %
  finalConcentrationMPerMl?: number;

  // Output
  strawsFrozen: number;
  strawType: SemenStrawType;
  qualityGrade?: QualityGrade;
  status: CollectionStatus;

  // Link to catalog entry (if frozen and added to inventory)
  linkedCatalogId?: string;

  notes?: string;
}

export interface SemenOrder {
  id: string;
  farmerId: string;
  farmId: string;
  semenCatalogId: string;
  quantityOrdered: number;
  quantityDelivered?: number;
  orderDate: string; // ISO date
  expectedDelivery: string; // ISO date
  actualDelivery?: string; // ISO date
  status: SemenOrderStatus;
  unitPriceUsd: number; // locked at order time
  totalAmountUsd: number; // quantityOrdered * unitPriceUsd
  paymentStatus: PaymentStatus;
  saleAgentId?: string; // agent who facilitated this sale
  commissionPct?: number; // override agent default (%)
  notes?: string;
}

// ---- Sale Agents & Incentives -----------------------------------------------

export interface SaleAgent {
  id: string; // "SA-001"
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  defaultCommissionPct: number; // e.g. 5 = 5 %
  isActive: boolean;
  registrationDate: string; // ISO date
  notes?: string;
}

export type IncentiveStatus = "Pending" | "Approved" | "Paid";

export interface SaleIncentive {
  id: string; // "SI-001"
  semenOrderId: string;
  agentId: string;
  saleAmount: number; // totalAmountUsd of the linked order
  commissionPct: number;
  commissionAmount: number; // saleAmount * commissionPct / 100
  status: IncentiveStatus;
  paidDate?: string; // ISO date — set when status = "Paid"
  notes?: string;
}

// ---- Semen AI Births --------------------------------------------------------

export type CalfSex = "Heifer" | "Bull" | "Unknown";
export type AIBirthStatus = "Pregnant" | "Open" | "Live Birth" | "Stillbirth";

export interface SemenBirth {
  id: string;             // "SB-001"
  semenOrderId: string;   // which semen order provided the straws
  semenCatalogId: string; // which semen lot (denormalized for stats)
  farmerId: string;
  farmId: string;
  inseminationDate: string; // ISO date
  damTagNo: string;       // farmer's own dam reference (free text tag)
  damBreed?: string;
  birthDate?: string;     // ISO date — set once calf is born
  calfTagNo?: string;     // farmer-assigned calf tag
  calfSex: CalfSex;
  calfWeightKg?: number;
  calvingEase?: CalvingEase;
  status: AIBirthStatus;
  notes?: string;
}

// ---- Financial ERP ----------------------------------------------------------

export type AccountType = "Asset" | "Liability" | "Equity" | "Revenue" | "Expense";

export interface Account {
  id: string; // "ACC-001"
  code: string; // "1001" — chart of accounts code
  name: string;
  type: AccountType;
  currency: string; // "USD"
  openingBalance: number; // positive = Dr balance for Assets/Expenses; positive = Cr balance for others
  isActive: boolean;
  notes?: string;
}

export type TransactionType =
  | "Sale"
  | "Purchase"
  | "Income"
  | "Expense"
  | "Journal Entry"
  | "Opening Balance"
  | "Transfer";

export type TransactionStatus = "Posted" | "Draft" | "Void";

export interface Transaction {
  id: string; // "TXN-001"
  date: string; // ISO date
  reference: string; // invoice / receipt / voucher number
  description: string;
  type: TransactionType;
  category: string; // e.g. "Semen Sales", "Veterinary", "Feed"
  debitAccountId: string;
  creditAccountId: string;
  amount: number; // always positive; direction determined by debit/credit accounts
  currency: string; // "USD"
  linkedEntityType?: "SemenOrder" | "SaleTransfer" | "SemenCollection" | "Cattle";
  linkedEntityId?: string;
  status: TransactionStatus;
  notes?: string;
}

export interface Farm {
  id: string;
  name: string;
  primaryFarmerId: string; // Reference to main farmer
  location: GeoLocation;
  registrationDate: string;
  status: "Active" | "Inactive" | "Under Development";
  totalAreaHa: number;
  herdSize: number;
  facilityType: "Dairy" | "Beef" | "Mixed" | "Breeding";
  certifications?: string; // e.g., "ISO 22000, Organic"
  contactPerson?: string;
  contactPhone?: string;
  notes?: string;
}
