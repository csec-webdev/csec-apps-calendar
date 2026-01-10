import Image from "next/image";
import LoginButton from "./LoginButton";

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
        <LoginButton />
      </main>
    </div>
  );
}
