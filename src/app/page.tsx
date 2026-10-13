import { cookies } from "next/headers";
import FeedPage from "@/components/FeedPage";
import type { ViewMode } from "@/context/SettingsContext";

interface SP { view?: string; id?: string; topic?: string; q?: string; source?: string; }

export default async function Page({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const c = await cookies();
  const cookieView = (c.get("hak_view")?.value as ViewMode | undefined) ?? "scroll";
  return <FeedPage searchParams={sp} cookieView={cookieView} />;
}
