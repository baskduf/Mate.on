import { AvatarPreview } from "../components/avatar-preview";
import { createBaseLayers } from "../lib/avatar";

export default function Home() {
  const clerkConfigured =
    Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) && Boolean(process.env.CLERK_SECRET_KEY);

  const demoLayers = {
    ...createBaseLayers(),
    bottom: "/avatar/bottom.svg",
    top: "/avatar/top.svg",
    hair: "/avatar/hair.svg",
    accessory: "/avatar/accessory.svg",
    effect: "/avatar/effect.svg"
  };

  return (
    <main style={{ maxWidth: 980, margin: "0 auto", padding: 24, fontFamily: "Segoe UI, sans-serif" }}>
      <header style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 28 }}>Mate.on</h1>
        <p style={{ margin: "6px 0 0", color: "#475569" }}>Desktop Avatar Community</p>
      </header>

      <section style={{ display: "grid", gap: 14 }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>Avatar Preview (512x512 Layer Stack)</h2>
        <p style={{ margin: 0, color: "#475569" }}>
          Shadow -{">"} Body -{">"} Bottom -{">"} Top -{">"} Hair -{">"} Accessory -{">"} Effect
        </p>
        <AvatarPreview layers={demoLayers} />
      </section>

      <section style={{ marginTop: 20, color: "#334155" }}>
        <p style={{ margin: 0 }}>
          Clerk auth status: {clerkConfigured ? "Configured" : "Missing keys"}.
        </p>
      </section>
    </main>
  );
}
