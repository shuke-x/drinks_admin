import { request } from '../request';
import type { PageDto } from '../types';
export type TastingRecord = { id:string; version?:number; ownerId:string; name:string; occurredAt:string; scene:'home'|'out'; verdict:'loved'|'liked'|'notForMe'; note?:string; venue?:string; price?:string; adjustments?:string; photoBase64?:string|null; reference?:Record<string,unknown>|null; actualRecipe:{n:string; ml?:number; t?:string}[] };
export type PendingRecord={id:string;ownerId:string;version:number;expiresAt:string;sharingStatus:'pending';snapshot:{name:string;verdict:string;caption:string;actualRecipe:{n:string;ml?:number;t?:string}[];photosBase64:string[]}};
export type FlavorDirection = {id:string;zh:string;en:string;zhSubtitle:string;enSubtitle:string;keywords:string[];color:string;icon:string;primaryWeight:number;secondaryWeight:number;isActive:boolean;sortOrder:number};
const records='/admin/drink-records', flavors='/admin/flavor-directions';
export const experienceApi={
 records:(query:Record<string,unknown>)=>request.get<PageDto<PendingRecord>>(records,query),
 reviewRecord:(record:PendingRecord,action:'approve'|'reject',reason?:string)=>request.post(`${records}/${record.ownerId}/${record.id}/review`,{version:record.version,action,reason}),
 flavors:()=>request.get<FlavorDirection[]>(flavors),
 saveFlavor:(flavor:FlavorDirection,create:boolean)=>create?request.post(flavors,flavor):request.patch(`${flavors}/${flavor.id}`,flavor),
 deleteFlavor:(id:string)=>request.delete(`${flavors}/${id}`),
};
