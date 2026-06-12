"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  GoogleAuthProvider,
  type User,
} from "firebase/auth";
import { auth } from "./firebase";
import { apiFetch } from "./api";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  getToken: () => Promise<string>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const googleProvider = new GoogleAuthProvider();

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // ログイン確認後にユーザードキュメントをFirestoreへ同期 (fire-and-forget)。
  // これが無いと users コレクションにドキュメントが作られない。
  useEffect(() => {
    if (!user) return;
    apiFetch("/api/auth/verify", { method: "POST" }).catch(() => {});
  }, [user]);

  // ログイン/ログアウト時にページをリロード。会話履歴などのUI状態を
  // ゲスト⇔ログイン切り替え時にきれいに作り直すため。
  const login = async () => {
    await signInWithPopup(auth, googleProvider);
    if (typeof window !== "undefined") window.location.reload();
  };

  const logout = async () => {
    await signOut(auth);
    if (typeof window !== "undefined") window.location.reload();
  };

  const getToken = async (): Promise<string> => {
    if (!user) throw new Error("Not authenticated");
    return user.getIdToken();
  };

  return (
    <AuthContext value={{ user, loading, login, logout, getToken }}>
      {children}
    </AuthContext>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
