// src/App.tsx
import * as React from "react";
import { OverviewPage } from "./pages/OverviewPage";
import ScopePage from "./pages/ScopePage";
import VersionChainPage from "./pages/VersionChainPage";
import AuditPage from "./pages/AuditPage";
import { ChangeImpactPage } from "./pages/ChangeImpactPage";
import LifecycleWheelPage from "./pages/LifecycleWheelPage";
import { useVersionApp, VersionProvider } from "./state";
import { can } from "./lib/rbac";

type TopTabKey = "overview" | "lifecycle_wheel" | "scope" | "version_chain" | "audit" | "change_impact";

const TAB_LABELS: Record<TopTabKey, string> = {
  overview: "Overview",
  lifecycle_wheel: "Lifecycle Wheel",
  scope: "Scope",
  version_chain: "Version Chain",
  audit: "Audit",
  change_impact: "Change Impact",
};

function TabButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        appearance: "none",
        border: "1px solid #e6e6e6",
        background: active ? "#111" : "#fff",
        color: active ? "#fff" : "#111",
        borderRadius: 999,
        padding: "8px 12px",
        fontSize: 13,
        fontWeight: 800,
        cursor: "pointer",
        transition: "all 150ms ease",
      }}
    >
      {label}
    </button>
  );
}

function Shell({
  activeTab,
  setActiveTab,
  children,
}: {
  activeTab: TopTabKey;
  setActiveTab: (k: TopTabKey) => void;
  children: React.ReactNode;
}) {
  const { role } = useVersionApp();

  const allowedTabs: TopTabKey[] = (Object.keys(TAB_LABELS) as TopTabKey[]).filter((k) => {
    const permMap: Record<TopTabKey, any> = {
      overview: "tab:overview",
      lifecycle_wheel: "tab:lifecycle_wheel",
      scope: "tab:scope",
      version_chain: "tab:version_chain",
      audit: "tab:audit",
      change_impact: "tab:change_impact",
    };
    return can(role as any, permMap[k]);
  });

  // If active tab becomes disallowed (role change), bounce to first allowed.
  React.useEffect(() => {
    if (!allowedTabs.includes(activeTab)) {
      setActiveTab(allowedTabs[0] || "overview");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f7f7f8",
        padding: 18,
        boxSizing: "border-box",
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji","Segoe UI Emoji"',
      }}
    >
      {/* Header */}
      <div
        style={{
          background: "#fff",
          border: "1px solid #eaeaea",
          borderRadius: 18,
          padding: 14,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ fontWeight: 900, fontSize: 16, color: "#111" }}>Grenomy • Phase 1</div>
          <div style={{ fontSize: 12, color: "#666" }}>Regulation Setup & Execution Workspace</div>
        </div>

        {/* Top Tabs */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
          {allowedTabs.map((k) => (
            <TabButton key={k} active={activeTab === k} label={TAB_LABELS[k]} onClick={() => setActiveTab(k)} />
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ marginTop: 14 }}>{children}</div>
    </div>
  );
}

function Placeholder({ title }: { title: string }) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #eaeaea",
        borderRadius: 16,
        padding: 18,
      }}
    >
      <div style={{ fontSize: 16, fontWeight: 900, color: "#111" }}>{title}</div>
      <div style={{ marginTop: 8, color: "#666", fontSize: 13, lineHeight: 1.5 }}>
        Placeholder screen. In Phase 1 we will implement this tab with its own deep-detail layout and actions.
      </div>
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = React.useState<TopTabKey>("overview");

  let content: React.ReactNode = null;
  if (activeTab === "overview") content = <OverviewPage />;
  if (activeTab === "lifecycle_wheel") content = <LifecycleWheelPage />;
  if (activeTab === "scope") content = <ScopePage />;
  if (activeTab === "version_chain") content = <VersionChainPage />;
  if (activeTab === "audit") content = <AuditPage />;
  if (activeTab === "change_impact") content = <ChangeImpactPage />;

  return (
    <VersionProvider>
      <Shell activeTab={activeTab} setActiveTab={setActiveTab}>
        {content}
      </Shell>
    </VersionProvider>
  );
}
