import Header from "@/components/Header";
import Quiz from "@/components/Quiz";
export const metadata = { title: "Quiz — hak" };
export default function Page() {
  return (
    <div className="app">
      <Header />
      <main className="main"><Quiz /></main>
    </div>
  );
}
