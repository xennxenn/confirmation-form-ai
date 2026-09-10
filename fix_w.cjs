const fs = require('fs');
let code = fs.readFileSync('src/components/ImageAreaEditor.tsx', 'utf8');

const targetW = `                              <g key="W" clipPath={\`url(#\${clipId})\`}>
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
                              </g>`;

const replW = `                              <g key="W" clipPath={\`url(#\${clipId})\`}>
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
                              </g>`;

if(code.includes(targetW)) {
  code = code.replace(targetW, replW);
  console.log("Replaced W");
} else {
  console.log("NOT FOUND W");
}

fs.writeFileSync('src/components/ImageAreaEditor.tsx', code, 'utf8');
