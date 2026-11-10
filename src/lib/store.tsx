"use client";

// ---------------------------------------------------------------------------
// Client-side data store. Seeds from the mock dataset in ./data, keeps every
// collection in React state, and persists to localStorage so records created
// through the Add forms survive a refresh. In a real deployment the add*
// helpers would POST to an API instead of mutating local state.
// ---------------------------------------------------------------------------

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  Cattle,
  BreedingRecord,
  BirthRecord,
  Vaccination,
  HealthRecord,
  FeedRecord,
  Pasture,
  SaleTransfer,
  Farmer,
  Farm,
  SemenCatalog,
  SemenOrder,
  SemenCollection,
  Account,
  Transaction,
  SaleAgent,
  SaleIncentive,
  SemenBirth,
  WeightRecord,
  BullRegistration,
  CollarDevice,
  CollarReading,
  MovementRecord,
  HeatDetectionAlert,
  BlockchainRecord,
  DistributionChannel,
  DistributionArea,
  TerritoryManager,
  DistributionZone,
  DistributionTerritory,
  SemenQualityTest,
  SemenBatch,
  SemenBatchQuality,
  SemenStraw,
  NitrogenTank,
  TankCanister,
  StrawStorage,
  Pedigree,
  GenomicRecord,
  BatchStatus,
  StrawStatus,
  TankStatus,
  PedigreeStatus,
  HierarchyLevel,
  HierarchyNode,
  FarmerCattle,
  InseminationEvent,
  PregnancyDiagnosis,
  DistributionPoint,
  DPStrawStock,
  StrawDispatch,
  AgentStrawIssue,
  FarmerCalfBirth,
  IncentiveSettlement,
} from "./types";
import {
  cattle as seedCattle,
  breedingRecords as seedBreeding,
  birthRecords as seedBirths,
  vaccinations as seedVaccinations,
  healthRecords as seedHealth,
  feedRecords as seedFeed,
  pastures as seedPastures,
  salesTransfers as seedSales,
  farmers as seedFarmers,
  farms as seedFarms,
  semenCatalog as seedSemenCatalogBase,
  semenOrders as seedSemenOrders,
  semenCollections as seedSemenCollections,
  ownCollectionCatalog,
  accounts as seedAccounts,
  transactions as seedTransactions,
  saleAgents as seedSaleAgents,
  saleIncentives as seedSaleIncentives,
  semenBirths as seedSemenBirths,
  weightRecords as seedWeightRecords,
  bullRegistrations as seedBullRegistrations,
  collarDevices as seedCollarDevices,
  collarReadings as seedCollarReadings,
  movementRecords as seedMovementRecords,
  heatDetectionAlerts as seedHeatDetectionAlerts,
  blockchainRecords as seedBlockchainRecords,
  distributionChannels as seedDistributionChannels,
  distributionAreas as seedDistributionAreas,
  territoryManagers as seedTerritoryManagers,
  distributionZones as seedDistributionZones,
  distributionTerritories as seedDistributionTerritories,
  semenQualityTests as seedSemenQualityTests,
  semenBatches as seedSemenBatches,
  semenBatchQuality as seedSemenBatchQuality,
  semenStraws as seedSemenStraws,
  nitrogenTanks as seedNitrogenTanks,
  tankCanisters as seedTankCanisters,
  strawStorageLog as seedStrawStorageLog,
  pedigrees as seedPedigrees,
  genomicRecords as seedGenomicRecords,
  hierarchyLevels as seedHierarchyLevels,
  hierarchyNodes as seedHierarchyNodes,
  farmerCattle as seedFarmerCattle,
  inseminationEvents as seedInseminationEvents,
  pregnancyDiagnoses as seedPregnancyDiagnoses,
  distributionPoints as seedDistributionPoints,
  dpStrawStocks as seedDPStrawStocks,
  strawDispatches as seedStrawDispatches,
  agentStrawIssues as seedAgentStrawIssues,
  farmerCalfBirths as seedFarmerCalfBirths,
  incentiveSettlements as seedIncentiveSettlements,
} from "./data";

const STORAGE_KEY = "herdline:data:v2";

interface DataState {
  cattle: Cattle[];
  breedingRecords: BreedingRecord[];
  birthRecords: BirthRecord[];
  vaccinations: Vaccination[];
  healthRecords: HealthRecord[];
  feedRecords: FeedRecord[];
  pastures: Pasture[];
  salesTransfers: SaleTransfer[];
  farmers: Farmer[];
  farms: Farm[];
  semenCatalog: SemenCatalog[];
  semenOrders: SemenOrder[];
  semenCollections: SemenCollection[];
  accounts: Account[];
  transactions: Transaction[];
  saleAgents: SaleAgent[];
  saleIncentives: SaleIncentive[];
  semenBirths: SemenBirth[];
  weightRecords: WeightRecord[];
  bullRegistrations: BullRegistration[];
  collarDevices: CollarDevice[];
  collarReadings: CollarReading[];
  movementRecords: MovementRecord[];
  heatDetectionAlerts: HeatDetectionAlert[];
  blockchainRecords: BlockchainRecord[];
  distributionChannels: DistributionChannel[];
  distributionAreas: DistributionArea[];
  territoryManagers: TerritoryManager[];
  distributionZones: DistributionZone[];
  distributionTerritories: DistributionTerritory[];
  hierarchyLevels: HierarchyLevel[];
  hierarchyNodes: HierarchyNode[];
  semenQualityTests: SemenQualityTest[];
  semenBatches: SemenBatch[];
  semenBatchQuality: SemenBatchQuality[];
  semenStraws: SemenStraw[];
  nitrogenTanks: NitrogenTank[];
  tankCanisters: TankCanister[];
  strawStorageLog: StrawStorage[];
  pedigrees: Pedigree[];
  genomicRecords: GenomicRecord[];
  farmerCattle: FarmerCattle[];
  inseminationEvents: InseminationEvent[];
  pregnancyDiagnoses: PregnancyDiagnosis[];
  distributionPoints: DistributionPoint[];
  dpStrawStocks: DPStrawStock[];
  strawDispatches: StrawDispatch[];
  agentStrawIssues: AgentStrawIssue[];
  farmerCalfBirths: FarmerCalfBirth[];
  incentiveSettlements: IncentiveSettlement[];
}

const seedState: DataState = {
  cattle: seedCattle,
  breedingRecords: seedBreeding,
  birthRecords: seedBirths,
  vaccinations: seedVaccinations,
  healthRecords: seedHealth,
  feedRecords: seedFeed,
  pastures: seedPastures,
  salesTransfers: seedSales,
  farmers: seedFarmers,
  farms: seedFarms,
  semenCatalog: [...seedSemenCatalogBase, ...ownCollectionCatalog],
  semenOrders: seedSemenOrders,
  semenCollections: seedSemenCollections,
  accounts: seedAccounts,
  transactions: seedTransactions,
  saleAgents: seedSaleAgents,
  saleIncentives: seedSaleIncentives,
  semenBirths: seedSemenBirths,
  weightRecords: seedWeightRecords,
  bullRegistrations: seedBullRegistrations,
  collarDevices: seedCollarDevices,
  collarReadings: seedCollarReadings,
  movementRecords: seedMovementRecords,
  heatDetectionAlerts: seedHeatDetectionAlerts,
  blockchainRecords: seedBlockchainRecords,
  distributionChannels: seedDistributionChannels,
  distributionAreas: seedDistributionAreas,
  territoryManagers: seedTerritoryManagers,
  distributionZones: seedDistributionZones,
  distributionTerritories: seedDistributionTerritories,
  hierarchyLevels: seedHierarchyLevels,
  hierarchyNodes: seedHierarchyNodes,
  semenQualityTests: seedSemenQualityTests,
  semenBatches: seedSemenBatches,
  semenBatchQuality: seedSemenBatchQuality,
  semenStraws: seedSemenStraws,
  nitrogenTanks: seedNitrogenTanks,
  tankCanisters: seedTankCanisters,
  strawStorageLog: seedStrawStorageLog,
  pedigrees: seedPedigrees,
  genomicRecords: seedGenomicRecords,
  farmerCattle: seedFarmerCattle,
  inseminationEvents: seedInseminationEvents,
  pregnancyDiagnoses: seedPregnancyDiagnoses,
  distributionPoints: seedDistributionPoints,
  dpStrawStocks: seedDPStrawStocks,
  strawDispatches: seedStrawDispatches,
  agentStrawIssues: seedAgentStrawIssues,
  farmerCalfBirths: seedFarmerCalfBirths,
  incentiveSettlements: seedIncentiveSettlements,
};

// Next sequential id for a prefix from the trailing number of existing ids
// (e.g. "C-3003" -> "C-3004"). `pad` zero-pads short numeric ids ("F-7" -> "F-07").
function nextId(prefix: string, ids: string[], pad = 0): string {
  const max = ids.reduce((m, id) => {
    const match = id.match(/(\d+)\s*$/);
    const n = match ? parseInt(match[1], 10) : 0;
    return n > m ? n : m;
  }, 0);
  const next = String(max + 1);
  return `${prefix}${pad ? next.padStart(pad, "0") : next}`;
}

export interface DataContextValue extends DataState {
  addCattle: (c: Omit<Cattle, "id">) => void;
  addBreeding: (b: Omit<BreedingRecord, "id">) => void;
  addBirth: (b: Omit<BirthRecord, "id">) => void;
  addVaccination: (v: Omit<Vaccination, "id">) => void;
  addHealth: (h: Omit<HealthRecord, "id">) => void;
  addFeed: (f: Omit<FeedRecord, "id">) => void;
  addPasture: (p: Omit<Pasture, "id">) => void;
  addSale: (s: Omit<SaleTransfer, "id">) => void;
  addFarmer: (f: Omit<Farmer, "id">) => void;
  addFarm: (f: Omit<Farm, "id">) => void;
  addSemenCatalog: (c: Omit<SemenCatalog, "id">) => void;
  addSemenOrder: (o: Omit<SemenOrder, "id">) => void;
  addSemenCollection: (c: Omit<SemenCollection, "id">) => void;
  addAccount: (a: Omit<Account, "id">) => void;
  addTransaction: (t: Omit<Transaction, "id">) => void;
  addSaleAgent: (a: Omit<SaleAgent, "id">) => void;
  addSaleIncentive: (i: Omit<SaleIncentive, "id">) => void;
  addSemenBirth: (b: Omit<SemenBirth, "id">) => void;
  addWeightRecord: (w: Omit<WeightRecord, "id">) => void;
  addBullRegistration: (r: Omit<BullRegistration, "id">) => void;
  addCollarDevice: (d: Omit<CollarDevice, "id">) => void;
  addCollarReading: (r: Omit<CollarReading, "id">) => void;
  addMovementRecord: (m: Omit<MovementRecord, "id">) => void;
  addHeatDetectionAlert: (h: Omit<HeatDetectionAlert, "id">) => void;
  addBlockchainRecord: (b: Omit<BlockchainRecord, "id">) => void;
  addDistributionChannel: (c: Omit<DistributionChannel, "id">) => void;
  addDistributionArea: (a: Omit<DistributionArea, "id">) => void;
  addTerritoryManager: (m: Omit<TerritoryManager, "id">) => void;
  addDistributionZone: (z: Omit<DistributionZone, "id">) => void;
  addDistributionTerritory: (t: Omit<DistributionTerritory, "id">) => void;
  addHierarchyLevel: (l: Omit<HierarchyLevel, "id">) => void;
  addHierarchyNode: (n: Omit<HierarchyNode, "id">) => void;
  addSemenQualityTest: (q: Omit<SemenQualityTest, "id">) => void;
  addSemenBatch: (b: Omit<SemenBatch, "id">) => void;
  addSemenBatchQuality: (q: Omit<SemenBatchQuality, "id">) => void;
  addSemenStraw: (s: Omit<SemenStraw, "id">) => void;
  addNitrogenTank: (t: Omit<NitrogenTank, "id">) => void;
  addTankCanister: (c: Omit<TankCanister, "id">) => void;
  addStrawStorageLog: (s: Omit<StrawStorage, "id">) => void;
  addPedigree: (p: Omit<Pedigree, "id">) => void;
  addGenomicRecord: (g: Omit<GenomicRecord, "id">) => void;
  addFarmerCattle: (fc: Omit<FarmerCattle, "id">) => void;
  addInseminationEvent: (ie: Omit<InseminationEvent, "id">) => void;
  addPregnancyDiagnosis: (pd: Omit<PregnancyDiagnosis, "id">) => void;
  addDistributionPoint: (dp: Omit<DistributionPoint, "id">) => void;
  addDPStrawStock: (s: Omit<DPStrawStock, "id">) => void;
  addStrawDispatch: (d: Omit<StrawDispatch, "id">) => void;
  addAgentStrawIssue: (i: Omit<AgentStrawIssue, "id">) => void;
  addFarmerCalfBirth: (b: Omit<FarmerCalfBirth, "id">) => void;
  addIncentiveSettlement: (s: Omit<IncentiveSettlement, "id">) => void;
  /** Atomically creates a BirthRecord + Cattle record for a live birth. */
  addBirthAndCalf: (
    birth: Omit<BirthRecord, "id" | "calfId">,
    calf: Omit<Cattle, "id">,
  ) => string; // returns the generated calfId
  /** Patch a record in any collection by id. */
  update: <K extends keyof DataState>(
    key: K,
    id: string,
    patch: Partial<DataState[K][number]>,
  ) => void;
  /** Delete a record from any collection by id. */
  remove: (key: keyof DataState, id: string) => void;
  /** Resolve a cattle id to a "Name (id)" label, aware of newly added animals. */
  cattleLabel: (id?: string) => string;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DataState>(seedState);
  // Guard so the persist effect doesn't write the seed back over stored data
  // before the hydrate effect has had a chance to load it.
  const hydrated = useRef(false);

  // Hydrate from localStorage after mount (keeps SSR / first render === seed).
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setState({ ...seedState, ...JSON.parse(raw) });
    } catch {
      // ignore malformed storage
    }
    hydrated.current = true;
  }, []);

  // Persist on change (only after hydration).
  useEffect(() => {
    if (!hydrated.current) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // storage full / unavailable — non-fatal
    }
  }, [state]);

  const addCattle = useCallback<DataContextValue["addCattle"]>((c) => {
    setState((s) => ({
      ...s,
      cattle: [
        {
          ...c,
          id: nextId(
            "C-",
            s.cattle.map((x) => x.id),
          ),
        },
        ...s.cattle,
      ],
    }));
  }, []);

  const addBreeding = useCallback<DataContextValue["addBreeding"]>((b) => {
    setState((s) => ({
      ...s,
      breedingRecords: [
        {
          ...b,
          id: nextId(
            "BR-",
            s.breedingRecords.map((x) => x.id),
          ),
        },
        ...s.breedingRecords,
      ],
    }));
  }, []);

  const addBirth = useCallback<DataContextValue["addBirth"]>((b) => {
    setState((s) => ({
      ...s,
      birthRecords: [
        {
          ...b,
          id: nextId(
            "B-",
            s.birthRecords.map((x) => x.id),
          ),
        },
        ...s.birthRecords,
      ],
    }));
  }, []);

  const addVaccination = useCallback<DataContextValue["addVaccination"]>(
    (v) => {
      setState((s) => ({
        ...s,
        vaccinations: [
          {
            ...v,
            id: nextId(
              "V-",
              s.vaccinations.map((x) => x.id),
            ),
          },
          ...s.vaccinations,
        ],
      }));
    },
    [],
  );

  const addHealth = useCallback<DataContextValue["addHealth"]>((h) => {
    setState((s) => ({
      ...s,
      healthRecords: [
        {
          ...h,
          id: nextId(
            "H-",
            s.healthRecords.map((x) => x.id),
          ),
        },
        ...s.healthRecords,
      ],
    }));
  }, []);

  const addFeed = useCallback<DataContextValue["addFeed"]>((f) => {
    setState((s) => ({
      ...s,
      feedRecords: [
        {
          ...f,
          id: nextId(
            "F-",
            s.feedRecords.map((x) => x.id),
            2,
          ),
        },
        ...s.feedRecords,
      ],
    }));
  }, []);

  const addPasture = useCallback<DataContextValue["addPasture"]>((p) => {
    setState((s) => ({
      ...s,
      pastures: [
        ...s.pastures,
        {
          ...p,
          id: nextId(
            "P-",
            s.pastures.map((x) => x.id),
            2,
          ),
        },
      ],
    }));
  }, []);

  const addSale = useCallback<DataContextValue["addSale"]>((sale) => {
    setState((s) => ({
      ...s,
      salesTransfers: [
        {
          ...sale,
          id: nextId(
            "S-",
            s.salesTransfers.map((x) => x.id),
          ),
        },
        ...s.salesTransfers,
      ],
    }));
  }, []);

  const addFarmer = useCallback<DataContextValue["addFarmer"]>((farmer) => {
    setState((s) => ({
      ...s,
      farmers: [
        {
          ...farmer,
          id: nextId(
            "FR-",
            s.farmers.map((x) => x.id),
          ),
        },
        ...s.farmers,
      ],
    }));
  }, []);

  const addFarm = useCallback<DataContextValue["addFarm"]>((farm) => {
    setState((s) => ({
      ...s,
      farms: [
        {
          ...farm,
          id: nextId(
            "FM-",
            s.farms.map((x) => x.id),
          ),
        },
        ...s.farms,
      ],
    }));
  }, []);

  const addSemenCatalog = useCallback<DataContextValue["addSemenCatalog"]>(
    (c) => {
      setState((s) => ({
        ...s,
        semenCatalog: [
          {
            ...c,
            id: nextId(
              "SS-",
              s.semenCatalog.map((x) => x.id),
              3,
            ),
          },
          ...s.semenCatalog,
        ],
      }));
    },
    [],
  );

  const addSemenCollection = useCallback<
    DataContextValue["addSemenCollection"]
  >((c) => {
    setState((s) => ({
      ...s,
      semenCollections: [
        {
          ...c,
          id: nextId(
            "SC-",
            s.semenCollections.map((x) => x.id),
            3,
          ),
        },
        ...s.semenCollections,
      ],
    }));
  }, []);

  const addAccount = useCallback<DataContextValue["addAccount"]>((a) => {
    setState((s) => ({
      ...s,
      accounts: [
        {
          ...a,
          id: nextId(
            "ACC-",
            s.accounts.map((x) => x.id),
            3,
          ),
        },
        ...s.accounts,
      ],
    }));
  }, []);

  const addTransaction = useCallback<DataContextValue["addTransaction"]>((t) => {
    setState((s) => ({
      ...s,
      transactions: [
        {
          ...t,
          id: nextId(
            "TXN-",
            s.transactions.map((x) => x.id),
            3,
          ),
        },
        ...s.transactions,
      ],
    }));
  }, []);

  const addSaleAgent = useCallback<DataContextValue["addSaleAgent"]>((a) => {
    setState((s) => ({
      ...s,
      saleAgents: [
        {
          ...a,
          id: nextId(
            "SA-",
            s.saleAgents.map((x) => x.id),
            3,
          ),
        },
        ...s.saleAgents,
      ],
    }));
  }, []);

  const addSaleIncentive = useCallback<DataContextValue["addSaleIncentive"]>((i) => {
    setState((s) => ({
      ...s,
      saleIncentives: [
        {
          ...i,
          id: nextId(
            "SI-",
            s.saleIncentives.map((x) => x.id),
            3,
          ),
        },
        ...s.saleIncentives,
      ],
    }));
  }, []);

  const addSemenBirth = useCallback<DataContextValue["addSemenBirth"]>((b) => {
    setState((s) => ({
      ...s,
      semenBirths: [
        {
          ...b,
          id: nextId(
            "SB-",
            s.semenBirths.map((x) => x.id),
            3,
          ),
        },
        ...s.semenBirths,
      ],
    }));
  }, []);

  const addWeightRecord = useCallback<DataContextValue["addWeightRecord"]>((w) => {
    setState((s) => ({
      ...s,
      weightRecords: [
        {
          ...w,
          id: nextId("WR-", s.weightRecords.map((x) => x.id), 3),
        },
        ...s.weightRecords,
      ],
    }));
  }, []);

  const addBullRegistration = useCallback<DataContextValue["addBullRegistration"]>((r) => {
    setState((s) => ({
      ...s,
      bullRegistrations: [
        {
          ...r,
          id: nextId("BREG-", s.bullRegistrations.map((x) => x.id), 3),
        },
        ...s.bullRegistrations,
      ],
    }));
  }, []);

  const addDistributionChannel = useCallback<DataContextValue["addDistributionChannel"]>((c) => {
    setState((s) => ({
      ...s,
      distributionChannels: [
        { ...c, id: nextId("DC-", s.distributionChannels.map((x) => x.id), 3) },
        ...s.distributionChannels,
      ],
    }));
  }, []);

  const addDistributionArea = useCallback<DataContextValue["addDistributionArea"]>((a) => {
    setState((s) => ({
      ...s,
      distributionAreas: [
        { ...a, id: nextId("DA-", s.distributionAreas.map((x) => x.id), 3) },
        ...s.distributionAreas,
      ],
    }));
  }, []);

  const addTerritoryManager = useCallback<DataContextValue["addTerritoryManager"]>((m) => {
    setState((s) => ({
      ...s,
      territoryManagers: [
        { ...m, id: nextId("TM-", s.territoryManagers.map((x) => x.id), 3) },
        ...s.territoryManagers,
      ],
    }));
  }, []);

  const addDistributionZone = useCallback<DataContextValue["addDistributionZone"]>((z) => {
    setState((s) => ({
      ...s,
      distributionZones: [
        { ...z, id: nextId("DZ-", s.distributionZones.map((x) => x.id), 3) },
        ...s.distributionZones,
      ],
    }));
  }, []);

  const addDistributionTerritory = useCallback<DataContextValue["addDistributionTerritory"]>((t) => {
    setState((s) => ({
      ...s,
      distributionTerritories: [
        { ...t, id: nextId("DT-", s.distributionTerritories.map((x) => x.id), 3) },
        ...s.distributionTerritories,
      ],
    }));
  }, []);

  const addHierarchyLevel = useCallback<DataContextValue["addHierarchyLevel"]>((l) => {
    setState((s) => ({
      ...s,
      hierarchyLevels: [
        { ...l, id: nextId("LVL-", s.hierarchyLevels.map((x) => x.id), 3) },
        ...s.hierarchyLevels,
      ],
    }));
  }, []);

  const addHierarchyNode = useCallback<DataContextValue["addHierarchyNode"]>((n) => {
    setState((s) => ({
      ...s,
      hierarchyNodes: [
        { ...n, id: nextId("HN-", s.hierarchyNodes.map((x) => x.id), 3) },
        ...s.hierarchyNodes,
      ],
    }));
  }, []);

  const addSemenQualityTest = useCallback<DataContextValue["addSemenQualityTest"]>((q) => {
    setState((s) => ({
      ...s,
      semenQualityTests: [{ ...q, id: nextId("SQT-", s.semenQualityTests.map((x) => x.id), 3) }, ...s.semenQualityTests],
    }));
  }, []);

  const addSemenBatch = useCallback<DataContextValue["addSemenBatch"]>((b) => {
    setState((s) => ({
      ...s,
      semenBatches: [{ ...b, id: nextId("SB-", s.semenBatches.map((x) => x.id), 3) }, ...s.semenBatches],
    }));
  }, []);

  const addSemenBatchQuality = useCallback<DataContextValue["addSemenBatchQuality"]>((q) => {
    setState((s) => ({
      ...s,
      semenBatchQuality: [{ ...q, id: nextId("SBQ-", s.semenBatchQuality.map((x) => x.id), 3) }, ...s.semenBatchQuality],
    }));
  }, []);

  const addSemenStraw = useCallback<DataContextValue["addSemenStraw"]>((s2) => {
    setState((s) => ({
      ...s,
      semenStraws: [{ ...s2, id: nextId("SS-", s.semenStraws.map((x) => x.id), 3) }, ...s.semenStraws],
    }));
  }, []);

  const addNitrogenTank = useCallback<DataContextValue["addNitrogenTank"]>((t) => {
    setState((s) => ({
      ...s,
      nitrogenTanks: [{ ...t, id: nextId("TK-", s.nitrogenTanks.map((x) => x.id), 3) }, ...s.nitrogenTanks],
    }));
  }, []);

  const addTankCanister = useCallback<DataContextValue["addTankCanister"]>((c) => {
    setState((s) => ({
      ...s,
      tankCanisters: [{ ...c, id: nextId("CAN-", s.tankCanisters.map((x) => x.id), 3) }, ...s.tankCanisters],
    }));
  }, []);

  const addStrawStorageLog = useCallback<DataContextValue["addStrawStorageLog"]>((l) => {
    setState((s) => ({
      ...s,
      strawStorageLog: [{ ...l, id: nextId("STS-", s.strawStorageLog.map((x) => x.id), 3) }, ...s.strawStorageLog],
    }));
  }, []);

  const addPedigree = useCallback<DataContextValue["addPedigree"]>((p) => {
    setState((s) => ({
      ...s,
      pedigrees: [{ ...p, id: nextId("PED-", s.pedigrees.map((x) => x.id), 3) }, ...s.pedigrees],
    }));
  }, []);

  const addGenomicRecord = useCallback<DataContextValue["addGenomicRecord"]>((g) => {
    setState((s) => ({
      ...s,
      genomicRecords: [{ ...g, id: nextId("GEN-", s.genomicRecords.map((x) => x.id), 3) }, ...s.genomicRecords],
    }));
  }, []);

  const addFarmerCattle = useCallback<DataContextValue["addFarmerCattle"]>((fc) => {
    setState((s) => ({
      ...s,
      farmerCattle: [{ ...fc, id: nextId("FC-", s.farmerCattle.map((x) => x.id), 3) }, ...s.farmerCattle],
    }));
  }, []);

  const addInseminationEvent = useCallback<DataContextValue["addInseminationEvent"]>((ie) => {
    setState((s) => ({
      ...s,
      inseminationEvents: [{ ...ie, id: nextId("IE-", s.inseminationEvents.map((x) => x.id), 3) }, ...s.inseminationEvents],
    }));
  }, []);

  const addPregnancyDiagnosis = useCallback<DataContextValue["addPregnancyDiagnosis"]>((pd) => {
    setState((s) => ({
      ...s,
      pregnancyDiagnoses: [{ ...pd, id: nextId("PD-", s.pregnancyDiagnoses.map((x) => x.id), 3) }, ...s.pregnancyDiagnoses],
    }));
  }, []);

  const addDistributionPoint = useCallback<DataContextValue["addDistributionPoint"]>((dp) => {
    setState((s) => ({
      ...s,
      distributionPoints: [{ ...dp, id: nextId("DP-", s.distributionPoints.map((x) => x.id), 3) }, ...s.distributionPoints],
    }));
  }, []);

  const addDPStrawStock = useCallback<DataContextValue["addDPStrawStock"]>((st) => {
    setState((s) => ({
      ...s,
      dpStrawStocks: [{ ...st, id: nextId("DPSS-", s.dpStrawStocks.map((x) => x.id), 3) }, ...s.dpStrawStocks],
    }));
  }, []);

  const addStrawDispatch = useCallback<DataContextValue["addStrawDispatch"]>((d) => {
    setState((s) => ({
      ...s,
      strawDispatches: [{ ...d, id: nextId("SD-", s.strawDispatches.map((x) => x.id), 3) }, ...s.strawDispatches],
    }));
  }, []);

  const addAgentStrawIssue = useCallback<DataContextValue["addAgentStrawIssue"]>((i) => {
    setState((s) => ({
      ...s,
      agentStrawIssues: [{ ...i, id: nextId("ASI-", s.agentStrawIssues.map((x) => x.id), 3) }, ...s.agentStrawIssues],
    }));
  }, []);

  const addFarmerCalfBirth = useCallback<DataContextValue["addFarmerCalfBirth"]>((b) => {
    setState((s) => ({
      ...s,
      farmerCalfBirths: [{ ...b, id: nextId("FCB-", s.farmerCalfBirths.map((x) => x.id), 3) }, ...s.farmerCalfBirths],
    }));
  }, []);

  const addIncentiveSettlement = useCallback<DataContextValue["addIncentiveSettlement"]>((st) => {
    setState((s) => ({
      ...s,
      incentiveSettlements: [{ ...st, id: nextId("IS-", s.incentiveSettlements.map((x) => x.id), 3) }, ...s.incentiveSettlements],
    }));
  }, []);

  const addBirthAndCalf = useCallback<DataContextValue["addBirthAndCalf"]>((birthData, calfData) => {
    let assignedCalfId = "";
    setState((s) => {
      const calfId = nextId("C-", s.cattle.map((x) => x.id));
      assignedCalfId = calfId;
      const newCalf: Cattle = { ...calfData, id: calfId };
      const newBirth: BirthRecord = {
        ...birthData,
        id: nextId("B-", s.birthRecords.map((x) => x.id)),
        calfId,
      };
      return {
        ...s,
        cattle: [newCalf, ...s.cattle],
        birthRecords: [newBirth, ...s.birthRecords],
      };
    });
    return assignedCalfId;
  }, []);

  const addMovementRecord = useCallback<DataContextValue["addMovementRecord"]>((m) => {
    setState((s) => ({
      ...s,
      movementRecords: [
        { ...m, id: nextId("MV-", s.movementRecords.map((x) => x.id), 3) },
        ...s.movementRecords,
      ],
    }));
  }, []);

  const addCollarDevice = useCallback<DataContextValue["addCollarDevice"]>((d) => {
    setState((s) => ({
      ...s,
      collarDevices: [
        { ...d, id: nextId("CD-", s.collarDevices.map((x) => x.id), 3) },
        ...s.collarDevices,
      ],
    }));
  }, []);

  const addCollarReading = useCallback<DataContextValue["addCollarReading"]>((r) => {
    setState((s) => ({
      ...s,
      collarReadings: [
        { ...r, id: nextId("CR-", s.collarReadings.map((x) => x.id), 3) },
        ...s.collarReadings,
      ],
    }));
  }, []);

  const addHeatDetectionAlert = useCallback<DataContextValue["addHeatDetectionAlert"]>((h) => {
    setState((s) => ({
      ...s,
      heatDetectionAlerts: [
        { ...h, id: nextId("HD-", s.heatDetectionAlerts.map((x) => x.id), 3) },
        ...s.heatDetectionAlerts,
      ],
    }));
  }, []);

  const addBlockchainRecord = useCallback<DataContextValue["addBlockchainRecord"]>((b) => {
    setState((s) => ({
      ...s,
      blockchainRecords: [
        { ...b, id: nextId("BC-", s.blockchainRecords.map((x) => x.id), 3) },
        ...s.blockchainRecords,
      ],
    }));
  }, []);

  const addSemenOrder = useCallback<DataContextValue["addSemenOrder"]>((o) => {
    setState((s) => ({
      ...s,
      semenOrders: [
        {
          ...o,
          id: nextId(
            "SO-",
            s.semenOrders.map((x) => x.id),
            3,
          ),
        },
        ...s.semenOrders,
      ],
    }));
  }, []);

  const update = useCallback<DataContextValue["update"]>((key, id, patch) => {
    setState((s) => ({
      ...s,
      [key]: (s[key] as { id: string }[]).map((r) =>
        r.id === id ? { ...r, ...patch } : r,
      ),
    }));
  }, []);

  const remove = useCallback<DataContextValue["remove"]>((key, id) => {
    setState((s) => ({
      ...s,
      [key]: (s[key] as { id: string }[]).filter((r) => r.id !== id),
    }));
  }, []);

  const cattleLabel = useCallback(
    (id?: string) => {
      if (!id || id === "—") return "—";
      const c = state.cattle.find((x) => x.id === id);
      return c ? `${c.name} (${c.id})` : id;
    },
    [state.cattle],
  );

  const value = useMemo<DataContextValue>(
    () => ({
      ...state,
      addCattle,
      addBreeding,
      addBirth,
      addVaccination,
      addHealth,
      addFeed,
      addPasture,
      addSale,
      addFarmer,
      addFarm,
      addSemenCatalog,
      addSemenOrder,
      addSemenCollection,
      addAccount,
      addTransaction,
      addSaleAgent,
      addSaleIncentive,
      addSemenBirth,
      addWeightRecord,
      addBullRegistration,
      addCollarDevice,
      addCollarReading,
      addMovementRecord,
      addHeatDetectionAlert,
      addBlockchainRecord,
      addDistributionChannel,
      addDistributionArea,
      addTerritoryManager,
      addDistributionZone,
      addDistributionTerritory,
      addHierarchyLevel,
      addHierarchyNode,
      addSemenQualityTest,
      addSemenBatch,
      addSemenBatchQuality,
      addSemenStraw,
      addNitrogenTank,
      addTankCanister,
      addStrawStorageLog,
      addPedigree,
      addGenomicRecord,
      addFarmerCattle,
      addInseminationEvent,
      addPregnancyDiagnosis,
      addDistributionPoint,
      addDPStrawStock,
      addStrawDispatch,
      addAgentStrawIssue,
      addFarmerCalfBirth,
      addIncentiveSettlement,
      addBirthAndCalf,
      update,
      remove,
      cattleLabel,
    }),
    [
      state,
      addCattle,
      addBreeding,
      addBirth,
      addVaccination,
      addHealth,
      addFeed,
      addPasture,
      addSale,
      addFarmer,
      addFarm,
      addSemenCatalog,
      addSemenOrder,
      addSemenCollection,
      addAccount,
      addTransaction,
      addSaleAgent,
      addSaleIncentive,
      addSemenBirth,
      addWeightRecord,
      addBullRegistration,
      addCollarDevice,
      addCollarReading,
      addMovementRecord,
      addHeatDetectionAlert,
      addBlockchainRecord,
      addDistributionChannel,
      addDistributionArea,
      addTerritoryManager,
      addDistributionZone,
      addDistributionTerritory,
      addHierarchyLevel,
      addHierarchyNode,
      addSemenQualityTest,
      addSemenBatch,
      addSemenBatchQuality,
      addSemenStraw,
      addNitrogenTank,
      addTankCanister,
      addStrawStorageLog,
      addPedigree,
      addGenomicRecord,
      addFarmerCattle,
      addInseminationEvent,
      addPregnancyDiagnosis,
      addDistributionPoint,
      addDPStrawStock,
      addStrawDispatch,
      addAgentStrawIssue,
      addFarmerCalfBirth,
      addIncentiveSettlement,
      addBirthAndCalf,
      update,
      remove,
      cattleLabel,
    ],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within <DataProvider>");
  return ctx;
}
