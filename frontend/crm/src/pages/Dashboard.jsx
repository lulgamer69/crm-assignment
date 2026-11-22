import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  ChartNoAxesColumn,
  ChevronRight,
  CircleX,
  Pencil,
  Plus,
  Trash2,
  UsersRound,
} from "lucide-react";
import { deleteLead, getLeadTrends, getLeads, getStats } from "../api/leadApi";
import { clearAuthToken } from "../api/authStorage";
import AddLeadModal from "../components/modals/AddLeadModal";
import DeleteModal from "../components/modals/DeleteModal";
import { Sidebar, TopNavigation } from "./Leads";
import "./Dashboard.css";

const LEADS_PAGE_SIZE = 100;
const RECENT_LEAD_LIMIT = 5;

const STATUS_STYLES = {
  New: { color: "#2563eb", tint: "#e0eaff" },
  Contacted: { color: "#6366f1", tint: "#eeedff" },
  Qualified: { color: "#10b981", tint: "#d9f7ea" },
  Lost: { color: "#ef4444", tint: "#fee2e2" },
};

const KPI_CARDS = [
  { key: "total", label: "Total Leads", icon: UsersRound, color: "#2563eb" },
  { key: "new", label: "New Leads", icon: Plus, color: "#3b82f6" },
  { key: "qualified", label: "Qualified Leads", icon: ChartNoAxesColumn, color: "#10b981" },
  { key: "lost", label: "Lost Leads", icon: CircleX, color: "#ef4444" },
];

function getDonutBackground(statuses, total) {
  if (!total) return "#e5e7eb";

  let start = 0;
  const slices = statuses.map(({ label, count }) => {
    const end = start + (count / total) * 100;
    const slice = `${STATUS_STYLES[label].color} ${start}% ${end}%`;
    start = end;
    return slice;
  });

  return `conic-gradient(${slices.join(", ")})`;
}

function StatusBadge({ status }) {
  const style = STATUS_STYLES[status] || { color: "#6b7280", tint: "#f3f4f6" };

  return (
    <span className="dashboard-status" style={{ color: style.color, backgroundColor: style.tint }}>
      {status || "Unknown"}
    </span>
  );
}

function KpiCards({ stats, loading, error }) {
  return (
    <section className="dashboard-kpis" aria-label="Lead totals">
      {KPI_CARDS.map(({ key, label, icon: Icon, color }) => (
        <article className="dashboard-card kpi-card" key={key}>
          <div className="kpi-card-top">
            <span className="kpi-icon" style={{ color, backgroundColor: `${color}20` }}>
              <Icon size={23} strokeWidth={2.4} />
            </span>
            <span className="kpi-label">{label}</span>
          </div>
          <p className="kpi-value">
            {loading ? "…" : error && !stats ? "—" : (stats?.[key] ?? 0).toLocaleString()}
          </p>
        </article>
      ))}
    </section>
  );
}

function StatusDistribution({ stats, loading, error }) {
  const statuses = [
    { label: "New", key: "new", count: stats?.new ?? 0 },
    { label: "Contacted", key: "contacted", count: stats?.contacted ?? 0 },
    { label: "Qualified", key: "qualified", count: stats?.qualified ?? 0 },
    { label: "Lost", key: "lost", count: stats?.lost ?? 0 },
  ];
  const total = statuses.reduce((sum, status) => sum + status.count, 0);

  return (
    <article className="dashboard-card analytics-card status-card">
      <div className="panel-heading">
        <div>
          <h2>Lead Status Distribution</h2>
          <p>Current status of your leads</p>
        </div>
      </div>

      {loading ? (
        <div className="chart-empty" aria-live="polite">Loading status data…</div>
      ) : error && !stats ? (
        <div className="chart-empty error-text" role="alert">Status data could not be loaded.</div>
      ) : total === 0 ? (
        <div className="chart-empty">Add leads to see status distribution.</div>
      ) : (
        <div className="status-chart-content">
          <div className="status-donut" style={{ background: getDonutBackground(statuses, total) }}>
            <div className="status-donut-hole">
              <strong>{total.toLocaleString()}</strong>
              <span>Leads</span>
            </div>
          </div>
          <ul className="status-legend">
            {statuses.map(({ label, key, count }) => {
              const percent = total ? (count / total) * 100 : 0;
              return (
                <li key={key}>
                  <span className="legend-label">
                    <i style={{ backgroundColor: STATUS_STYLES[label].color }} />
                    {label}
                  </span>
                  <span className="legend-count">{percent.toFixed(1)}%</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </article>
  );
}

function LeadsTrend({ trend, period, onPeriodChange, loading, error }) {
  const values = trend?.buckets || [];
  const maximum = Math.max(1, ...values.map((bucket) => bucket.count));
  const tickYs = [40, 85, 130, 180];
  const points = values.map((bucket, index) => ({
    x: values.length <= 1 ? 326 : 52 + (index / (values.length - 1)) * 538,
    y: 176 - (bucket.count / maximum) * 140,
    ...bucket,
  }));
  const line = points.map(({ x, y }) => `${x},${y}`).join(" ");
  const area = points.length ? `52,180 ${line} 590,180` : "";
  const tickPoints = points.length > 1
    ? [points[0], points[Math.floor((points.length - 1) / 2)], points[points.length - 1]]
    : points;
  const formatTick = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return period === "24h"
      ? date.toLocaleTimeString(undefined, { hour: "numeric" })
      : date.toLocaleDateString(undefined, { month: "short", day: period === "12m" ? undefined : "numeric", year: period === "12m" ? "2-digit" : undefined });
  };

  return (
    <article className="dashboard-card analytics-card trend-card">
      <div className="panel-heading">
        <div>
          <h2>Leads Trend</h2>
          <p>{trend?.timezone ? `Creation times in ${trend.timezone}` : "Lead creation over time"}</p>
        </div>
        <select aria-label="Trend time period" value={period} onChange={(event) => onPeriodChange(event.target.value)}>
          <option value="24h">Last 24 Hours</option>
          <option value="7d">Last 7 Days</option>
          <option value="30d">Last 30 Days</option>
          <option value="12m">Last 12 Months</option>
        </select>
      </div>
      {loading ? <div className="chart-empty trend-empty">Loading trend…</div> : error ? (
        <div className="chart-empty trend-empty error-text" role="alert">{error}</div>
      ) : !points.some((point) => point.count > 0) ? (
        <div className="chart-empty trend-empty">No leads were created in this period.</div>
      ) : (
        <div className="trend-chart" role="img" aria-label={`Lead creation trend for ${period}`}>
          <svg viewBox="0 0 620 210" preserveAspectRatio="none" aria-hidden="true">
            <defs><linearGradient id="trendFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#2563eb" stopOpacity=".24" /><stop offset="100%" stopColor="#2563eb" stopOpacity="0" /></linearGradient></defs>
            {tickYs.map((y) => (
              <g key={y}>
                <line x1="48" x2="600" y1={y} y2={y} className="trend-gridline" />
                <text x="2" y={y + 4} className="trend-axis-label">
                  {Math.round(maximum * (180 - y) / 140)}
                </text>
              </g>
            ))}
            <polygon points={area} fill="url(#trendFill)" />
            <polyline points={line} fill="none" stroke="#2563eb" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
            {points.map((point) => <circle key={point.start} cx={point.x} cy={point.y} r="3" fill="#2563eb"><title>{`${new Date(point.start).toLocaleString()}: ${point.count} leads`}</title></circle>)}
          </svg>
          <div className="trend-axis-labels" aria-hidden="true">
            {tickPoints.map((point, index) => <span key={`${point.start}-${index}`}>{formatTick(point.start)}</span>)}
          </div>
        </div>
      )}
    </article>
  );
}

function RecentLeads({ leads, loading, error, search, onAddLead, onEdit, onDelete }) {
  return (
    <article className="dashboard-card data-card recent-card" id="recent-leads">
      <div className="panel-heading recent-heading">
        <div>
          <h2>Recent Leads</h2>
          <p>{search ? "Latest matches for your search" : "Latest leads added to your CRM"}</p>
        </div>
        <Link className="view-all-link" to={search ? `/leads?search=${encodeURIComponent(search)}` : "/leads"}>
          View All <ChevronRight size={17} />
        </Link>
      </div>

      {loading ? (
        <div className="list-empty" aria-live="polite">Loading leads…</div>
      ) : error ? (
        <div className="list-empty error-text" role="alert">{error}</div>
      ) : leads.length === 0 ? (
        <div className="list-empty">
          <p>{search ? "No leads match this search." : "No leads yet. Add your first lead to get started."}</p>
          {!search && <button type="button" onClick={onAddLead}>Add a lead</button>}
        </div>
      ) : (
        <ul className="recent-lead-list">
          {leads.map((lead) => (
            <li className="recent-lead-row" key={lead._id}>
              <div className="recent-avatar">{lead.name?.trim()?.charAt(0)?.toUpperCase() || "?"}</div>
              <div className="recent-lead-info">
                <strong>{lead.name}</strong>
                <span>{lead.email}</span>
              </div>
              <StatusBadge status={lead.status} />
              <div className="recent-actions">
                <button type="button" onClick={() => onEdit(lead)} aria-label={`Edit ${lead.name}`} title="Edit lead">
                  <Pencil size={15} />
                </button>
                <button type="button" onClick={() => onDelete(lead)} aria-label={`Delete ${lead.name}`} title="Delete lead">
                  <Trash2 size={15} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

function LeadsBySource({ leads, loading, error }) {
  const sourceCounts = useMemo(() => {
    const counts = new Map();
    leads.forEach((lead) => {
      if (lead.source) counts.set(lead.source, (counts.get(lead.source) || 0) + 1);
    });
    return [...counts.entries()].sort((first, second) => second[1] - first[1]);
  }, [leads]);
  const maximumCount = Math.max(1, ...sourceCounts.map(([, count]) => count));

  return (
    <article className="dashboard-card data-card sources-card">
      <div className="panel-heading">
        <div>
          <h2>Leads by Source</h2>
          <p>Lead records by source</p>
        </div>
      </div>

      {loading ? (
        <div className="chart-empty" aria-live="polite">Loading source data…</div>
      ) : error ? (
        <div className="chart-empty error-text" role="alert">{error}</div>
      ) : sourceCounts.length === 0 ? (
        <div className="chart-empty">Source data will appear when you add leads.</div>
      ) : (
        <div className="source-chart">
          {sourceCounts.map(([source, count]) => (
            <div className="source-row" key={source}>
              <span className="source-name">{source}</span>
              <div className="source-bar-track">
                <span className="source-bar" style={{ width: `${(count / maximumCount) * 100}%` }} />
              </div>
              <strong>{count}</strong>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [trend, setTrend] = useState(null);
  const [trendPeriod, setTrendPeriod] = useState("30d");
  const [chartLeads, setChartLeads] = useState([]);
  const [recentLeads, setRecentLeads] = useState([]);
  const [search, setSearch] = useState("");
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [trendLoading, setTrendLoading] = useState(true);
  const [recentLoading, setRecentLoading] = useState(true);
  const [overviewError, setOverviewError] = useState("");
  const [trendError, setTrendError] = useState("");
  const [recentError, setRecentError] = useState("");
  const [showAddLead, setShowAddLead] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [deletingLead, setDeletingLead] = useState(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const loadOverview = useCallback(async () => {
    setOverviewLoading(true);
    setOverviewError("");
    try {
      const [statsResponse, leadsResponse] = await Promise.all([
        getStats(),
        getLeads("", "", 1, LEADS_PAGE_SIZE),
      ]);
      const allLeads = Array.isArray(leadsResponse.data) ? [...leadsResponse.data] : [];
      const totalPages = leadsResponse.totalPages ?? 1;
      for (let page = 2; page <= totalPages; page += 1) {
        const pageResponse = await getLeads("", "", page, LEADS_PAGE_SIZE);
        if (Array.isArray(pageResponse.data)) allLeads.push(...pageResponse.data);
      }
      setStats(statsResponse.data);
      setChartLeads(allLeads);
    } catch (requestError) {
      setOverviewError(
        requestError.response?.data?.message || "Dashboard data could not be loaded. Please try again."
      );
    } finally {
      setOverviewLoading(false);
    }
  }, []);

  const loadTrend = useCallback(async () => {
    setTrendLoading(true);
    setTrendError("");
    try {
      const response = await getLeadTrends(trendPeriod);
      setTrend(response.data);
    } catch (requestError) {
      setTrend(null);
      setTrendError(requestError.response?.data?.message || "Lead trend could not be loaded.");
    } finally {
      setTrendLoading(false);
    }
  }, [trendPeriod]);

  const loadRecentLeads = useCallback(async (searchTerm = "") => {
    setRecentLoading(true);
    setRecentError("");
    try {
      const response = await getLeads(searchTerm, "", 1, RECENT_LEAD_LIMIT);
      setRecentLeads(Array.isArray(response.data) ? response.data : []);
    } catch (requestError) {
      setRecentError(
        requestError.response?.data?.message || "Recent leads could not be loaded."
      );
    } finally {
      setRecentLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => loadOverview(), 0);
    return () => window.clearTimeout(timer);
  }, [loadOverview]);

  useEffect(() => {
    const timer = window.setTimeout(() => loadTrend(), 0);
    return () => window.clearTimeout(timer);
  }, [loadTrend]);

  useEffect(() => {
    const timer = window.setTimeout(() => loadRecentLeads(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [loadRecentLeads, search]);

  const refreshDashboard = async () => {
    await Promise.all([loadOverview(), loadTrend(), loadRecentLeads(search.trim())]);
  };

  const handleLogout = () => {
    clearAuthToken();
    navigate("/login", { replace: true });
  };

  const handleDeleteLead = async () => {
    if (!deletingLead) return;

    try {
      await deleteLead(deletingLead._id);
      toast.success("Lead deleted successfully");
      setDeletingLead(null);
      await refreshDashboard();
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || "Unable to delete this lead.");
    }
  };

  const totalLeads = stats?.total ?? 0;
  const statusSummary = [
    { label: "New", count: stats?.new ?? 0 },
    { label: "Contacted", count: stats?.contacted ?? 0 },
    { label: "Qualified", count: stats?.qualified ?? 0 },
    { label: "Lost", count: stats?.lost ?? 0 },
  ];
  const hasOverviewError = Boolean(overviewError);

  return (
    <div className="dashboard-shell">
      <Sidebar
        activePage="dashboard"
        mobileOpen={mobileNavOpen}
        onToggle={() => setMobileNavOpen((open) => !open)}
        onLogout={handleLogout}
      />

      <main className="dashboard-main" id="dashboard">
        <div className="dashboard-content">
          <TopNavigation
            title="Dashboard"
            subtitle="Overview of your leads and performance."
            search={search}
            onSearchChange={setSearch}
            action={(
              <button className="dashboard-add-button" type="button" onClick={() => setShowAddLead(true)}>
                <Plus size={18} />
                <span>Add Lead</span>
              </button>
            )}
          />

          {hasOverviewError && (
            <div className="dashboard-error" role="alert">
              <span>{overviewError}</span>
              <button type="button" onClick={loadOverview}>Retry</button>
            </div>
          )}

          <KpiCards stats={stats} loading={overviewLoading && !stats} error={overviewError} />

          <section className="analytics-grid" id="analytics" aria-label="Lead analytics">
            <StatusDistribution stats={stats} loading={overviewLoading && !stats} error={overviewError} />
            <LeadsTrend
              trend={trend}
              period={trendPeriod}
              onPeriodChange={setTrendPeriod}
              loading={trendLoading}
              error={trendError}
            />
          </section>

          <section className="data-grid" aria-label="Lead activity">
            <RecentLeads
              leads={recentLeads}
              loading={recentLoading}
              error={recentError}
              search={search.trim()}
              onAddLead={() => setShowAddLead(true)}
              onEdit={(lead) => setEditingLead(lead)}
              onDelete={(lead) => setDeletingLead(lead)}
            />
            <LeadsBySource
              leads={chartLeads}
              loading={overviewLoading && chartLeads.length === 0}
              error={overviewError}
            />
          </section>

          <footer className="dashboard-footer">
            <span>{totalLeads.toLocaleString()} leads across four statuses</span>
            <span>{statusSummary.map(({ label, count }) => `${label}: ${count}`).join(" · ")}</span>
          </footer>
        </div>
      </main>

      {(showAddLead || editingLead) && (
        <AddLeadModal
          editingLead={editingLead}
          onClose={() => {
            setShowAddLead(false);
            setEditingLead(null);
          }}
          onLeadCreated={async () => {
            await refreshDashboard();
            setShowAddLead(false);
            setEditingLead(null);
          }}
        />
      )}

      {deletingLead && (
        <DeleteModal
          onClose={() => setDeletingLead(null)}
          onConfirm={handleDeleteLead}
        />
      )}
    </div>
  );
}
