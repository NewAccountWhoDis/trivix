'use client';
import * as React from 'react';
import { Canvas } from '@react-three/fiber';
import { GridFloor } from './GridFloor';

export function FullScene() {
  return (
    <div className="absolute inset-0 -z-10">
      <Canvas
        camera={{ position: [0, 1.4, 4], fov: 60 }}
        dpr={[1, 1.6]}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <color attach="background" args={['#050608']} />
        <ambientLight intensity={0.4} />
        <pointLight position={[3, 4, 2]} intensity={2.0} color="#ff1f3a" />
        <GridFloor />
      </Canvas>
    </div>
  );
}
