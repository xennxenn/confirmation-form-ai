/**
 * Helper to build high-precision photorealistic curtain prompts for Gemini image generation
 * strictly following the 14 curtain style rules and specification guidelines.
 */

export interface CurtainAreaSpec {
  areaIndex: number;
  width?: string;
  height?: string;
  minX?: number;
  maxX?: number;
  minY?: number;
  maxY?: number;
  maskPct?: number;
  fabrics?: any[];
  styleMain1?: string;
  styleAction1?: string;
  points?: { x: number; y: number }[];
}

export interface CurtainPromptSpecs {
  styleName1: string;
  action1: string;
  styleName2?: string;
  action2?: string;
  layers: number;
  track?: string;
  bracket?: string;
  hangStyle?: string;
  accessories?: string[];
  marginLeft?: string;
  marginRight?: string;
  marginTop?: string;
  marginBottom?: string;
  fabricName1?: string;
  fabricColor1?: string;
  fabricSubtype1?: string;
  fabricMainType1?: string;
  fabricName2?: string;
  fabricColor2?: string;
  fabricSubtype2?: string;
  fabricMainType2?: string;
  roomPos?: string;
  width?: string;
  height?: string;
  maskPct?: number;
  boundary?: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  } | null;
  polygonPoints?: { x: number; y: number }[];
  isBayOrCorner?: boolean;
  areas?: CurtainAreaSpec[];
  hasSwatch1?: boolean;
  hasSwatch2?: boolean;
  hasGuideImage?: boolean;
}

/**
 * 5 Mandatory Roller Blind (ผ้าม่านม้วน) Opacity Levels:
 * 1. Black out: 100%
 * 2. Dim out, 0%, Zebra Blinds: 99%
 * 3. 1%: 98%
 * 4. 3%: 97%
 * 5. 5%: 95%
 */
export function getRollerBlindOpacitySpecs(
  styleName1: string,
  fabricName1: string = '',
  fabricColor1: string = '',
  subtype1: string = '',
  mainType1: string = ''
): { opacityPct: number; category: string; description: string } {
  const combined = `${styleName1} ${fabricName1} ${fabricColor1} ${subtype1} ${mainType1}`.toLowerCase();

  // 1. Black out -> 100%
  if (
    combined.includes('black out') ||
    combined.includes('blackout') ||
    combined.includes('แบล็คเอาท์') ||
    combined.includes('แบล็คเอ้าท์') ||
    combined.includes('แบล็กเอาท์') ||
    combined.includes('ทึบแสง 100%') ||
    combined.includes('100%')
  ) {
    return {
      opacityPct: 100,
      category: 'Black out (ค่าความทึบ 100%)',
      description: '100% Total Blackout Opacity (ค่าความทึบ 100%). The roller fabric is completely solid and impenetrable to light. ZERO daylight passes through. The window glass, mullions, frames, door handles, and exterior scenery behind the blind are 100% COMPLETELY HIDDEN AND INVISIBLE.'
    };
  }

  // 2. Dim out, 0%, Zebra Blinds -> 99%
  if (
    combined.includes('dim out') ||
    combined.includes('dimout') ||
    combined.includes('ดิมเอาท์') ||
    combined.includes('ดิมเอ้าท์') ||
    combined.includes('0%') ||
    combined.includes('0 %') ||
    combined.includes('zebra') ||
    combined.includes('ซีบร้า') ||
    combined.includes('ม่านม้วนซีบร้า') ||
    combined.includes('ม่านม้วนดิมเอาท์') ||
    combined.includes('ซันสกรีน 0%')
  ) {
    return {
      opacityPct: 99,
      category: 'Dim out, 0%, Zebra Blinds (ค่าความทึบ 99%)',
      description: '99% High Opacity (ค่าความทึบ 99%, 0% openness factor). Dense, substantial fabric with 99% light blocking. The window glass, sliding door frames, and outdoor view behind the blind are 99% obscured and NOT clearly visible through the fabric. It MUST NOT look sheer or translucent.'
    };
  }

  // 3. 1% -> 98%
  if (combined.includes('1%') || combined.includes('1 %')) {
    return {
      opacityPct: 98,
      category: '1% Sunscreen (ค่าความทึบ 98%)',
      description: '98% Dense Opacity (ค่าความทึบ 98%, 1% openness factor). Tight dense weave with high glare protection. Window frames behind the blind are virtually invisible with only negligible silhouette transmission.'
    };
  }

  // 4. 3% -> 97%
  if (combined.includes('3%') || combined.includes('3 %')) {
    return {
      opacityPct: 97,
      category: '3% Sunscreen (ค่าความทึบ 97%)',
      description: '97% Opacity (ค่าความทึบ 97%, 3% openness factor). Fine sunscreen weave with 97% opacity, softly diffusing bright daylight while maintaining high interior privacy.'
    };
  }

  // 5. 5% -> 95%
  if (combined.includes('5%') || combined.includes('5 %')) {
    return {
      opacityPct: 95,
      category: '5% Sunscreen (ค่าความทึบ 95%)',
      description: '95% Opacity (ค่าความทึบ 95%, 5% openness factor). Sunscreen weave with 95% opacity, filtering direct harsh sunlight while allowing soft diffuse light into the room.'
    };
  }

  // Default for Roller Blinds if no openness rate is specified: Default to 99% Dim out / high opacity
  return {
    opacityPct: 99,
    category: 'Standard Roller Blind (ค่าความทึบ 99%)',
    description: 'High Opacity 99% solid tailored roller shade fabric (ค่าความทึบ 99%). Crisp, flat, dense fabric. DO NOT render as sheer or see-through.'
  };
}

/**
 * 14 Specified Curtain Rules:
 * 1. ม่านจีบ คือ Pinch Pleat Curtains (หากการแขวนปิดรางม่านใช้เป็น Pinch Pleat Curtains on Track) ต้องเป็นแบบ 3 จีบเท่านั้น
 * 2. ม่านลอน หรือ ม่านลอนเทป คือ Ripple Fold Curtains
 * 3. ม่านเจาะห่วง คือ Grommet Curtains
 * 4. ม่านลอน (โปร่งจีบ) คือ Ripple Fold Curtains with sheer Pinch Pleat Curtains underlayer
 * 5. ม่านห่วงคล้อง คือ Tab top curtains
 * 6. ม่านพับ คือ Roman shades
 * 7. มู่ลี่ คือ Venetian blind
 * 8. มู่ลี่อลูมิเนียม คือ Aluminum venetian blinds
 * 9. ม่านม้วน คือ Roller shades
 * 10. ม่านม้วนสกายไลท์ คือ Skylight roller blinds
 * 11. ม่านปรับแสง คือ Vertical blinds
 * 12. ม่านเสียบตะขอ คือ Hook top curtains
 * 13. ม่านจีบ (โปร่งพับ) คือ Pinch pleat curtains with sheer Roman shade
 * 14. ม่านสอดราง คือ Rod pocket curtains
 */
export function mapCurtainStyleRule(styleName: string, hangStyle: string = ''): string {
  const s = (styleName || '').trim();
  const h = (hangStyle || '').trim();
  const isCoverTrack = h.includes('ปิดราง') || h.includes('บังราง');

  if (s.includes('ม่านจีบ (โปร่งพับ)')) {
    return 'Pinch Pleat Curtains (strictly 3-finger triple pinch pleats) on the main layer, with a sheer Roman shade underlayer';
  }
  if (s.includes('ม่านลอน (โปร่งจีบ)')) {
    return 'Ripple Fold Curtains (uniform S-wave ripples) on the main layer, with sheer Pinch Pleat Curtains (strictly 3-finger triple pinch pleats) underlayer';
  }
  if (s.includes('มู่ลี่อลูมิเนียม')) {
    return 'Aluminum venetian blinds with slim horizontal metallic slats, clean cord controls, no wide fabric ladder tapes';
  }
  if (s.includes('มู่ลี่')) {
    return 'Venetian blind with horizontal timber or faux-wood slats and clean slat alignment';
  }
  if (s.includes('ม่านม้วนสกายไลท์')) {
    return 'Skylight roller blinds neatly tensioned along the overhead glass skylight frame';
  }
  if (s.includes('ม่านม้วน')) {
    return 'Roller shades, modern flat fabric roller blind with exposed open top roller tube (ไม่มีกล่องบังราง ให้เห็นตัวม้วนม่านม้วนทรงกระบอกด้านบนอย่างชัดเจน, NO pelmet box, NO cassette fascia)';
  }
  if (s.includes('ม่านปรับแสง')) {
    return 'Vertical blinds with uniform vertical fabric louvers hanging straight';
  }
  if (s.includes('ม่านเจาะห่วง') || s.toLowerCase().includes('grommet') || s.toLowerCase().includes('eyelet')) {
    return 'Grommet / Eyelet Curtains (ม่านเจาะห่วง) featuring prominent circular metal grommet rings punched into the reinforced top fabric heading, visibly sliding along an exposed decorative curtain pole (such as a 19mm titanium or metal rod). Deep sinusoidal S-curve folds cascade directly from the rings. ABSOLUTELY NO PINCH PLEATS, NO 3-FINGER PLEATS, NO CONCEALED TRACKS!';
  }
  if (s.includes('ม่านห่วงคล้อง')) {
    return 'Tab top curtains with fabric loop straps hung over a curtain pole';
  }
  if (s.includes('ม่านพับ')) {
    return 'Roman shades with crisp, clean horizontal cascading fabric folds when raised or flat neat panels when lowered';
  }
  if (s.includes('ม่านเสียบตะขอ')) {
    return 'Hook top curtains mounted on classic hooks';
  }
  if (s.includes('ม่านสอดราง')) {
    return 'Rod pocket curtains with top sewn-in casing shirred directly over the curtain rod';
  }
  if (s.includes('ม่านลอน') || s.includes('ม่านลอนเทป')) {
    return 'Ripple Fold Curtains (S-Fold drapery) featuring continuous, uniform, deep S-wave vertical ripples with perfectly consistent wave spacing from ceiling/track to hem. NO pinch pleats on this curtain';
  }
  if (s.includes('ม่านจีบ')) {
    if (isCoverTrack) {
      return 'Pinch Pleat Curtains on Track (MUST be strictly 3-finger triple pinch pleats, with curtain heading standing up to conceal and hide the track completely)';
    }
    return 'Pinch Pleat Curtains (MUST be strictly 3-finger triple pinch pleats, with crisp 3 neat folded fingers per pleat grouped at regular intervals along the header)';
  }

  return s || 'Tailored interior drapery';
}

export function buildCurtainAiPrompt(specs: CurtainPromptSpecs): string {
  let rawStyle1 = (specs.styleName1 || '').trim();
  let rawStyle2 = (specs.styleName2 || '').trim();
  const fName1 = (specs.fabricName1 || '').trim();
  const fName2 = (specs.fabricName2 || '').trim();
  const fSub1 = (specs.fabricSubtype1 || '').trim();
  const fSub2 = (specs.fabricSubtype2 || '').trim();
  const fMain1 = (specs.fabricMainType1 || '').trim();

  // Category classification
  const isVenetian = rawStyle1.includes('มู่ลี่') || fName1.toLowerCase().includes('water proof') || fSub1.includes('มู่ลี่') || fMain1.includes('มู่ลี่');
  const isRoller = rawStyle1.includes('ม่านม้วน') || rawStyle1.includes('สกายไลท์') || fSub1.includes('ม่านม้วน');
  const isRoman = rawStyle1.includes('ม่านพับ') && !rawStyle1.includes('ม่านจีบ') && !rawStyle1.includes('ม่านลอน');
  const isVerticalBlind = rawStyle1.includes('ม่านปรับแสง');
  const isBlindOrShade = isVenetian || isRoller || isRoman || isVerticalBlind;
  const isGrommet = rawStyle1.includes('เจาะห่วง') || rawStyle1.toLowerCase().includes('grommet') || rawStyle1.toLowerCase().includes('eyelet');
  const isRippleFold = (rawStyle1.includes('ม่านลอน') || rawStyle1.includes('ลอนเทป') || rawStyle1.toLowerCase().includes('ripple') || rawStyle1.toLowerCase().includes('s-fold')) && !isGrommet;
  const isPinchPleat = (rawStyle1.includes('ม่านจีบ') || rawStyle1.toLowerCase().includes('pinch')) && !isGrommet && !isRippleFold;

  // Venetian Blinds with Fabric Ladder Tape detection
  const isVenetianWithTape = isVenetian && (
    rawStyle2.includes('เทป') ||
    fName2.toUpperCase().includes('TAPE') ||
    fName2.includes('เทป') ||
    fSub2.includes('เทป') ||
    specs.hasSwatch2 ||
    (specs.accessories || []).some(a => (a || '').includes('เทป'))
  );

  // Determine whether it's truly a 2-layer drapery system (Opaque Drapery + Sheer Underlayer)
  // For Venetian blinds, Roller blinds, Roman shades, or Vertical blinds, it is NEVER a 2-layer sheer+drapery system!
  let is2Layers = specs.layers === 2;
  if (isBlindOrShade) {
    is2Layers = false;
  }

  if (rawStyle1.includes('ม่านลอน (โปร่งจีบ)')) {
    is2Layers = true;
    rawStyle1 = 'ม่านลอน';
    if (!rawStyle2) rawStyle2 = 'ม่านจีบ';
  } else if (rawStyle1.includes('ม่านจีบ (โปร่งพับ)')) {
    is2Layers = true;
    rawStyle1 = 'ม่านจีบ';
    if (!rawStyle2) rawStyle2 = 'ม่านพับ';
  } else if (rawStyle1.includes('ม่านจีบ (โปร่งลอน)')) {
    is2Layers = true;
    rawStyle1 = 'ม่านจีบ';
    if (!rawStyle2) rawStyle2 = 'ม่านลอน';
  } else if (rawStyle1.includes('ม่านลอน (โปร่งพับ)')) {
    is2Layers = true;
    rawStyle1 = 'ม่านลอน';
    if (!rawStyle2) rawStyle2 = 'ม่านพับ';
  }

  const style1En = mapCurtainStyleRule(rawStyle1, specs.hangStyle);
  const style2En = is2Layers ? mapCurtainStyleRule(rawStyle2 || 'ม่านโปร่ง', specs.hangStyle) : null;

  // Opening actions
  const a1 = (specs.action1 || '').trim();
  const isA1OneWayLeft = a1.includes('ซ้าย') && !a1.includes('กลาง');
  const isA1OneWayRight = a1.includes('ขวา') && !a1.includes('กลาง');
  const isA1Split = a1.includes('กลาง') || a1.includes('แยก') || a1.includes('2 ผืน');
  const isA1OneWay = isA1OneWayLeft || isA1OneWayRight || a1.includes('ข้าง') || a1.includes('ทางเดียว') || a1.includes('1 ผืน') || a1.includes('ด้านเดียว');

  let action1En = 'standard full coverage';
  if (isBlindOrShade) {
    if (a1.includes('โซ่') || a1.includes('ดึง')) {
      action1En = `precision cord/chain tilt and lift control (${a1 || 'side controls'})`;
    } else {
      action1En = 'neatly lowered window blind providing uniform coverage';
    }
  } else {
    action1En = isA1OneWayLeft
      ? 'one-way draw to the left side (single drapery panel gathered on the left, right side open)'
      : isA1OneWayRight
        ? 'one-way draw to the right side (single drapery panel gathered on the right, left side open)'
        : isA1Split
          ? 'center split parting symmetrically to both left and right sides (two panels)'
          : 'standard full-coverage draw';
  }

  const a2 = (specs.action2 || specs.action1 || '').trim();
  const isA2OneWay = a2.includes('ข้าง') || a2.includes('ทางเดียว') || a2.includes('ซ้าย') || a2.includes('ขวา') || a2.includes('1 ผืน');
  const action2En = isA2OneWay
    ? 'one-way draw to side'
    : 'center split parting to both sides';

  // Detect Bay Window, Corner Window, or Alcove (แบบโค้งหรือแบบตรงตามที่พื้นที่ผ้าม่านและสเปกกำหนด)
  // NEVER assume a 4-point straight window is a bay/curved window!
  const isBay = (() => {
    if (specs.isBayOrCorner) return true;
    const room = (specs.roomPos || '').toLowerCase();
    const track = (specs.track || '').toLowerCase();

    // Explicit curved track
    const explicitCurvedTrack = track.includes('โค้ง') || track.includes('ดัด') || track.includes('curve');
    if (explicitCurvedTrack) return true;

    // Explicit bay / corner room name AND polygon with >= 5 vertices tracing the walls
    const explicitBayRoom = room.includes('เบย์') || room.includes('bay') || room.includes('เข้ามุม') || room.includes('หักมุม') || room.includes('โค้ง');
    if (explicitBayRoom && specs.polygonPoints && specs.polygonPoints.length >= 5) return true;

    return false;
  })();

  // Panel & Blind Quantity configuration
  const numAreas = (specs.areas && specs.areas.length > 0) ? specs.areas.length : 1;
  let panelConfigText = '';

  if (numAreas >= 2) {
    panelConfigText = `
======================================================================
CRITICAL: STRICT MULTI-SET SEGMENTATION (${numAreas} ชุดอย่างเคร่งครัด)
======================================================================
TOTAL NUMBER OF INDEPENDENT BLINDS / CURTAIN UNITS: EXACTLY ${numAreas} SEPARATE UNITS SIDE-BY-SIDE.
(แบ่งชุดม่าน/มู่ลี่ออกเป็น ${numAreas} ชุดเรียงต่อกันในแนวนอนอย่างเคร่งครัด)

STRICT MANDATORY RULES:
1. The user has measured and designated EXACTLY ${numAreas} SEPARATE BLIND/CURTAIN UNITS installed side-by-side across this window.
2. DO NOT combine them into 1 single wide blind!
3. DO NOT generate more than ${numAreas} blinds!
${numAreas === 2 ? `
4. *** CRITICAL ARCHITECTURAL DISTINCTION FROM BACKGROUND WINDOW PANES ***:
   - In the background source photo, the glass window or sliding door frame may have 3 glass sections / vertical mullions.
   - DO NOT BLINDLY FOLLOW THE 3 BACKGROUND GLASS PANES!
   - The interior blinds are strictly TWO (2) BLIND UNITS (${numAreas} ชุด).
   - Divide the entire horizontal width into EXACTLY TWO (2) EQUAL BLIND SETS (50% width on the Left half, 50% width on the Right half).
   - There must be a clean vertical division seam between the two blinds right down the middle.
   - Generating 3 blinds or 1 single blind is a FATAL ERROR. MUST BE EXACTLY 2 BLINDS SIDE-BY-SIDE.
` : `
4. Render EXACTLY ${numAreas} separate units side-by-side, each aligned with its corresponding measured area.
`}

INDIVIDUAL UNIT DETAILS:
${specs.areas?.map((a, i) => `  * Unit ${i + 1} (บานที่ ${a.areaIndex}): ${a.width ? `Width ${a.width} cm` : ''} ${a.height ? `x Height ${a.height} cm` : ''} ${a.minX !== undefined && a.maxX !== undefined ? `[Spans horizontally from X: ${a.minX.toFixed(1)}% to ${a.maxX.toFixed(1)}%]` : ''}`).join('\n')}
======================================================================
`;
  } else {
    if (rawStyle1.includes('ม่านพับ')) {
      panelConfigText = `
BLIND CONFIGURATION (ROMAN SHADE):
- EXACTLY ONE SINGLE continuous Roman shade unit (ม่านพับ 1 ผืน/ชุด เต็มความกว้างบาน).
- DO NOT generate two separate Roman shades side-by-side! It MUST be one single unbroken horizontal shade spanning the entire designated window width.
`;
    } else if (rawStyle1.includes('ม่านม้วน')) {
      panelConfigText = `
BLIND CONFIGURATION (ROLLER SHADE):
- EXACTLY ONE SINGLE continuous roller shade unit (ม่านม้วน 1 ผืนเต็มความกว้าง).
- DO NOT split into two separate blinds!
`;
    } else if (rawStyle1.includes('มู่ลี่')) {
      panelConfigText = `
BLIND CONFIGURATION (VENETIAN BLINDS):
- EXACTLY ONE SINGLE continuous blind unit (มู่ลี่ 1 ชุด เต็มความกว้างบาน).
- DO NOT split into multiple blinds!
`;
    } else if (isA1OneWayLeft) {
      panelConfigText = `
======================================================================
PANEL CONFIGURATION: ONE-WAY DRAW TO THE LEFT (รวบซ้าย - ผ้าม่าน 1 ผืนเก็บซ้าย)
======================================================================
1. EXACTLY ONE (1) OPAQUE CURTAIN PANEL IN TOTAL (ผ้าม่านทึบ 1 ผืนเท่านั้น):
   - The curtain is a single panel gathered and stacked ONLY ON THE LEFT SIDE of the opening, within the left ~20-30% of the designated boundary.
   - It hangs neatly from the top track down to the bottom boundary.
2. RIGHT SIDE AND CENTER REMAIN COMPLETELY OPEN (ด้านขวาและตรงกลางเปิดโล่ง):
   - ABSOLUTELY NO OPAQUE CURTAIN ON THE RIGHT SIDE! ZERO drapery on the right half.
   - The right side and walkway/doorway must remain completely clear, unobstructed, and see-through.
   - DO NOT place a curtain stack on the right side!
${is2Layers ? `
3. DUAL-LAYER / 2-LAYER OPERATION (ระบบม่าน 2 ชั้น):
   - Layer 1 (Main Opaque): Gathered and stacked on the LEFT side only (รวบซ้าย 1 ผืน).
   - Layer 2 (Sheer Underlayer): White translucent sheer curtain. If sheer action is also "รวบซ้าย", the sheer is also gathered on the left side with the main curtain. If drawn across the glass, it provides a soft sheer filter while the main curtain remains stacked on the left.
` : ''}
4. STRICT BOUNDARY RESTRICTION (ผ้าม่านต้องอยู่ในกรอบพื้นที่ผ้าม่านไม่ขาด ไม่เกิน):
   - The curtain must stay strictly within the designated boundary frame.
   - DO NOT spill over onto the adjacent left wall molding! Keep it inside the opening frame.
======================================================================
`;
    } else if (isA1OneWayRight) {
      panelConfigText = `
======================================================================
PANEL CONFIGURATION: ONE-WAY DRAW TO THE RIGHT (รวบขวา - ผ้าม่าน 1 ผืนเก็บขวา)
======================================================================
1. EXACTLY ONE (1) OPAQUE CURTAIN PANEL IN TOTAL (ผ้าม่านทึบ 1 ผืนเท่านั้น):
   - The curtain is a single panel gathered and stacked ONLY ON THE RIGHT SIDE of the opening, within the right ~20-30% of the designated boundary.
   - It hangs neatly from the top track down to the bottom boundary.
2. LEFT SIDE AND CENTER REMAIN COMPLETELY OPEN (ด้านซ้ายและตรงกลางเปิดโล่ง):
   - ABSOLUTELY NO OPAQUE CURTAIN ON THE LEFT SIDE! ZERO drapery on the left half.
   - The left side and walkway/doorway must remain completely clear, unobstructed, and see-through.
   - DO NOT place a curtain stack on the left side!
${is2Layers ? `
3. DUAL-LAYER / 2-LAYER OPERATION (ระบบม่าน 2 ชั้น):
   - Layer 1 (Main Opaque): Gathered and stacked on the RIGHT side only (รวบขวา 1 ผืน).
   - Layer 2 (Sheer Underlayer): White translucent sheer curtain.
` : ''}
4. STRICT BOUNDARY RESTRICTION (ผ้าม่านต้องอยู่ในกรอบพื้นที่ผ้าม่านไม่ขาด ไม่เกิน):
   - The curtain must stay strictly within the designated boundary frame.
   - DO NOT spill over onto the adjacent right wall! Keep it inside the opening frame.
======================================================================
`;
    } else if (isA1Split) {
      if (isBay) {
        panelConfigText = `
======================================================================
STRICT MANDATE: ONE SINGLE CONTINUOUS CURVED TRACK WITH CENTER-SPLIT DRAPERY
(ผ้าม่านชุดเดียวบนรางดัดโค้งต่อเนื่อง 1 ชุด - รวบแยกกลางซ้ายขวา ห้ามแบ่งเป็น 3 บานเด็ดขาด!)
======================================================================
1. TOTAL NUMBER OF CURTAIN UNITS:
   - This installation is EXACTLY ONE (1) CONTINUOUS CURTAIN SET on a continuous curved/bay ceiling track (รางดัดโค้ง 1 ชุดต่อเนื่อง บานที่ 1).
   - ABSOLUTELY DO NOT SPLIT THIS ALCOVE INTO 3 SEPARATE WINDOW BLINDS OR 3 SEPARATE CURTAIN PAIRS!
   - Generating 3 separate sets of curtains across the walls is a FATAL DEFECT.
   - Do NOT treat each window pane as a separate curtain.

2. DRAPERY DRAW ACTION & STACK POSITIONS (เปิดแยกกลาง - รวบไปเก็บที่ผนังซ้ายสุดและขวาสุดเท่านั้น):
   - The main opaque drapery operates as a center-split pair (2 panels total) on this continuous curved track:
     * LEFT PANEL (รวบซ้าย): The entire left half of the curtain is drawn open and stacked neatly against the FAR LEFT WALL (ผนังซ้ายสุด).
     * RIGHT PANEL (รวบขวา): The entire right half of the curtain is drawn open and stacked neatly against the FAR RIGHT WALL (ผนังขวาสุด).
     * REAR CENTER WINDOW & INNER CORNERS: MUST BE COMPLETELY CLEAR OF OPAQUE DRAPERY!
     * ABSOLUTELY DO NOT HANG HEAVY CURTAINS IN THE TWO INNER CORNERS!
     * ABSOLUTELY DO NOT HANG HEAVY CURTAINS IN THE REAR CENTER WINDOW!
     * The center window view must remain OPEN, unobstructed, and clear!
     ${is2Layers ? `* If Sheer Underlayer is present (Layer 2 / ผ้าโปร่ง): A soft translucent white sheer curtain hangs along the track across the windows, while the main opaque curtains are stacked ONLY on the far left wall and far right wall.` : ''}

3. TOTAL VISIBLE OPAQUE PANELS:
   - EXACTLY TWO (2) OPAQUE CURTAIN PANELS IN TOTAL in the entire room:
     * 1 panel gathered against the far left wall.
     * 1 panel gathered against the far right wall.
   - ZERO panels in the middle or in the inner corners!
======================================================================
`;
      } else {
        panelConfigText = `
======================================================================
PANEL CONFIGURATION: TWO-PANEL CENTER-SPLIT (เปิดแยกกลาง - ผ้าม่าน 2 ผืน รวบซ้ายและขวา)
======================================================================
1. TWO (2) OPAQUE CURTAIN PANELS (ผ้าม่าน 2 ผืน เปิดแยกกลาง):
   - Panel 1: Gathered and stacked on the LEFT side within the boundary.
   - Panel 2: Gathered and stacked on the RIGHT side within the boundary.
   - Meeting cleanly in the center when drawn closed, or neatly stacked to left and right when open.
   - Exactly 2 panels total inside the boundary. DO NOT generate 3 panels or extra curtains in the middle!
2. STRICT BOUNDARY RESTRICTION (ผ้าม่านต้องอยู่ในกรอบพื้นที่ผ้าม่านไม่ขาด ไม่เกิน):
   - Both panels must stay 100% inside the designated boundary.
   - DO NOT spill over onto adjacent perpendicular walls!
======================================================================
`;
      }
    } else if (isA1OneWay) {
      panelConfigText = `
PANEL CONFIGURATION:
- Exactly ONE SINGLE continuous drapery panel (ผ้าม่าน 1 ผืน / One-way draw).
- The curtain is a single wide piece drawn to one side within the designated boundary.
- ABSOLUTELY DO NOT split this into two panels meeting in the middle!
`;
    }
  }

  // Dual layer architectural breakdown based on treatment category
  let layerArchitecture = '';
  if (isVenetian) {
    layerArchitecture = `
======================================================================
STRICT PRODUCT MANDATE: 100% HORIZONTAL VENETIAN BLINDS (มู่ลี่แนวนอน)
======================================================================
1. PRODUCT TYPE:
   - The window treatment MUST BE 100% HORIZONTAL VENETIAN BLINDS (horizontal slats).
   - This is NOT a fabric drapery curtain!
   - ABSOLUTELY NO PINCH PLEAT CURTAINS!
   - ABSOLUTELY NO RIPPLE FOLD CURTAINS!
   - ABSOLUTELY NO SHEER CURTAINS!
   - ABSOLUTELY NO FLOOR-LENGTH FABRIC CURTAINS HANGING ON SIDES!
2. SLAT SPECIFICATIONS:
   - Slats are clean, perfectly horizontal, parallel, and evenly spaced across the entire designated window drop.
   - Slat Width: 50mm slats (standard for wood/waterproof blinds) or 25mm (for aluminum blinds).
   - Slats are drawn down covering the designated window area with clean horizontal lines.
3. CONTROLS:
   - Tilt & Lift: Controlled via side control cords or beaded chain (${action1En}).
======================================================================
`;
  } else if (isRoller) {
    layerArchitecture = `
======================================================================
STRICT PRODUCT MANDATE: 100% FLAT FABRIC ROLLER SHADES (ม่านม้วน - ไม่มีบังราง)
======================================================================
1. PRODUCT TYPE:
   - The window treatment MUST BE 100% FLAT FABRIC ROLLER BLINDS.
   - Smooth, flat, taut fabric panel hanging straight down from a top roller tube with a weighted bottom bar.
   - ABSOLUTELY NO PINCH PLEATS, NO RIPPLE FOLDS, NO DRAPERY, NO SHEERS!
2. TOP ROLLER: OPEN ROLL MECHANISM - NO PELMET / NO VALANCE / NO CASSETTE (ไม่มีบังราง ให้เห็นเป็นม้วนม่านม้วนชัดเจน):
   - ABSOLUTELY NO pelmet, NO valance box, NO cassette box, NO fascia, and NO cornice covering the top roller!
   - THE CYLINDRICAL ROLLER TUBE WITH THE WOUND FABRIC ROLL MUST BE OPEN, EXPOSED, AND CLEARLY VISIBLE AT THE VERY TOP (เห็นตัวม้วนม่านม้วนทรงกระบอกด้านบนอย่างชัดเจน).
   - The rolled-up cylinder of fabric is visibly mounted between two clean side mounting brackets.
   - The flat fabric drops smoothly and directly down from the visible exposed roller cylinder.
3. BOTTOM & CONTROLS:
   - Bottom Finish: Clean horizontal weighted bottom bar (รางล่างถ่วงน้ำหนัก).
   - Controls: Side beaded pull chain (${action1En}) hanging alongside the window frame.
======================================================================
`;
  } else if (isRoman) {
    layerArchitecture = `
======================================================================
STRICT PRODUCT MANDATE: 100% TAILORED ROMAN SHADES (ม่านพับ)
======================================================================
1. PRODUCT TYPE:
   - Crisp, structured Roman shade with distinct horizontal fabric panels and clean horizontal batten/rod fold lines.
   - ABSOLUTELY NO VERTICAL DRAPERY CURTAINS! NO PINCH PLEATS!
======================================================================
`;
  } else if (isVerticalBlind) {
    layerArchitecture = `
======================================================================
STRICT PRODUCT MANDATE: 100% VERTICAL BLINDS (ม่านปรับแสง)
======================================================================
1. PRODUCT TYPE:
   - Vertical fabric louvers/slats hanging straight down from a top track.
   - ABSOLUTELY NO PINCH PLEAT OR RIPPLE FOLD DRAPERY!
======================================================================
`;
  } else if (is2Layers) {
    layerArchitecture = `
DUAL-TRACK TWO-LAYER CURTAIN SYSTEM:
1. FRONT LAYER (Room Interior Track) - MAIN OPAQUE CURTAIN:
   - Style: ${style1En}
   - Draw Style: ${action1En}
   - Position: Facing the room interior on the front track.
   - Detail: Must STRICTLY display the style characteristics of [${rawStyle1}].
     * If Ripple Fold (ม่านลอน): Uniform S-curves with continuous wave ripples. MUST NOT have pinch pleats on this front layer.
     * If Pinch Pleat (ม่านจีบ): Crisp 3-finger triple pinch pleats.
2. REAR LAYER (Window Glass Track) - TRANSLUCENT SHEER UNDERLAYER:
   - Style: ${style2En}
   - Draw Style: ${action2En}
   - Position: Installed behind the main curtain, directly in front of the window glass.
   - Detail: Lightweight, ethereal translucent sheer fabric letting soft daylight filter into the room.
     * If Pinch Pleat (ม่านจีบ/โปร่งจีบ): MUST have distinct, neat 3-finger pinch pleats along the sheer heading tape.
     * If Ripple Fold (ม่านลอน/โปร่งลอน): Smooth continuous S-waves.
   - NOTE: The front and rear layers have DIFFERENT styles as defined above. Do NOT render them identically!
`;
  } else {
    if (isGrommet) {
      layerArchitecture = `
======================================================================
CRITICAL STYLE MANDATE: 100% GROMMET / EYELET CURTAINS (ม่านเจาะห่วง)
======================================================================
1. HEADING STYLE & CONSTRUCTION:
   - This curtain is 100% GROMMET / EYELET CURTAIN (ม่านเจาะห่วง).
   - Large circular metallic grommet/eyelet rings (ห่วงตาไก่โลหะ) are punched directly through the reinforced fabric heading band at regular intervals.
   - The decorative cylindrical curtain pole (exposed 19mm titanium or metal drapery pole) passes directly THROUGH every single grommet ring!
   - The metallic grommet rings MUST BE CLEARLY VISIBLE spaced along the exposed curtain pole.
   - The fabric naturally forms deep, soft S-curve cylindrical folds cascading down directly from the rings on the pole.
   - The top edge of the fabric (ruffle header) stands up only approx 2.5 to 3 cm above the top of the rod.
2. DRAW ACTION:
   - ${action1En}
3. ABSOLUTE HARD NEGATIVE RESTRICTIONS (FATAL DEFECT IF VIOLATED):
   - ABSOLUTELY NO PINCH PLEATS (ห้ามใส่จีบม่าน หรือจีบ 3 จีบเด็ดขาด)!
   - ABSOLUTELY NO TRIPLE-FINGER PLEATS OR HEADING TAPE!
   - ABSOLUTELY NO CURTAIN HOOKS OR SLIDERS!
   - ABSOLUTELY NO CONCEALED TRACKS, PELMET BOXES, CASSETTES, OR CORNICES!
   - The decorative cylindrical pole and its wall brackets MUST BE FULLY EXPOSED.
======================================================================
`;
    } else if (isRippleFold) {
      layerArchitecture = `
======================================================================
CRITICAL STYLE MANDATE: 100% RIPPLE FOLD / S-FOLD CURTAINS (ม่านลอน)
======================================================================
1. HEADING STYLE & CONSTRUCTION:
   - This curtain is 100% RIPPLE FOLD / S-FOLD CURTAINS (ม่านลอน).
   - Uniform, continuous, unbroken sinusoidal S-curve waves flowing smoothly from the top track down to the hem with equal wave spacing.
2. ABSOLUTE HARD NEGATIVE RESTRICTIONS:
   - ABSOLUTELY NO PINCH PLEATS! NO 3-FINGER PLEATS!
   - ABSOLUTELY NO GROMMET RINGS!
======================================================================
`;
    } else if (isPinchPleat) {
      layerArchitecture = `
======================================================================
CRITICAL STYLE MANDATE: 100% PINCH PLEAT CURTAINS (ม่านจีบ 3 จีบ)
======================================================================
1. HEADING STYLE & CONSTRUCTION:
   - This curtain is 100% PINCH PLEAT CURTAINS (ม่านจีบ).
   - Distinct, crisp 3-finger triple pinch pleats (จีบ 3 แฉก) neatly folded and stitched at regular intervals along the header tape.
2. ABSOLUTE HARD NEGATIVE RESTRICTIONS:
   - ABSOLUTELY NO GROMMET RINGS! NO EYELET HOLES!
   - ABSOLUTELY NO RIPPLE WAVE TAPE!
======================================================================
`;
    } else {
      layerArchitecture = `
SINGLE-LAYER CURTAIN SYSTEM:
- Style: ${style1En}
- Draw Style: ${action1En}
- Single track installation without any sheer underlayer.
`;
    }
  }

  // Venetian Blinds with Fabric Ladder Tape
  let venetianTapeSection = '';
  if (isVenetianWithTape) {
    venetianTapeSection = `
======================================================================
VENETIAN BLINDS WITH VERTICAL FABRIC LADDER TAPE (มู่ลี่ติดเทปผ้า):
======================================================================
- The venetian blinds MUST feature wide decorative vertical cloth ladder tapes (เทปผ้ามู่ลี่, approx 25mm to 38mm wide vertical fabric webbing/straps) running vertically from top headrail to bottom rail across the horizontal slats.
- Fabric Tape Styling: Replicate the decorative ladder tape appearance and color from Reference Swatch 2 / Tape spec: "${specs.fabricColor2 || specs.fabricName2 || 'neutral fabric ladder tape'}".
- Slat & Tape Contrast: The vertical fabric tapes must be straight, crisp, parallel, and evenly spaced across each blind unit (typically 2 to 3 vertical tape strips per blind set), securing the horizontal slats neatly.
======================================================================
`;
  }

  // Roller Blind Opacity Section
  let rollerOpacitySection = '';
  const isRollerStyle = rawStyle1.includes('ม่านม้วน') || rawStyle1.includes('สกายไลท์') || (specs.fabricName1 || '').toLowerCase().includes('0%') || (specs.fabricName1 || '').toLowerCase().includes('bin') || (specs.fabricName1 || '').toLowerCase().includes('roller');
  if (isRollerStyle) {
    const opacitySpec = getRollerBlindOpacitySpecs(
      rawStyle1,
      specs.fabricName1,
      specs.fabricColor1,
      specs.fabricSubtype1,
      specs.fabricMainType1
    );
    rollerOpacitySection = `
======================================================================
ROLLER BLIND FABRIC OPACITY SPECIFICATION (MANDATORY):
- Classification: ${opacitySpec.category}
- Target Light Opacity: ${opacitySpec.opacityPct}%
- Visual Rendering Directive:
  ${opacitySpec.description}
  * Texture: Render flat, crisp modern roller blind textile surface with realistic fine weave texture.
  * Transparency Constraint: DO NOT render this roller shade as see-through or transparent mesh! Window glass, mullions, and exterior patio/trees behind the blind must NOT be clearly visible through this ${opacitySpec.opacityPct}% opaque blind.
======================================================================
`;
  }

  // Mask drop proportion section for Roller Blinds, Venetian Blinds, and Roman Shades
  let maskDropSection = '';
  const effectiveMaskPct = specs.maskPct !== undefined 
    ? specs.maskPct 
    : (specs.areas?.[0]?.maskPct !== undefined ? specs.areas[0].maskPct : 100);

  if (isBlindOrShade) {
    const productName = isRoller ? 'roller blind (ม่านม้วน)' : isVenetian ? 'Venetian blind slats (มู่ลี่)' : isRoman ? 'Roman shade (ม่านพับ)' : 'blind';
    if (effectiveMaskPct < 95) {
      maskDropSection = `
======================================================================
MANDATORY BLIND DROP EXTENSION / MASK PROPORTION (${effectiveMaskPct}% LOWERED):
======================================================================
- The user has explicitly specified that this blind MUST BE LOWERED DOWN TO EXACTLY ${effectiveMaskPct}% OF THE WINDOW HEIGHT (สัดส่วนปิดผ้าม่าน ${effectiveMaskPct}% ตาม Mask).
- VERTICAL DROP COVERAGE:
  * Top ${effectiveMaskPct}% of the window opening: Covered by the ${productName} (hanging from the top mounting brackets down to exactly ${effectiveMaskPct}% of the window height).
  * Bottom ${100 - effectiveMaskPct}% of the window opening: COMPLETELY OPEN AND UNOBSTRUCTED! The window glass, window frame/mullions, and the outdoor scenery (lake, trees, sky, greenery) in the bottom ${100 - effectiveMaskPct}% MUST BE FULLY VISIBLE, untouched, exactly as in the original room photo!
  * The bottom horizontal rail/hem of the blind hovers horizontally at exactly ${effectiveMaskPct}% down from the top of the window frame!
  * DO NOT lower the blind all the way to the bottom sill! It MUST stop and remain open below the ${effectiveMaskPct}% line!
======================================================================
`;
    } else {
      maskDropSection = `
======================================================================
MANDATORY BLIND DROP EXTENSION / MASK PROPORTION (100% FULLY CLOSED):
======================================================================
- The ${productName} is 100% FULLY LOWERED, extending all the way down to cover the entire window opening from top to bottom sill.
======================================================================
`;
    }
  }

  // Track & Mounting
  let trackDescription = '';
  let hangDescription = '';
  let bracketDescription = '';

  if (isVenetian) {
    trackDescription = 'Headrail: Low-profile rectangular Venetian blind headrail / valance cassette matching slat tone, cleanly concealing the internal tilt mechanism.';
    if (specs.bracket?.includes('เพดาน') || specs.bracket?.includes('ฝ้า')) {
      bracketDescription = 'Mounting: Top ceiling-mounted directly into the ceiling/soffit.';
    } else {
      bracketDescription = 'Mounting: Face-mounted to wall frame directly above the window.';
    }
    hangDescription = 'Hardware: Flush architectural blind headrail.';
  } else if (isRoller) {
    trackDescription = 'Top Tube: EXPOSED OPEN ROLLER TUBE (ไม่มีบังราง). The cylindrical roll of fabric wrapped around the top aluminum roller tube is OPEN, EXPOSED, and CLEARLY VISIBLE at the top of the blind. ABSOLUTELY NO cassette box, NO pelmet box, and NO valance fascia covering or hiding the roller.';
    bracketDescription = specs.bracket?.includes('เพดาน') ? 'Mounting: Ceiling mounted side brackets.' : 'Mounting: Wall mounted side brackets.';
    hangDescription = 'Hardware: Exposed open-roll roller tube with sleek side mounting brackets and side bead chain.';
  } else if (isRoman) {
    trackDescription = 'Headrail: Compact Velcro Roman shade aluminum track.';
    bracketDescription = specs.bracket?.includes('เพดาน') ? 'Mounting: Ceiling mounted.' : 'Mounting: Wall mounted.';
    hangDescription = 'Hardware: Flush concealed mounting.';
  } else {
    trackDescription = 'Drapery Track: Precision architectural curtain track.';
    if (specs.track) {
      if (specs.track.includes('รางม่านลอน') || specs.track.includes('รางเทป')) {
        trackDescription = 'Track: Specialized Ripple-fold / S-Fold drapery track with interconnected wheeled carriers ensuring perfectly uniform wave spacing.';
      } else if (specs.track.includes('รางไมโคร') || specs.track.includes('รางตัวซี') || specs.track.includes('รางอลูมิเนียม')) {
        trackDescription = 'Track: Low-profile slim white aluminum architectural drapery track.';
      } else if (specs.track.includes('ไทเทเนียม') || specs.track.includes('19')) {
        trackDescription = 'Track: Decorative 19mm cylindrical curtain pole in sleek titanium finish (รางโชว์ไทเทเนียม 19 มม.) with wall-mounted brackets and matching finials.';
      } else if (specs.track.includes('รางโชว์') || specs.track.includes('ห่วง')) {
        trackDescription = 'Track: Decorative cylindrical curtain pole / rod with matching end finials.';
      } else if (specs.track && specs.track !== '-') {
        trackDescription = `Track: ${specs.track}.`;
      }
    }

    if (isGrommet) {
      hangDescription = 'Heading: GROMMET / EYELET HEADERS (ม่านเจาะห่วง). Round metallic eyelet grommet rings punched into the reinforced fabric top, sliding along the exposed decorative curtain pole. The pole passes through the grommet rings with wall-mount brackets. ABSOLUTELY NO PINCH PLEATS!';
    } else if (specs.hangStyle) {
      if (specs.hangStyle.includes('หลุมฝ้า') || specs.hangStyle.includes('หลุม') || (specs.hangStyle.includes('ใต้ราง') && specs.hangStyle.includes('บังราง'))) {
        hangDescription = 'Heading: Recessed ceiling pocket / pelmet installation (หลุมฝ้า/บังราง). The curtain track is mounted inside the recessed ceiling pocket, and the top headings of the curtains emerge neatly from the ceiling pocket/recess.';
      } else if (specs.hangStyle.includes('ปิดราง') || specs.hangStyle.includes('บังราง')) {
        hangDescription = 'Heading: Track-concealing top heading (ปิดราง) where the fabric heading stands up to completely hide and conceal the track and runners from view.';
      } else if (specs.hangStyle.includes('โชว์ราง') || specs.hangStyle.includes('ใต้ราง')) {
        hangDescription = 'Heading: Cleanly suspended under the visible track (โชว์ราง).';
      } else if (specs.hangStyle.includes('กล่องม่าน')) {
        hangDescription = 'Heading: Recessed inside a recessed ceiling curtain pocket / pelmet box.';
      }
    }

    if (specs.bracket) {
      if (specs.bracket.includes('เพดาน') || specs.bracket.includes('ฝ้า')) {
        bracketDescription = 'Mounting: Ceiling-mounted directly into the ceiling soffit.';
      } else if (specs.bracket.includes('ผนัง')) {
        bracketDescription = 'Mounting: Wall-mounted onto the wall directly above the window frame.';
      }
    }
  }

  // Margin Details: Top, Left, Right
  let marginDetails = '';
  if (specs.marginTop) {
    const mt = specs.marginTop.trim();
    if (mt.includes('ติดเพดาน') || mt.includes('ฝ้า')) {
      marginDetails += '\n- Top Margin (ขอบบน): Mounted directly to the ceiling (ติดเพดาน). The curtain hangs starting from the ceiling down to the specified bottom hem line.';
    } else if (mt.includes('กล่องบังราง') || mt.includes('หลุม')) {
      marginDetails += '\n- Top Margin (ขอบบน): Installed in recessed ceiling pelmet box / drop ceiling pocket (ติดหลุมฝ้า/กล่องบังราง).';
    } else if (mt && mt !== '-') {
      marginDetails += `\n- Top Margin (ขอบบน): ${mt}.`;
    }
  }
  if (specs.marginLeft) {
    const ml = specs.marginLeft.trim();
    if (ml.includes('พอดีเฟรม') || ml.includes('เฟรม')) {
      marginDetails += '\n- Left Margin (ขอบซ้าย): Flush with the left window/door frame edge (พอดีเฟรม).';
    } else if (ml.includes('ชนผนัง')) {
      marginDetails += '\n- Left Margin (ขอบซ้าย): Extending all the way to touch the adjacent left wall (ชนผนัง).';
    } else if (ml && ml !== '-') {
      marginDetails += `\n- Left Margin (ขอบซ้าย): ${ml}.`;
    }
  }
  if (specs.marginRight) {
    const mr = specs.marginRight.trim();
    if (mr.includes('พอดีเฟรม') || mr.includes('เฟรม')) {
      marginDetails += '\n- Right Margin (ขอบขวา): Flush with the right window/door frame edge (พอดีเฟรม).';
    } else if (mr.includes('ชนผนัง')) {
      marginDetails += '\n- Right Margin (ขอบขวา): Extending all the way to touch the adjacent right wall (ชนผนัง).';
    } else if (mr && mr !== '-') {
      marginDetails += `\n- Right Margin (ขอบขวา): ${mr}.`;
    }
  }

  // Margin / Hem
  let hemDescription = '';
  const mb = (specs.marginBottom || '').trim();
  if (isBlindOrShade) {
    if (mb.includes('บวกเพิ่ม 10') || mb.includes('บวกเพิ่ม') || mb.includes('10 ซม.')) {
      hemDescription = 'Bottom rail: Terminating 10 cm below the window sill / frame with clean horizontal weighted bottom bar.';
    } else if (mb.includes('พื้น')) {
      hemDescription = 'Bottom rail: Terminating just above the floor.';
    } else {
      hemDescription = 'Bottom rail: Clean horizontal bottom bar resting neatly at the designated bottom margin.';
    }
  } else {
    if (mb.includes('ลอย 1') || mb.includes('ลอย 1.5') || mb.includes('ลอย 2') || mb.includes('ลอย')) {
      hemDescription = 'Bottom hem (ระยะชายม่าน): MUST cleanly hover approximately 1 to 1.5 cm above the finished floor, showing a distinct visible gap between hem and floor. Absolutely NO fabric dragging, bunching, or puddling on the floor.';
    } else if (mb.includes('แตะพื้น') || mb.includes('เต็มพื้น')) {
      hemDescription = 'Bottom hem (ระยะชายม่าน): MUST precisely touch the floor surface (kissing the floor) without excessive pooling.';
    } else if (mb.includes('บัว') || mb.includes('เสมอขอบบัว')) {
      hemDescription = 'Bottom hem (ระยะชายม่าน): MUST terminate precisely at the top edge of the floor skirting / baseboard.';
    } else if (mb.includes('หน้าต่าง') || mb.includes('ขอบล่าง') || mb.includes('บวกเพิ่ม')) {
      hemDescription = `Bottom hem (ระยะชายม่าน): MUST terminate PRECISELY at the bottom boundary of the designated area (${mb}). This is a floating hem ending in mid-air above the floor. Absolutely DO NOT extend or drag curtains down to the floor!`;
    } else if (mb && mb !== '-') {
      hemDescription = `Bottom hem (ระยะชายม่าน): Terminate PRECISELY at the bottom boundary of the designated area (${mb}).`;
    }
  }

  // Fabric & Swatch instructions
  let fabricDescription = '';
  if (isVenetian) {
    if (specs.hasSwatch1) {
      fabricDescription += `
- Venetian Blind Slat Material (Layer 1): MATCH ATTACHED REFERENCE SWATCH 1 EXACTLY!
  * Examine the attached SWATCH 1 image. Replicate this exact material tone, finish, wood grain/slat color, and texture on all horizontal slats of the Venetian blinds.
  * Specified Slat Material: "${specs.fabricName1 || 'Venetian Blind Slat'}", Color/Code: "${specs.fabricColor1 || ''}".
  * Slats must look crisp, solid, and non-translucent with this exact color.`;
    } else if (specs.fabricName1 || specs.fabricColor1) {
      fabricDescription += `
- Venetian Blind Slat Material (Layer 1): Slat material: "${specs.fabricName1 || ''}", Color: "${specs.fabricColor1 || 'neutral'}". Horizontal slats matching this exact color and finish.`;
    }

    if (isVenetianWithTape) {
      if (specs.hasSwatch2) {
        fabricDescription += `
- Vertical Fabric Ladder Tape (Layer 2 / Tape): MATCH ATTACHED REFERENCE SWATCH 2 EXACTLY!
  * Replicate the exact color, tone, and woven cloth pattern from attached SWATCH 2 for the vertical decorative ladder tapes running across the slats.
  * Specified Tape: "${specs.fabricName2 || 'Tape for Blinds'}", Color/Code: "${specs.fabricColor2 || ''}".
  * REMINDER: This is cloth tape on the slats, NOT a sheer curtain!`;
      } else if (specs.fabricName2 || specs.fabricColor2) {
        fabricDescription += `
- Vertical Fabric Ladder Tape (Layer 2 / Tape): Fabric tape: "${specs.fabricName2 || ''}", Color: "${specs.fabricColor2 || 'neutral tape'}". Distinct vertical cloth tape strips running down the blind slats.`;
      }
    }
  } else {
    if (specs.hasSwatch1) {
      fabricDescription += `
- Main Fabric (Layer 1): MATCH ATTACHED REFERENCE SWATCH 1 IMAGE EXACTLY!
  * You MUST carefully sample the color, hue, saturation, textile weave, and pattern from the attached SWATCH 1 image.
  * Specified Fabric Name: "${specs.fabricName1 || 'Tailored Fabric'}", Color Code: "${specs.fabricColor1 || ''}".
  * Replicate this exact fabric appearance, texture, and light reflection on the curtains. DO NOT invent an arbitrary color!`;
    } else if (specs.fabricName1 || specs.fabricColor1) {
      fabricDescription += `
- Main Fabric (Layer 1): Fabric: "${specs.fabricName1 || ''}", Color: "${specs.fabricColor1 || 'neutral'}". Match this exact specified color and premium fabric texture.`;
    }

    if (is2Layers) {
      if (specs.hasSwatch2) {
        fabricDescription += `
- Inner Sheer Fabric (Layer 2): MATCH ATTACHED REFERENCE SWATCH 2 IMAGE EXACTLY!
  * Sample the soft sheer tone, airy translucent weave, and texture from the attached SWATCH 2 image.
  * Specified Sheer: "${specs.fabricName2 || 'Tailored Sheer'}", Color: "${specs.fabricColor2 || 'soft sheer white'}".`;
      } else if (specs.fabricName2 || specs.fabricColor2) {
        fabricDescription += `
- Inner Sheer Fabric (Layer 2): Fabric: "${specs.fabricName2 || ''}", Color: "${specs.fabricColor2 || 'soft sheer white / translucent'}". Translucent sheer fabric softly diffusing sunlight.`;
      }
    }
  }

  // Accessories & STRICT Negative Constraints
  let accessoriesSection = '';
  if (isBlindOrShade) {
    accessoriesSection = `
ACCESSORY SPECIFICATIONS & HARD NEGATIVE RESTRICTIONS:
- Controlled strictly via side control cords or beaded pull chains.
- HARD NEGATIVE RULE: ABSOLUTELY NO DRAPERY DRAW WANDS (ห้ามใส่ด้ามจูง).
- HARD NEGATIVE RULE: ABSOLUTELY NO CURTAIN TIEBACKS OR TASSELS (ห้ามใส่สายรวบม่าน).
- HARD NEGATIVE RULE: ABSOLUTELY NO DRAPERY CURTAINS OR SHEER CURTAINS.
`;
  } else {
    const validAccessories = (specs.accessories || []).filter(a => a && a !== '-');
    const hasDrawWand = validAccessories.some(a => a.includes('ด้ามจูง') || a.toLowerCase().includes('wand') || a.toLowerCase().includes('baton'));
    const hasTieback = validAccessories.some(a => a.includes('สายรวบ') || a.includes('รวบม่าน') || a.includes('ตะขอ'));

    accessoriesSection = `
ACCESSORY SPECIFICATIONS & HARD NEGATIVE RESTRICTIONS:
${validAccessories.length > 0 ? `- Selected Accessories: ${validAccessories.join(', ')}` : '- No optional accessories selected.'}
${hasDrawWand 
  ? '- Draw Wands (ด้ามจูง): Include slim, modern matching clear acrylic or aluminum draw wands attached neatly at the leading edge of the curtains.' 
  : '- STRICT NEGATIVE RULE: ABSOLUTELY NO DRAW WANDS (ห้ามใส่ด้ามจูงเด็ดขาด). Do NOT render any baton pulls, draw wands, or hanging rods on the curtain edges.'}
${hasTieback 
  ? '- Tiebacks: Include neat matching fabric tiebacks holding the drapery to side wall hooks.' 
  : '- Tiebacks: Curtains hang naturally; do NOT add fancy tassels or ropes.'}
- ABSOLUTELY NO unrequested accessories: no pelmets, no valances, no fringe, no dangling chains.
`;
  }

  let windowTypeSection = '';
  if (isBay) {
    windowTypeSection = `
======================================================================
CRITICAL ARCHITECTURAL MANDATE: 3D BAY WINDOW / CORNER ALCOVE INSTALLATION
(หน้าต่างเบย์ / หลืบม่านเข้ามุม / หน้าต่างหักมุม 3 มิติ ตามสเปกที่ระบุ)
======================================================================
1. CONTINUOUS CURVED TRACK (รางดัดโค้ง 1 ชุดต่อเนื่อง):
   - The curtain track wraps along the ceiling recess as ONE UNIFIED CONTINUOUS CURVED TRACK across all walls of the alcove.
   - IT IS NOT 3 SEPARATE CURTAINS! DO NOT divide the installation into 3 separate window sets!
   ${isA1Split ? `
   - FOR CENTER-SPLIT OPENING (แยกกลาง - รวบซ้ายขวา):
     * The main opaque curtains are parted in the center and stacked ONLY at the two far ends:
       - FAR LEFT WALL (ผนังซ้ายสุด): 1 neat gathered stack (รวบซ้าย).
       - FAR RIGHT WALL (ผนังขวาสุด): 1 neat gathered stack (รวบขวา).
     * ZERO OPAQUE CURTAINS IN THE REAR CENTER WINDOW!
     * ZERO OPAQUE CURTAINS IN THE TWO INNER CORNERS!
     * The rear center window must remain open to provide a clean panoramic view!
     * If 2-layer sheer underlayer is specified, the translucent sheer hangs along the curved track across the window glazing while the main opaque curtains frame the far left and right walls.
   ` : isA1OneWayLeft ? `
   - FOR ONE-WAY DRAW TO LEFT (รวบซ้าย 1 ผืน):
     * The curtain is gathered ONLY at the far left wall.
     * The center and right sections remain completely clear and open!
   ` : isA1OneWayRight ? `
   - FOR ONE-WAY DRAW TO RIGHT (รวบขวา 1 ผืน):
     * The curtain is gathered ONLY at the far right wall.
     * The center and left sections remain completely clear and open!
   ` : `
   - Curtains follow the continuous curved track neatly along the ceiling recess.
   `}
2. RECESSED CEILING POCKET / PELMET (หลุมฝ้า/บังราง):
   - Curtains and track emerge cleanly from the recessed ceiling pocket along the alcove contour.
======================================================================
`;
  } else {
    windowTypeSection = `
======================================================================
CRITICAL ARCHITECTURAL MANDATE: STRAIGHT FLAT OPENING / WINDOW (บานตรงปกติ - รางตรง)
======================================================================
1. STRAIGHT FLAT TRACK (บานตรงปกติ - รางตรงระนาบเดียว ไม่โค้ง):
   - This installation is a STANDARD STRAIGHT, FLAT OPENING / WINDOW (บานตรงปกติ ไม่ใช่บานโค้ง/ไม่เข้ามุม).
   - The curtain track runs in a SINGLE STRAIGHT LINE directly across the top of the designated opening frame.
   - ABSOLUTELY NO CURVES, NO CORNER TURNS, AND NO WRAPPING ONTO SIDE WALLS!
   - DO NOT bend, curve, or wrap the track or curtains onto adjacent perpendicular walls!

2. ZERO CURTAINS ON SIDE WALLS (ห้ามติดผ้าม่านบนผนังด้านข้างเด็ดขาด):
   - The adjacent perpendicular walls (such as side walls with molding, wainscoting, decorative paneling, or painted walls) MUST REMAIN 100% BARE AND UNTOUCHED.
   - Any curtain placed on the side perpendicular walls is a FATAL DEFECT!
   - Curtains MUST HANG FLAT strictly within the plane of the doorway/window opening inside the designated boundary.
======================================================================
`;
  }

  // Exact user-drawn polygon coordinates
  let polygonSection = '';
  if (specs.polygonPoints && specs.polygonPoints.length >= 3) {
    polygonSection = `
======================================================================
EXACT USER-DRAWN POLYGON MASK COORDINATES (TARGET BOUNDARY & TRACK):
======================================================================
The user has designated the exact curtain installation boundary on this photograph with the following polygon vertices (percentages of image width and height):
${specs.polygonPoints.map((p, idx) => `  - Point ${idx + 1}: X: ${p.x.toFixed(1)}%, Y: ${p.y.toFixed(1)}%`).join('\n')}

GUIDE IMAGE REFERENCE & SPECIFICATION COMPLIANCE (ยึดตามที่กำหนดเป็นหลัก ไม่คิดไปเอง):
- In the attached GUIDE IMAGE, the exact curtain installation zone is clearly outlined in red with vertex dots, and the exact curtain positions are illustrated:
  ${isBay ? `
  * CURVED / BAY WINDOW TREATMENT: The track follows the continuous curved ceiling recess along the top polygon vertices across the alcove.
  * CURTAIN STACKS: Respect the designated stacks shown in the guide image.
  ` : `
  * STRAIGHT FLAT TREATMENT (บานตรงปกติ): The track is straight across the top vertices of the opening.
  * DO NOT BEND OR CURVE THE TRACK ONTO SIDE WALLS!
  ${isA1OneWayLeft ? `
  * CURTAIN IS GATHERED ON THE LEFT ONLY (รวบซ้าย 1 ผืน): The curtain stack is located ONLY on the left inside the red boundary. The right side and center of the opening are completely clear and open!
  ` : isA1OneWayRight ? `
  * CURTAIN IS GATHERED ON THE RIGHT ONLY (รวบขวา 1 ผืน): The curtain stack is located ONLY on the right inside the red boundary. The left side and center of the opening are completely clear and open!
  ` : `
  * CENTER-SPLIT (แยกกลาง 2 ผืน): Curtains are gathered on the left and right inside the red boundary.
  `}
  `}
- STRICT BOUNDARY & HEIGHT ENFORCEMENT (ผ้าม่านต้องอยู่ในกรอบพื้นที่ผ้าม่านไม่ขาด ไม่เกิน):
  * The curtains MUST be installed 100% STRICTLY WITHIN THIS DESIGNATED POLYGON BOUNDARY.
  * DO NOT spill over or install any curtain fabric outside this red boundary!
  * Top Track Mounting Level: Curtains hang starting PRECISELY at the top boundary edge. DO NOT move the track up to the ceiling if the boundary starts lower on the wall! Keep any wall above the boundary bare and untouched.
  * Bottom Hem Line: Curtains hang down and terminate PRECISELY at the bottom boundary edge. DO NOT extend down to the floor if the boundary stops in mid-air above the floor! DO NOT cut short above the window sill if the boundary extends below the sill!
  * Foreground Objects & 3D Depth: If kitchen counters, appliances, dish racks, baby walkers, cribs, chairs, or furniture are in front of the window within this boundary, the curtain MUST hang down in 3D space BEHIND those objects down to the bottom boundary line, while keeping all foreground items 100% visible and intact in front.
======================================================================
`;
  }

  // Strict boundary constraints
  let boundarySection = '';
  if (specs.boundary) {
    const { minX, maxX, minY, maxY } = specs.boundary;
    if (isBay) {
      boundarySection = `
=====================================================
OVERALL 3D BOUNDARY FOOTPRINT (ALCOVE SPAN):
=====================================================
The multi-sided corner/bay installation zone spans within:
- Left-most corner: ${minX.toFixed(1)}% of total image width
- Right-most corner: ${maxX.toFixed(1)}% of total image width
- Top ceiling track: ${minY.toFixed(1)}% of total image height
- Bottom hem line: ${maxY.toFixed(1)}% of total image height

Remember: Curtains follow the continuous curved track across the designated alcove within these bounds.
`;
    } else {
      const isFloatingHem = (mb.includes('บวกเพิ่ม') || mb.includes('ลอย') || mb.includes('ขอบล่าง') || mb.includes('หน้าต่าง')) || (maxY < 88);
      const isWallMounted = (!specs.marginTop?.includes('เพดาน') && !specs.marginTop?.includes('ฝ้า')) && (minY > 6);
      const isLeftFlush = specs.marginLeft?.includes('พอดีเฟรม') || specs.marginLeft?.includes('เฟรม');

      boundarySection = `
=====================================================
EXACT BOUNDARY RESTRICTION (ผ้าม่านต้องอยู่ในกรอบพื้นที่ผ้าม่านไม่ขาด ไม่เกิน):
=====================================================
The user has designated the exact target window frame coordinates on this photograph:
- Left Edge: ${minX.toFixed(1)}% of total image width
- Right Edge: ${maxX.toFixed(1)}% of total image width
- Top Track Mounting Level: ${minY.toFixed(1)}% of total image height
- Bottom Hem Line: ${maxY.toFixed(1)}% of total image height

CRITICAL BOUNDARY & VERTICAL POSITION ENFORCEMENT (ยึดตามขนาดกรอบพื้นที่ผ้าม่านเป๊ะ 100%):
1. MANDATORY ROOM PRESERVATION (คงต้นฉบับห้องเดิมไว้ 100% ไม่เปลี่ยนแปลงเฟอร์นิเจอร์หรือของตกแต่ง):
   - Every element of this room outside the window area MUST BE PRESERVED with 100% fidelity: the wall artwork / picture frame on the left, the floor lamp, the armchair, the crib and canopy on the right, and the wooden floor.
   - DO NOT re-render, distort, or hallucinate the room. Only replace the window curtains.

2. TOP ROD / TRACK MOUNTING LEVEL (ตำแหน่งติดตั้งรางม่าน - รางติดผนังเหนือวงกบ 20 ซม.):
   - The curtain rod/track MUST be mounted PRECISELY at Y = ${minY.toFixed(1)}% of the image height${specs.marginTop ? ` (${specs.marginTop})` : ''}.
${isWallMounted ? `   - *** WALL-MOUNTED ROD (รางติดผนัง) ***
   - The new curtain pole is anchored directly into the plaster wall at Y = ${minY.toFixed(1)}% (approx 20 cm above the window frame).
   - The wall section above this new rod (between Y = ${minY.toFixed(1)}% and the ceiling) MUST BE CLEAN, BARE PAINTED WALL matching the room's paint!
   - ABSOLUTELY DO NOT mount the rod near the ceiling!` : `   - ABSOLUTELY DO NOT move the rod away from Y = ${minY.toFixed(1)}%!`}

3. EXACT BOTTOM HEM TERMINATION (ระยะชายม่านด้านล่าง ต้องไม่ขาด ไม่เกิน - ห้ามลากลงพื้นเด็ดขาด!):
   - The curtain fabric hem MUST terminate PRECISELY at Y = ${maxY.toFixed(1)}% of the image height${mb ? ` (${mb})` : ''}.
${isFloatingHem ? `   - *** CRITICAL ARCHITECTURAL CONSTRAINT: FLOATING MID-WALL CURTAIN (ม่านลอยครึ่งผนัง) ***
   - The curtain stops cleanly in mid-air at Y = ${maxY.toFixed(1)}% (approx 40 cm below the window sill, roughly level with the armchair armrest).
   - *** ABSOLUTELY DO NOT EXTEND THE CURTAIN DOWN TO TOUCH OR HOVER NEAR THE FLOOR! ***
   - The entire wall area, baseboard, and wood flooring below Y = ${maxY.toFixed(1)}% down to the bottom of the photo MUST REMAIN 100% BARE, FULLY EXPOSED, AND UNTOUCHED!
   - Letting curtains touch or pool on the floor is a FATAL DEFECT.` : `   - ABSOLUTELY DO NOT let curtains drag or bunch on the floor!`}

4. FOREGROUND OBJECT OCCLUSION & 3D DEPTH LAYERING (การบังของสิ่งของด้านหน้าผ้าม่าน):
   - Real rooms often have items in front of the window (e.g. baby walkers, cribs, chairs, armchairs, kitchen counters, appliances, sterilizers, dish racks, shelves, furniture).
   - If the curtain boundary extends behind or below any foreground item:
     * THE CURTAIN MUST HANG IN 3D SPACE BEHIND THOSE FOREGROUND OBJECTS, FULLY EXTENDING FROM TOP (Y = ${minY.toFixed(1)}%) DOWN TO THE BOTTOM HEM LINE (Y = ${maxY.toFixed(1)}%).
     * DO NOT cut the curtain short or stop it above foreground objects!
     * The foreground objects (such as the armchair and baby crib) MUST REMAIN 100% INTACT, CRISP, AND UNCHANGED in front of the curtains.

5. HORIZONTAL BOUNDARIES (ความกว้างซ้าย-ขวา):
   - Left Edge: Exactly ${minX.toFixed(1)}% of image width.
${isLeftFlush ? `     * *** FLUSH WITH LEFT WINDOW FRAME (พอดีเฟรม) ***: The left curtain panel stack MUST NOT extend leftward past the window frame onto the bare wall behind the armchair or artwork!` : `     * Aligns strictly at X = ${minX.toFixed(1)}%.`}
   - Right Edge: Exactly ${maxX.toFixed(1)}% of image width (extends approx 25 cm past the right window frame onto the wall, stopping neatly before the crib).
   - ZERO overflow onto adjacent side walls, side moldings, or columns.
`;
    }
  }

  let productIntro = 'Carefully perform an architectural inpainting operation on the provided room photograph to realistically install tailor-made curtains.';
  if (isVenetian) {
    productIntro = 'Carefully perform an architectural inpainting operation on the provided room photograph to realistically install custom HORIZONTAL VENETIAN BLINDS (มู่ลี่แนวนอน). DO NOT generate fabric drapery or pinch pleat curtains.';
  } else if (isRoller) {
    productIntro = 'Carefully perform an architectural inpainting operation on the provided room photograph to realistically install custom FLAT FABRIC ROLLER SHADES (ม่านม้วน). DO NOT generate fabric drapery.';
  } else if (isRoman) {
    productIntro = 'Carefully perform an architectural inpainting operation on the provided room photograph to realistically install custom ROMAN SHADES (ม่านพับ).';
  } else if (isVerticalBlind) {
    productIntro = 'Carefully perform an architectural inpainting operation on the provided room photograph to realistically install custom VERTICAL BLINDS (ม่านปรับแสง).';
  } else if (isGrommet) {
    productIntro = 'Carefully perform an architectural inpainting operation on the provided room photograph to realistically install custom GROMMET / EYELET CURTAINS (ม่านเจาะห่วง) on an exposed decorative titanium curtain pole. DO NOT generate pinch pleats!';
  } else if (isRippleFold) {
    productIntro = 'Carefully perform an architectural inpainting operation on the provided room photograph to realistically install custom RIPPLE FOLD / S-FOLD CURTAINS (ม่านลอน). DO NOT generate pinch pleats!';
  } else if (isPinchPleat) {
    productIntro = 'Carefully perform an architectural inpainting operation on the provided room photograph to realistically install custom PINCH PLEAT CURTAINS (ม่านจีบ 3 จีบ). DO NOT generate grommet eyelets!';
  }

  return `
You are an expert architectural interior visualizer and master window treatment craftsman.
${productIntro}

CRITICAL NON-NEGOTIABLE ARCHITECTURAL PRESERVATION RULES:
1. PRESERVE 100% OF THE ROOM ARCHITECTURE & PERSPECTIVE:
   - YOU ARE INPAINTING / COMPOSITING CURTAINS ONTO AN EXISTING ROOM PHOTOGRAPH.
   - DO NOT re-generate or re-invent the room.
   - DO NOT rotate, DO NOT flip, DO NOT crop, and DO NOT stretch the image.
   - The camera angle, room perspective, wall colors, floor texture, ceiling, lighting direction, and door/furniture positions MUST REMAIN 100% IDENTICAL to the source photograph.
2. DO NOT SHRINK THE WINDOW OR DOOR:
   - The size, position, height, and width of the window opening, glass panes, and door frames MUST REMAIN IN EXACT 1:1 SCALE. Do not make windows narrower, shorter, or smaller.
3. UNTOUCHED BACKGROUND:
   - All furniture, lamps, floors, artwork, and outdoor views outside the curtain area must remain untouched in pixel-level fidelity.

${windowTypeSection}

${polygonSection}

${boundarySection}

${panelConfigText}

${maskDropSection}

${venetianTapeSection}

${rollerOpacitySection}

${layerArchitecture}

CRITICAL 3D DEPTH & FOREGROUND OBJECT PRESERVATION:
- Real rooms frequently contain foreground objects in front of the window (such as kitchen counters, dish drying racks, sterilizers, appliances, baby walkers, baby cribs, chairs, sofas, headboards, desks, lamps, or shelves).
- When the curtain boundary extends behind or below any foreground object:
  * Curtains MUST hang in 3D depth space BEHIND those objects down to the designated bottom hem boundary.
  * Curtains MUST NEVER be cut off or stopped above foreground objects.
  * All foreground objects MUST remain 100% visible, crisp, and intact in the foreground.

FABRIC & COLOR SPECIFICATIONS:
${fabricDescription || '- Premium drapery fabric with rich authentic texture and natural soft folds.'}

MOUNTING & TAILORING:
- Track: ${trackDescription} ${hangDescription} ${bracketDescription}
- Margins & Hem: ${hemDescription || 'Cleanly tailored hem terminating strictly at the bottom polygon boundary.'}${marginDetails}
- Room Position: ${specs.roomPos || 'Interior room window'}
${specs.width && specs.height ? `- Specified dimensions: Width ${specs.width} cm, Height ${specs.height} cm.` : ''}

${accessoriesSection}

OUTPUT QUALITY & ARCHITECTURAL REALISM (เน้นความสมจริงและตามแบบที่กำหนด - แก้ไขภาพที่ดูลอย ไม่เนียน):
1. SEAMLESS PHYSICAL ANCHORING & CONTACT SHADOWS:
   - Curtains must look 100% physically installed in this real room, NOT like a flat sticker or disconnected CGI overlay!
   - Cast soft, subtle contact drop shadows and ambient occlusion behind the mounting brackets, behind the curtain rod, and behind the deep fabric folds onto the wall.
   - Natural illumination: Daylight entering from the window must naturally cast light across the fabric folds, creating authentic highlight contours, rim lighting along leading fabric edges, and soft shadow falloff in the fold valleys.
2. ORGANIC TEXTILE FABRIC DRAPE:
   - Render natural fabric weight, gentle gravitational drape, and authentic textile weave matching Reference Swatch 1 (${specs.fabricName1 || 'PLENARY'} / ${specs.fabricColor1 || 'CREAM'}).
   - Authentic tailored double-folded bottom hem with neat stitching.
   - Fabric must have natural surface texture and sheen—NO blown-out flat white surfaces, NO synthetic plastic sheen.
3. HARDWARE REALISM:
   - The decorative curtain pole (such as 19mm titanium pole) has an authentic satin metallic texture with wall-mounting bracket anchors and matching finials.
   - Eyelet rings or track carriers are physically linked to the fabric and rod/track with authentic mechanical precision.
`.trim();
}
