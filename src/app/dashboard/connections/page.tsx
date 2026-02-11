import { ConnectAccounts } from "../components/connect-accounts";

export default function ConnectionsPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>Connections</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
          Connect your ad platforms and e-commerce stores to sync data.
        </p>
      </div>
      <ConnectAccounts />
    </div>
  );
}
