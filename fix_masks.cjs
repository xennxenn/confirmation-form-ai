const fs = require('fs');
let code = fs.readFileSync('src/components/ImageAreaEditor.tsx', 'utf8');

const targetH = `                          maskElements.push(
                            <g key="H" clipPath={\`url(#\${clipId})\`}>
                              <mask id={maskIdH}>
                                <image 
                                  href={optImg(maskImgFallback, 800, true)} 
                                  x={minX_px} y={minY_px} width={w_px} height={h_px * mPct} 
                                  preserveAspectRatio="none" 
                                  filter={\`url(#alpha-to-white-\${idPrefix})\`}
                                />
                              </mask>

                              {/* Masked full opacity fabric layer and sheer base layer */}
                              {/* Solid background/sheer base layer to fill transparent gaps/mesh at 0.6 opacity */}
                              {!isBlinds && <rect x={minX_px} y={minY_px} width={w_px} height={h_px * mPct} fill={finalColor} opacity={0.6} mask={\`url(#\${maskIdH})\`} />}
                              {!isBlinds && fabricImg && <rect x={minX_px} y={minY_px} width={w_px} height={h_px * mPct} fill={\`url(#\${patId})\`} opacity={0.6} mask={\`url(#\${maskIdH})\`} />}

                              <rect x={minX_px} y={minY_px} width={w_px} height={h_px * mPct} fill={finalColor} mask={\`url(#\${maskIdH})\`} />
                              {fabricImg && <rect x={minX_px} y={minY_px} width={w_px} height={h_px * mPct} fill={\`url(#\${patId})\`} mask={\`url(#\${maskIdH})\`} />}

                              <image 
                                href={optImg(maskImgFallback, 800, true)} 
                                x={minX_px} y={minY_px} width={w_px} height={h_px * mPct} 
                                preserveAspectRatio="none" 
                                opacity={maskOpacity} 
                                style={{ mixBlendMode: 'multiply' }} 
                                mask={\`url(#\${maskIdH})\`}
                              />
                              {styleMain1.includes('มู่ลี่') && (
                                <image 
                                  href={optImg(maskImgFallback, 800, true)} 
                                  x={minX_px} y={minY_px} width={w_px} height={h_px * mPct} 
                                  preserveAspectRatio="none" 
                                  opacity={0.15} 
                                  style={{ mixBlendMode: 'screen' }} 
                                  mask={\`url(#\${maskIdH})\`}
                                />
                              )}
                            </g>
                          );`;

const replH = `                          maskElements.push(
                            <g key="H" clipPath={\`url(#\${clipId})\`}>
                              <CanvasMaskedLayer
                                maskUrl={optImg(maskImgFallback, 800, true)}
                                fabricUrl={fabricImg}
                                finalColor={finalColor}
                                x={minX_px}
                                y={minY_px}
                                width={w_px}
                                height={h_px * mPct}
                                maskOpacity={maskOpacity}
                                styleMain1={styleMain1}
                                isBlinds={isBlinds}
                              />
                            </g>
                          );`;

if(code.includes(targetH)) {
  code = code.replace(targetH, replH);
  console.log("Replaced H");
} else {
  console.log("NOT FOUND H");
}

const targetW = `                            maskElements.push(
                              <g key="W" clipPath={\`url(#\${clipId})\`}>
                                <mask id={maskIdL}>
                                  <image 
                                    href={optImg(leftImg, 800, true)} 
                                    x={minX_px} y={minY_px} width={w_px * mPct} height={h_px} 
                                    preserveAspectRatio="none" 
                                    filter={\`url(#alpha-to-white-\${idPrefix})\`} 
                                  />
                                </mask>
                                <rect x={minX_px} y={minY_px} width={w_px * mPct} height={h_px} fill={finalColor} mask={\`url(#\${maskIdL})\`} />
                                {fabricImg && <rect x={minX_px} y={minY_px} width={w_px * mPct} height={h_px} fill={\`url(#\${patId})\`} mask={\`url(#\${maskIdL})\`} />}
                                <image href={optImg(leftImg, 800, true)} x={minX_px} y={minY_px} width={w_px * mPct} height={h_px} preserveAspectRatio="none" opacity={maskOpacity} style={{ mixBlendMode: 'multiply' }} mask={\`url(#\${maskIdL})\`} />
                                {styleMain1.includes('มู่ลี่') && (
                                  <image href={optImg(leftImg, 800, true)} x={minX_px} y={minY_px} width={w_px * mPct} height={h_px} preserveAspectRatio="none" opacity={0.15} style={{ mixBlendMode: 'screen' }} mask={\`url(#\${maskIdL})\`} />
                                )}
                                <mask id={maskIdR}>
                                  <image 
                                    href={optImg(rightImg, 800, true)} 
                                    x={maxX_px - (w_px * mPct)} y={minY_px} width={w_px * mPct} height={h_px} 
                                    preserveAspectRatio="none" 
                                    filter={\`url(#alpha-to-white-\${idPrefix})\`} 
                                  />
                                </mask>
                                <rect x={maxX_px - (w_px * mPct)} y={minY_px} width={w_px * mPct} height={h_px} fill={finalColor} mask={\`url(#\${maskIdR})\`} />
                                {fabricImg && <rect x={maxX_px - (w_px * mPct)} y={minY_px} width={w_px * mPct} height={h_px} fill={\`url(#\${patId})\`} mask={\`url(#\${maskIdR})\`} />}
                                <image href={optImg(rightImg, 800, true)} x={maxX_px - (w_px * mPct)} y={minY_px} width={w_px * mPct} height={h_px} preserveAspectRatio="none" opacity={maskOpacity} style={{ mixBlendMode: 'multiply' }} mask={\`url(#\${maskIdR})\`} />
                                {styleMain1.includes('มู่ลี่') && (
                                  <image href={optImg(rightImg, 800, true)} x={maxX_px - (w_px * mPct)} y={minY_px} width={w_px * mPct} height={h_px} preserveAspectRatio="none" opacity={0.15} style={{ mixBlendMode: 'screen' }} mask={\`url(#\${maskIdR})\`} />
                                )}
                              </g>
                            );`;

const replW = `                            maskElements.push(
                              <g key="W" clipPath={\`url(#\${clipId})\`}>
                                <CanvasMaskedLayer
                                  maskUrl={optImg(leftImg, 800, true)}
                                  fabricUrl={fabricImg}
                                  finalColor={finalColor}
                                  x={minX_px}
                                  y={minY_px}
                                  width={w_px * mPct}
                                  height={h_px}
                                  maskOpacity={maskOpacity}
                                  styleMain1={styleMain1}
                                  isBlinds={isBlinds}
                                />
                                <CanvasMaskedLayer
                                  maskUrl={optImg(rightImg, 800, true)}
                                  fabricUrl={fabricImg}
                                  finalColor={finalColor}
                                  x={maxX_px - (w_px * mPct)}
                                  y={minY_px}
                                  width={w_px * mPct}
                                  height={h_px}
                                  maskOpacity={maskOpacity}
                                  styleMain1={styleMain1}
                                  isBlinds={isBlinds}
                                />
                              </g>
                            );`;

if(code.includes(targetW)) {
  code = code.replace(targetW, replW);
  console.log("Replaced W");
} else {
  console.log("NOT FOUND W");
}

const targetR = `                            maskElements.push(
                              <g key="R" clipPath={\`url(#\${clipId})\`}>
                                <mask id={maskIdR}>
                                  <image 
                                    href={optImg(rightImg, 800, true)} 
                                    x={maxX_px - (w_px * mPct)} y={minY_px} width={w_px * mPct} height={h_px} 
                                    preserveAspectRatio="none" 
                                    filter={\`url(#alpha-to-white-\${idPrefix})\`} 
                                  />
                                </mask>
                                <rect x={maxX_px - (w_px * mPct)} y={minY_px} width={w_px * mPct} height={h_px} fill={finalColor} mask={\`url(#\${maskIdR})\`} />
                                {fabricImg && <rect x={maxX_px - (w_px * mPct)} y={minY_px} width={w_px * mPct} height={h_px} fill={\`url(#\${patId})\`} mask={\`url(#\${maskIdR})\`} />}
                                <image href={optImg(rightImg, 800, true)} x={maxX_px - (w_px * mPct)} y={minY_px} width={w_px * mPct} height={h_px} preserveAspectRatio="none" opacity={maskOpacity} style={{ mixBlendMode: 'multiply' }} mask={\`url(#\${maskIdR})\`} />
                                {styleMain1.includes('มู่ลี่') && (
                                  <image href={optImg(rightImg, 800, true)} x={maxX_px - (w_px * mPct)} y={minY_px} width={w_px * mPct} height={h_px} preserveAspectRatio="none" opacity={0.15} style={{ mixBlendMode: 'screen' }} mask={\`url(#\${maskIdR})\`} />
                                )}
                              </g>
                            );`;

const replR = `                            maskElements.push(
                              <g key="R" clipPath={\`url(#\${clipId})\`}>
                                <CanvasMaskedLayer
                                  maskUrl={optImg(rightImg, 800, true)}
                                  fabricUrl={fabricImg}
                                  finalColor={finalColor}
                                  x={maxX_px - (w_px * mPct)}
                                  y={minY_px}
                                  width={w_px * mPct}
                                  height={h_px}
                                  maskOpacity={maskOpacity}
                                  styleMain1={styleMain1}
                                  isBlinds={isBlinds}
                                />
                              </g>
                            );`;

if(code.includes(targetR)) {
  code = code.replace(targetR, replR);
  console.log("Replaced R");
} else {
  console.log("NOT FOUND R");
}

const targetL = `                            maskElements.push(
                              <g key="L" clipPath={\`url(#\${clipId})\`}>
                                <mask id={maskIdL}>
                                  <image 
                                    href={optImg(leftImg, 800, true)} 
                                    x={minX_px} y={minY_px} width={w_px * mPct} height={h_px} 
                                    preserveAspectRatio="none" 
                                    filter={\`url(#alpha-to-white-\${idPrefix})\`} 
                                  />
                                </mask>
                                <rect x={minX_px} y={minY_px} width={w_px * mPct} height={h_px} fill={finalColor} mask={\`url(#\${maskIdL})\`} />
                                {fabricImg && <rect x={minX_px} y={minY_px} width={w_px * mPct} height={h_px} fill={\`url(#\${patId})\`} mask={\`url(#\${maskIdL})\`} />}
                                <image href={optImg(leftImg, 800, true)} x={minX_px} y={minY_px} width={w_px * mPct} height={h_px} preserveAspectRatio="none" opacity={maskOpacity} style={{ mixBlendMode: 'multiply' }} mask={\`url(#\${maskIdL})\`} />
                                {styleMain1.includes('มู่ลี่') && (
                                  <image href={optImg(leftImg, 800, true)} x={minX_px} y={minY_px} width={w_px * mPct} height={h_px} preserveAspectRatio="none" opacity={0.15} style={{ mixBlendMode: 'screen' }} mask={\`url(#\${maskIdL})\`} />
                                )}
                              </g>
                            );`;

const replL = `                            maskElements.push(
                              <g key="L" clipPath={\`url(#\${clipId})\`}>
                                <CanvasMaskedLayer
                                  maskUrl={optImg(leftImg, 800, true)}
                                  fabricUrl={fabricImg}
                                  finalColor={finalColor}
                                  x={minX_px}
                                  y={minY_px}
                                  width={w_px * mPct}
                                  height={h_px}
                                  maskOpacity={maskOpacity}
                                  styleMain1={styleMain1}
                                  isBlinds={isBlinds}
                                />
                              </g>
                            );`;

if(code.includes(targetL)) {
  code = code.replace(targetL, replL);
  console.log("Replaced L");
} else {
  console.log("NOT FOUND L");
}

fs.writeFileSync('src/components/ImageAreaEditor.tsx', code, 'utf8');
