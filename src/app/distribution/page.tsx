"use client";

import { useMemo, useState, useCallback } from "react";
import {
  PageHeader, StatCard, Card, CardHeader, Badge, PrimaryButton,
  Table, Th, Td, EmptyRow,
} from "@/components/ui";
import { Icon } from "@/components/icons";
import {
  Modal, FormGrid, FormButtons, TextField, SelectField,
  TextAreaField, NumberField, DateField,
} from "@/components/forms";
import { useData } from "@/lib/store";
import type { HierarchyLevel, HierarchyNode, TerritoryManager, HierarchyColor } from "@/lib/types";
import { formatDate } from "@/lib/format";

// ── nextId mirror (matches store's logic) ─────────────────────────────────────
function computeNextId(prefix: string, existingIds: string[]): string {
  const max = existingIds.reduce((m, id) => {
    const match = id.match(/(\d+)\s*$/);
    const n = match ? parseInt(match[1], 10) : 0;
    return n > m ? n : m;
  }, 0);
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}

// ── Colour system ─────────────────────────────────────────────────────────────
type CC = { bg:string; text:string; codeBg:string; codeText:string; dot:string; rowBg:string; border:string; tone:"blue"|"green"|"purple"|"amber"|"red"|"gray"; hex:string };
const COLOR_MAP: Record<HierarchyColor, CC> = {
  blue:   { bg:"bg-blue-50",   text:"text-blue-900",   codeBg:"bg-blue-600",   codeText:"text-white", dot:"bg-blue-500",   rowBg:"bg-blue-50/60",   border:"border-blue-400",   tone:"blue",   hex:"#3b82f6" },
  green:  { bg:"bg-green-50",  text:"text-green-900",  codeBg:"bg-green-600",  codeText:"text-white", dot:"bg-green-500",  rowBg:"bg-green-50/60",  border:"border-green-400",  tone:"green",  hex:"#22c55e" },
  purple: { bg:"bg-purple-50", text:"text-purple-900", codeBg:"bg-purple-600", codeText:"text-white", dot:"bg-purple-500", rowBg:"bg-purple-50/40", border:"border-purple-400", tone:"purple", hex:"#a855f7" },
  amber:  { bg:"bg-amber-50",  text:"text-amber-900",  codeBg:"bg-amber-500",  codeText:"text-white", dot:"bg-amber-500",  rowBg:"bg-amber-50/30",  border:"border-amber-400",  tone:"amber",  hex:"#f59e0b" },
  red:    { bg:"bg-red-50",    text:"text-red-900",    codeBg:"bg-red-600",    codeText:"text-white", dot:"bg-red-500",    rowBg:"bg-red-50/30",    border:"border-red-400",    tone:"red",    hex:"#ef4444" },
  cyan:   { bg:"bg-cyan-50",   text:"text-cyan-900",   codeBg:"bg-cyan-600",   codeText:"text-white", dot:"bg-cyan-500",   rowBg:"bg-cyan-50/30",   border:"border-cyan-400",   tone:"blue",   hex:"#06b6d4" },
  teal:   { bg:"bg-teal-50",   text:"text-teal-900",   codeBg:"bg-teal-600",   codeText:"text-white", dot:"bg-teal-500",   rowBg:"bg-teal-50/30",   border:"border-teal-400",   tone:"green",  hex:"#14b8a6" },
  rose:   { bg:"bg-rose-50",   text:"text-rose-900",   codeBg:"bg-rose-600",   codeText:"text-white", dot:"bg-rose-500",   rowBg:"bg-rose-50/30",   border:"border-rose-400",   tone:"red",    hex:"#f43f5e" },
  gray:   { bg:"bg-gray-50",   text:"text-gray-900",   codeBg:"bg-gray-500",   codeText:"text-white", dot:"bg-gray-400",   rowBg:"bg-gray-50/30",   border:"border-gray-300",   tone:"gray",   hex:"#9ca3af" },
};
const COLORS: HierarchyColor[] = ["blue","green","purple","amber","red","cyan","teal","rose","gray"];
const PROVINCES = ["Harare","Bulawayo","Manicaland","Mashonaland Central","Mashonaland East","Mashonaland West","Matabeleland North","Matabeleland South","Midlands","Masvingo"];

// ── Google Maps components ────────────────────────────────────────────────────
function GoogleMapEmbed({ lat, lng, zoom = 14 }: { lat: number; lng: number; zoom?: number }) {
  const src = `https://maps.google.com/maps?q=${lat},${lng}&z=${zoom}&output=embed`;
  return (
    <iframe
      src={src}
      className="w-full h-full border-0 rounded-xl"
      allowFullScreen
      loading="lazy"
      title={`Map: ${lat.toFixed(4)}, ${lng.toFixed(4)}`}
    />
  );
}
function mapsUrl(lat: number, lng: number, zoom = 15) {
  return `https://www.google.com/maps/@${lat},${lng},${zoom}z`;
}

// ── SVG mini-map (overview) ───────────────────────────────────────────────────
const MAP_W = 260, MAP_H = 195;
const MINLNG=25.5,MAXLNG=33.0,MINLAT=-22.5,MAXLAT=-15.5;
function ll2xy(lat:number,lng:number):[number,number]{return[((lng-MINLNG)/(MAXLNG-MINLNG))*MAP_W,((MAXLAT-lat)/(MAXLAT-MINLAT))*MAP_H];}
const ZIM_BORDER="38,2 135,12 260,27 260,67 260,118 225,190 104,193 0,168 0,79 16,40";
const CITIES=[{n:"Harare",lat:-17.83,lng:31.05},{n:"Bulawayo",lat:-20.15,lng:28.58},{n:"Mutare",lat:-18.97,lng:32.67},{n:"Gweru",lat:-19.45,lng:29.82},{n:"Masvingo",lat:-20.07,lng:30.83}];
function SvgMap({pins=[],selected,onSelect}:{pins:{id:string;lat:number;lng:number;color:string;label:string}[];selected?:string;onSelect?:(id:string)=>void;}){
  return(
    <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} className="w-full rounded-xl">
      <rect width={MAP_W} height={MAP_H} fill="#e0f2fe" rx="8"/>
      <polygon points={ZIM_BORDER} fill="#dcfce7" stroke="#16a34a" strokeWidth="0.8"/>
      {pins.map(p=>{const[cx,cy]=ll2xy(p.lat,p.lng);const isSel=p.id===selected;return(
        <g key={p.id} onClick={()=>onSelect?.(p.id)} className={onSelect?"cursor-pointer":""}>
          <circle cx={cx} cy={cy} r={isSel?12:8} fill={p.color} fillOpacity={isSel?0.3:0.18}/>
          <circle cx={cx} cy={cy} r={isSel?4.5:3} fill={p.color} stroke={isSel?"white":"none"} strokeWidth={isSel?1.5:0}/>
          {p.label&&<text x={cx+5} y={cy+2} fontSize="5" fill="#1f2937" fontFamily="system-ui" fontWeight="600">{p.label}</text>}
        </g>
      );})}
      {CITIES.map(c=>{const[cx,cy]=ll2xy(c.lat,c.lng);return(
        <g key={c.n}><circle cx={cx} cy={cy} r={2} fill="#6b7280"/><text x={cx+3} y={cy+2} fontSize="5" fill="#374151" fontFamily="system-ui">{c.n}</text></g>
      );})}
    </svg>
  );
}

// ── Location picker (for forms) ───────────────────────────────────────────────
function LocationPicker({lat,lng,onLat,onLng}:{lat:string;lng:string;onLat:(v:string)=>void;onLng:(v:string)=>void;}){
  const[url,setUrl]=useState("");
  function extract(){const m1=url.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);const m2=url.match(/(-?\d+\.?\d+),\s*(-?\d+\.?\d+)/);const m=m1??m2;if(m){onLat(parseFloat(m[1]).toFixed(4));onLng(parseFloat(m[2]).toFixed(4));setUrl("");}}
  const numLat=parseFloat(lat),numLng=parseFloat(lng),hasPin=!isNaN(numLat)&&!isNaN(numLng);
  return(
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted">Map Pin (lat / lng)</p>
      <div className="flex gap-2">
        <input value={url} onChange={e=>setUrl(e.target.value)} placeholder="Paste Google Maps URL or lat,lng…"
          className="flex-1 rounded-lg border border-line bg-canvas px-3 py-2 text-sm placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand-500"/>
        <button type="button" onClick={extract} className="rounded-lg border border-line bg-surface px-3 py-2 text-xs font-semibold hover:bg-canvas">Extract</button>
      </div>
      {hasPin&&(
        <a href={mapsUrl(numLat,numLng)} target="_blank" rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-medium text-brand-600 hover:bg-canvas">
          <Icon.location width={12} height={12}/>Preview in Google Maps ↗
        </a>
      )}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="mb-1 block text-[11px] font-medium text-muted">Latitude</label>
          <input type="number" step="0.0001" value={lat} onChange={e=>onLat(e.target.value)} placeholder="-17.8252"
            className="w-full rounded-lg border border-line bg-canvas px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"/>
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-medium text-muted">Longitude</label>
          <input type="number" step="0.0001" value={lng} onChange={e=>onLng(e.target.value)} placeholder="31.0335"
            className="w-full rounded-lg border border-line bg-canvas px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"/>
        </div>
      </div>
    </div>
  );
}

// ── Manager pill ──────────────────────────────────────────────────────────────
function ManagerPill({id,managers,level}:{id?:string;managers:TerritoryManager[];level?:HierarchyLevel;}){
  if(!id)return<span className="text-xs italic text-muted/40">Unassigned</span>;
  const m=managers.find(x=>x.id===id);
  if(!m)return<span className="text-xs text-muted">{id}</span>;
  const tone=level?COLOR_MAP[level.color].tone:"blue";
  return(
    <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-0.5 text-xs font-medium text-ink">
      <span className={`h-1.5 w-1.5 rounded-full ${level?COLOR_MAP[level.color].dot:"bg-blue-500"}`}/>
      {m.name}<Badge tone={tone}>{m.role}</Badge>
    </span>
  );
}

// ── Empty forms ───────────────────────────────────────────────────────────────
type NodeFormStatus = "Active" | "Inactive";
type NodeForm = { levelId:string; parentId:string; name:string; code:string; lat:string; lng:string; radiusKm:string; managerId:string; agentIds:string[]; provinces:string[]; district:string; beat:string; address:string; status:NodeFormStatus; notes:string; };

const emptyLevel={name:"",rank:"",managerTitle:"",color:"blue" as HierarchyColor,isActive:"true"};
const emptyNode: NodeForm ={levelId:"",parentId:"",name:"",code:"",lat:"",lng:"",radiusKm:"",managerId:"",agentIds:[],provinces:[],district:"",beat:"",address:"",status:"Active",notes:""};
const emptyManager={name:"",role:"",phone:"",email:"",isActive:"true",joinDate:"2026-06-24",notes:"",assignedNodeIds:[] as string[]};

// ── Recursive tree node ───────────────────────────────────────────────────────
function TreeNode({node,level,levels,allNodes,managers,agents,depth,onEdit,onDelete,onOpenMap}:{
  node:HierarchyNode;level:HierarchyLevel;levels:HierarchyLevel[];allNodes:HierarchyNode[];
  managers:TerritoryManager[];agents:{id:string;firstName:string;lastName:string;isActive:boolean}[];
  depth:number;onEdit:(n:HierarchyNode)=>void;onDelete:(id:string)=>void;onOpenMap:(n:HierarchyNode)=>void;
}){
  const[open,setOpen]=useState(depth<2);
  const children=useMemo(()=>allNodes.filter(n=>n.parentId===node.id),[allNodes,node.id]);
  const sortedLevels=useMemo(()=>[...levels].sort((a,b)=>a.rank-b.rank),[levels]);
  const childLevel=useMemo(()=>{const idx=sortedLevels.findIndex(l=>l.id===level.id);return idx>=0&&idx<sortedLevels.length-1?sortedLevels[idx+1]:undefined;},[sortedLevels,level.id]);
  const cc=COLOR_MAP[level.color];
  const hasGps=node.lat!=null&&node.lng!=null;
  return(
    <div>
      <div className={`flex items-center gap-2 py-2.5 border-b border-line ${cc.rowBg}`}
        style={{paddingLeft:`${16+depth*20}px`,paddingRight:"12px",borderLeftWidth:"3px",borderLeftColor:cc.hex,borderLeftStyle:"solid"}}>
        {children.length>0?(
          <button type="button" onClick={()=>setOpen(o=>!o)} className="shrink-0 p-0.5 text-muted hover:text-ink"
            style={{transform:open?"rotate(0deg)":"rotate(-90deg)",transition:"transform 0.15s"}}>
            <Icon.arrowDown width={12} height={12}/>
          </button>
        ):<span className="w-5 shrink-0"/>}
        <span className={`shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] font-bold ${cc.codeBg} ${cc.codeText}`}>{node.code}</span>
        <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${cc.bg} ${cc.text}`}>{level.name}</span>
        <span className="flex-1 text-sm font-semibold text-ink truncate min-w-0">{node.name}</span>
        <div className="shrink-0 hidden md:block"><ManagerPill id={node.managerId} managers={managers} level={level}/></div>
        {children.length>0&&<span className="shrink-0 text-[11px] text-muted tabular-nums">{children.length} sub</span>}
        {node.agentIds.length>0&&<div className="shrink-0 flex gap-1">{node.agentIds.slice(0,2).map(id=>{const a=agents.find(s=>s.id===id);return a?<Badge key={id} tone="green">{a.firstName[0]}.{a.lastName[0]}.</Badge>:null;})}
          {node.agentIds.length>2&&<Badge tone="gray">+{node.agentIds.length-2}</Badge>}
        </div>}
        <Badge tone={node.status==="Active"?"green":"gray"}>{node.status}</Badge>
        <div className="shrink-0 flex gap-0.5">
          {hasGps&&(
            <button type="button" onClick={()=>onOpenMap(node)}
              className="rounded p-1.5 text-muted hover:text-brand-600 hover:bg-canvas transition" title="View on Google Maps">
              <Icon.location width={12} height={12}/>
            </button>
          )}
          <button type="button" onClick={()=>onEdit(node)} className="rounded p-1.5 text-muted hover:text-ink hover:bg-canvas transition"><Icon.edit width={12} height={12}/></button>
          <button type="button" onClick={()=>onDelete(node.id)} className="rounded p-1.5 text-muted hover:text-red-600 hover:bg-canvas transition"><Icon.trash width={12} height={12}/></button>
        </div>
      </div>
      {open&&children.length>0&&childLevel&&children.map(child=>(
        <TreeNode key={child.id} node={child} level={childLevel} levels={levels} allNodes={allNodes}
          managers={managers} agents={agents} depth={depth+1} onEdit={onEdit} onDelete={onDelete} onOpenMap={onOpenMap}/>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Main page
// ══════════════════════════════════════════════════════════════════════════════
export default function DistributionPage(){
  const{hierarchyLevels,hierarchyNodes,territoryManagers,saleAgents,addHierarchyLevel,addHierarchyNode,addTerritoryManager,update,remove}=useData();

  const[tab,setTab]=useState<"tree"|"levels"|"locations"|"managers"|"map">("tree");

  // modals
  const[lvlModal,setLvlModal]=useState<{open:boolean;editing:HierarchyLevel|null}>({open:false,editing:null});
  const[nodeModal,setNodeModal]=useState<{open:boolean;editing:HierarchyNode|null}>({open:false,editing:null});
  const[mgModal,setMgModal]=useState<{open:boolean;editing:TerritoryManager|null}>({open:false,editing:null});
  const[mapModal,setMapModal]=useState<{open:boolean;node:HierarchyNode|null}>({open:false,node:null});

  // forms
  const[lvlForm,setLvlForm]=useState(emptyLevel);
  const[nodeForm,setNodeForm]=useState(emptyNode);
  const[mgForm,setMgForm]=useState(emptyManager);

  const setLvl=(k:keyof typeof emptyLevel)=>(v:string)=>setLvlForm(f=>({...f,[k]:v}));
  const setNd =(k:keyof NodeForm)=>(v:string)=>setNodeForm(f=>({...f,[k]:v as NodeFormStatus}));
  const setMg =(k:keyof typeof emptyManager)=>(v:string)=>setMgForm(f=>({...f,[k]:v}));

  // map tab state
  const[selectedMapNodeId,setSelectedMapNodeId]=useState<string|null>(null);

  const sortedLevels=useMemo(()=>[...hierarchyLevels].sort((a,b)=>a.rank-b.rank),[hierarchyLevels]);
  const rootLevel=sortedLevels[0];
  const rootNodes=useMemo(()=>hierarchyNodes.filter(n=>!n.parentId),[hierarchyNodes]);
  const pinnedNodes=useMemo(()=>hierarchyNodes.filter(n=>n.lat!=null&&n.lng!=null&&n.status==="Active"),[hierarchyNodes]);

  const levelOf=useCallback((n:HierarchyNode)=>hierarchyLevels.find(l=>l.id===n.levelId),[hierarchyLevels]);
  const managerOf=useCallback((n:HierarchyNode)=>territoryManagers.find(m=>m.id===n.managerId),[territoryManagers]);

  const selectedLevel=useMemo(()=>hierarchyLevels.find(l=>l.id===nodeForm.levelId),[hierarchyLevels,nodeForm.levelId]);
  const parentLevel=useMemo(()=>!selectedLevel?undefined:sortedLevels.find(l=>l.rank===selectedLevel.rank-1),[sortedLevels,selectedLevel]);
  const eligibleParents=useMemo(()=>!parentLevel?[]:hierarchyNodes.filter(n=>n.levelId===parentLevel.id&&n.status==="Active"),[hierarchyNodes,parentLevel]);

  // stats
  const activeLevels=hierarchyLevels.filter(l=>l.isActive).length;
  const activeNodes=hierarchyNodes.filter(n=>n.status==="Active").length;
  const assignedMgrs=new Set(hierarchyNodes.map(n=>n.managerId).filter(Boolean)).size;
  const deployedAgents=new Set(hierarchyNodes.flatMap(n=>n.agentIds)).size;

  // map pins
  const svgPins=useMemo(()=>pinnedNodes.map(n=>{const lv=levelOf(n);return{id:n.id,lat:n.lat!,lng:n.lng!,color:lv?COLOR_MAP[lv.color].hex:"#9ca3af",label:n.code};}), [pinnedNodes,levelOf]);

  // selected map node
  const selectedMapNode=useMemo(()=>selectedMapNodeId?hierarchyNodes.find(n=>n.id===selectedMapNodeId):null,[selectedMapNodeId,hierarchyNodes]);

  // toggles
  function toggleProvince(p:string){setNodeForm(f=>({...f,provinces:f.provinces.includes(p)?f.provinces.filter(x=>x!==p):[...f.provinces,p]}));}
  function toggleAgent(id:string){setNodeForm(f=>({...f,agentIds:f.agentIds.includes(id)?f.agentIds.filter(x=>x!==id):[...f.agentIds,id]}));}
  function toggleMgNode(id:string){setMgForm(f=>({...f,assignedNodeIds:f.assignedNodeIds.includes(id)?f.assignedNodeIds.filter(x=>x!==id):[...f.assignedNodeIds,id]}));}

  // open modals
  function openAddNode(levelId?:string){setNodeForm({...emptyNode,levelId:levelId??"",parentId:""});setNodeModal({open:true,editing:null});}
  function openEditNode(n:HierarchyNode){
    setNodeForm({levelId:n.levelId,parentId:n.parentId??"",name:n.name,code:n.code,lat:n.lat!=null?String(n.lat):"",lng:n.lng!=null?String(n.lng):"",radiusKm:n.radiusKm!=null?String(n.radiusKm):"",managerId:n.managerId??"",agentIds:[...n.agentIds],provinces:[...(n.provinces??[])],district:n.district??"",beat:n.beat??"",address:n.address??"",status:n.status,notes:n.notes??""});
    setNodeModal({open:true,editing:n});
  }
  function openAddMg(){setMgForm({...emptyManager,assignedNodeIds:[]});setMgModal({open:true,editing:null});}
  function openEditMg(m:TerritoryManager){
    setMgForm({name:m.name,role:m.role,phone:m.phone,email:m.email??"",isActive:String(m.isActive),joinDate:m.joinDate,notes:m.notes??"",assignedNodeIds:hierarchyNodes.filter(n=>n.managerId===m.id).map(n=>n.id)});
    setMgModal({open:true,editing:m});
  }
  function openMapNode(n:HierarchyNode){setMapModal({open:true,node:n});}

  // submit handlers
  function submitLevel(e:React.SyntheticEvent){
    e.preventDefault();
    const p={name:lvlForm.name,rank:parseInt(lvlForm.rank)||1,managerTitle:lvlForm.managerTitle,color:lvlForm.color as HierarchyColor,isActive:lvlForm.isActive==="true"};
    if(lvlModal.editing)update("hierarchyLevels",lvlModal.editing.id,p);else addHierarchyLevel(p);
    setLvlModal({open:false,editing:null});
  }
  function submitNode(e:React.SyntheticEvent){
    e.preventDefault();
    const lat=parseFloat(nodeForm.lat)||undefined,lng=parseFloat(nodeForm.lng)||undefined;
    const p:Omit<HierarchyNode,"id">={levelId:nodeForm.levelId,parentId:nodeForm.parentId||undefined,name:nodeForm.name,code:nodeForm.code,lat,lng,radiusKm:nodeForm.radiusKm?parseInt(nodeForm.radiusKm)||undefined:undefined,managerId:nodeForm.managerId||undefined,agentIds:nodeForm.agentIds,provinces:nodeForm.provinces.length?nodeForm.provinces:undefined,district:nodeForm.district||undefined,beat:nodeForm.beat||undefined,address:nodeForm.address||undefined,status:nodeForm.status,notes:nodeForm.notes||undefined};
    if(nodeModal.editing)update("hierarchyNodes",nodeModal.editing.id,p);else addHierarchyNode(p);
    setNodeModal({open:false,editing:null});
  }
  function submitManager(e:React.SyntheticEvent){
    e.preventDefault();
    const p={name:mgForm.name,role:mgForm.role,phone:mgForm.phone,email:mgForm.email||undefined,isActive:mgForm.isActive==="true",joinDate:mgForm.joinDate,notes:mgForm.notes||undefined};

    if(mgModal.editing){
      // update manager record
      update("territoryManagers",mgModal.editing.id,p);
      const managerId=mgModal.editing.id;
      const prev=hierarchyNodes.filter(n=>n.managerId===managerId).map(n=>n.id);
      const next=mgForm.assignedNodeIds;
      // unassign removed nodes
      prev.filter(id=>!next.includes(id)).forEach(id=>{
        const nd=hierarchyNodes.find(n=>n.id===id);
        if(nd)update("hierarchyNodes",id,{...nd,managerId:undefined});
      });
      // assign new nodes
      next.filter(id=>!prev.includes(id)).forEach(id=>{
        const nd=hierarchyNodes.find(n=>n.id===id);
        if(nd)update("hierarchyNodes",id,{...nd,managerId});
      });
    }else{
      // predict new ID (same logic as store's nextId with pad=3)
      const newId=computeNextId("TM-",territoryManagers.map(m=>m.id));
      addTerritoryManager(p);
      // batch-assign selected nodes to the predicted new ID
      mgForm.assignedNodeIds.forEach(id=>{
        const nd=hierarchyNodes.find(n=>n.id===id);
        if(nd)update("hierarchyNodes",id,{...nd,managerId:newId});
      });
    }
    setMgModal({open:false,editing:null});
  }

  const tabAddActions:{[k:string]:()=>void}={levels:()=>{setLvlForm(emptyLevel);setLvlModal({open:true,editing:null});},locations:()=>openAddNode(),managers:openAddMg};
  const tabAddLabels:{[k:string]:string}={levels:"Add Level",locations:"Add Location",managers:"Add Manager"};

  return(
    <>
      <PageHeader
        title="Distribution Management"
        description="N-level configurable territory hierarchy with GPS-pinned locations, manager assignments, and Google Maps integration."
        action={tabAddActions[tab]&&(
          <PrimaryButton onClick={tabAddActions[tab]}>
            <Icon.plus width={16} height={16}/>{tabAddLabels[tab]}
          </PrimaryButton>
        )}
      />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-5">
        <StatCard label="Hierarchy Levels" value={String(activeLevels)} iconName="network" tone="blue"/>
        <StatCard label="Active Locations" value={String(activeNodes)} iconName="location" tone="green"/>
        <StatCard label="GPS Pinned" value={String(pinnedNodes.length)} iconName="map" tone="purple"/>
        <StatCard label="Managers Assigned" value={String(assignedMgrs)} iconName="agent" tone="amber"/>
        <StatCard label="Field Agents" value={String(deployedAgents)} iconName="shield" tone="blue"/>
      </div>

      <div className="mt-4 flex flex-wrap gap-1 rounded-xl border border-line bg-canvas p-1">
        {([{k:"tree",l:"Tree View"},{k:"levels",l:`Hierarchy Levels (${hierarchyLevels.length})`},{k:"locations",l:`Locations (${hierarchyNodes.length})`},{k:"managers",l:`Managers (${territoryManagers.length})`},{k:"map",l:"Map"}] as const).map(t=>(
          <button key={t.k} onClick={()=>setTab(t.k as typeof tab)}
            className={`rounded-lg px-3.5 py-1.5 text-sm font-medium transition ${tab===t.k?"bg-surface text-ink shadow-sm":"text-muted hover:text-ink"}`}>
            {t.l}
          </button>
        ))}
      </div>

      {/* ═══ TREE ══════════════════════════════════════════════════════════════ */}
      {tab==="tree"&&(
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-canvas px-4 py-3">
            <span className="text-xs font-semibold text-muted">Levels:</span>
            {sortedLevels.map(l=>{const cc=COLOR_MAP[l.color];return(
              <span key={l.id} className="inline-flex items-center gap-1.5 text-xs text-ink">
                <span className={`h-2.5 w-2.5 rounded-full ${cc.dot}`}/><span className="font-medium">{l.name}</span>
                <span className="text-muted">({l.managerTitle})</span>
              </span>
            );})}
            <span className="ml-auto text-[11px] text-muted">{activeNodes} active · {pinnedNodes.length} GPS-pinned</span>
          </div>
          {sortedLevels.length===0&&<Card><div className="py-10 text-center text-sm text-muted">No levels defined. <button className="text-brand-600 underline" onClick={()=>setTab("levels")}>Go to Hierarchy Levels.</button></div></Card>}
          {rootLevel&&rootNodes.length>0&&(
            <Card className="overflow-hidden">
              {rootNodes.map(root=>(
                <TreeNode key={root.id} node={root} level={rootLevel} levels={sortedLevels} allNodes={hierarchyNodes}
                  managers={territoryManagers} agents={saleAgents} depth={0}
                  onEdit={openEditNode} onDelete={id=>remove("hierarchyNodes",id)} onOpenMap={openMapNode}/>
              ))}
            </Card>
          )}
          {rootLevel&&rootNodes.length===0&&<Card><div className="py-10 text-center text-sm text-muted">No root locations yet. <button className="text-brand-600 underline" onClick={()=>openAddNode(rootLevel.id)}>Add the first {rootLevel.name}.</button></div></Card>}
        </div>
      )}

      {/* ═══ HIERARCHY LEVELS ════════════════════════════════════════════════ */}
      {tab==="levels"&&(
        <Card className="mt-4">
          <div className="border-b border-line px-5 py-3 text-xs text-muted"><strong>Rank 1</strong> = top of tree. Add any levels: Region, Zone, District, Territory, Beat, Route…</div>
          <Table>
            <thead><tr><Th>Rank</Th><Th>Level Name</Th><Th>Manager Title</Th><Th>Colour</Th><Th>Locations</Th><Th>Status</Th><Th className="text-right">Actions</Th></tr></thead>
            <tbody>
              {sortedLevels.length===0&&<EmptyRow colSpan={7} label="No levels yet."/>}
              {sortedLevels.map(l=>{const cc=COLOR_MAP[l.color];return(
                <tr key={l.id} className="hover:bg-canvas/60 transition">
                  <Td className="font-mono font-bold text-sm text-center w-14">{l.rank}</Td>
                  <Td><span className="inline-flex items-center gap-2"><span className={`h-3 w-3 rounded-full ${cc.dot}`}/><span className="font-semibold text-sm">{l.name}</span></span></Td>
                  <Td><Badge tone={cc.tone}>{l.managerTitle}</Badge></Td>
                  <Td><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${cc.bg} ${cc.text}`}><span className={`h-2 w-2 rounded-full ${cc.dot}`}/>{l.color}</span></Td>
                  <Td className="font-mono text-sm">{hierarchyNodes.filter(n=>n.levelId===l.id).length}</Td>
                  <Td><Badge tone={l.isActive?"green":"gray"}>{l.isActive?"Active":"Inactive"}</Badge></Td>
                  <Td><div className="flex justify-end gap-1">
                    <button onClick={()=>{setLvlForm({name:l.name,rank:String(l.rank),managerTitle:l.managerTitle,color:l.color,isActive:String(l.isActive)});setLvlModal({open:true,editing:l});}} className="p-1.5 text-muted hover:text-ink"><Icon.edit width={13} height={13}/></button>
                    <button onClick={()=>remove("hierarchyLevels",l.id)} className="p-1.5 text-muted hover:text-red-600"><Icon.trash width={13} height={13}/></button>
                  </div></Td>
                </tr>
              );})}
            </tbody>
          </Table>
        </Card>
      )}

      {/* ═══ LOCATIONS ════════════════════════════════════════════════════════ */}
      {tab==="locations"&&(
        <div className="mt-4 space-y-3">
          {sortedLevels.map(level=>{
            const nodes=hierarchyNodes.filter(n=>n.levelId===level.id);
            if(nodes.length===0)return null;
            const cc=COLOR_MAP[level.color];
            return(
              <Card key={level.id} className="overflow-hidden">
                <div className={`flex items-center justify-between px-5 py-3 border-b border-line ${cc.bg}`}>
                  <div className="flex items-center gap-2">
                    <span className={`h-3 w-3 rounded-full ${cc.dot}`}/>
                    <span className={`font-bold text-sm ${cc.text}`}>{level.name}</span>
                    <span className="text-xs text-muted">Rank {level.rank} · {level.managerTitle} · {nodes.length} locations</span>
                  </div>
                  <button type="button" onClick={()=>openAddNode(level.id)}
                    className={`inline-flex items-center gap-1.5 rounded-lg border border-current px-2.5 py-1 text-xs font-semibold ${cc.text} hover:opacity-80`}>
                    <Icon.plus width={12} height={12}/>Add {level.name}
                  </button>
                </div>
                <Table>
                  <thead><tr><Th>Code</Th><Th>Name</Th><Th>Parent</Th><Th>Manager</Th><Th>Agents</Th><Th>GPS</Th><Th>Status</Th><Th className="text-right">Actions</Th></tr></thead>
                  <tbody>
                    {nodes.map(n=>{
                      const parent=n.parentId?hierarchyNodes.find(x=>x.id===n.parentId):undefined;
                      const mgr=managerOf(n);
                      const hasGps=n.lat!=null&&n.lng!=null;
                      return(
                        <tr key={n.id} className="hover:bg-canvas/60 transition">
                          <Td className="font-mono text-xs font-bold">{n.code}</Td>
                          <Td>
                            <p className="font-semibold text-sm">{n.name}</p>
                            {n.district&&<p className="text-xs text-muted">{n.district}</p>}
                            {n.beat&&<p className="text-xs text-muted">Beat: {n.beat}</p>}
                            {n.provinces&&n.provinces.length>0&&<div className="mt-0.5 flex flex-wrap gap-0.5">{n.provinces.slice(0,3).map(p=><Badge key={p} tone="blue">{p}</Badge>)}{n.provinces.length>3&&<Badge tone="gray">+{n.provinces.length-3}</Badge>}</div>}
                          </Td>
                          <Td className="text-xs text-muted">{parent?`${parent.name} (${parent.code})`:"Root"}</Td>
                          <Td>
                            {mgr?(
                              <span className="inline-flex items-center gap-1.5 text-xs font-medium">
                                <span className={`h-2 w-2 rounded-full ${cc.dot}`}/>{mgr.name}<Badge tone={cc.tone}>{mgr.role}</Badge>
                              </span>
                            ):<span className="text-xs italic text-muted/40">Unassigned</span>}
                          </Td>
                          <Td>{n.agentIds.length===0?<span className="text-xs text-muted/40">—</span>:<div className="flex flex-wrap gap-1">{n.agentIds.map(id=>{const a=saleAgents.find(s=>s.id===id);return a?<Badge key={id} tone="green">{a.firstName} {a.lastName[0]}.</Badge>:null;})}</div>}</Td>
                          <Td>
                            {hasGps?(
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-[10px] text-muted">{n.lat!.toFixed(3)},{n.lng!.toFixed(3)}</span>
                                <a href={mapsUrl(n.lat!,n.lng!)} target="_blank" rel="noreferrer"
                                  className="inline-flex items-center gap-0.5 rounded border border-line bg-surface px-1.5 py-0.5 text-[10px] font-semibold text-brand-600 hover:bg-canvas" title="Open in Google Maps">
                                  <Icon.location width={10} height={10}/>Maps ↗
                                </a>
                              </div>
                            ):<span className="text-muted/40 text-xs">—</span>}
                          </Td>
                          <Td><Badge tone={n.status==="Active"?"green":"gray"}>{n.status}</Badge></Td>
                          <Td>
                            <div className="flex justify-end gap-1">
                              {hasGps&&<button onClick={()=>openMapNode(n)} className="p-1.5 text-muted hover:text-brand-600" title="Google Maps"><Icon.map width={13} height={13}/></button>}
                              <button onClick={()=>openEditNode(n)} className="p-1.5 text-muted hover:text-ink"><Icon.edit width={13} height={13}/></button>
                              <button onClick={()=>remove("hierarchyNodes",n.id)} className="p-1.5 text-muted hover:text-red-600"><Icon.trash width={13} height={13}/></button>
                            </div>
                          </Td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              </Card>
            );
          })}
          {hierarchyNodes.length===0&&<Card><div className="py-10 text-center text-sm text-muted">No locations yet. <button className="text-brand-600 underline" onClick={()=>openAddNode()}>Add the first location.</button></div></Card>}
        </div>
      )}

      {/* ═══ MANAGERS ════════════════════════════════════════════════════════ */}
      {tab==="managers"&&(
        <Card className="mt-4">
          <Table>
            <thead><tr><Th>Manager</Th><Th>Role</Th><Th>Contact</Th><Th>Assigned Locations</Th><Th>Joined</Th><Th>Status</Th><Th className="text-right">Actions</Th></tr></thead>
            <tbody>
              {territoryManagers.length===0&&<EmptyRow colSpan={7} label="No managers yet."/>}
              {territoryManagers.map(m=>{
                const assigned=hierarchyNodes.filter(n=>n.managerId===m.id);
                const firstLv=assigned.length>0?levelOf(assigned[0]):undefined;
                const tone=firstLv?COLOR_MAP[firstLv.color].tone:"gray";
                return(
                  <tr key={m.id} className="hover:bg-canvas/60 transition">
                    <Td className="font-semibold text-sm">{m.name}</Td>
                    <Td><Badge tone={tone}>{m.role}</Badge></Td>
                    <Td className="text-xs"><p>{m.phone}</p>{m.email&&<p className="text-muted">{m.email}</p>}</Td>
                    <Td>
                      {assigned.length===0?<span className="text-xs italic text-muted/40">Unassigned</span>:(
                        <div className="flex flex-wrap gap-1">
                          {assigned.map(n=>{
                            const lv=levelOf(n);const cc=lv?COLOR_MAP[lv.color]:COLOR_MAP.gray;
                            return(
                              <span key={n.id} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-2 py-0.5 text-xs font-medium">
                                <span className={`h-1.5 w-1.5 rounded-full ${cc.dot}`}/>{n.name}
                                {lv&&<span className="text-muted">({lv.name})</span>}
                                {n.lat!=null&&n.lng!=null&&(
                                  <a href={mapsUrl(n.lat,n.lng)} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline" title="Google Maps"><Icon.location width={9} height={9}/></a>
                                )}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </Td>
                    <Td className="text-xs text-muted">{formatDate(m.joinDate)}</Td>
                    <Td><Badge tone={m.isActive?"green":"gray"}>{m.isActive?"Active":"Inactive"}</Badge></Td>
                    <Td>
                      <div className="flex justify-end gap-1">
                        <button onClick={()=>openEditMg(m)} className="p-1.5 text-muted hover:text-ink"><Icon.edit width={13} height={13}/></button>
                        <button onClick={()=>remove("territoryManagers",m.id)} className="p-1.5 text-muted hover:text-red-600"><Icon.trash width={13} height={13}/></button>
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </Card>
      )}

      {/* ═══ MAP ═════════════════════════════════════════════════════════════ */}
      {tab==="map"&&(
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          {/* Left: location list */}
          <div className="space-y-3">
            <Card>
              <div className="flex items-center justify-between px-4 py-3 border-b border-line">
                <p className="text-sm font-semibold">{pinnedNodes.length} Pinned Locations</p>
                {selectedMapNodeId&&<button type="button" onClick={()=>setSelectedMapNodeId(null)} className="text-xs text-muted hover:text-ink">← Overview</button>}
              </div>
              <div className="max-h-[calc(100vh-320px)] overflow-y-auto divide-y divide-line">
                {pinnedNodes.length===0&&<div className="px-4 py-8 text-center text-xs text-muted">No GPS-pinned locations yet.</div>}
                {sortedLevels.map(level=>{
                  const nodes=pinnedNodes.filter(n=>n.levelId===level.id);
                  if(nodes.length===0)return null;
                  const cc=COLOR_MAP[level.color];
                  return(
                    <div key={level.id}>
                      <div className={`px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider ${cc.text} ${cc.bg}`}>{level.name} ({level.managerTitle})</div>
                      {nodes.map(n=>{
                        const mgr=managerOf(n);
                        const isSel=selectedMapNodeId===n.id;
                        return(
                          <button key={n.id} type="button" onClick={()=>setSelectedMapNodeId(isSel?null:n.id)}
                            className={`w-full flex items-start gap-3 px-4 py-3 text-left transition hover:bg-canvas ${isSel?"bg-brand-50 border-l-2 border-brand-500":""}`}>
                            <span className={`mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full ${cc.dot}`}/>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-ink truncate">{n.name}</p>
                              <p className="font-mono text-[10px] text-muted">{n.lat!.toFixed(4)}, {n.lng!.toFixed(4)}</p>
                              {mgr&&<p className="text-[11px] text-muted mt-0.5">{mgr.name} · {mgr.role}</p>}
                              {n.agentIds.length>0&&<p className="text-[10px] text-muted">{n.agentIds.length} agent{n.agentIds.length!==1?"s":""}</p>}
                            </div>
                            <div className="shrink-0 flex flex-col gap-1 items-end">
                              <Badge tone={cc.tone}>{n.code}</Badge>
                              <a href={mapsUrl(n.lat!,n.lng!)} target="_blank" rel="noreferrer"
                                onClick={e=>e.stopPropagation()}
                                className="text-[10px] font-medium text-brand-600 hover:underline">↗ Maps</a>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Level legend */}
            <Card>
              <CardHeader title="Level Legend"/>
              <div className="divide-y divide-line">
                {sortedLevels.map(l=>{const cc=COLOR_MAP[l.color];const cnt=pinnedNodes.filter(n=>n.levelId===l.id).length;return(
                  <div key={l.id} className="flex items-center justify-between px-4 py-2.5">
                    <span className="flex items-center gap-2 text-sm font-medium"><span className={`h-3 w-3 rounded-full ${cc.dot}`}/>{l.name}<span className="text-xs font-normal text-muted">({l.managerTitle})</span></span>
                    <span className="font-mono text-sm text-muted">{cnt}</span>
                  </div>
                );})}
              </div>
            </Card>
          </div>

          {/* Right: Google Maps or SVG overview */}
          <div className="lg:col-span-2">
            {selectedMapNode&&selectedMapNode.lat!=null&&selectedMapNode.lng!=null?(
              <Card className="overflow-hidden">
                {/* Header */}
                <div className={`flex items-center justify-between px-5 py-3 border-b border-line ${(() => {const lv=levelOf(selectedMapNode);return lv?COLOR_MAP[lv.color].bg:"bg-surface";})()}`}>
                  <div className="flex items-center gap-3">
                    <div>
                      {(() => {const lv=levelOf(selectedMapNode);const cc=lv?COLOR_MAP[lv.color]:COLOR_MAP.gray;return(
                        <>
                          <div className="flex items-center gap-2">
                            <span className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-bold ${cc.codeBg} ${cc.codeText}`}>{selectedMapNode.code}</span>
                            {lv&&<span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${cc.bg} ${cc.text}`}>{lv.name}</span>}
                            <span className="font-bold text-sm">{selectedMapNode.name}</span>
                          </div>
                          <p className="mt-0.5 font-mono text-[11px] text-muted">{selectedMapNode.lat!.toFixed(5)}, {selectedMapNode.lng!.toFixed(5)}</p>
                        </>
                      );})()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {(() => {const mgr=managerOf(selectedMapNode);return mgr?<ManagerPill id={mgr.id} managers={territoryManagers} level={levelOf(selectedMapNode)}/>:null;})()}
                    <a href={mapsUrl(selectedMapNode.lat!,selectedMapNode.lng!,17)} target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-brand-600 hover:bg-canvas">
                      <Icon.location width={12} height={12}/>Open in Google Maps ↗
                    </a>
                    <button type="button" onClick={()=>setSelectedMapNodeId(null)} className="rounded-lg border border-line bg-surface p-1.5 text-muted hover:text-ink">
                      <Icon.close width={14} height={14}/>
                    </button>
                  </div>
                </div>

                {/* Google Maps iframe */}
                <div style={{height:520}}>
                  <GoogleMapEmbed lat={selectedMapNode.lat!} lng={selectedMapNode.lng!} zoom={14}/>
                </div>

                {/* Footer info */}
                <div className="flex flex-wrap items-center gap-4 border-t border-line px-5 py-3">
                  {selectedMapNode.radiusKm&&<span className="text-xs text-muted">Radius: <strong>{selectedMapNode.radiusKm} km</strong></span>}
                  {selectedMapNode.district&&<span className="text-xs text-muted">District: <strong>{selectedMapNode.district}</strong></span>}
                  {selectedMapNode.beat&&<span className="text-xs text-muted">Beat: <strong>{selectedMapNode.beat}</strong></span>}
                  {selectedMapNode.agentIds.length>0&&<span className="text-xs text-muted">{selectedMapNode.agentIds.length} field agent{selectedMapNode.agentIds.length!==1?"s":""}</span>}
                  <button type="button" onClick={()=>openEditNode(selectedMapNode)} className="ml-auto text-xs text-brand-600 hover:underline">Edit location →</button>
                </div>
              </Card>
            ):(
              <Card>
                <CardHeader title="Overview Map — Zimbabwe"/>
                <div className="m-4 overflow-hidden rounded-xl border border-line" style={{height:400}}>
                  <SvgMap pins={svgPins} selected={selectedMapNodeId??undefined} onSelect={id=>setSelectedMapNodeId(id)}/>
                </div>
                <p className="pb-4 text-center text-xs text-muted">
                  {pinnedNodes.length} GPS-pinned locations · click a pin to open Google Maps view
                </p>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════ MODALS ═════════════════════════════════════════ */}

      {/* Quick Google Maps modal (from tree/locations) */}
      {mapModal.node&&mapModal.node.lat!=null&&(
        <Modal key={`map-${mapModal.node.id}`} open={mapModal.open} onClose={()=>setMapModal({open:false,node:null})}
          title={`${mapModal.node.name} — Google Maps`}
          description={`${mapModal.node.lat!.toFixed(5)}, ${mapModal.node.lng!.toFixed(5)} · ${mapModal.node.code}`}
          size="lg">
          <div className="px-5 pb-5 space-y-3">
            <div style={{height:400}}>
              <GoogleMapEmbed lat={mapModal.node.lat!} lng={mapModal.node.lng!} zoom={14}/>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ManagerPill id={mapModal.node.managerId} managers={territoryManagers} level={levelOf(mapModal.node)}/>
                {mapModal.node.radiusKm&&<span className="text-xs text-muted">{mapModal.node.radiusKm} km radius</span>}
              </div>
              <a href={mapsUrl(mapModal.node.lat!,mapModal.node.lng!,16)} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
                <Icon.location width={14} height={14}/>Open in Google Maps ↗
              </a>
            </div>
          </div>
        </Modal>
      )}

      {/* Level modal */}
      <Modal key={lvlModal.editing?.id??"new-lvl"} open={lvlModal.open} onClose={()=>setLvlModal({open:false,editing:null})}
        title={lvlModal.editing?"Edit Hierarchy Level":"Add Hierarchy Level"}
        description="Define a tier: name, rank (1=top), manager title, colour. Add Region, Zone, District, Territory, Beat — any structure you need.">
        <form onSubmit={submitLevel} className="space-y-4 p-5">
          <FormGrid>
            <TextField label="Level Name" value={lvlForm.name} onChange={setLvl("name")} required placeholder="Region, Zone, District, Territory, Beat…"/>
            <NumberField label="Rank (1 = top)" value={lvlForm.rank} onChange={setLvl("rank")} min={1} required/>
            <TextField label="Manager Title" value={lvlForm.managerTitle} onChange={setLvl("managerTitle")} required placeholder="NSM, RSM, ASM, TSM, DM…"/>
            <SelectField label="Status" value={lvlForm.isActive} onChange={setLvl("isActive")} options={[{value:"true",label:"Active"},{value:"false",label:"Inactive"}]} required/>
          </FormGrid>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Level Colour</p>
            <div className="flex flex-wrap gap-2">
              {COLORS.map(c=>{const cc=COLOR_MAP[c];return(
                <button key={c} type="button" onClick={()=>setLvlForm(f=>({...f,color:c}))}
                  className={`rounded-full px-3 py-1 text-xs font-semibold border-2 transition capitalize ${cc.bg} ${cc.text} ${lvlForm.color===c?"border-current shadow-sm":"border-transparent opacity-50 hover:opacity-80"}`}>
                  {c}
                </button>
              );})}
            </div>
          </div>
          <FormButtons onCancel={()=>setLvlModal({open:false,editing:null})} submitLabel="Save Level"/>
        </form>
      </Modal>

      {/* Location modal */}
      <Modal key={nodeModal.editing?.id??"new-node"} open={nodeModal.open} onClose={()=>setNodeModal({open:false,editing:null})}
        title={nodeModal.editing?"Edit Location":"Add Location"}
        description="Any node in your hierarchy — channel, zone, district, territory, or beat." size="lg">
        <form onSubmit={submitNode} className="space-y-4 p-5">
          <FormGrid>
            <SelectField label="Hierarchy Level" value={nodeForm.levelId} onChange={setNd("levelId")} required placeholder="— Select level —"
              options={sortedLevels.map(l=>({value:l.id,label:`${l.name} (rank ${l.rank})`}))}/>
            {parentLevel?(
              <SelectField label={`Parent ${parentLevel.name}`} value={nodeForm.parentId} onChange={setNd("parentId")}
                placeholder="— Select parent —" options={eligibleParents.map(n=>({value:n.id,label:`${n.name} (${n.code})`}))}/>
            ):(
              <div className="flex items-end pb-1"><p className="text-xs text-muted">Root location — no parent needed at rank 1.</p></div>
            )}
            <TextField label="Location Name" value={nodeForm.name} onChange={setNd("name")} required placeholder="e.g. Harare North"/>
            <TextField label="Short Code" value={nodeForm.code} onChange={setNd("code")} required placeholder="e.g. HRN"/>
            <SelectField label={`Assign ${selectedLevel?.managerTitle??"Manager"}`} value={nodeForm.managerId} onChange={setNd("managerId")}
              placeholder="— Unassigned —" options={territoryManagers.filter(m=>m.isActive).map(m=>({value:m.id,label:`${m.name} (${m.role})`}))}/>
            <NumberField label="Service Radius (km)" value={nodeForm.radiusKm} onChange={setNd("radiusKm")} min={1}/>
            <TextField label="District" value={nodeForm.district} onChange={setNd("district")} placeholder="e.g. Harare Urban"/>
            <TextField label="Beat / Route" value={nodeForm.beat} onChange={setNd("beat")} placeholder="e.g. Beat A"/>
            <TextField label="Address / Landmark" value={nodeForm.address} onChange={setNd("address")}/>
            <SelectField label="Status" value={nodeForm.status} onChange={setNd("status")} options={["Active","Inactive"]} required/>
          </FormGrid>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Provinces Covered</p>
            <div className="flex flex-wrap gap-1.5">
              {PROVINCES.map(p=>(
                <button key={p} type="button" onClick={()=>toggleProvince(p)}
                  className={`rounded-full border px-2.5 py-0.5 text-xs font-medium transition ${nodeForm.provinces.includes(p)?"border-brand-400 bg-brand-50 text-brand-700":"border-line bg-surface text-muted hover:border-brand-300"}`}>
                  {nodeForm.provinces.includes(p)?"✓ ":""}{p}
                </button>
              ))}
            </div>
          </div>
          {saleAgents.filter(a=>a.isActive).length>0&&(
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Field Agents (AI Technicians)</p>
              <div className="flex flex-wrap gap-1.5">
                {saleAgents.filter(a=>a.isActive).map(a=>(
                  <button key={a.id} type="button" onClick={()=>toggleAgent(a.id)}
                    className={`rounded-full border px-2.5 py-0.5 text-xs font-medium transition ${nodeForm.agentIds.includes(a.id)?"border-brand-400 bg-brand-50 text-brand-700":"border-line bg-surface text-muted hover:border-brand-300"}`}>
                    {nodeForm.agentIds.includes(a.id)?"✓ ":""}{a.firstName} {a.lastName}
                  </button>
                ))}
              </div>
            </div>
          )}
          <LocationPicker lat={nodeForm.lat} lng={nodeForm.lng} onLat={setNd("lat")} onLng={setNd("lng")}/>
          <TextAreaField label="Notes" value={nodeForm.notes} onChange={setNd("notes")}/>
          <FormButtons onCancel={()=>setNodeModal({open:false,editing:null})} submitLabel="Save Location"/>
        </form>
      </Modal>

      {/* Manager modal — with location assignment */}
      <Modal key={mgModal.editing?.id??"new-mg"} open={mgModal.open} onClose={()=>setMgModal({open:false,editing:null})}
        title={mgModal.editing?"Edit Manager":"Add Territory Manager"}
        description="Fill in the manager's details, choose their role, then assign the locations they will oversee directly from this form."
        size="lg">
        <form onSubmit={submitManager} className="space-y-4 p-5">
          <FormGrid>
            <TextField label="Full Name" value={mgForm.name} onChange={setMg("name")} required placeholder="e.g. John Moyo"/>
            <TextField label="Role / Title" value={mgForm.role} onChange={setMg("role")} required placeholder="NSM, RSM, ASM, TSM, BDM…"/>
            <TextField label="Phone Number" value={mgForm.phone} onChange={setMg("phone")} required placeholder="+263-77-…"/>
            <TextField label="Email Address" value={mgForm.email} onChange={setMg("email")} placeholder="name@company.com"/>
            <DateField label="Join Date" value={mgForm.joinDate} onChange={setMg("joinDate")} required/>
            <SelectField label="Status" value={mgForm.isActive} onChange={setMg("isActive")} options={[{value:"true",label:"Active"},{value:"false",label:"Inactive"}]} required/>
          </FormGrid>
          <TextAreaField label="Notes" value={mgForm.notes} onChange={setMg("notes")}/>

          {/* Location assignment */}
          {hierarchyNodes.length>0&&(
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">Assign to Locations</p>
                {mgForm.assignedNodeIds.length>0&&(
                  <span className="text-xs font-medium text-brand-600">{mgForm.assignedNodeIds.length} selected</span>
                )}
              </div>
              <div className="max-h-56 overflow-y-auto rounded-xl border border-line divide-y divide-line">
                {sortedLevels.map(level=>{
                  const nodes=hierarchyNodes.filter(n=>n.levelId===level.id&&n.status==="Active");
                  if(nodes.length===0)return null;
                  const cc=COLOR_MAP[level.color];
                  return(
                    <div key={level.id}>
                      <div className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider ${cc.text} ${cc.bg}`}>
                        {level.name} — {level.managerTitle}
                      </div>
                      {nodes.map(n=>{
                        const isSel=mgForm.assignedNodeIds.includes(n.id);
                        const parent=n.parentId?hierarchyNodes.find(x=>x.id===n.parentId):undefined;
                        const currentMgr=territoryManagers.find(m=>m.id===n.managerId);
                        const isOtherMgr=n.managerId&&n.managerId!==(mgModal.editing?.id??"");
                        return(
                          <button key={n.id} type="button" onClick={()=>toggleMgNode(n.id)}
                            className={`w-full flex items-center gap-3 px-3 py-2 text-left transition hover:bg-canvas ${isSel?"bg-brand-50":""}`}>
                            <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 transition ${isSel?"border-brand-500 bg-brand-500":"border-line bg-white"}`}>
                              {isSel&&<span className="text-white text-[10px] font-bold">✓</span>}
                            </div>
                            <span className={`shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] font-bold ${cc.codeBg} ${cc.codeText}`}>{n.code}</span>
                            <span className="flex-1 text-xs font-medium text-ink">{n.name}</span>
                            {parent&&<span className="text-[10px] text-muted">{parent.name}</span>}
                            {isOtherMgr&&currentMgr&&<Badge tone="amber">{currentMgr.name}</Badge>}
                            {n.lat!=null&&n.lng!=null&&<span className="text-[10px] text-muted"><Icon.location width={9} height={9}/></span>}
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
              {mgForm.assignedNodeIds.length>0&&(
                <p className="mt-1.5 text-[11px] text-muted">
                  {mgModal.editing?"Node assignments update immediately on save.":"Locations will be assigned after the manager is created."}
                </p>
              )}
            </div>
          )}

          <FormButtons onCancel={()=>setMgModal({open:false,editing:null})} submitLabel={mgModal.editing?"Save Changes":"Create Manager"}/>
        </form>
      </Modal>
    </>
  );
}
