import {
  EmailAuthProvider,
  GoogleAuthProvider,
  RecaptchaVerifier,
  createUserWithEmailAndPassword,
  linkWithCredential,
  signInWithEmailAndPassword,
  signInWithPhoneNumber,
  signInWithPopup,
  signOut,
  sendPasswordResetEmail,
  updatePassword,
  type AuthCredential,
  type ConfirmationResult,
  type UserCredential,
} from "firebase/auth";
import { FirebaseError } from "firebase/app";
import { firebaseAuth } from "@/lib/firebase/client";

export type GoogleSignInResult =
  | { kind: "success"; user: UserCredential }
  | {
      kind: "link-required";
      email: string;
      pendingCred: AuthCredential;
    };

export async function signUpWithEmail(input: {
  email: string;
  password: string;
}): Promise<UserCredential> {
  return createUserWithEmailAndPassword(
    firebaseAuth,
    input.email,
    input.password,
  );
}

export async function signInWithEmail(input: {
  email: string;
  password: string;
}): Promise<UserCredential> {
  return signInWithEmailAndPassword(firebaseAuth, input.email, input.password);
}

export async function signInWithGoogle(): Promise<GoogleSignInResult> {
  const provider = new GoogleAuthProvider();
  try {
    const cred = await signInWithPopup(firebaseAuth, provider);
    return { kind: "success", user: cred };
  } catch (err) {
    if (
      err instanceof FirebaseError &&
      err.code === "auth/account-exists-with-different-credential"
    ) {
      const email = (err.customData?.email as string | undefined) ?? "";
      const pendingCred = GoogleAuthProvider.credentialFromError(err);
      if (pendingCred && email) {
        return { kind: "link-required", email, pendingCred };
      }
    }
    throw err;
  }
}

export async function signOutClient(): Promise<void> {
  await signOut(firebaseAuth);
}

export async function sendPasswordReset(email: string): Promise<void> {
  await sendPasswordResetEmail(firebaseAuth, email);
}

export async function linkEmailPasswordToCurrentUser(
  email: string,
  password: string,
): Promise<void> {
  const user = firebaseAuth.currentUser;
  if (!user) throw new Error("No authenticated user to link credential to.");
  const credential = EmailAuthProvider.credential(email, password);
  await linkWithCredential(user, credential);
}

export async function updateCurrentUserPassword(
  newPassword: string,
): Promise<void> {
  const user = firebaseAuth.currentUser;
  if (!user) throw new Error("No authenticated user.");
  await updatePassword(user, newPassword);
}

let recaptchaVerifier: RecaptchaVerifier | null = null;

function getRecaptcha(containerId: string): RecaptchaVerifier {
  if (recaptchaVerifier) return recaptchaVerifier;
  recaptchaVerifier = new RecaptchaVerifier(firebaseAuth, containerId, {
    size: "invisible",
  });
  return recaptchaVerifier;
}

export function clearRecaptcha(): void {
  recaptchaVerifier?.clear();
  recaptchaVerifier = null;
}

export async function sendPhoneCode(
  phoneE164: string,
  containerId: string,
): Promise<ConfirmationResult> {
  return signInWithPhoneNumber(
    firebaseAuth,
    phoneE164,
    getRecaptcha(containerId),
  );
}

export async function confirmPhoneCode(
  confirmation: ConfirmationResult,
  code: string,
): Promise<UserCredential> {
  return confirmation.confirm(code);
}

export type { ConfirmationResult };

export async function getIdToken(forceRefresh = false): Promise<string> {
  const user = firebaseAuth.currentUser;
  if (!user) {
    throw new Error("No authenticated user.");
  }
  return user.getIdToken(forceRefresh);
}
