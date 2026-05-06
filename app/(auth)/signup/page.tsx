import { Suspense } from "react";
import { SignupWizard } from "./SignupWizard";

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupWizard />
    </Suspense>
  );
}
