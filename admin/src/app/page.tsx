import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <main className="text-center px-6">
        <Image
          src="https://d37ygqmmhd03wh.cloudfront.net/assets/csec_primary.svg"
          alt="Calgary Sports and Entertainment Corporation"
          width={400}
          height={88}
          priority
          className="mx-auto mb-8"
        />
        <h1 className="text-3xl font-bold text-zinc-900 mb-8">
          CSEC Apps Calendar
        </h1>
        <Link
          href="/api/auth/signin?callbackUrl=/admin"
          className="inline-flex items-center justify-center px-10 py-4 bg-red-600 text-white text-lg font-semibold rounded-lg hover:bg-red-700 hover:scale-105 hover:shadow-xl transition-all duration-200 ease-in-out active:scale-95"
        >
          Click To Login
        </Link>
      </main>
    </div>
  );
}
