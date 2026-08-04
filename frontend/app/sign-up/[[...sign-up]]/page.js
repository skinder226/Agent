import { SignUp } from "@clerk/nextjs";

export default function Page() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0b0f19] p-4">
    <SignUp
  appearance={{
    elements: {
      card: "bg-zinc-900 border border-zinc-800 rounded-2xl shadow-xl",
      headerTitle: "text-white text-3xl font-bold",
      headerSubtitle: "text-zinc-400",
      formFieldInput:
        "bg-zinc-800 border-zinc-700 text-white rounded-lg",
      formButtonPrimary:
        "bg-blue-600 hover:bg-blue-700 rounded-lg",
      socialButtonsBlockButton:
        "bg-zinc-800 hover:bg-zinc-700 text-white border-zinc-700",
    
    },
  }}
/>
    </div>
  );
}