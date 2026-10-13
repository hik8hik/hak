import Header from "@/components/Header";
import StackScan from "@/components/StackScan";
export const metadata = { title: "Stack scan — hak" };
export default function Page() {
  return (
    <div className="app">
      <Header />
      <main className="main"><StackScan /></main>
    </div>
  );
}
