import Header from "@/components/Header";
import Flashcards from "@/components/Flashcards";
export const metadata = { title: "Flashcards — hak" };
export default function Page() {
  return (
    <div className="app">
      <Header />
      <main className="main"><Flashcards /></main>
    </div>
  );
}
