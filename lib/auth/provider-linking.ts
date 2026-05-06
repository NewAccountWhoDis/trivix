import {
  linkWithCredential,
  signInWithEmailAndPassword,
  type AuthCredential,
  type UserCredential,
} from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase/client";

export {
  formatLinkRequiredMessage,
  formatGoogleSignInRequiredMessage,
} from "@/lib/auth/messages";

export async function linkPendingGoogleCredential(input: {
  email: string;
  password: string;
  pendingCred: AuthCredential;
}): Promise<UserCredential> {
  const signedIn = await signInWithEmailAndPassword(
    firebaseAuth,
    input.email,
    input.password,
  );
  return linkWithCredential(signedIn.user, input.pendingCred);
}
