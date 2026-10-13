import Header from "@/components/Header";
import ScamScanner from "@/components/ScamScanner";

export const metadata = { title: "Scam scanner — hak" };

export default function Page() {
  return (
    <div className="app">
      <Header />
      <main className="main">
        <ScamScanner />
      </main>
    </div>
  );
}
