import Header from "@/components/Header"
import ContentStudio from "@/components/Content/ContentStudio"
import { ContentSettingsProvider } from "@/context/ContentSettingsContext"

export const metadata = { title: "Content Studio — hak" }

export default function Page() {
  return (
    <ContentSettingsProvider>
      <div className="app">
        <Header />
        <main className="main">
          <ContentStudio />
        </main>
      </div>
    </ContentSettingsProvider>
  )
}