export interface FabricItem {
  id: string;
  mainType: string;
  subType: string;
  name: string;
  color: string;
  image?: string;
}

export interface AreaItem {
  id: string;
  points: { x: number; y: number }[];
  width: string;
  height: string;
  lineColor: string;
  lineWidth: number;
  fabrics: FabricItem[];
  layers: number;
  labelColor: string;
  labelSize: number;
  wPos: string;
  hPos: string;
  maskType: string;
  maskPct: number;
  maskOpacity: number;
  styleMain1: string;
  styleAction1: string;
  styleMain2: string;
  styleAction2: string;
  [key: string]: any;
}

export interface CurtainItem {
  id: string;
  image: string | null;
  imageFit: 'fill' | 'fit';
  layers: number;
  areas: AreaItem[];
  roomPos: string;
  styleMain1: string;
  styleAction1: string;
  styleMain2: string;
  styleAction2: string;
  tracks: string[];
  bracket: string;
  accessories: string[];
  hangStyle: string;
  marginLeft: string;
  customMarginLeft: string;
  marginRight: string;
  customMarginRight: string;
  marginTop: string;
  customMarginTop: string;
  marginBottom: string;
  customMarginBottom: string;
  note: string;
  originalImage?: string | null;
  aiImage?: string | null;
  aiImages?: string[];
}

export interface GeneralInfo {
  surveyDate: string;
  confirmDate: string;
  installDates: string[];
  location: string;
  customerName: string;
  customerPhone: string;
  agentName: string;
  agentPhone: string;
  customFabrics: FabricItem[];
  creatorName: string;
  creatorSignature: string;
  terms: string;
}

export interface Account {
  id: string;
  username: string;
  password: string;
  role: 'admin' | 'user';
  name: string;
  signatureUrl: string;
}

export const PRESET_COLORS = ['#EF4444', '#F97316', '#EAB308', '#22C55E', '#3B82F6', '#A855F7', '#EC4899', '#000000', '#FFFFFF'];
export const ACCEPTED_IMAGE_FORMATS = ".png,.jpeg,.jpg,.webp,.heic,.heif,image/*";

export const DEFAULT_DB = {
  curtainTypes: {
    'ผ้าม่าน': { 'ผ้าม่านทึบ (Blackout)': {}, 'ผ้าม่านโปร่ง (Sheer)': {} },
    'ม่านอื่นๆ': { 'มู่ลี่ (Blinds)': {}, 'ม่านม้วน (Roller Blinds)': {} }
  },
  styles: ['ม่านลอน', 'ม่านจีบ', 'ม่านพับ', 'มู่ลี่', 'ม่านม้วน', 'ม่านปรับแสง'],
  styleImages: {} as Record<string, string>,
  actions: ['รวบซ้าย', 'รวบขวา', 'แยกกลาง', 'โซ่ดึงซ้าย', 'โซ่ดึงขวา', 'โซ่ดึงซ้าย-ขวา'],
  masks: {} as Record<string, Record<string, string>>,
  tracks: ['รางลอนเทป', 'รางจีบ', 'รางโชว์', 'ม่านพับ', 'กล่องมู่ลี่'],
  brackets: ['ติดเพดาน (ยึดฝ้า)', 'ติดผนัง'], 
  accessories: ['-', 'ด้ามจูงอะคริลิค', 'ด้ามจูงไม้', 'สายรวบม่านแบบพู่', 'ตะขอเกี่ยวสายรวบม่าน'],
  hangStyles: ['หัวผ้าม่านแขวนปิดราง', 'หัวผ้าม่านแขวนใต้ราง (โชว์ราง)'],
  margins: {
    horizontal: ['-', 'พอดีเฟรม', 'บวกเพิ่ม 10 ซม.', 'บวกเพิ่ม 15 ซม.', 'ชนผนัง', 'ระบุเอง...'],
    top: ['ติดกล่องบังราง', 'ติดเพดาน', 'บวกจากขอบเฟรม 10 ซม.', 'ระบุเอง...'],
    bottom: ['ลอยจากพื้น 1 ซม.', 'ลอยจากพื้น 2 ซม.', 'พอดีพื้น', 'คลุมบัวพื้น', 'ระบุเอง...']
  },
  marginImages: {} as Record<string, string>
};

export const DEFAULT_ACCOUNTS: Account[] = [
  { id: '1', username: 'Admin', password: '1234', role: 'admin', name: 'ผู้ดูแลระบบ', signatureUrl: '' },
  { id: '2', username: 'T65099', password: '65099', role: 'user', name: 'พนักงานทดสอบ', signatureUrl: '' }
];
