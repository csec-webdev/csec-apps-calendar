import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <main style={{ maxWidth: 720, margin: "32px auto", padding: "0 16px" }}>
      <h1>Unauthorized</h1>
      <p style={{ opacity: 0.85 }}>
        You are signed in, but your email is not authorized for this admin portal.
      </p>
      <p>
        If you believe this is a mistake, contact the Super Admin.
      </p>
      <p>
        <Link href="/api/auth/signout">Sign out</Link>
      </p>
    </main>
  );
}


