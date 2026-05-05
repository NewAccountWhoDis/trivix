"use client";
import * as React from "react";
import dynamic from "next/dynamic";
import { useMotionTier } from "@/hooks/useMotionTier";
import { StaticGridFloor } from "./StaticGridFloor";

const FullScene = dynamic(
  () => import("./FullScene").then((m) => m.FullScene),
  {
    ssr: false,
    loading: () => null,
  },
);

export function BrandScene() {
  const tier = useMotionTier();

  if (tier === "full") return <FullScene />;
  return <StaticGridFloor className="absolute inset-0 -z-10" />;
}
