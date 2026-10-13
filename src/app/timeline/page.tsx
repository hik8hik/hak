import Header from "@/components/Header";
import TimelineView from "@/components/Timeline";

export default async function Page({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams;
  return (
    <div className="app">
      <Header />
      <main className="main">
        {id ? <TimelineView itemId={id} /> : <p className="muted">Pass ?id=CVE-2024-3094</p>}
      </main>
    </div>
  );
}
