import StudioShell from "@/components/Studio/StudioShell";
import Header from "@/components/Header";
export const metadata = { title: "Payload Studio — hak" };
export default function StudioPage() {
  return (
    <div className="app">
      <Header />
      <main className="main"><StudioShell /></main>
    </div>
  );
}
