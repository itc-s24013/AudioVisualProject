export function sketch(p, audioSrc, designSettings, playback = {})
{
    // /presets で選択されたデザイン設定(未指定時はデフォルト値にフォールバック)
    const design = {
        backgroundColor: "#dcf0f0",
        lineColor: "#ffffff",
        ...(designSettings || {}),
    };

    const PATH_FONT = "/play/assets/Ac437_IBM_PGC.ttf";
    const PATH_AUDIO = "/play/assets/song.mp3";

    // canvas
    const W = 1920;
    const H = 1080;
    const SCREEN_MARGIN = 25; // 画面全体の外周および中央の隙間
    const CANVAS_W = (W - SCREEN_MARGIN * 4) / 2;
    const CANVAS_H = H - SCREEN_MARGIN * 2;

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
    
    let an_bass = null;
    let an_bass_array = null;
    let bass_lowpass = null;

    let an_high = null;
    let an_high_array = null;
    let highpass = null;

    //
    // overall
    const SW_SCREENS = 1;   // インナーストローク用
    //
    // g_graph
    let g_graph = null;
        const SW_PANELS = 2; // 画面枠の太さ（インナーストローク用）
            let g_graph_subGraph = null;
            let g_graph_ampGraphHigh = null;
            let g_graph_ampGraphHigh_rawLine = null;
            let g_graph_ampGraphHigh_fx = null;
            let g_graph_ampGraphLow = null;
            let g_graph_ampGraphLow_rawLine = null;
            let g_graph_ampGraphLow_fx = null;
            let g_graph_mainGraph = null;
        // settings
        let wave_width = null;
        let waveform_width = null;
        let wave_height = null;
        let waveform_height = null;
        let wave_pos_y = null;
        let bottom_text_pos_y = null;
        let rect_gap = null;
        let sort_func = null;
        let objs_margin = null;
        let g_graph_padding = null;

        // box for calculation
        let g_graph_box_mainGraph = null;
        let g_graph_box_subGraph = null;
        let g_graph_box_ampGraphHigh = null;
        let g_graph_box_ampGraphLow = null;

        let amp_history_high = [];
        const ampGraphHigh_oscilloscopeState = {
            sweep_buffer: [],
            scan_x: 0,
            smoothed_amp: null,
            previous_sweep_y: null,
        };
        const OSCILLOSCOPE_WAVE_SPEED = 0.5; // 小さいほど波の間隔が広がる
        const OSCILLOSCOPE_AMP_SMOOTHING = 0.16; // 小さいほど音量変化が滑らかになる

        const ampGraphLow_oscilloscopeState = {
            sweep_buffer: [],
            scan_x: 0,
            smoothed_amp: null,
            previous_sweep_y: null,
        };

    // g_info
    let g_info = null;
        let g_info_particle = null; // 背景パーティクルの描画先（infoパネルの背景として使用）
        let currentInfoScreen = "blank";
        let g_info_box_screen = null;   // g_info内側画面の共通位置・サイズ
        let g_info_box_terminal = null; // g_info下部ターミナルの位置・サイズ
        let g_info_terminal = null;     // ターミナルパネルのWEBGLバッファ
        const TERMINAL_HEIGHT_RATIO = 1 / 7; // ターミナルの縦幅の比率（使える縦幅全体に対する割合）
        function make_terminal_state()
        {
            return {
                logs: [],            // 表示中（表示済み or タイプ中）の行 [{ fullText, displayedLength }]
                pendingQueue: [],    // これから流し込む文字列の配列
                lineDelayCounter: 0, // 次行追加までの待機カウンター
            };
        }

        let terminal_state_left = make_terminal_state();   // 左側ログの状態
        let terminal_state_right = make_terminal_state();  // 右側ログの状態
        let is_playing = false; // 現在再生中かどうか
        const MAX_TERMINAL_LINES = 4;        // 表示する最大行数
        const TYPE_SPEED_FRAMES = 2;         // 1文字追加に必要なフレーム数
        const LINE_DELAY_FRAMES = 5;        // 行の入力完了から次の行を追加するまでの待機フレーム数

        // 再生開始時に info_terminal_left へ表示する内容（プレースホルダー。後で実際の内容に差し替える）
        let terminal_left_content = [
            "TRACK: ------------",
            "ARTIST: ------------",
            "STATUS: NOW PLAYING",
        ];

        // 再生開始時に info_terminal_right へ表示する内容
        let terminal_right_content = [
            "Playback started.",
        ];

        // ダミーメッセージ集：常時ループでの使用はやめ、"t"/"y"キーによるテスト更新の
        // サンプルデータ提供元としてのみ使う
        let terminal_dummy_messages = [  // ログ用ダミーメッセージ集
            "SYS_CHECK: OK",
            "AUDIO_NODE: CONNECTED",
            "BUFFER: ALLOCATED",
            "MEM_ADDR: 0x00F91B",
            "ANALYSER: SYNCED",
            "FREQ_BANDS: 1024",
            "WEBGL_CTX: ACTIVE",
            "DSP_FILTER: PASS_LOW",
            "FFT_SIZE: 2048",
            "STREAM: STABLE"
        ];
        let g_info_screen = null;       // 合成パネル（白枠+bg+shapeを貼り合わせる）共有WEBGLバッファ
        let g_info_screen_bg = null;    // 背景レイヤー（g_info_particleを描く）共有WEBGLバッファ
        let g_info_screen_shape = null; // 3D形状レイヤー（Torus/Cubeを描く）共有WEBGLバッファ
        // 以下は専用WEBGLバッファではなく、画面固有の設定・状態を保持するだけのオブジェクト
        let g_info_torus = null;
        let g_info_cube = null;
        let g_info_cubes = []; // 複数キューブの属性（x, y, z, baseSize）を初回のみ生成して保持
        let g_info_cylinder = null;

        // 画面切替のスキャンライントランジション状態
        let g_infoTransition = {
            active: false,
            fromScreen: null,   // 消えていく方（開始時点の角度で静止させる）
            toScreen: null,     // 現れる方（通常通り回転を続ける）
            startFrame: 0,      // トランジション開始時の p.frameCount
            duration: 60,       // 何フレームかけて切り替えるか
            progress: 0,        // 現在の進捗(0〜1)。境界線の描画位置に使う
        };



    // colors
    let col_bg_main = null;
    let col_line = null;
    let col_graph_bgLine = null;

    let fx = null;
    let fx_mosaic = null;
    let fx_mosaic_low = null;
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

    const mosaicFragSrc = `
                precision highp float;
                varying vec2 vTexCoord;
                uniform sampler2D tex0;
                uniform float mosaicSize;
                uniform vec2 resolution;

                void main() {
                    // 0以下はモザイクなし（1px単位）として扱い、ゼロ除算を防ぐ
                    float safeMosaicSize = max(mosaicSize, 1.0);
                    vec2 blockUvSize = safeMosaicSize / resolution;
                    vec2 uv = floor(vTexCoord / blockUvSize) * blockUvSize + (blockUvSize * 0.5);
                    vec4 color = texture2D(tex0, uv);
                    gl_FragColor = color;
                }
                `;


    function setupAudio(src)
    {
        audio_el = new Audio(src || PATH_AUDIO);

        // == 再生・停止のイベントリスナー ==
        audio_el.addEventListener("play", () => {
            is_playing = true;
            p.loop();
            setPlaying(true); // 再生コントロールUI関連のやつ

            // 再生状態に連動してターミナルの表示を制御する
            // 再生開始のたびに左右ともリセットしてから、左右それぞれの内容を流し込む
            info_terminal_update(terminal_state_left, terminal_left_content);
            info_terminal_update(terminal_state_right, terminal_right_content);

            // 3D図形をスキャンラインで出現させる（一時停止からの再開も含め、playイベントのたびに毎回発火）
            info_transition_start("none", currentInfoScreen);
        });

        audio_el.addEventListener("pause", () => {
            is_playing = false;
            // p.noLoop();
            setPlaying(false); // 再生コントロールUI関連のやつ

            // 再生状態に連動してターミナルの表示を制御する
            // 停止時は左右とも空にして「何も表示しない」状態に戻す
            info_terminal_update(terminal_state_left, []);
            info_terminal_update(terminal_state_right, []);

            // 3D図形をスキャンラインで消す
            info_transition_start(currentInfoScreen, "none");
        });

        audio_el.addEventListener("ended", () => {
            is_playing = false;
            // p.noLoop();
            setPlaying(false); // 再生コントロールUI関連のやつ

            // 再生状態に連動してターミナルの表示を制御する
            info_terminal_update(terminal_state_left, []);
            info_terminal_update(terminal_state_right, []);

            // 3D図形をスキャンラインで消す
            info_transition_start(currentInfoScreen, "none");
        });

        // ==========================================

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

        bass_lowpass = audio_ctx.createBiquadFilter();
        bass_lowpass.type = "lowpass";
        bass_lowpass.frequency.value = 100;
        bass_lowpass.Q.value = 1;

        an_bass = audio_ctx.createAnalyser();
        an_bass.fftSize = 4096;
        an_bass.maxDecibels = 0;
        an_bass.minDecibels = -100;
        an_bass.smoothingTimeConstant = 0.86;
        an_bass_array = new Uint8Array(an_bass.frequencyBinCount);

        highpass = audio_ctx.createBiquadFilter();
        highpass.type = "highpass";
        highpass.frequency.value = 5000;
        highpass.Q.value = 1;

        an_high = audio_ctx.createAnalyser();
        an_high.fftSize = 2048;
        an_high.maxDecibels = -25;
        an_high.minDecibels = -100;
        an_high.smoothingTimeConstant = 0.86;
        an_high_array = new Uint8Array(an_high.frequencyBinCount);

        src = audio_ctx.createMediaElementSource(audio_el);

        // 再生用
        src.connect(audio_ctx.destination);

        // メインの波形用
        src.connect(an_freq);

        // ローパス用
        src.connect(lowpass)
        lowpass.connect(an_lowFreq);

        // 新しい低周波数用
        src.connect(bass_lowpass);
        bass_lowpass.connect(an_bass);

        // 新しい高周波数用
        src.connect(highpass);
        highpass.connect(an_high);
    }

    // == 再生・停止のUI関連用の関数 ==
    function setPlaying(playing) {
        playback.onPlaybackChange?.(playing);
    }

    async function playAudio() {
        if (audio_ctx.state === "suspended") {
            await audio_ctx.resume();
        }
        await audio_el.play();
        p.loop();
    }

    function pauseAudio() {
        audio_el.pause();
        // p.noLoop();
    }

    function togglePlayback() {
        return audio_el.paused ? playAudio() : pauseAudio();
    }
    // =================================

    p.setup = async () => 
    {
        setupAudio();

        p.frameRate(30);


        const cnv = p.createCanvas(W, H, p.WEBGL);
        // 画面クリックで再生。コントロールUIがあるから不要
        /*
        cnv.mousePressed(() => {
            togglePlayback();
        });
        */

        // 再生コントロールUI関連のやつ
        if (playback.controller) {
            playback.controller.toggle = togglePlayback;
            playback.controller.dispose = () => {
                pauseAudio();
                src?.disconnect();
                lowpass?.disconnect();
                an_freq?.disconnect();
                an_lowFreq?.disconnect();
                audio_ctx?.close();
            };
        }
        // ==============================

        // 
        // g_graph setup
        (() => {
            g_graph = p.createGraphics(CANVAS_W - SW_SCREENS * 2, CANVAS_H - SW_SCREENS * 2, p.WEBGL);
            g_graph.translate(-(g_graph.width/2), -(g_graph.height/2));

            // --- 全体のレイアウト設定 ---
            objs_margin = 25;          // 各ボックス（画面）同士の間の隙間
            g_graph_padding = 27.5; // 画面全体の外周（上下左右）の余白

            // --- パネル領域の設定 ---
            (() => {
                // 1. 各ボックスのサイズを決定
                let main_box_w = g_graph.width - (g_graph_padding * 2);
                let equal_h = (g_graph.height - (g_graph_padding * 2) - objs_margin) / 2;
                let main_box_h = equal_h;
                let sub_box_w = (main_box_w - objs_margin) / 2;
                let sub_box_h = equal_h;
                
                // 2. 上部にサブグラフ群を配置
                g_graph_box_subGraph = {
                    x: g_graph_padding,
                    y: g_graph_padding,
                    w: sub_box_w,
                    h: sub_box_h
                };

                let right_col_x = g_graph_box_subGraph.x + g_graph_box_subGraph.w + objs_margin;
                let sub_sub_box_h = (sub_box_h - objs_margin) / 2;

                g_graph_box_ampGraphHigh = {
                    x: right_col_x,
                    y: g_graph_padding,
                    w: sub_box_w,
                    h: sub_sub_box_h
                };

                g_graph_box_ampGraphLow = {
                    x: right_col_x,
                    y: g_graph_box_ampGraphHigh.y + g_graph_box_ampGraphHigh.h + objs_margin,
                    w: sub_box_w,
                    h: sub_sub_box_h
                };

                // 3. 下部にメイングラフを配置
                g_graph_box_mainGraph = {
                    x: g_graph_padding,
                    y: g_graph_box_subGraph.y + g_graph_box_subGraph.h + objs_margin,
                    w: main_box_w,
                    h: main_box_h
                };

                // 4. メインボックス内のグラフサイズを決定
                let graph_padding_x = 40; // ボックスの内側からグラフまでの左右余白
                wave_width = main_box_w - (graph_padding_x * 2); // 棒グラフ自体の横幅
                waveform_width = wave_width + 25; // グリッド（背景の横線）の横幅（棒より少しだけ長くする）
                
                waveform_height = main_box_h; // (互換性のため保持)
                wave_height = (main_box_h - 55) - graph_padding_x; // 棒グラフが伸びる最大縦幅（自由に変更可能）
                
                bottom_text_pos_y = 10; // グラフの下に表示する数値の位置（底辺からの距離）
                rect_gap = 10; // 棒グラフ1本1本の間の隙間
                sort_func = sort_highLow;
            })();

            // 棒グラフの位置調整
            wave_pos_y = H - g_graph_box_mainGraph.y - wave_height;

            g_graph_subGraph = p.createGraphics(
                g_graph_box_subGraph.w - SW_PANELS * 2,
                g_graph_box_subGraph.h - SW_PANELS * 2,
                p.WEBGL
            );

            g_graph_ampGraphHigh = p.createGraphics(
                g_graph_box_ampGraphHigh.w - SW_PANELS * 2,
                g_graph_box_ampGraphHigh.h - SW_PANELS * 2,
                p.WEBGL
            );

            g_graph_ampGraphHigh_rawLine = p.createGraphics(
                g_graph_box_ampGraphHigh.w - SW_PANELS * 2,
                g_graph_box_ampGraphHigh.h - SW_PANELS * 2,
                p.WEBGL
            );

            g_graph_ampGraphHigh_fx = p.createGraphics(
                g_graph_box_ampGraphHigh.w - SW_PANELS * 2,
                g_graph_box_ampGraphHigh.h - SW_PANELS * 2,
                p.WEBGL
            );

            g_graph_ampGraphLow = p.createGraphics(
                g_graph_box_ampGraphLow.w - SW_PANELS * 2,
                g_graph_box_ampGraphLow.h - SW_PANELS * 2,
                p.WEBGL
            );

            g_graph_ampGraphLow_rawLine = p.createGraphics(
                g_graph_box_ampGraphLow.w - SW_PANELS * 2,
                g_graph_box_ampGraphLow.h - SW_PANELS * 2,
                p.WEBGL
            );

            g_graph_ampGraphLow_fx = p.createGraphics(
                g_graph_box_ampGraphLow.w - SW_PANELS * 2,
                g_graph_box_ampGraphLow.h - SW_PANELS * 2,
                p.WEBGL
            );

            g_graph_mainGraph = p.createGraphics(
                g_graph_box_mainGraph.w - SW_PANELS * 2,
                g_graph_box_mainGraph.h - SW_PANELS * 2,
                p.WEBGL
            );
        })();


        //
        // g_info setup
        (() => {
            g_info = p.createGraphics(CANVAS_W - SW_SCREENS * 2, CANVAS_H - SW_SCREENS * 2, p.WEBGL);
            g_info.translate(-g_info.width / 2, -g_info.height / 2);

            g_info_particle = p.createGraphics(CANVAS_W, CANVAS_H, p.WEBGL);

            // 縦幅の分割計算：使える縦幅の内、terminal を下に添える
            let available_h = g_info.height - g_graph_padding * 2;
            let terminal_h  = available_h * TERMINAL_HEIGHT_RATIO;
            let screen_h    = available_h - terminal_h - objs_margin;

            g_info_box_screen = {
                x: g_graph_padding,
                y: g_graph_padding,
                w: g_info.width - g_graph_padding * 2,
                h: screen_h
            };

            g_info_box_terminal = {
                x: g_graph_padding,
                y: g_graph_padding + screen_h + objs_margin,
                w: g_info.width - g_graph_padding * 2,
                h: terminal_h
            };

            // 合成パネル：白枠 + bg + shape を貼り合わせて g_info に配置する
            g_info_screen = p.createGraphics(
                g_info_box_screen.w,
                g_info_box_screen.h,
                p.WEBGL
            );
            g_info_screen.translate(-g_info_screen.width / 2, -g_info_screen.height / 2);

            // 背景レイヤー：g_info_particleを描く（Torus/Cubeで共通の内容のため共有）
            g_info_screen_bg = p.createGraphics(
                g_info_box_screen.w - SW_PANELS * 2,
                g_info_box_screen.h - SW_PANELS * 2,
                p.WEBGL
            );

            // 3D形状レイヤー：選択中の画面のTorus/Cube/Blankを描く
            // p5.Framebuffer を使用し、インナーストロークの内側サイズ（SW_PANELS分縮小）で生成
            g_info_screen_shape = p.createFramebuffer({
                width: g_info_box_screen.w - SW_PANELS * 2,
                height: g_info_box_screen.h - SW_PANELS * 2
            });
            // 画面固有の設定・状態（専用WEBGLバッファではなく、ただのデータ）
            g_info_torus = {
                rotX_speed: 0.01,
                rotY_speed: 0.015,
                rotZ_speed: 0.005,
                radius1: 250,
                radius2: 120,
                detailX: 24,
                detailY: 16,
            };

            g_info_cube = {
                rotX_speed: 0.008,
                rotY_speed: 0.012,
                rotZ_speed: 0.004,
                size: 350,
            };

            g_info_cylinder = {
                rotX_speed: 0.006,
                rotY_speed: 0.01,
                rotZ_speed: 0.008,
                radius:  180,
                height:  400,
                detailX: 24,
                detailY: 1,
            };

            // ターミナルパネルのWEBGLバッファ
            g_info_terminal = p.createGraphics(
                g_info_box_terminal.w - SW_PANELS * 2,
                g_info_box_terminal.h - SW_PANELS * 2,
                p.WEBGL
            );
        })();


        // camera
        cam = p.createCamera();
        p.setCamera(cam);
        cam.setPosition(0, 0, 800);
        cam.lookAt(0, 0, 0);



        // colors
        col_bg_main = {
            h: p.hue(p.color(design.backgroundColor)),
            s: p.saturation(p.color(design.backgroundColor)),
            b: p.brightness(p.color(design.backgroundColor)),
            get() { return p.color(this.h, this.s, this.b) } 
        };

        col_line = {
            h: p.hue(p.color(design.lineColor)),
            s: p.saturation(p.color(design.lineColor)),
            b: p.brightness(p.color(design.lineColor)),
            get() { return p.color(this.h, this.s, this.b) }
        };

        col_graph_bgLine = {
            h: col_line.h,
            s: col_line.s,
            b: col_line.b - 45, // 100超えそうだったら逆に下げるとか作ったほうがいいのかもしれない
            get() { return p.color(this.h, this.s, this.b) } 
        };

        // col_graph_bgLine = p.color("hsl(0, 0, 50%)");

        // text setup
        let f = await p.loadFont(PATH_FONT)
        g_graph.textFont(f);
        g_graph.textSize(18);
        g_graph.textAlign(p.CENTER, p.TOP);
        g_graph_mainGraph.textFont(f);
        g_graph_mainGraph.textSize(23);
        g_graph_mainGraph.textAlign(p.CENTER, p.TOP);
        g_info_terminal.textFont(f);
        g_info_terminal.textSize(30);
        g_info_terminal.textAlign(p.LEFT, p.TOP);

        // shader setup
        fx = p.createFilterShader(fragSrc);
        fx_mosaic = g_graph_ampGraphHigh_fx.createFilterShader(mosaicFragSrc);
        fx_mosaic.setUniform('resolution', [g_graph_ampGraphHigh_fx.width, g_graph_ampGraphHigh_fx.height]);
        fx_mosaic.setUniform('mosaicSize', 0);
        fx_mosaic_low = g_graph_ampGraphLow_fx.createFilterShader(mosaicFragSrc);
        fx_mosaic_low.setUniform('resolution', [g_graph_ampGraphLow_fx.width, g_graph_ampGraphLow_fx.height]);
        fx_mosaic_low.setUniform('mosaicSize', 0);
        fx.setUniform('resolution', [W, H]);
        fx.setUniform('fov', 1.0);        // お好みで調整
        fx.setUniform('aberration', 0.000);
        fx.setUniform('vignette', 0);

        playback.onReady?.();

    }

    const PARTICLE_COUNT = 200;
    const PARTICLE_SIZE = 200;
    const PARTICLE_POS_LIST = [];

    const PARTICLE_START_X = -700;
    const PARTICLE_END_X = 700;
    const PARTICLE_WIDTH = PARTICLE_END_X - PARTICLE_START_X;

    const PARTICLE_START_Y = -700;
    const PARTICLE_END_Y = 500;
    const PARTICLE_HEIGHT = PARTICLE_END_Y - PARTICLE_START_Y;

    function info_particle_draw()
    {
        g_info_particle.push();
        g_info_particle.background(col_bg_main.get());
        g_info_particle.fill(col_bg_main.get());
        g_info_particle.stroke(p.color(col_bg_main.h, col_bg_main.s, 15));
        g_info_particle.strokeWeight(2);

        const getPosX = () => Math.floor(Math.random() * PARTICLE_WIDTH) + PARTICLE_START_X;
        const getPosY = () => Math.floor(Math.random() * PARTICLE_HEIGHT) + PARTICLE_START_Y;

        while (PARTICLE_POS_LIST.length < PARTICLE_COUNT) {
            PARTICLE_POS_LIST.push([getPosX(), getPosY()]);
        }

        for (let i = 0; i < PARTICLE_COUNT; i++) {
            if (PARTICLE_POS_LIST[i][1] > PARTICLE_END_Y) {
                PARTICLE_POS_LIST[i] = [getPosX(), PARTICLE_START_Y];
            }
            g_info_particle.rect(PARTICLE_POS_LIST[i][0], PARTICLE_POS_LIST[i][1], PARTICLE_SIZE, PARTICLE_SIZE);
            PARTICLE_POS_LIST[i][1] += 1;
        }
    }

    const SPEED = 0.05;
    let progress = 0;
    const LINE_COUNT = 6;
    let progress_array = new Array(LINE_COUNT).fill(0);
    function graph_mainGraph_grid_draw()
    {
        // 下の文字（55px分）を避けた位置を棒グラフの底とする
        let bottom_y = g_graph_mainGraph.height - 55;
        let top_y = bottom_y - wave_height;

        g_graph_mainGraph.push();
        g_graph_mainGraph.translate(-g_graph_mainGraph.width / 2, -g_graph_mainGraph.height / 2); // WEBGLキャンバスの中心から左上へ
        g_graph_mainGraph.translate((g_graph_mainGraph.width - waveform_width) / 2, 0); // 中央揃え

        g_graph_mainGraph.stroke(col_line.get());
        // 一番下の線
        g_graph_mainGraph.strokeWeight(3);
        g_graph_mainGraph.line(0, bottom_y, waveform_width, bottom_y);

        // 縦の線
        g_graph_mainGraph.strokeWeight(3);
        g_graph_mainGraph.line(0, top_y, 0, bottom_y);


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

            g_graph_mainGraph.push();
            let c = col_graph_bgLine.get();
            c.setAlpha(alpha_val);
            g_graph_mainGraph.translate(0, y);
            g_graph_mainGraph.stroke(c);
            g_graph_mainGraph.strokeWeight(1);
            g_graph_mainGraph.line(0, 0, waveform_width, 0);
            c.setAlpha(255);
            g_graph_mainGraph.pop();
        }

        g_graph_mainGraph.noStroke();
        g_graph_mainGraph.pop();
    }

    let boost = 0;         // 明るさの上乗せ分
    const DECAY = 0.9;    // 減衰率(1に近いほどゆっくり元に戻る/0.9〜0.97くらいで調整)
    const GAIN  = 5;    // 増加分をどれだけ明るさに反映するか(感度)
    const BASE_BRIGHTNESS = 125;
    let prev_data = null;
    let boosts = null;
    let br = null;
    function graph_mainGraph_draw()
    {
        // グラフ背景を描画
        g_graph_mainGraph.background(col_bg_main.get());

        // グリッドをg_graph_mainGraphに描画
        graph_mainGraph_grid_draw();

        const buffer_length = an_freq.frequencyBinCount;

        if (!prev_data || prev_data.length !== buffer_length) {
            // 各ビンごとの「明るさの上乗せ量」を個別に保持する配列
            prev_data = new Uint8Array(buffer_length);
            boosts = new Float32Array(buffer_length);
            br = new Float32Array(buffer_length);
        }

        g_graph_mainGraph.push();
        g_graph_mainGraph.translate(-g_graph_mainGraph.width / 2, -g_graph_mainGraph.height / 2); // WEBGLキャンバスの中心から左上へ
        g_graph_mainGraph.translate((g_graph_mainGraph.width - wave_width) / 2, 0);
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
            br[i] = Math.min(255, BASE_BRIGHTNESS + boosts[i]);
        }

        prev_data.set(graph_array);


        let rect_w = (wave_width / an_freq_array.length) - rect_gap;
        let bottom_y = g_graph_mainGraph.height - 55; // グリッドと合わせた基準y座標

        // 棒グラフ描画
        for(let x = 0; x < graph_array.length; x++) {
            let mapped = p.map(graph_array[x], 0, 255, 0, wave_height);;
            let total_w = rect_w + rect_gap;

            g_graph_mainGraph.push();
            let c = col_line.get();
            c.setAlpha(br[x]);
            g_graph_mainGraph.fill(c);

            g_graph_mainGraph.noStroke();

            // 棒が小さすぎる場合におかしくならないよう調整
            let draw_h = -mapped;
            if (mapped <= 0) {
                draw_h = 0;
            }

            g_graph_mainGraph.rect(
                total_w * x + (rect_gap / 2), 
                bottom_y, rect_w, draw_h
            );

            g_graph_mainGraph.text(
                Math.round(p.map(graph_array[x], 0, 255, 0, 100)),
                total_w * x + total_w / 2, bottom_y + bottom_text_pos_y
            );
            g_graph_mainGraph.pop();
        }
        g_graph_mainGraph.pop();
    }


    function graph_subGraph_draw()
    {
        g_graph_subGraph.background(col_bg_main.get());
        // g_graph_subGraph.background(0, 255, 0);

        g_graph_subGraph.push();
        g_graph_subGraph.translate(-g_graph_subGraph.width / 2, -g_graph_subGraph.height / 2);

        // --- 低音域用グラフの描画 ---
        (() => {
            let c = p.color(col_line.get())
            // let c = p.color(col_bg_main.h, col_bg_main.s - 40, col_bg_main.b + 50)
            c.setAlpha(150)
            g_graph_subGraph.fill(c);
            g_graph_subGraph.noStroke();

            g_graph_subGraph.beginShape();
            g_graph_subGraph.vertex(0, g_graph_subGraph.height);

            // 低音域のみを抽出して描画幅に引き伸ばす
            let bass_bin_count = getBinCount(bass_lowpass.frequency.value, an_bass.fftSize, audio_ctx.sampleRate, 2.0);
            bass_bin_count = Math.max(50, Math.min(bass_bin_count, an_bass_array.length));

            let step = Math.max(1, Math.floor(bass_bin_count / 10));

            // 1. 描画するamplitudeだけを入れた配列を作る
            let draw_amps = [];
            for (let i = 0; i < bass_bin_count; i += step) {
                draw_amps.push(an_bass_array[i]);
            }

            // 波形の左右反転フラグ（trueで反転）
            let is_reverse = true;
            if (is_reverse) {
                draw_amps.reverse();
            }

            // 最初の制御点
            let firstH = p.map(draw_amps[0], 0, 255, 0, g_graph_subGraph.height);
            g_graph_subGraph.splineVertex(0, g_graph_subGraph.height - firstH);

            let lastX = 0;
            let lastH = 0;
            // 2. 描画するときはその配列をループで回す
            for (let i = 0; i < draw_amps.length; i++) {
                let amp = draw_amps[i];
                let h = p.map(amp, 0, 255, 0, g_graph_subGraph.height);
                let x = p.map(i, 0, draw_amps.length - 1, 0, g_graph_subGraph.width);
                g_graph_subGraph.splineVertex(x, g_graph_subGraph.height - h);
                lastX = x;
                lastH = h;
            }

            // 最後の制御点
            g_graph_subGraph.splineVertex(lastX, g_graph_subGraph.height - lastH);
            g_graph_subGraph.vertex(lastX, g_graph_subGraph.height);
            g_graph_subGraph.endShape(p.CLOSE);
        })();

        // --- 高音域用グラフの描画 ---
        (() => {
            let c = p.color(col_bg_main.h, col_bg_main.s - 40, col_bg_main.b + 50)
            c.setAlpha(150)
            g_graph_subGraph.fill(c);
            g_graph_subGraph.beginShape();
            g_graph_subGraph.vertex(0, g_graph_subGraph.height);

            // 高音域のアナライザーからサンプリング（高域全体）
            // フィルターのカットオフ付近（5000Hz〜）から意味のある高音域までを抽出
            let start_bin = getBinCount(highpass.frequency.value, an_high.fftSize, audio_ctx.sampleRate, 0.8);
            let end_bin = getBinCount(16000, an_high.fftSize, audio_ctx.sampleRate, 1.0); // 16kHz程度まで
            start_bin = Math.min(start_bin, an_high_array.length - 10);
            end_bin = Math.min(end_bin, an_high_array.length);

            let bin_range = Math.max(10, end_bin - start_bin);
            let step_high = Math.max(1, Math.floor(bin_range / 10));

            let draw_amps_high = [];
            for (let i = start_bin; i < end_bin; i += step_high) {
                draw_amps_high.push(an_high_array[i]);
            }

            // 波形の左右反転フラグ
            let is_reverse_high = false;
            if (is_reverse_high) {
                draw_amps_high.reverse();
            }

            // 最初の制御点
            let firstH_high = p.map(draw_amps_high[0], 0, 255, 0, g_graph_subGraph.height);
            g_graph_subGraph.splineVertex(0, g_graph_subGraph.height - firstH_high);

            let lastX_high = 0;
            let lastH_high = 0;
            for (let i = 0; i < draw_amps_high.length; i++) {
                let amp = draw_amps_high[i];
                let h = p.map(amp, 0, 255, 0, g_graph_subGraph.height);
                let x = p.map(i, 0, draw_amps_high.length - 1, 0, g_graph_subGraph.width);
                g_graph_subGraph.splineVertex(x, g_graph_subGraph.height - h);
                lastX_high = x;
                lastH_high = h;
            }

            // 最後の制御点
            g_graph_subGraph.splineVertex(lastX_high, g_graph_subGraph.height - lastH_high);
            g_graph_subGraph.vertex(lastX_high, g_graph_subGraph.height);
            g_graph_subGraph.endShape(p.CLOSE);
            g_graph_subGraph.pop();
        })();
    }


    // ampGraphの波形別バージョン（使うかわからない）
    function graph_ampGraphHigh_waveform_draw(val)
    {
        amp_history_high.push(val);
        
        let speed = 2; // 1フレームで進むピクセル数
        let max_history = Math.ceil(g_graph_ampGraphHigh.width / speed);
        
        while (amp_history_high.length > max_history) {
            amp_history_high.shift();
        }

        // --- 波形を rawLine に描画 ---
        g_graph_ampGraphHigh_rawLine.clear();
        g_graph_ampGraphHigh_rawLine.push();
        g_graph_ampGraphHigh_rawLine.translate(-g_graph_ampGraphHigh_rawLine.width / 2, -g_graph_ampGraphHigh_rawLine.height / 2);
        
        g_graph_ampGraphHigh_rawLine.noFill();
        g_graph_ampGraphHigh_rawLine.stroke(col_line.get());
        g_graph_ampGraphHigh_rawLine.strokeWeight(10);

        g_graph_ampGraphHigh_rawLine.beginShape();
        for (let i = 0; i < amp_history_high.length; i++) {
            // 右端が最新データ
            let x = g_graph_ampGraphHigh_rawLine.width - (amp_history_high.length - 1 - i) * speed;
            // 値が大きいほど上に振れる
            let y = p.map(amp_history_high[i], 0, 255, g_graph_ampGraphHigh_rawLine.height - 10, 10);
            
            y = p.constrain(y, 10, g_graph_ampGraphHigh_rawLine.height - 10);
            g_graph_ampGraphHigh_rawLine.vertex(x, y);
        }
        g_graph_ampGraphHigh_rawLine.endShape();
        g_graph_ampGraphHigh_rawLine.pop();
    }

    // ampGraphのoscilloscope描画用の汎用関数
    function graph_ampGraph_oscilloscope_draw(raw_line, oscilloscope_state, val)
    {
        let w = raw_line.width;
        let h = raw_line.height;
        let center_y = h / 2;

        // オシロスコープ走査線（スキャンライナー）の更新処理
        let scan_speed = 3; // スキャン速度 (px/frame)
        let max_amp = center_y - 12; // 上下の振幅限界
        oscilloscope_state.smoothed_amp = oscilloscope_state.smoothed_amp === null
            ? val
            : p.lerp(oscilloscope_state.smoothed_amp, val, OSCILLOSCOPE_AMP_SMOOTHING);
        let oscillation = Math.sin(p.frameCount * OSCILLOSCOPE_WAVE_SPEED);
        let y_val = center_y - (oscilloscope_state.smoothed_amp / 255) * max_amp * oscillation;
        let previous_y = oscilloscope_state.previous_sweep_y ?? y_val;

        // 前回の値から補間しながら書き込み、走査ごとの段差をなくす
        for (let s = 0; s < scan_speed; s++) {
            let cur_x = Math.floor(oscilloscope_state.scan_x + s);
            if (cur_x < w) {
                let t = (s + 1) / scan_speed;
                oscilloscope_state.sweep_buffer[cur_x] = p.lerp(previous_y, y_val, t);
            }
        }
        oscilloscope_state.previous_sweep_y = y_val;

        // 走査線の進行方向の先頭（消去領域 head_gap）をクリア（null）にする
        let head_gap = 25;
        for (let g = 0; g < head_gap; g++) {
            let clear_x = Math.floor((oscilloscope_state.scan_x + scan_speed + g) % w);
            oscilloscope_state.sweep_buffer[clear_x] = null;
        }

        // 走査線位置を進める
        oscilloscope_state.scan_x = (oscilloscope_state.scan_x + scan_speed) % w;

        // --- 波形を rawLine に描画 ---
        raw_line.clear();
        raw_line.push();
        raw_line.translate(-w / 2, -h / 2);
        
        raw_line.noFill();
        raw_line.stroke(col_line.get());
        raw_line.strokeWeight(2);

        // 連続した波形ラインの描画 (nullをスキップして線分割)
        let in_shape = false;
        for (let x = 0; x < w; x++) {
            let cur_y = oscilloscope_state.sweep_buffer[x];
            if (cur_y !== null && cur_y !== undefined) {
                if (!in_shape) {
                    raw_line.beginShape();
                    in_shape = true;
                }
                raw_line.vertex(x, cur_y);
            } else {
                if (in_shape) {
                    raw_line.endShape();
                    in_shape = false;
                }
            }
        }
        if (in_shape) {
            raw_line.endShape();
        }

        // スキャンビームの先端（カーソル光）を描画
        raw_line.fill(col_line.get());
        raw_line.noStroke();
        raw_line.rect(oscilloscope_state.scan_x - 1, 0, 2, h); // 走査線のカーソル縦ライン

        raw_line.pop();
    }

    // ampGraphのgrid描画用の汎用関数
    function graph_ampGraph_grid_draw(graphics)
    {
        let w = graphics.width;
        let h = graphics.height;
        let grid_size = h / 5; // グリッドの間隔

        graphics.push();
        graphics.translate(-w / 2, -h / 2);
        graphics.stroke(col_graph_bgLine.get());
        graphics.strokeWeight(1);
        // for (let x = 0; x <= w; x += grid_size) {
        //     graphics.line(x, 0, x, h);
        // }
        graphics.line(w / 2, 0, w / 2, h);
        for (let y = 0; y <= h; y += grid_size) {
            graphics.line(0, y, w, y);
        }
        graphics.pop();
    }

    function graph_ampGraph_draw(graphics, raw_line, fx_layer, mosaic_fx, oscilloscope_state, val)
    {
        let w = graphics.width;
        let h = graphics.height;

        graphics.background(col_bg_main.get());
        graph_ampGraph_grid_draw(graphics);
        graph_ampGraph_oscilloscope_draw(raw_line, oscilloscope_state, val);

        // rawLineにモザイクをかける
        fx_layer.clear();
        fx_layer.push();
        fx_layer.translate(-w / 2, -h / 2);
        fx_layer.image(raw_line, 0, 0);
        fx_layer.pop();
        fx_layer.filter(mosaic_fx);

        // 背景の上にFXレイヤーを重ねる
        graphics.push();
        graphics.translate(-w / 2, -h / 2);
        graphics.image(fx_layer, 0, 0);
        graphics.pop();
    }

    function graph_ampGraphHigh_draw()
    {
        // 高音域の振幅を取得
        let start_bin = getBinCount(highpass.frequency.value, an_high.fftSize, audio_ctx.sampleRate, 0.8);
        let target_bin = Math.min(start_bin + 5, an_high_array.length - 1); 
        let val = an_high_array[target_bin];

        graph_ampGraph_draw(
            g_graph_ampGraphHigh,
            g_graph_ampGraphHigh_rawLine,
            g_graph_ampGraphHigh_fx,
            fx_mosaic,
            ampGraphHigh_oscilloscopeState,
            val
        );
    }

    function graph_ampGraphLow_draw()
    {
        // 低域全体のRMS値を使い、単一ビン由来の細かな揺れを抑える
        let bass_bin_count = getBinCount(
            bass_lowpass.frequency.value,
            an_bass.fftSize,
            audio_ctx.sampleRate
        );
        let val = getRMS(an_bass_array.slice(0, bass_bin_count));

        graph_ampGraph_draw(
            g_graph_ampGraphLow,
            g_graph_ampGraphLow_rawLine,
            g_graph_ampGraphLow_fx,
            fx_mosaic_low,
            ampGraphLow_oscilloscopeState,
            val
        );
    }

    function graph_panels_draw()
    {
        g_graph.push();
        g_graph.noStroke();

        // --- 棒グラフ ---
        // 枠（白の矩形）
        g_graph.fill(col_line.get());
        g_graph.rect(
            g_graph_box_mainGraph.x,
            g_graph_box_mainGraph.y,
            g_graph_box_mainGraph.w,
            g_graph_box_mainGraph.h
        );
        // 内側にGraphicsを描画（texture + rect でWEBGL座標のズレを回避）
        g_graph.texture(g_graph_mainGraph);
        g_graph.rect(
            g_graph_box_mainGraph.x + SW_PANELS,
            g_graph_box_mainGraph.y + SW_PANELS,
            g_graph_box_mainGraph.w - SW_PANELS * 2,
            g_graph_box_mainGraph.h - SW_PANELS * 2
        );

        // --- g_graph_subGraph ---
        // 枠（白の矩形）
        g_graph.fill(col_line.get());
        g_graph.rect(
            g_graph_box_subGraph.x,
            g_graph_box_subGraph.y,
            g_graph_box_subGraph.w,
            g_graph_box_subGraph.h
        );
        // 内側にGraphicsを描画
        g_graph.texture(g_graph_subGraph);
        g_graph.rect(
            g_graph_box_subGraph.x + SW_PANELS,
            g_graph_box_subGraph.y + SW_PANELS,
            g_graph_box_subGraph.w - SW_PANELS * 2,
            g_graph_box_subGraph.h - SW_PANELS * 2
        );
        
        // --- g_graph_ampGraphHigh ---
        graph_ampGraphHigh_draw();
        
        // 枠（白の矩形）
        g_graph.fill(col_line.get());
        g_graph.rect(
            g_graph_box_ampGraphHigh.x,
            g_graph_box_ampGraphHigh.y,
            g_graph_box_ampGraphHigh.w,
            g_graph_box_ampGraphHigh.h
        );
        // 内側にGraphicsを描画
        g_graph.texture(g_graph_ampGraphHigh);
        g_graph.rect(
            g_graph_box_ampGraphHigh.x + SW_PANELS,
            g_graph_box_ampGraphHigh.y + SW_PANELS,
            g_graph_box_ampGraphHigh.w - SW_PANELS * 2,
            g_graph_box_ampGraphHigh.h - SW_PANELS * 2
        );

        // --- g_graph_ampGraphLow ---
        graph_ampGraphLow_draw();

        // 枠（白の矩形）
        g_graph.fill(col_line.get());
        g_graph.rect(
            g_graph_box_ampGraphLow.x,
            g_graph_box_ampGraphLow.y,
            g_graph_box_ampGraphLow.w,
            g_graph_box_ampGraphLow.h
        );
        // 内側にGraphicsを描画
        g_graph.texture(g_graph_ampGraphLow);
        g_graph.rect(
            g_graph_box_ampGraphLow.x + SW_PANELS,
            g_graph_box_ampGraphLow.y + SW_PANELS,
            g_graph_box_ampGraphLow.w - SW_PANELS * 2,
            g_graph_box_ampGraphLow.h - SW_PANELS * 2
        );
        
        g_graph.pop();
    }



    // --- 背景レイヤー (g_info_screen_bg) ---
    // Torus/Cubeで内容が共通のため、画面種別に関係なく毎フレーム描画する
    function info_screenBg_draw()
    {
        g_info_screen_bg.background(col_bg_main.get());

        g_info_screen_bg.push();
        // 背景としてg_info_particleをそのまま描画（解像度の違いにより見切れることを許容）
        g_info_screen_bg.image(g_info_particle, -(g_info_particle.width / 2), -(g_info_particle.height / 2));
        g_info_screen_bg.pop();
    }

    // --- 3D形状レイヤー (g_info_screen_shape: Framebuffer): カメラ管理 ---
    let defaultShapeCam = null; // Torus/Cube/Cylinder 用の標準正面カメラ
    let blankCam = null;        // Blank 専用の公式カメラオブジェクト

    // Torus / Cube / Cylinder 用に標準の正面カメラを明示セットする（アスペクト比とトランジション干渉の補正）
    function info_screen_defaultCamera_set()
    {
        if (!defaultShapeCam) {
            defaultShapeCam = p.createCamera();
        }
        p.setCamera(defaultShapeCam);

        // Framebuffer の縦横比に合わせたアスペクト比と画角（FOV）を設定（縦長歪みの解消）
        let aspect = g_info_box_screen.w / g_info_box_screen.h;
        let fov = 2 * Math.atan(g_info_box_screen.h / 2 / 800);
        defaultShapeCam.perspective(fov, aspect, 0.1, 3000);

        defaultShapeCam.setPosition(0, 0, 800);
        defaultShapeCam.lookAt(0, 0, 0);
    }

    // --- 3D形状レイヤー: Torus ---
    function info_screenTorus_draw(frame = p.frameCount)
    {
        info_screen_defaultCamera_set();

        p.push();
        p.rotateX(frame * g_info_torus.rotX_speed);
        p.rotateY(frame * g_info_torus.rotY_speed);
        p.rotateZ(frame * g_info_torus.rotZ_speed);

        p.noFill();
        let torus_stroke = col_line.get();
        torus_stroke.setAlpha(150);
        p.stroke(torus_stroke);
        p.strokeWeight(1);

        p.torus(
            g_info_torus.radius1,
            g_info_torus.radius2,
            g_info_torus.detailX,
            g_info_torus.detailY
        );

        p.pop();
    }

    // --- 3D形状レイヤー: Cube ---
    const CUBE_COUNT = 16;
    const CUBE_POS_RANGE = 100;
    const CUBE_BASE_SIZE_MIN = 25;
    const CUBE_BASE_SIZE_MAX = 150;
    const CUBE_AMP_SIZE_RANGE = 400;
    function info_screenCube_draw(frame = p.frameCount)
    {
        info_screen_defaultCamera_set();

        if (g_info_cubes.length === 0) {
            for (let i = 0; i < CUBE_COUNT; i++) {
                g_info_cubes.push({
                    x: p.random(-CUBE_POS_RANGE, CUBE_POS_RANGE),
                    y: p.random(-CUBE_POS_RANGE, CUBE_POS_RANGE),
                    z: p.random(-CUBE_POS_RANGE, CUBE_POS_RANGE),
                    baseSize: p.random(CUBE_BASE_SIZE_MIN, CUBE_BASE_SIZE_MAX),
                    lastAmp: 0,
                });
            }
        }

        p.push();
        p.rotateX(frame * g_info_cube.rotX_speed);
        p.rotateY(frame * g_info_cube.rotY_speed);
        p.rotateZ(frame * g_info_cube.rotZ_speed);

        p.noFill();
        let cube_stroke = col_line.get();
        p.stroke(cube_stroke);
        p.strokeWeight(1);

        let isLive = (frame === p.frameCount);

        for (let i = 0; i < g_info_cubes.length; i++) {
            let cube = g_info_cubes[i];
            if (isLive) {
                cube.lastAmp = an_freq_array[i] ?? 0;
            }
            let size = cube.baseSize + p.map(cube.lastAmp, 0, 255, 0, CUBE_AMP_SIZE_RANGE);

            p.push();
            p.translate(cube.x, cube.y, cube.z);
            p.box(size);
            p.pop();
        }

        p.pop();
    }

    // --- 3D形状レイヤー: Cylinder ---
    function info_screenCylinder_draw(frame = p.frameCount)
    {
        info_screen_defaultCamera_set();

        p.push();
        p.rotateX(frame * g_info_cylinder.rotX_speed);
        p.rotateY(frame * g_info_cylinder.rotY_speed);
        p.rotateZ(frame * g_info_cylinder.rotZ_speed);

        p.noFill();
        let cylinder_stroke = col_line.get();
        cylinder_stroke.setAlpha(150);
        p.stroke(cylinder_stroke);
        p.strokeWeight(1);

        p.cylinder(
            g_info_cylinder.radius,
            g_info_cylinder.height,
            g_info_cylinder.detailX,
            g_info_cylinder.detailY
        );

        p.pop();
    }

    const BUILDING_COLS = 30;   // 列数（横方向）
    const BUILDING_ROWS = 30;   // 行数（奥行き方向）
    const BUILDING_CELL_W = 60; // 1マスの幅（隙間込み）
    const BUILDING_CELL_D = 60; // 1マスの奥行き（隙間込み）
    const BUILDING_GAP = 20;     // 隣のビルとの隙間
    const BUILDING_BASE_HEIGHT = 20;     // ベースの高さ (px)
    const BUILDING_AMP_HEIGHT_MAX = 350; // Amplitude による最大追加高さ (px)
    const BUILDING_SCROLL_SPEED = 5.0; // 前進スクロール速度 (px/frame)
    const CAMERA_PAN_SPEED = 0.0002;    // 首振りの速度（小さいほど遅い）
    const CAMERA_PAN_ROTATIONS = 2;     // 片方向への最大回転数（2回転）

    function info_screenBlank_draw(frame = p.frameCount)
    {
        // 初回に公式カメラを作成
        if (!blankCam) {
            blankCam = p.createCamera();
        }
        p.setCamera(blankCam);

        // Framebuffer の縦横比に合わせたアスペクト比を設定
        let aspect = g_info_box_screen.w / g_info_box_screen.h;
        let fov = 2 * Math.atan(g_info_box_screen.h / 2 / 800);
        blankCam.perspective(fov, aspect, 0.1, 3000);

        // ─── カメラの配置（街のど真ん中・全周囲首振り） ───
        let camX = 0;
        let camY = -500; // ビルを見下ろす適度な高さ
        let camZ = 0;    // 街の中心 (Z=0)
        blankCam.setPosition(camX, camY, camZ);

        // 右に2回転（+4π）➔ 左に2回転（-4π）をゆっくり往復
        let maxPanAngle = CAMERA_PAN_ROTATIONS * 2 * Math.PI;
        let panAngle = Math.sin(frame * CAMERA_PAN_SPEED) * maxPanAngle;

        let lookDist = 500;
        let targetX = camX + Math.sin(panAngle) * lookDist;
        let targetY = -300;   // 地面付近を見下ろす視線をキープ
        let targetZ = camZ - Math.cos(panAngle) * lookDist;

        blankCam.lookAt(targetX, targetY, targetZ);

        p.push();
        p.fill(col_bg_main.get());
        p.stroke(col_line.get());
        p.strokeWeight(1);

        // ─── 無限前進スクロール計算（奥 -Z から手前 +Z へ流す） ───
        let scrollDist = frame * BUILDING_SCROLL_SPEED;
        let totalDepth = BUILDING_ROWS * BUILDING_CELL_D;
        let footprint_w = BUILDING_CELL_W - BUILDING_GAP;
        let footprint_d = BUILDING_CELL_D - BUILDING_GAP;

        for (let row = 0; row < BUILDING_ROWS; row++) {
            // スクロールにより「奥（-Z）から手前（+Z）」へ流れる Z 座標
            let rawZ = row * BUILDING_CELL_D + (scrollDist % totalDepth);
            // 範囲内にループ（手前を行き過ぎたら奥へ戻す）
            let z = ((rawZ % totalDepth) + totalDepth) % totalDepth - (totalDepth / 2);

            // 絶対グリッド行番号（前進するにつれて新しい街並みを奥から生成）
            let absRowIndex = Math.floor((scrollDist - z) / BUILDING_CELL_D);

            let maxRadius = totalDepth / 2; // 街の中心から最外周までの半径 (px)

            for (let col = 0; col < BUILDING_COLS; col++) {
                let x = (col - (BUILDING_COLS - 1) / 2) * BUILDING_CELL_W;

                // ─── 円形ラジアルフォグのアルファ計算 ───
                let distFromCenter = Math.hypot(x, z);
                let normDist = distFromCenter / maxRadius; // 0.0 (中心) 〜 1.0 (外周)
                // 中心〜55%までは完全不透明、55%〜95%にかけて透明にフェードアウト
                let alphaRatio = p.constrain(p.map(normDist, 0.55, 0.95, 1.0, 0.0), 0.0, 1.0);
                if (alphaRatio <= 0) continue; // 完全に見えないビルは描画スキップして高速化
                let alphaVal = alphaRatio * 255;

                // ビル固有の決定論的疑似乱数から担当周波数ビン（0〜31）を決定
                let seed = Math.abs(Math.sin(col * 12.9898 + absRowIndex * 78.233) * 43758.5453);
                let binIndex = Math.floor((seed - Math.floor(seed)) * (an_freq_array ? an_freq_array.length : 32));
                let amp = (an_freq_array && an_freq_array.length > 0) ? an_freq_array[binIndex] : 0;
                let audioHeight = p.map(amp, 0, 255, 0, BUILDING_AMP_HEIGHT_MAX);
                let height = BUILDING_BASE_HEIGHT + audioHeight;

                p.push();
                let fillCol = col_bg_main.get();
                fillCol.setAlpha(alphaVal);
                p.fill(fillCol);

                let strokeCol = col_line.get();
                strokeCol.setAlpha(alphaVal);
                p.stroke(strokeCol);

                // 地面(y=0)から上(-Y)に伸ばす
                p.translate(x, -height / 2, z);
                p.box(footprint_w, height, footprint_d);
                p.pop();
            }
        }

        p.pop();
    }

    // 画面名から Torus/Cube/Cylinder/Blank の描画関数を呼び分ける
    function info_screenShape_drawByName(screenName, frame = p.frameCount)
    {
        switch (screenName) {
            case "none":
                // 何も描画しない（非再生中などに使う）
                break;
            case "cube":
                info_screenCube_draw(frame);
                break;
            case "cylinder":
                info_screenCylinder_draw(frame);
                break;
            case "blank":
                info_screenBlank_draw(frame);
                break;
            case "torus":
            default:
                info_screenTorus_draw(frame);
                break;
        }
    }

    // --- 合成パネル (g_info_screen): 白枠 + bg + shape を貼り合わせ、g_infoに配置 ---
    function info_screenPanel_draw()
    {
        g_info_screen.push();
        g_info_screen.noStroke();

        // 枠（白の矩形）
        g_info_screen.fill(col_line.get());
        g_info_screen.rect(0, 0, g_info_screen.width, g_info_screen.height);

        // 背景テクスチャ (インナーストローク)
        g_info_screen.texture(g_info_screen_bg);
        g_info_screen.rect(
            SW_PANELS,
            SW_PANELS,
            g_info_screen.width - SW_PANELS * 2,
            g_info_screen.height - SW_PANELS * 2
        );

        // トランジション中の境界線（スキャンライン）
        if (g_infoTransition.active) {
            let lineY = g_infoTransition.progress * g_info_screen.height;
            let lineH = 1; // 線の太さ(px)

            let line_col = col_line.get();
            line_col.setAlpha(255);
            g_info_screen.noStroke();
            g_info_screen.fill(line_col);
            g_info_screen.rect(0, lineY - lineH / 2, g_info_screen.width, lineH);
        }

        g_info_screen.pop();

        // --- 親キャンバス (g_info) に貼り付け ---
        g_info.push();
        g_info.noStroke();
        g_info.texture(g_info_screen);
        g_info.rect(
            g_info_box_screen.x,
            g_info_box_screen.y,
            g_info_box_screen.w,
            g_info_box_screen.h
        );
        g_info.pop();
    }

    // スキャンライントランジション中の描画：g_info_screen_shape を
    // gl.scissor で上帯/下帯に分け、上帯に新画面・下帯に旧画面(静止)を描く
    function info_screenShape_drawTransition()
    {
        let elapsed = p.frameCount - g_infoTransition.startFrame;
        let t = elapsed / g_infoTransition.duration;

        if (t >= 1) {
            // トランジション完了：通常描画に戻す
            g_infoTransition.active = false;
            info_screenShape_drawByName(g_infoTransition.toScreen);
            return;
        }

        g_infoTransition.progress = t; // パネル側のスキャンライン描画で使う

        let gl = p.drawingContext;
        let dpr = p.pixelDensity();
        let w_px = g_info_screen_shape.width * dpr;
        let h_px = g_info_screen_shape.height * dpr;

        // 境界線（上端からの距離。CSS px→framebuffer px に変換）
        let lineY_px = t * g_info_screen_shape.height * dpr;

        gl.enable(gl.SCISSOR_TEST);

        // 上帯：新しい画面（通常通り回転を続ける）
        gl.scissor(0, h_px - lineY_px, w_px, lineY_px);
        info_screenShape_drawByName(g_infoTransition.toScreen);

        // 下帯：古い画面（トランジション開始時点の角度で静止）
        gl.scissor(0, 0, w_px, h_px - lineY_px);
        info_screenShape_drawByName(g_infoTransition.fromScreen, g_infoTransition.startFrame);

        gl.disable(gl.SCISSOR_TEST);
    }

    function info_screen_draw()
    {
        info_screenBg_draw();

        // ─── Framebuffer 内での 3D 描画 ───
        g_info_screen_shape.begin();
        p.clear();
        p.push();
        p.resetMatrix();

        if (g_infoTransition.active) {
            info_screenShape_drawTransition();
        } else if (is_playing) {
            info_screenShape_drawByName(currentInfoScreen);
        }

        p.pop();
        g_info_screen_shape.end();

        info_screenPanel_draw();
    }

    // タイプライターの進行ロジック（左右共通で使う汎用関数）
    function terminal_state_advance(state)
    {
        if (state.logs.length === 0 && state.pendingQueue.length > 0) {
            // 新しい行を1つ、表示キューから出す
            let text = state.pendingQueue.shift();
            state.logs.push({ fullText: text, displayedLength: 0 });
        } else if (state.logs.length > 0) {
            let activeLog = state.logs[state.logs.length - 1];
            if (activeLog.displayedLength < activeLog.fullText.length) {
                if (p.frameCount % TYPE_SPEED_FRAMES === 0) {
                    activeLog.displayedLength++;
                }
            } else if (state.pendingQueue.length > 0) {
                state.lineDelayCounter++;
                if (state.lineDelayCounter >= LINE_DELAY_FRAMES) {
                    state.lineDelayCounter = 0;
                    let text = state.pendingQueue.shift();
                    state.logs.push({ fullText: text, displayedLength: 0 });
                    if (state.logs.length > MAX_TERMINAL_LINES) {
                        state.logs.shift();
                    }
                }
            }
            // pending_queue が空 かつ 最終行のタイプも完了 → 何もしない（静止）
        }
        // logs も pendingQueue も空 → 何もしない（アイドル状態）
    }

    // terminal の表示内容を更新する。
    // 呼び出した瞬間、表示中の内容は次フレームで消え、渡した lines を
    // 先頭から順にタイプライターアニメーションで表示し直す。
    function info_terminal_update(state, lines)
    {
        state.logs = [];
        state.pendingQueue = [...lines];
        state.lineDelayCounter = 0;
    }

    // 左右それぞれの状態を対象に更新する、呼び出し側用の薄いラッパー
    function info_terminalLeft_update(lines)  { info_terminal_update(terminal_state_left, lines); }
    function info_terminalRight_update(lines) { info_terminal_update(terminal_state_right, lines); }

    // state のpendingQueueに新しい行を追記する（logs・表示中の内容はリセットしない）
    function terminal_state_append(state, lines)
    {
        state.pendingQueue.push(...lines);
    }

    function info_terminalRight_append(lines) { terminal_state_append(terminal_state_right, lines); }

    // テキスト描画の汎用関数（左右共通で使う。startX で描画開始位置を切り替える）
    function terminal_state_drawTexts(state, startX, startY, lineHeight)
    {
        for (let i = 0; i < state.logs.length; i++) {
            let log = state.logs[i];
            let displayText = log.fullText.substring(0, log.displayedLength);

            // アクティブで入力中の行にはカーソル '_' を追加
            if (i === state.logs.length - 1 && log.displayedLength < log.fullText.length) {
                displayText += "_";
            }

            g_info_terminal.text(displayText, startX, startY + i * lineHeight);
        }
    }

    function info_terminal_draw()
    {
        g_info_terminal.background(col_bg_main.get());

        // 1. 状態の更新（左右独立）
        terminal_state_advance(terminal_state_left);
        terminal_state_advance(terminal_state_right);

        // 2. 中央の区切り線（縦線）
        // g_info_terminal は translate していないので、ローカル座標の原点(0,0)はバッファ中心
        // これがそのまま左右の境界線位置と一致する
        g_info_terminal.push();
        g_info_terminal.stroke(col_line.get());
        g_info_terminal.strokeWeight(1);
        g_info_terminal.line(0, -g_info_terminal.height / 2, 0, g_info_terminal.height / 2);
        g_info_terminal.pop();

        // 3. テキスト描画（WEBGLキャンバス中心が(0,0)のため左上基準に計算）
        let startY = -g_info_terminal.height / 2 + 8;
        let lineHeight = 27;
        let padding = 10;

        g_info_terminal.fill(col_line.get());
        g_info_terminal.noStroke();

        let leftStartX  = -g_info_terminal.width / 2 + padding; // 左端から
        let rightStartX = padding;                              // 中央線から少し右

        terminal_state_drawTexts(terminal_state_left,  leftStartX,  startY, lineHeight);
        terminal_state_drawTexts(terminal_state_right, rightStartX, startY, lineHeight);
    }

    function info_drawCanvas()
    {
        g_info.background(col_bg_main.get());
        info_screen_draw();

        // --- g_info_terminal ---
        info_terminal_draw();
        g_info.push();
        g_info.noStroke();
        // 枠（白の矩形）
        g_info.fill(col_line.get());
        g_info.rect(
            g_info_box_terminal.x,
            g_info_box_terminal.y,
            g_info_box_terminal.w,
            g_info_box_terminal.h
        );
        // 内側にGraphicsを描画（インナーストローク）
        g_info.texture(g_info_terminal);
        g_info.rect(
            g_info_box_terminal.x + SW_PANELS,
            g_info_box_terminal.y + SW_PANELS,
            g_info_box_terminal.w - SW_PANELS * 2,
            g_info_box_terminal.h - SW_PANELS * 2
        );
        g_info.pop();
    }

    // トランジション開始の共通ヘルパー（"i"キーでの画面切替、再生/停止トリガーの両方から使う）
    // 戻り値: トランジションを開始できたら true、多重起動などで無視した場合は false
    function info_transition_start(fromScreen, toScreen)
    {
        if (g_infoTransition.active) {
            return false; // トランジション中は多重起動しない
        }

        g_infoTransition.active = true;
        g_infoTransition.fromScreen = fromScreen;
        g_infoTransition.toScreen = toScreen;
        g_infoTransition.startFrame = p.frameCount;

        console.log("info transition:", fromScreen, "->", toScreen);

        return true;
    }

    // "i" キーで info screen (Torus/Cube) を切り替える（スキャンライントランジション開始）
    p.keyPressed = () => 
    {
        if (p.key === "i" || p.key === "I") {
            const SCREEN_ORDER = ["blank", "torus", "cube", "cylinder"];
            let nextScreen = SCREEN_ORDER[(SCREEN_ORDER.indexOf(currentInfoScreen) + 1) % SCREEN_ORDER.length];

            if (is_playing) {
                // 再生中：画面に見えているのでスキャンライン演出付きで切り替える
                let started = info_transition_start(currentInfoScreen, nextScreen);
                if (!started) {
                    return; // トランジション中は多重起動しない
                }

                // 画面切り替えのログを右側に追記する
                info_terminalRight_append(["Switched to " + nextScreen + " view."]);
            }
            // 非再生中：画面は非表示のため演出は出さず、選択のみ静かに更新する
            // （次回再生時にこの画面が出現する）

            currentInfoScreen = nextScreen;
        }

        if (p.key === "t" || p.key === "T") {
            // テスト用: ダミーメッセージからランダムに2～4行選んで左側ターミナルを更新する
            let line_count = p.floor(p.random(2, MAX_TERMINAL_LINES + 1)); // 2～4行
            let sample_lines = [];
            for (let i = 0; i < line_count; i++) {
                sample_lines.push(p.random(terminal_dummy_messages));
            }
            info_terminalLeft_update(sample_lines);
            console.log("terminal update (left):", sample_lines);
        }

        if (p.key === "y" || p.key === "Y") {
            // テスト用: 右側ターミナルを同じダミーメッセージから更新する
            // 中身は他であり、左側と同じ汎用タイプライター機構が独立して動くことを確認するための他のもの
            let line_count = p.floor(p.random(2, MAX_TERMINAL_LINES + 1)); // 2～4行
            let sample_lines = [];
            for (let i = 0; i < line_count; i++) {
                sample_lines.push(p.random(terminal_dummy_messages));
            }
            info_terminalRight_update(sample_lines);
            console.log("terminal update (right):", sample_lines);
        }
    }

    p.draw = () => 
    {
        p.colorMode(p.HSB);
        p.background(col_bg_main.get());
        p.translate(-(p.width/2), -(p.height/2));
        g_graph.background(col_bg_main.get());
        g_graph.noStroke();

        an_freq.getByteFrequencyData(an_freq_array);
        an_lowFreq.getByteFrequencyData(an_lowFreq_array);
        an_bass.getByteFrequencyData(an_bass_array);
        an_high.getByteFrequencyData(an_high_array);

        // カメラの動き
        let bin_count = getBinCount(lowpass.frequency.value, an_lowFreq.fftSize, audio_ctx.sampleRate);
        let rms = getRMS(an_lowFreq_array.slice(0, bin_count));
        // cam.setPosition(0, 0, 800 - p.map(rms, 0, 255, 0, 70));
        cam.setPosition(0, 0, 800);

        //
        // --- 描画処理の実行 ---
        info_particle_draw();
        graph_mainGraph_draw(); // グラフとグリッドはこの中で描画される
        graph_subGraph_draw();

        graph_panels_draw();
        info_drawCanvas();

        // --- メインキャンバス(p)への配置とインナーストロークの実装 ---
        p.push();
        p.noStroke();

        // g_info のインナーストロークと描画
        p.fill(col_line.get());
        p.rect(SCREEN_MARGIN, SCREEN_MARGIN, CANVAS_W, CANVAS_H); // 白枠：固定サイズのまま
        p.texture(g_info);
        p.rect(
            SCREEN_MARGIN + SW_SCREENS, 
            SCREEN_MARGIN + SW_SCREENS, 
            g_info.width,  // 1:1描画（生成サイズ=描画サイズ）
            g_info.height
        );

        // 3D形状レイヤー（Framebuffer）を g_info のスクリーン領域の上に直接重ねる（Y反転補正 & インナーストロークの内側に配置）
        if (is_playing || g_infoTransition.active) {
            let shape_x = SCREEN_MARGIN + SW_SCREENS + g_info_box_screen.x + SW_PANELS;
            let shape_y = SCREEN_MARGIN + SW_SCREENS + g_info_box_screen.y + SW_PANELS;
            let shape_w = g_info_box_screen.w - SW_PANELS * 2;
            let shape_h = g_info_box_screen.h - SW_PANELS * 2;

            p.push();
            p.translate(shape_x, shape_y + shape_h);
            p.scale(1, -1);
            p.texture(g_info_screen_shape);
            p.rect(0, 0, shape_w, shape_h);
            p.pop();
        }

        // g_graph のインナーストロークと描画
        let graph_x = SCREEN_MARGIN * 3 + CANVAS_W;
        p.fill(col_line.get());
        p.rect(graph_x, SCREEN_MARGIN, CANVAS_W, CANVAS_H); // 白枠：固定サイズのまま
        p.texture(g_graph);
        p.rect(
            graph_x + SW_SCREENS, 
            SCREEN_MARGIN + SW_SCREENS, 
            g_graph.width,  // 1:1描画（生成サイズ=描画サイズ）
            g_graph.height
        );

        p.pop();
    }

    function getBinCount(cutoffFreq, fftSize, sampleRate, marginRatio = 1) 
    {
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
}
