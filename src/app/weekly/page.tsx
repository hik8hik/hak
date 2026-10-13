import Header from "@/components/Header";
import WeeklyKev from "@/components/WeeklyKev";

export const metadata = { title: "This week in KEV — hak" };

export default function Page() {
  return (
    <div className="app">
      <Header />
      <main className="main">
        <WeeklyKev />
      </main>
    </div>
  );
}