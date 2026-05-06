import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  sendEmailVerification,
  sendPasswordResetEmail,
  type AuthCredential,
  type User,
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

export async function sendVerificationEmail(user?: User): Promise<void> {
  const target = user ?? firebaseAuth.currentUser;
  if (!target) {
    throw new Error("No authenticated user to send verification email to.");
  }
  await sendEmailVerification(target);
}

export async function sendPasswordReset(email: string): Promise<void> {
  await sendPasswordResetEmail(firebaseAuth, email);
}

export async function getIdToken(forceRefresh = false): Promise<string> {
  const user = firebaseAuth.currentUser;
  if (!user) {
    throw new Error("No authenticated user.");
  }
  return user.getIdToken(forceRefresh);
}
