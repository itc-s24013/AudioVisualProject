'use client';
import { useEffect, useRef } from 'react';
import { sketch } from './waveformSketch.js';
import { useAudioFile } from '@/app/context/AudioFileProvider';

export default function Play() {
    const containerRef = useRef(null);
    const { audioFile } = useAudioFile();

    useEffect(() => {
        let p5Instance;
        let objectUrl = null;

        (async () => {
            const p5 = (await import('p5')).default;

            // アップロードされた File があれば、このページの寿命に合わせて
            // object URL を作る（無ければ waveformSketch 側のデフォルト曲にフォールバック）
            const audioSrc = audioFile ? (objectUrl = URL.createObjectURL(audioFile)) : null;

            p5Instance = new p5((p) => sketch(p, audioSrc), containerRef.current);
        })();

        return () => {
            p5Instance?.remove();
            if (objectUrl) {
                URL.revokeObjectURL(objectUrl);
            }
        };
    }, [audioFile]);

    return (
        <div>
            {!audioFile && (
                <p style={{ padding: '16px' }}>
                    音声ファイルがアップロードされていないため、サンプル音声を再生します。
                    プリセット画面で音声ファイルを選択してから開くと、その音声が流れます。
                </p>
            )}
            <div ref={containerRef}></div>
        </div>
    );
}