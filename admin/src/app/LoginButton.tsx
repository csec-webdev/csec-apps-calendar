"use client";

import { signIn } from "next-auth/react";

export default function LoginButton() {
  const handleLogin = () => {
    signIn("azure-ad", { callbackUrl: "/admin" });
  };

  return (
    <button
      onClick={handleLogin}
      className="inline-flex items-center justify-center px-10 py-4 bg-red-600 text-white text-lg font-semibold rounded-lg hover:bg-red-700 hover:scale-105 hover:shadow-xl transition-all duration-200 ease-in-out active:scale-95"
    >
      Click To Login
    </button>
  );
}
