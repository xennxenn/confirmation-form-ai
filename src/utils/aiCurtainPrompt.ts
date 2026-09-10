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
  areas?: CurtainAreaSpec[];
  hasSwatch1?: boolean;
  hasSwatch2?: boolean;
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
  if (s.includes('ม่านเจาะห่วง')) {
    return 'Grommet Curtains with round metal eyelet rings threaded onto a visible drapery rod';
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
  const isA1OneWay = a1.includes('ข้าง') || a1.includes('ทางเดียว') || a1.includes('ซ้าย') || a1.includes('ขวา') || a1.includes('1 ผืน') || a1.includes('ด้านเดียว');
  const isA1Split = a1.includes('กลาง') || a1.includes('แยก') || a1.includes('2 ผืน');

  let action1En = 'standard full coverage';
  if (isBlindOrShade) {
    if (a1.includes('โซ่') || a1.includes('ดึง')) {
      action1En = `precision cord/chain tilt and lift control (${a1 || 'side controls'})`;
    } else {
      action1En = 'neatly lowered window blind providing uniform coverage';
    }
  } else {
    action1En = isA1OneWay
      ? 'one-way draw to one side (single drapery panel)'
      : isA1Split
        ? 'center split parting symmetrically to both left and right sides (two panels)'
        : 'standard full-coverage draw';
  }

  const a2 = (specs.action2 || specs.action1 || '').trim();
  const isA2OneWay = a2.includes('ข้าง') || a2.includes('ทางเดียว') || a2.includes('ซ้าย') || a2.includes('ขวา') || a2.includes('1 ผืน');
  const action2En = isA2OneWay
    ? 'one-way draw to side'
    : 'center split parting to both sides';

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
    } else if (isA1OneWay) {
      panelConfigText = `
PANEL CONFIGURATION:
- Exactly ONE SINGLE continuous drapery panel (ผ้าม่าน 1 ผืน / One-way draw).
- The curtain is a single wide piece drawn to one side.
- ABSOLUTELY DO NOT split this into two panels meeting in the middle!
`;
    } else if (isA1Split) {
      panelConfigText = `
PANEL CONFIGURATION:
- TWO matching drapery panels (ผ้าม่าน 2 ผืน เปิดแยกกลาง).
- Meeting cleanly in the center when drawn closed, or neatly stacked to left and right when open.
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
    layerArchitecture = `
SINGLE-LAYER CURTAIN SYSTEM:
- Style: ${style1En}
- Draw Style: ${action1En}
- Single track installation without any sheer underlayer.
`;
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
      } else if (specs.track.includes('รางโชว์') || specs.track.includes('ห่วง')) {
        trackDescription = 'Track: Decorative cylindrical curtain pole / rod with matching end finials.';
      } else if (specs.track && specs.track !== '-') {
        trackDescription = `Track: ${specs.track}.`;
      }
    }

    if (specs.hangStyle) {
      if (specs.hangStyle.includes('ปิดราง') || specs.hangStyle.includes('บังราง')) {
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
    } else if (mb.includes('หน้าต่าง') || mb.includes('ขอบล่าง')) {
      hemDescription = 'Bottom hem (ระยะชายม่าน): MUST terminate 10-15 cm below the window sill.';
    } else if (mb && mb !== '-') {
      hemDescription = `Bottom hem (ระยะชายม่าน): ${mb}.`;
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

  // Strict boundary constraints
  let boundarySection = '';
  if (specs.boundary) {
    const { minX, maxX, minY, maxY } = specs.boundary;
    boundarySection = `
=====================================================
EXACT BOUNDARY RESTRICTION & FULL COVERAGE RULES:
=====================================================
The user has designated the exact target window frame coordinates on this photograph:
- Left Edge: ${minX.toFixed(1)}% of total image width
- Right Edge: ${maxX.toFixed(1)}% of total image width
- Top Edge: ${minY.toFixed(1)}% of total image height
- Bottom Edge: ${maxY.toFixed(1)}% of total image height

CRITICAL BOUNDARY ENFORCEMENT:
1. FULL EDGE-TO-EDGE SPAN: The curtain installation MUST span across the entire window area from Left (${minX.toFixed(1)}%) to Right (${maxX.toFixed(1)}%). Do NOT leave the window partially uncovered or short of these borders.
2. ZERO OVERHANG / NO SPILLAGE: The curtain fabric, track, and hardware MUST NOT spill over beyond ${minX.toFixed(1)}% on the left or ${maxX.toFixed(1)}% on the right onto adjacent furniture, doors, light switches, or unrelated walls.
3. Keep all wall and ceiling surfaces outside [Left ${minX.toFixed(1)}% to Right ${maxX.toFixed(1)}%] 100% clean, identical to the source photo.
`;
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

${boundarySection}

${panelConfigText}

${maskDropSection}

${venetianTapeSection}

${rollerOpacitySection}

${layerArchitecture}

FABRIC & COLOR SPECIFICATIONS:
${fabricDescription || '- Premium drapery fabric with rich authentic texture and natural soft folds.'}

MOUNTING & TAILORING:
- Track: ${trackDescription} ${hangDescription} ${bracketDescription}
- Margins & Hem: ${hemDescription || 'Cleanly tailored hem hovering just above the floor.'}
- Room Position: ${specs.roomPos || 'Interior room window'}
${specs.width && specs.height ? `- Specified dimensions: Width ${specs.width} cm, Height ${specs.height} cm.` : ''}

${accessoriesSection}

OUTPUT QUALITY:
- 8K architectural interior photography finish.
- Natural fabric weight, ambient drop shadows under folds, and realistic light diffusion through the window.
`.trim();
}
