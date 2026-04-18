import { SignIn } from "@clerk/nextjs";

export default function Page() {
  return <div className="flex justify-center items-center bg-[#1E2022] h-screen"><SignIn /></div>;
}
