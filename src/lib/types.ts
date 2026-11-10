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
  farmId?: string;
  rfidTag?: string;   // ISO 11784 EID, e.g. "716000100101001"
  gpsLat?: number;    // WGS-84 latitude
  gpsLng?: number;    // WGS-84 longitude
  acquisition: "Born on farm" | "Purchased";
  notes?: string;
}

// ---- Weight Tracking ---------------------------------------------------------

export interface WeightRecord {
  id: string;          // "WR-001"
  cattleId: string;
  date: string;        // ISO date
  weightKg: number;
  recordedBy: string;
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
  channelId?: string;   // distribution channel that handled this order
  areaId?: string;      // distribution area that served this order
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

// ---- Muzzle Print Biometrics ------------------------------------------------

export type MuzzlePrintQuality = "High" | "Medium" | "Low";
export type MuzzlePrintMethod = "Digital Scanner" | "Camera Scan" | "Ink Pad";

export interface MuzzlePrint {
  id: string;             // "MP-001"
  cattleId: string;
  printHash: string;      // unique biometric hash e.g. "7F3A-2B8E"
  capturedDate: string;   // ISO date
  quality: MuzzlePrintQuality;
  method: MuzzlePrintMethod;
  capturedBy: string;
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

// ---- IoT Smart Collar -------------------------------------------------------

export type CollarDeviceStatus = "Active" | "Inactive" | "Lost" | "Maintenance";

export interface CollarDevice {
  id: string;             // "CD-001"
  serialNumber: string;   // manufacturer device serial
  brand: string;
  model?: string;
  cattleId?: string;      // assigned animal; undefined = unassigned
  assignedDate?: string;  // ISO date
  status: CollarDeviceStatus;
  notes?: string;
}

export interface CollarReading {
  id: string;                  // "CR-001"
  collarId?: string;            // FK to CollarDevice.id
  cattleId: string;
  temperature: number;         // body temperature °C (normal 38.0–39.5)
  activityIndex: number;       // 0-100 movement intensity
  batteryPct: number;
  heartRate?: number;          // bpm
  ruminationMinPh?: number;    // rumination minutes per hour
  gpsLat?: number;
  gpsLng?: number;
  lastSync: string;            // ISO datetime
  isOnline: boolean;
}

// ---- Animal Movement History ------------------------------------------------

export type MovementEventType =
  | "Farm Transfer"
  | "Pasture Move"
  | "Sale Transfer"
  | "Quarantine Entry"
  | "Quarantine Release"
  | "Vet Visit"
  | "AI Visit"
  | "GPS Ping";

export interface MovementRecord {
  id: string;                  // "MV-001"
  cattleId: string;
  timestamp: string;           // ISO datetime
  eventType: MovementEventType;
  fromLocation: string;
  toLocation: string;
  lat?: number;
  lng?: number;
  recordedBy: string;
  notes?: string;
}

// ---- Heat Detection Alerts --------------------------------------------------

export type HeatDetectionSource =
  | "IoT Collar"
  | "Pedometer"
  | "Visual Observation"
  | "Manual Entry";

export type HeatAlertStatus =
  | "Active"
  | "Confirmed"
  | "Bred"
  | "False Alarm"
  | "Dismissed";

export interface HeatDetectionAlert {
  id: string;                  // "HD-001"
  cattleId: string;
  detectedAt: string;          // ISO datetime
  confidence: number;          // 0-100
  source: HeatDetectionSource;
  activitySpike?: number;      // % above 24h baseline
  temperature?: number;        // body temp at detection
  status: HeatAlertStatus;
  breedingRecordId?: string;
  notes?: string;
}

// ---- Blockchain Pedigree Registry -------------------------------------------

export type BlockchainEntityType =
  | "Pedigree Certificate"
  | "Health Record"
  | "Ownership Transfer"
  | "Bull Registration"
  | "Vaccination Record";

export type BlockchainNetwork = "AgriChain" | "LivestockLedger" | "HerdChain";

export interface BlockchainRecord {
  id: string;                  // "BC-001"
  entityType: BlockchainEntityType;
  entityId: string;            // cattle.id / bullRegistration.id / etc.
  blockNumber: number;
  blockHash: string;           // e.g. "0x7f3a2b8e..."
  previousHash: string;
  dataHash: string;            // SHA-256 of data payload
  timestamp: string;           // ISO datetime of block creation
  network: BlockchainNetwork;
  txId: string;                // transaction ID on chain
  verifiedAt?: string;         // last verification datetime
  isVerified: boolean;
}

// ---- Distribution Channels & Areas ------------------------------------------

export type ChannelType =
  | "Agent Network"
  | "Direct Sales"
  | "Cooperative"
  | "Online"
  | "Franchise";

export interface DistributionChannel {
  id: string;              // "DC-001"
  name: string;
  code: string;            // short code e.g. "NRN"
  type: ChannelType;
  status: "Active" | "Inactive";
  description?: string;
  createdDate: string;     // ISO date
  nsmId?: string;          // FK → TerritoryManager (NSM)
}

export interface DistributionArea {
  id: string;              // "DA-001"
  channelId: string;       // FK → DistributionChannel
  zoneId?: string;         // FK → DistributionZone
  name: string;
  code: string;            // short area code
  lat: number;             // WGS-84 center latitude
  lng: number;             // WGS-84 center longitude
  radiusKm: number;        // coverage radius in km
  address?: string;        // human-readable address
  province?: string;
  district?: string;
  asmId?: string;          // FK → TerritoryManager (ASM)
  agentIds: string[];      // legacy: SaleAgent ids (use territories for new assignments)
  status: "Active" | "Inactive";
  notes?: string;
}

// ---- Territory Management Hierarchy -----------------------------------------

export type TerritoryRole = string;   // e.g. "NSM" | "RSM" | "ASM" | "TSM" — dynamic, not fixed

export interface TerritoryManager {
  id: string;              // "TM-001"
  name: string;
  role: TerritoryRole;
  phone: string;
  email?: string;
  isActive: boolean;
  joinDate: string;        // ISO date
  notes?: string;
}

export interface DistributionZone {
  id: string;              // "DZ-001"
  channelId: string;       // FK → DistributionChannel
  name: string;            // "Northern Zone"
  code: string;            // "NZ"
  rsmId?: string;          // FK → TerritoryManager (RSM)
  provinces: string[];     // Zimbabwe provinces covered
  status: "Active" | "Inactive";
  notes?: string;
}

export interface DistributionTerritory {
  id: string;              // "DT-001"
  channelId: string;       // FK → DistributionChannel
  zoneId: string;          // FK → DistributionZone
  areaId: string;          // FK → DistributionArea
  name: string;            // "Harare Urban Beat"
  code: string;            // "HUB"
  tsmId?: string;          // FK → TerritoryManager (TSM)
  agentIds: string[];      // FK → SaleAgent[] (field agents)
  lat: number;
  lng: number;
  radiusKm: number;
  beat?: string;           // named route e.g. "Beat A"
  district?: string;
  status: "Active" | "Inactive";
  notes?: string;
}

// ---- Dynamic Hierarchy -------------------------------------------------------

export type HierarchyColor =
  | "blue" | "green" | "purple" | "amber" | "red" | "cyan" | "teal" | "rose" | "gray";

export interface HierarchyLevel {
  id: string;            // "LVL-001"
  name: string;          // "Channel", "Region", "Zone", "Area", "Territory", "Beat"
  rank: number;          // 1 = top of tree, 2, 3, 4 ... lower = deeper
  managerTitle: string;  // "NSM", "RSM", "ASM", "TSM", or any custom title
  color: HierarchyColor;
  isActive: boolean;
}

export interface HierarchyNode {
  id: string;            // "HN-001"
  levelId: string;       // FK → HierarchyLevel
  parentId?: string;     // FK → HierarchyNode (undefined = root)
  name: string;
  code: string;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  managerId?: string;    // FK → TerritoryManager
  agentIds: string[];    // FK → SaleAgent[]
  provinces?: string[];
  district?: string;
  beat?: string;
  address?: string;
  status: "Active" | "Inactive";
  notes?: string;
}

// ---- Government Bull Registration -------------------------------------------

export type BullRegistrationStatus = "Active" | "Expired" | "Pending" | "Rejected";
export type BSEGrade = "Satisfactory" | "Unsatisfactory" | "Deferred" | "Not Tested";
export type QuarantineStatus = "Not Required" | "In Quarantine" | "Cleared" | "Failed";

export interface BullRegistration {
  id: string;                       // "BREG-001"
  bullId: string;                   // cattle.id (class="Bull")
  regNo: string;                    // official government registration number
  authority: string;                // registering body, e.g. "Dept. of Livestock"
  country: string;                  // country of registration
  issueDate: string;                // ISO date
  expiryDate: string;               // ISO date
  certificateNo?: string;           // document certificate number
  status: BullRegistrationStatus;

  // Breeding Soundness Evaluation (BSE)
  bseGrade?: BSEGrade;
  bseDate?: string;
  bseTechnician?: string;

  // Disease clearances
  brucellosisClear: boolean;
  tbClear: boolean;                 // Tuberculosis
  viralDiseasesClear: boolean;      // IBR, BVD, EBL, etc.
  clearanceDate?: string;           // date all clearances were issued

  // Import tracking
  isImported: boolean;
  importPermitNo?: string;
  countryOfOrigin?: string;
  quarantineStatus?: QuarantineStatus;
  quarantineClearanceDate?: string;

  notes?: string;
}

// ---- Semen Laboratory Analysis -----------------------------------------------

export interface SemenQualityTest {
  id: string;                       // "SQT-001"
  collectionId: string;             // FK → SemenCollection
  bullId: string;                   // FK → Cattle (Bull)
  testDate: string;                 // ISO date
  testedBy: string;
  totalMotilityPct: number;         // 0-100
  progressiveMotilityPct: number;   // 0-100
  morphologyNormalPct: number;      // % normal morphology
  concentrationMPerMl: number;      // million/mL
  viabilityPct: number;             // % live sperm
  volumeMl: number;
  pH: number;
  colorAppearance: "Creamy White" | "White" | "Yellowish" | "Pink" | "Other";
  acrosomalIntegrityPct?: number;
  dnaFragmentationPct?: number;
  result: "Pass" | "Fail" | "Marginal";
  notes?: string;
}

// ---- Semen Processing -------------------------------------------------------

export type BatchStatus = "Processing" | "Frozen" | "Quarantine" | "Released" | "Destroyed";

export interface SemenBatch {
  id: string;                   // "SB-001"
  collectionId: string;         // FK → SemenCollection
  bullId: string;
  batchNo: string;              // e.g. "BTH-2026-001"
  processingDate: string;       // ISO date
  processor: string;
  diluentUsed: string;          // e.g. "Tris-egg-yolk"
  extensionRatio: string;       // e.g. "1:4"
  glycerolPct: number;
  equilibrationTimeMin: number;
  packagingType: "0.25ml" | "0.5ml";
  totalStrawsFilled: number;
  strawsAccepted: number;
  strawsRejected: number;
  status: BatchStatus;
  releaseDate?: string;
  notes?: string;
}

export interface SemenBatchQuality {
  id: string;                       // "SBQ-001"
  batchId: string;                  // FK → SemenBatch
  testDate: string;
  testedBy: string;
  postThawMotilityPct: number;
  postThawProgressivePct: number;
  postThawMorphologyPct: number;
  thawProtocol: string;             // e.g. "37°C water bath, 30s"
  result: "Approved" | "Rejected" | "Conditional";
  notes?: string;
}

// ---- Straw Production -------------------------------------------------------

export type StrawStatus = "In Stock" | "Dispatched" | "Used" | "Destroyed" | "Quarantined";

export interface SemenStraw {
  id: string;              // "SS-001"
  batchId: string;         // FK → SemenBatch
  bullId: string;
  catalogId?: string;      // FK → SemenCatalog
  serialNumber: string;    // e.g. "TK01-CA1-0042"
  strawType: "0.25ml" | "0.5ml";
  colorCode: string;
  doseMillion: number;
  tankId: string;          // FK → NitrogenTank
  canisterId: string;      // FK → TankCanister
  gobletPosition: string;  // e.g. "G3-R2"
  storedDate: string;      // ISO date
  expiryDate?: string;
  status: StrawStatus;
  dispatchedOn?: string;
  orderId?: string;        // FK → SemenOrder if dispatched
  notes?: string;
}

// ---- Cryogenic Storage ------------------------------------------------------

export type TankStatus = "Active" | "Maintenance" | "Retired";

export interface NitrogenTank {
  id: string;               // "TK-001"
  name: string;             // "Tank Alpha"
  serialNumber: string;
  manufacturer: string;
  model: string;
  capacityLiters: number;
  location: string;
  purchaseDate: string;     // ISO date
  lastRefillDate: string;   // ISO date
  nextRefillDue: string;    // ISO date
  nitrogenLevelPct: number; // 0-100
  temperatureC: number;     // e.g. -196
  status: TankStatus;
  canisterSlots: number;
  notes?: string;
}

export interface TankCanister {
  id: string;              // "CAN-001"
  tankId: string;          // FK → NitrogenTank
  code: string;            // "CAN-A1"
  color: string;
  gobletCapacity: number;
  bullId?: string;         // dedicated bull (optional)
  description: string;
  currentStrawCount: number;
  status: "Active" | "Empty" | "Sealed";
}

export interface StrawStorage {
  id: string;              // "STS-001"
  strawId: string;         // FK → SemenStraw
  tankId: string;
  canisterId: string;
  gobletPosition: string;
  storedDate: string;      // ISO date
  storedBy: string;
  movedFrom?: string;
  reason?: string;
}

// ---- Pedigree & Genomic Records ---------------------------------------------

export type PedigreeStatus = "Registered" | "Pending" | "Rejected" | "Lapsed";

export interface Pedigree {
  id: string;                              // "PED-001"
  cattleId: string;
  sireId: string;
  damId: string;
  paternalGrandsireId?: string;
  paternalGrandamId?: string;
  maternalGrandsireId?: string;
  maternalGrandamId?: string;
  breedComposition: Record<string, number>; // { "Holstein": 62.5, "Friesian": 37.5 }
  registrationNo: string;
  registrationBody: string;
  issueDate: string;
  expiryDate?: string;
  isVerified: boolean;
  blockchainTxId?: string;
  status: PedigreeStatus;
  notes?: string;
}

export interface GenomicRecord {
  id: string;                              // "GEN-001"
  cattleId: string;
  testDate: string;
  laboratory: string;
  snpPanel: string;                        // "LD 7K" / "HD 777K"
  dnaSource: "Blood" | "Hair follicle" | "Tissue" | "Semen";
  parentageVerified: boolean;
  breedComposition: Record<string, number>;
  milkEpd?: number;
  fatEpd?: number;
  proteinEpd?: number;
  fertilityIndex?: number;
  conformationScore?: number;
  inbreedingCoefficient?: number;
  geneticMeritIndex?: number;
  certificateNo?: string;
  status: "Completed" | "Pending" | "Failed";
  notes?: string;
}

// ---- Farmer Cattle (third-party farm animals registered for AI) --------------

export interface FarmerCattle {
  id: string;                       // "FC-001"
  farmerId: string;                 // FK → Farmer
  farmId: string;                   // FK → Farm
  tagNumber: string;                // farmer's ear tag or RFID number
  name?: string;
  breed: string;
  sex: "Female" | "Male";
  dateOfBirth?: string;             // ISO date
  color?: string;
  weightKg?: number;
  lactationStatus?: "Dry" | "Lactating" | "Pregnant" | "Open";
  registeredDate: string;           // ISO date — when registered with the AI centre
  registeredByAgentId?: string;     // FK → SaleAgent
  rfidTag?: string;
  qrCode?: string;
  isActive: boolean;
  notes?: string;
}

// ---- Insemination Event (AI Service) ----------------------------------------

export type InseminationResult =
  | "Pending PD"
  | "Pregnant"
  | "Open"
  | "Repeat Service"
  | "Aborted";

export type ServiceMethod = "Cervical" | "Trans-Cervical" | "Recto-vaginal";

export interface InseminationEvent {
  id: string;                       // "IE-001"
  inseminationDate: string;         // ISO date
  inseminationTime?: string;        // "08:30"
  farmerCattleId: string;           // FK → FarmerCattle
  farmId: string;                   // FK → Farm
  farmerId: string;                 // FK → Farmer
  agentId: string;                  // FK → SaleAgent (AI technician)
  semenCatalogId: string;           // FK → SemenCatalog
  batchId?: string;                 // FK → SemenBatch
  strawId?: string;                 // FK → SemenStraw
  heatAlertId?: string;             // FK → HeatDetectionAlert
  dpId?: string;                    // FK → DistributionPoint (straw source)
  agentStrawIssueId?: string;       // FK → AgentStrawIssue
  serviceMethod: ServiceMethod;
  heatConfirmedBy: "IoT" | "Visual" | "Manual";
  serviceFeeUsd: number;
  paymentStatus: PaymentStatus;
  result: InseminationResult;
  pdScheduledDate?: string;         // auto: inseminationDate + 30 days
  notes?: string;
  lat?: number;
  lng?: number;
}

// ---- Pregnancy Diagnosis (PD) -----------------------------------------------

export type PDMethod =
  | "Rectal Palpation"
  | "Ultrasound"
  | "Blood Test"
  | "Milk Progesterone"
  | "Visual";

export type PDResult = "Pregnant" | "Open" | "Twins" | "Aborted" | "Uncertain";

export interface PregnancyDiagnosis {
  id: string;                       // "PD-001"
  inseminationEventId: string;      // FK → InseminationEvent
  farmerCattleId: string;           // FK → FarmerCattle
  farmId: string;
  diagnosisDate: string;
  daysAfterService: number;
  method: PDMethod;
  result: PDResult;
  conductedBy: string;
  agentId?: string;                 // FK → SaleAgent
  estimatedCalvingDate?: string;
  repeatServiceScheduled?: boolean;
  repeatServiceDate?: string;
  notes?: string;
}

// ---- Distribution Point (DP) ------------------------------------------------

export type DPStatus = "Active" | "Inactive" | "Maintenance";

export interface DistributionPoint {
  id: string;                       // "DP-001"
  name: string;
  code: string;
  hierarchyNodeId?: string;         // FK → HierarchyNode
  managerId?: string;               // FK → TerritoryManager
  address: string;
  district: string;
  lat?: number;
  lng?: number;
  phone?: string;
  contactPerson: string;
  nitrogenCapacityLiters: number;
  currentNitrogenLiters: number;
  maxStrawCapacity: number;
  currentStrawCount: number;
  status: DPStatus;
  lastNitrogenRefill?: string;
  nextRefillDue?: string;
  notes?: string;
}

export interface DPStrawStock {
  id: string;                       // "DPSS-001"
  dpId: string;                     // FK → DistributionPoint
  semenCatalogId: string;           // FK → SemenCatalog
  batchId?: string;
  quantityReceived: number;
  quantityOnHand: number;
  quantityIssued: number;
  lastReceivedDate: string;
  notes?: string;
}

// ---- Straw Dispatch ---------------------------------------------------------

export type DispatchStatus = "Pending" | "In Transit" | "Received" | "Partial" | "Rejected";

export interface StrawDispatch {
  id: string;                       // "SD-001"
  dispatchDate: string;
  fromType: "MainStore" | "DP";
  fromDpId?: string;
  toDpId?: string;
  toAgentId?: string;
  semenCatalogId: string;
  batchId?: string;
  quantityDispatched: number;
  quantityReceived?: number;
  status: DispatchStatus;
  dispatchedBy: string;
  receivedBy?: string;
  dispatchedAt: string;
  receivedAt?: string;
  notes?: string;
}

// ---- Agent Straw Issue (Flask / Field Inventory) ----------------------------

export interface AgentStrawIssue {
  id: string;                       // "ASI-001"
  issueDate: string;
  dpId: string;                     // FK → DistributionPoint
  agentId: string;                  // FK → SaleAgent
  semenCatalogId: string;
  batchId?: string;
  quantityIssued: number;
  quantityUsed: number;
  quantityReturned: number;
  quantityWasted: number;
  status: "Open" | "Closed";
  closedDate?: string;
  notes?: string;
}

// ---- Farmer Calf Birth (AI birth at third-party farm) -----------------------

export type FarmerCalfOutcome =
  | "Live Birth"
  | "Stillbirth"
  | "Died Shortly After"
  | "Aborted";

export interface FarmerCalfBirth {
  id: string;                       // "FCB-001"
  birthDate: string;
  farmerCattleId: string;           // FK → FarmerCattle (dam)
  inseminationEventId?: string;     // FK → InseminationEvent
  farmerId: string;
  farmId: string;
  semenCatalogId?: string;          // FK → SemenCatalog (sire bull)
  agentId?: string;                 // AI tech who performed service
  calfTagNumber?: string;
  calfSex: "Male" | "Female";
  calfBreed?: string;
  calfWeightKg?: number;
  calfName?: string;
  outcome: FarmerCalfOutcome;
  calvingEase?: CalvingEase;
  reportedByFarmer: boolean;
  reportedByAgent: boolean;
  blockchainTxHash?: string;
  notes?: string;
}

// ---- Incentive Settlement ---------------------------------------------------

export type SettlementStatus = "Draft" | "Approved" | "Paid" | "Disputed";

export interface IncentiveSettlement {
  id: string;                       // "IS-001"
  agentId: string;
  periodStart: string;
  periodEnd: string;
  incentiveIds: string[];           // FK → SaleIncentive[]
  totalEarnedUsd: number;
  totalDeductionsUsd: number;
  netPayableUsd: number;
  status: SettlementStatus;
  approvedBy?: string;
  approvedDate?: string;
  paidDate?: string;
  paymentReference?: string;
  notes?: string;
}
