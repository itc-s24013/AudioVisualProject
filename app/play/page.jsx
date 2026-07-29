'use client';
import { useEffect, useRef } from 'react';

export default function Play() {
    const containerRef = useRef(null);

    useEffect(() => {
        let p5Instance;
        (async () => {
            const p5 = (await import('p5')).default;
            p5Instance = new p5((p) => {
                // canvas
                const W = 1920;
                const H = 1080;

                // camera
                let cam = null;

                // audio
                let audio_el = null;
                let audio_ctx = null;
                let src = null;
                let an_freq = null;
                let an_freq_array = null;
                let an_lowFreq = null;
                let an_lowFreq_array = null;
                let lowpass = null;

                // settings
                let wave_width = null;
                let LINE_WIDTH = null;
                let wave_height = null;
                let wave_pos_y = null;
                let bottom_text_pos_y = null;
                let rect_gap = null;
                let sort_func = null;

                // colors
                let col_bg_main = null;
                let col_bg_side = null;
                let col_grid = null;
                let col_graph = null;

                let fx = null;
                const fragSrc = `
                precision highp float;

                varying vec2 vTexCoord;

                uniform sampler2D tex0;
                uniform vec2  resolution;
                uniform float fov;         // 視野角(ラジアン)。例: 2.4 ≈ 137°
                uniform float aberration;  // 色収差の強さ 0.0〜0.02 程度
                uniform float vignette;    // 周辺減光の強さ 0.0(なし)〜1.0(強)

                // 出力半径 rOut(0〜1)を実際のレンズ投影に基づいてソース画像上の半径に変換
                float lensRadius(float rOut, float halfFov) {
                  float phi = rOut * halfFov;
                  return tan(phi) / tan(halfFov);
                }

                void main() {
                  vec2 uv = vTexCoord * 2.0 - 1.0;
                  float aspect = resolution.x / resolution.y;
                  uv.x *= aspect;

                  // 画面中心から「四隅」までの距離を半径1.0として正規化する
                  // → 円形マスクを使わずに矩形全体をレンズ効果でカバーできる
                  float maxR = length(vec2(aspect, 1.0));
                  float lenUv = length(uv);
                  float rOut = min(lenUv / maxR, 1.0);

                  vec2 dir = (lenUv > 0.0001) ? uv / lenUv : vec2(0.0);
                  float halfFov = fov * 0.5;

                  // R/G/Bでサンプリング半径を微妙にずらして色収差を再現
                  float rR = lensRadius(rOut, halfFov) * (1.0 + aberration);
                  float rG = lensRadius(rOut, halfFov);
                  float rB = lensRadius(rOut, halfFov) * (1.0 - aberration);

                  vec2 uvR = dir * rR * maxR; uvR.x /= aspect; uvR = uvR * 0.5 + 0.5;
                  vec2 uvG = dir * rG * maxR; uvG.x /= aspect; uvG = uvG * 0.5 + 0.5;
                  vec2 uvB = dir * rB * maxR; uvB.x /= aspect; uvB = uvB * 0.5 + 0.5;

                  float red   = texture2D(tex0, clamp(uvR, 0.0, 1.0)).r;
                  float green = texture2D(tex0, clamp(uvG, 0.0, 1.0)).g;
                  float blue  = texture2D(tex0, clamp(uvB, 0.0, 1.0)).b;

                  vec3 color = vec3(red, green, blue);

                  // 周辺減光(四隅に向かって少し暗く)
                  float vig = mix(1.0, 1.0 - smoothstep(0.6, 1.0, rOut), vignette);
                  color *= vig;

                  gl_FragColor = vec4(color, 1.0);
                }
                `;


                function setupAudio()
                {
                    audio_el = new Audio("/play/assets/song.mp3");
                    audio_ctx = new AudioContext();

                    an_freq = audio_ctx.createAnalyser();
                    an_freq.fftSize = 64;
                    an_freq.maxDecibels = 0;
                    an_freq.minDecibels = -150;
                    an_freq.smoothingTimeConstant = 0.86;
                    an_freq_array = new Uint8Array(an_freq.frequencyBinCount);

                    lowpass = audio_ctx.createBiquadFilter();
                    lowpass.type = "lowpass";
                    lowpass.frequency.value = 150;
                    lowpass.Q.value = 1;

                    an_lowFreq = audio_ctx.createAnalyser();
                    an_lowFreq.fftSize = 2048;
                    an_lowFreq.maxDecibels = 0;
                    an_lowFreq.minDecibels = -100;
                    an_lowFreq.smoothingTimeConstant = 0.75;
                    an_lowFreq_array = new Uint8Array(an_lowFreq.frequencyBinCount);

                    src = audio_ctx.createMediaElementSource(audio_el);

                    // 再生用
                    src.connect(audio_ctx.destination);

                    // メインの波形用
                    src.connect(an_freq);

                    // ローパス用
                    src.connect(lowpass)
                    lowpass.connect(an_lowFreq);
                }

                p.setup = async () => 
                {
                    setupAudio();

                    p.frameRate(30);

                    const cnv = p.createCanvas(W, H, p.WEBGL);
                    cnv.mousePressed(() => {
                        console.log("pressed") 
                        if (audio_ctx.state == "suspended") {
                            audio_ctx.resume();
                        }
                        audio_el.play();
                    });

                    // camera
                    cam = p.createCamera();
                    p.setCamera(cam);
                    cam.setPosition(0, 0, 800);
                    cam.lookAt(0, 0, 0);

                    // settings
                    wave_width = 800;
                    LINE_WIDTH = wave_width + 25;
                    wave_height = 600;
                    wave_pos_y = 275;
                    bottom_text_pos_y = 15;
                    rect_gap = 10;
                    sort_func = sort_highLow;

                    // colors
                    col_bg_main = p.color(10);
                    col_bg_side = p.color(240);
                    col_grid = p.color(100);
                    col_graph = p.color(220, 240, 240);

                    // text setup
                    // let f = await loadFont('../assets/fonts/Liter/Liter-Regular.ttf')
                    let f = await p.loadFont('/play/assets/Oswald-Regular.ttf')
                    p.textFont(f);
                    p.textSize(18);
                    p.textAlign(p.CENTER, p.TOP);

                    // shader setup
                    
                    fx = p.createFilterShader(fragSrc);
                    fx.setUniform('resolution', [W, H]);
                    fx.setUniform('fov', 1.8);        // お好みで調整
                    fx.setUniform('aberration', 0.005);
                    fx.setUniform('vignette', 0);

                }

                const SPEED = 0.05;
                let progress = 0;
                const LINE_COUNT = 6;
                let progress_array = new Array(LINE_COUNT).fill(0);
                function drawGrid()
                {
                    let top_y = H - wave_height - wave_pos_y;
                    let bottom_y = H - wave_pos_y;

                    p.push();
                    p.translate((W - LINE_WIDTH) / 2, 0);

                    p.stroke(col_grid);
                    // 一番下の線
                    p.strokeWeight(5);
                    p.line(0, bottom_y, LINE_WIDTH, bottom_y);

                    // 一番上の線
                    p.strokeWeight(2);
                    p.line(0, top_y, LINE_WIDTH, top_y);

                 
                    for (let i = 1; i <= LINE_COUNT; i++) {
                        let idx = i - 1;
                        let amt = i / (LINE_COUNT + 1);

                        let is_active = false;
                        let target_y = p.lerp(bottom_y, top_y, amt);

                        // 波形が線の位置まで届いてるかの判定
                        for (let j = 0; j < an_freq_array.length; j++) {
                            is_active = (p.map(an_freq_array[j], 0, 255, 0, 1) >= amt - 0.05)
                            if(is_active) break;
                        }

                        progress_array[idx] += is_active ? SPEED : -SPEED;
                        progress_array[idx] = p.constrain(progress_array[idx], 0, 1);

                        let ease = ((t) => 1 - (1 - t) * (1 - t))(progress_array[idx]);
                        let y = p.lerp(target_y + 15, target_y, ease);
                        let alpha_val = p.lerp(0, 255, ease);

                        p.push();
                        col_grid.setAlpha(alpha_val);
                        p.translate(0, y);
                        p.stroke(col_grid);
                        p.line(0, 0, LINE_WIDTH, 0);
                        col_grid.setAlpha(255);
                        p.pop();
                    }

                    p.noStroke();
                    p.pop();
                }

                let boost = 0;         // 明るさの上乗せ分
                const DECAY = 0.86;    // 減衰率(1に近いほどゆっくり元に戻る/0.9〜0.97くらいで調整)
                const GAIN  = 4;    // 増加分をどれだけ明るさに反映するか(感度)
                const BASE_BRIGHTNESS = 60;
                let prev_data = null;
                let boosts = null;
                let br = null;
                function drawWaveform()
                {
                    const buffer_length = an_freq.frequencyBinCount;

                    if (!prev_data || prev_data.length !== buffer_length) {
                        // 各ビンごとの「明るさの上乗せ量」を個別に保持する配列
                        prev_data = new Uint8Array(buffer_length);
                        boosts = new Float32Array(buffer_length);
                        br = new Float32Array(buffer_length);
                    }


                    p.push();
                    p.translate((W - wave_width) / 2, -wave_pos_y);
                    let graph_array = sort_func(an_freq_array);

                    for (let i = 0; i < graph_array.length; i++) {
                        const diff = graph_array[i] - prev_data[i];

                        // このビンだけの増加分をこのビンのboostに加算
                        if (diff > 0) {
                            boosts[i] += diff * GAIN;
                        }

                        // このビンのboostを減衰
                        boosts[i] *= DECAY;

                        // このビンの最終的な明るさ
                        br[i] = Math.min(100, BASE_BRIGHTNESS + boosts[i]);
                    }

                    prev_data.set(graph_array);


                    let rect_w = (wave_width / an_freq_array.length) - rect_gap;

                    console.log(br);
                    // 棒グラフ描画
                    for(let x = 0; x < graph_array.length; x++) {
                        let mapped = p.map(graph_array[x], 0, 255, 0, wave_height);;
                        let total_w = rect_w + rect_gap;
                        // fill(col_graph);
                        p.push();
                        p.colorMode(p.HSB);
                        p.fill(p.color(0, 0, br[x]));
                        p.rect(
                            total_w * x + (rect_gap / 2), 
                            H, rect_w, -mapped
                        );
                        // fill(col_grid);
                        p.fill(p.color(0, 0, br[x]));
                        p.text(
                            Math.round(p.map(graph_array[x], 0, 255, 0, 100)),
                            total_w * x + total_w / 2, H + bottom_text_pos_y
                        );
                        p.pop();
                    }
                    p.pop();
                }

                p.draw = () => 
                {
                    p.background(col_bg_side);
                    p.noStroke();
                    p.translate(-(p.width/2), -(p.height/2));

                    an_freq.getByteFrequencyData(an_freq_array);
                    an_lowFreq.getByteFrequencyData(an_lowFreq_array);

                    // カメラの動き
                    let bin_count = getBinCount(lowpass.frequency.value, an_lowFreq.fftSize, audio_ctx.sampleRate);
                    let rms = getRMS(an_lowFreq_array.slice(0, bin_count));
                    cam.setPosition(0, 0, 800 - p.map(rms, 0, 255, 0, 150));

                    p.push();
                    p.fill(col_bg_main);
                    p.translate((W - H) / 2, 0);
                    p.rect(0, 0, H, H);
                    p.pop();


                    p.push();
                    p.fill(5);
                    let bg_overall_offset = 50; // 四角い枠全体の余白
                    let bg_bottom_offset = 50; // 下の余白
                    p.translate(
                        (W - LINE_WIDTH - bg_overall_offset) / 2,
                        (H - wave_height - wave_pos_y) - (bg_overall_offset / 2)
                    );
                    p.strokeWeight(2);
                    p.stroke(100);
                    p.rect(
                        0, 0,
                        LINE_WIDTH + bg_overall_offset,
                        wave_height + bg_bottom_offset + bg_overall_offset
                    );
                    p.pop();


                    drawWaveform();

                    drawGrid();

                    p.filter(fx);
                }

                function getBinCount(cutoffFreq, fftSize, sampleRate, marginRatio = 1) {
                    const binHz = sampleRate / fftSize;
                    // biquadフィルターは急な壁ではなく、なだらかに減衰する(-12dB/oct程度)ので、
                    // cutoffぴったりで切ると信号を拾いこぼすため、余裕(margin)を持たせる
                    const rawBinCount = (cutoffFreq * marginRatio) / binHz;
                    const binCount = Math.ceil(rawBinCount);

                    // 配列の範囲内に収める(最低1ビン、最大はfftSize/2)
                    return Math.max(1, Math.min(binCount, fftSize / 2));
                }

                function getRMS(array)
                {
                    let sum = 0;
                    for(const e of array) {
                        sum += e * e;
                    }
                    return Math.sqrt(sum / array.length);
                }

                function sort_lowHigh(freqData)
                {
                    return [...freqData].reverse();
                }

                function sort_highLow(freqData)
                {
                    return freqData;
                }

                function sort_lowHighLow(freqData) 
                {
                    const asc = [...freqData].reverse(); // 低 -> 高 に反転
                    const up = asc.filter((_, i) => i % 2 === 0);            // 上り坂用
                    const down = asc.filter((_, i) => i % 2 === 1).reverse(); // 下り坂用
                    return [...up, ...down];
                }

            }, containerRef.current);

        })();

        return () => p5Instance?.remove();
    }, []);

    return (
        <div>
        <div ref={containerRef}></div>
        </div>
    );
}
