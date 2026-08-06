'use client';
import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { sketch } from './waveformSketch.js';
import styles from './page.module.css';
import { useAudioFile } from '@/app/context/AudioFileProvider';
import { useDesignSettings } from '@/app/context/DesignSettingProvider';

export default function Play() {
    const containerRef = useRef(null);
    const playbackControllerRef = useRef(null);
    const { audioFile } = useAudioFile();
    const { designSettings } = useDesignSettings();
    const [isReady, setIsReady] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);

    useEffect(() => {
        let p5Instance;
        let objectUrl = null;
        let disposed = false;
        const playbackController = {};

        playbackControllerRef.current = playbackController;

        (async () => {
            const p5 = (await import('p5')).default;
            if (disposed) return;

            // アップロードされた File があれば、このページの寿命に合わせて
            // object URL を作る(無ければ waveformSketch 側のデフォルト曲にフォールバック)
            const audioSrc = audioFile ? (objectUrl = URL.createObjectURL(audioFile)) : null;

            p5Instance = new p5(
                (p) => sketch(p, audioSrc, designSettings, {
                    controller: playbackController,
                    onReady: () => {
                        if (!disposed) {
                            setIsPlaying(false);
                            setIsReady(true);
                        }
                    },
                    onPlaybackChange: (playing) => !disposed && setIsPlaying(playing),
                }),
                containerRef.current
            );
        })();

        return () => {
            disposed = true;
            playbackController.dispose?.();
            if (playbackControllerRef.current === playbackController) {
                playbackControllerRef.current = null;
            }
            p5Instance?.remove();
            if (objectUrl) {
                URL.revokeObjectURL(objectUrl);
            }
        };
    }, [audioFile, designSettings]);

    const togglePlayback = () => {
        playbackControllerRef.current?.toggle?.();
    };

    return (
        <div className={styles.playPage}>
            {!audioFile && (
                <p className={styles.audioNotice}>
                    音声ファイルがアップロードされていないため、サンプル音声を再生します。
                    プリセット画面で音声ファイルを選択してから開くと、その音声が流れます。
                </p>
            )}
            <button
                type="button"
                onClick={togglePlayback}
                disabled={!isReady}
                aria-pressed={isPlaying}
                aria-label={isPlaying ? '一時停止' : '再生'}
                style={{
                    position: 'fixed',
                    bottom: '24px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 2,
                    border: '1px solid #fff',
                    padding: 0,
                    lineHeight: 0,
                }}
            >
                <Image
                    src={isPlaying ? '/pause.png' : '/play.png'}
                    alt=""
                    width={48}
                    height={48}
                />
            </button>
            <div ref={containerRef} className={styles.canvasContainer}></div>
        </div>
    );
}
