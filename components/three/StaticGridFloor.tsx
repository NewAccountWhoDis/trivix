import * as React from "react";

export function StaticGridFloor({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={className}
      style={{
        position: "absolute",
        inset: 0,
        backgroundColor: "#050608",
        backgroundImage:
          "repeating-linear-gradient(90deg, rgba(255,255,255,0.06) 0 1px, transparent 1px 60px)," +
          "repeating-linear-gradient(0deg, rgba(255,255,255,0.06) 0 1px, transparent 1px 60px)," +
          "radial-gradient(120% 80% at 50% 100%, rgba(255,31,58,0.18), transparent 60%)",
      }}
    />
  );
}
