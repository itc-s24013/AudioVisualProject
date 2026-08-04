'use client';
import { useEffect, useRef } from 'react';
import { sketch } from './waveformSketch.js';


export default function Play() {
    const containerRef = useRef(null);

    useEffect(() => {
        let p5Instance;
        (async () => {
            const p5 = (await import('p5')).default;
            p5Instance = new p5(sketch, containerRef.current);
        })();
        return () => p5Instance?.remove();
    }, []);

    return (
        <div>
        <div ref={containerRef}></div>
        </div>
    );
}
