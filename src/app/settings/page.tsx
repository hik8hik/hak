"use client";
import { useSettings } from "@/context/SettingsContext";
import Header from "@/components/Header";
export default function SettingsPage() {
  const { s, set, reset } = useSettings();
  return (
    <div className="app">
      <Header />
      <main className="main">
        <div className="card raised" style={{ maxWidth: 640 }}>
          <h3>Settings</h3>
          <p className="muted small">The floating drawer is preferred — it never navigates away.</p>
          <pre className="mono small" style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(s, null, 2)}</pre>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button className="btn" onClick={() => set("theme", "dark")}>Dark</button>
            <button className="btn" onClick={() => set("theme", "light")}>Light</button>
            <button className="btn" onClick={() => set("theme", "black")}>Black</button>
            <button className="btn" onClick={reset}>Reset</button>
          </div>
        </div>
      </main>
    </div>
  );
}
