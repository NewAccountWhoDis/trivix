import { Suspense } from "react";
import { PlayJoinForm } from "./PlayJoinForm";

export default function PlayJoinPage() {
  return (
    <Suspense fallback={null}>
      <PlayJoinForm />
    </Suspense>
  );
}
