import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SettingsProvider } from "@/context/SettingsContext";
import { ScriptSettingsProvider } from "@/context/ScriptSettingsContext";
import { QueueProvider } from "@/context/QueueContext";

export const metadata: Metadata = { title: "hak", description: "Cyber reference reader + payload studio" };
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

const THEME_BOOT = `
(function(){
  try {
    var raw = localStorage.getItem("hak.settings");
    var t = raw ? (JSON.parse(raw).theme || "auto") : "auto";
    var d = t === "auto" ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : t;
    document.documentElement.dataset.theme = d;
  } catch (e) { document.documentElement.dataset.theme = "light"; }
})();
`.trim();

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" translate="no" className="notranslate" suppressHydrationWarning>
      <head>
        <meta name="google" content="notranslate" />
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
      </head>
      <body>
        <SettingsProvider>
          <ScriptSettingsProvider>
            <QueueProvider>{children}</QueueProvider>
          </ScriptSettingsProvider>
        </SettingsProvider>
      </body>
    </html>
  );
}
