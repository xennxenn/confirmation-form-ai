import React from 'react';
import { X } from 'lucide-react';

interface FabricSelectorProps {
  item: any;
  area: any;
  fab: any;
  appDB: any;
  generalInfo: any;
  updateFabric: (itemId: string, areaId: string, fabricId: string, updates: any) => void;
  removeFabric: (itemId: string, areaId: string, fabricId: string) => void;
}

export const FabricSelector: React.FC<FabricSelectorProps> = React.memo(({ 
  item, 
  area, 
  fab, 
  appDB, 
  generalInfo, 
  updateFabric, 
  removeFabric 
}) => {
    const isCustom = fab.mainType === 'ผ้านอกระบบ (เฉพาะงานนี้)';
    const isCurtain = fab.mainType === 'ผ้าม่าน';
    const mainTypeOptions = [
      ...Object.keys(appDB.curtainTypes || {}), 
      ...(generalInfo.customFabrics?.length > 0 ? ['ผ้านอกระบบ (เฉพาะงานนี้)'] : [])
    ];
    
    let subTypeOptions: string[] = [], nameOptions: string[] = [], colorOptions: string[] = [], curtainModels: any[] = [];
    if (isCurtain && appDB.curtainTypes['ผ้าม่าน']) {
        Object.entries(appDB.curtainTypes['ผ้าม่าน']).forEach(([sT, mods]: any) => {
            Object.keys(mods).forEach(mName => curtainModels.push({ modelName: mName, subType: sT }));
        });
        curtainModels.sort((a,b) => a.modelName.localeCompare(b.modelName));
    }

    if (isCustom) {
      const cFabs = generalInfo.customFabrics || [];
      subTypeOptions = [...new Set(cFabs.map((f: any)=>f.subType))].filter(Boolean).sort() as string[];
      nameOptions = [...new Set(cFabs.filter((f: any)=>f.subType === fab.subType).map((f: any)=>f.name))].filter(Boolean).sort() as string[];
      colorOptions = [...new Set(cFabs.filter((f: any)=>f.subType === fab.subType && f.name === fab.name).map((f: any)=>f.color))].filter(Boolean).sort() as string[];
    } else if (isCurtain) {
      nameOptions = curtainModels.map(m => m.modelName);
      const matchModel = curtainModels.find(m => m.modelName === fab.name);
      if (matchModel) colorOptions = Object.keys(appDB.curtainTypes['ผ้าม่าน'][matchModel.subType][fab.name] || {}).sort();
    } else {
      subTypeOptions = fab.mainType ? Object.keys(appDB.curtainTypes[fab.mainType] || {}).sort() : [];
      nameOptions = fab.subType ? Object.keys(appDB.curtainTypes[fab.mainType]?.[fab.subType] || {}).sort() : [];
      colorOptions = fab.name ? Object.keys(appDB.curtainTypes[fab.mainType]?.[fab.subType]?.[fab.name] || {}).sort() : [];
    }

    const nameListId = `names-${item.id}-${area.id}-${fab.id}`;
    const colorListId = `colors-${item.id}-${area.id}-${fab.id}`;

    return (
      <div className="flex flex-col gap-1.5 mb-1.5 bg-white p-1.5 border border-gray-200 rounded relative pr-5 shadow-sm">
        <button onClick={()=>removeFabric(item.id, area.id, fab.id)} className="absolute top-1 right-1 text-red-500 hover:bg-red-50 rounded no-print transition-colors"><X size={14}/></button>
        <div className="flex flex-col gap-1.5">
          <div className="flex gap-1.5">
            <select value={fab.mainType} onChange={(e)=>updateFabric(item.id, area.id, fab.id, {mainType: e.target.value, subType:'', name:'', color:''})} className={`border-b border-gray-300 outline-none text-[11px] bg-transparent font-bold h-7 ${isCustom ? 'text-indigo-600' : 'text-gray-700'} ${isCurtain ? 'w-full' : 'w-1/2'}`}>
              <option value="">-หมวดหมู่-</option>{mainTypeOptions.map(o=><option key={o} value={o}>{o}</option>)}
            </select>
            {!isCurtain && (
                <select value={fab.subType} onChange={(e)=>updateFabric(item.id, area.id, fab.id, {subType: e.target.value, name:'', color:''})} className="w-1/2 border-b border-gray-300 outline-none text-[11px] bg-transparent font-bold text-indigo-700 h-7" disabled={!fab.mainType}>
                  <option value="">-ประเภทม่าน-</option>{subTypeOptions.map(o=><option key={o} value={o}>{o}</option>)}
                </select>
            )}
          </div>
          <div className="flex gap-1.5">
            <div className="w-1/2 relative">
              <input list={nameListId} value={fab.name} onChange={(e) => {
                 const val = e.target.value.toUpperCase();
                 if (isCurtain) {
                     const match = curtainModels.find(m => m.modelName === val);
                     updateFabric(item.id, area.id, fab.id, {name: val, subType: match ? match.subType : fab.subType, color: ''});
                 } else updateFabric(item.id, area.id, fab.id, {name: val, color: ''});
              }} className="w-full border-b border-gray-300 outline-none text-[11px] bg-transparent font-medium h-7" disabled={!fab.mainType || (!isCurtain && !fab.subType)} placeholder="-พิมพ์ค้นหารุ่น-"/>
              <datalist id={nameListId}>{nameOptions.map(o=><option key={o} value={o}/>)}</datalist>
            </div>
            <div className="w-1/2 relative">
              <input list={colorListId} value={fab.color} onChange={(e)=>updateFabric(item.id, area.id, fab.id, {color: e.target.value})} className="w-full border-b border-gray-300 outline-none text-[11px] bg-transparent font-medium text-gray-600 h-7" disabled={!fab.name} placeholder="-พิมพ์ค้นหาสี-"/>
              <datalist id={colorListId}>{colorOptions.map(o=><option key={o} value={o}/>)}</datalist>
            </div>
          </div>
        </div>
      </div>
    );
});

FabricSelector.displayName = 'FabricSelector';
