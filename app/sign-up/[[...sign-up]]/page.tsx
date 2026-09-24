import { SignUp } from "@clerk/nextjs";

export default function Page() {
  return (
    <main className="w-full min-h-screen flex items-center justify-center bg-black px-4 pt-32 pb-16">
      <SignUp />
    </main>
  );
}
