import Header from "@/components/Header";
import DailyBrief from "@/components/DailyBrief";
export const metadata = { title: "Daily brief — hak" };
export default function Page() {
  return (
    <div className="app">
      <Header />
      <main className="main"><DailyBrief /></main>
    </div>
  );
}
