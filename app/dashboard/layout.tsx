// import ChatWidget from "@/components/ChatWidget"; // dormant for now
import PushManager from "@/components/PushManager";
import { DashboardTheme } from "@/components/ThemeToggle";
import { DashboardGlass } from "@/components/GlassMode";
import { GlassBackdrop } from "@/components/DashboardBanner";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Liquid Glass (the default interface): the member's banner fills the
          screen behind every dashboard page and stays put between pages.
          Hidden in Classic. Styles: app/glass-theme.css */}
      <GlassBackdrop />
      <div className="dash-shell">{children}</div>
      <PushManager />
      <DashboardTheme />
      <DashboardGlass />
      {/* Chat kept dormant for now — re-enable by uncommenting. */}
      {/* <ChatWidget /> */}
    </>
  );
}
