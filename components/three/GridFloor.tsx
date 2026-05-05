"use client";
import * as React from "react";
import { useFrame } from "@react-three/fiber";
import type * as THREE from "three";

export function GridFloor() {
  const ref = React.useRef<THREE.GridHelper>(null);
  useFrame((_state, dt) => {
    if (ref.current) {
      ref.current.position.z = (ref.current.position.z + dt * 0.6) % 4;
    }
  });
  return (
    <gridHelper
      ref={ref}
      args={[40, 40, "#ff1f3a", "#1a1c22"]}
      position={[0, -1.2, 0]}
      rotation={[0, 0, 0]}
    />
  );
}
