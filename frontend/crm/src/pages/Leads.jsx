import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Home,
  LogOut,
  Menu,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  UsersRound,
  Pencil,
  X,
} from "lucide-react";
import { clearAuthToken } from "../api/authStorage";
import HeaderTools from "../components/common/HeaderTools";
import { deleteLead, getLeads } from "../api/leadApi";
import DeleteModal from "../components/modals/DeleteModal";
import "./Dashboard.css";
import "./Leads.css";

const PAGE_SIZE = 5;
const SOURCE_OPTIONS = [
  "Website",
  "Referral",
  "LinkedIn",
  "Social Media",
  "Cold Call",
  "Email",
  "Other",
];

const STATUS_STYLES = {
  New: { color: "#2563eb", background: "#e0eaff" },
  Contacted: { color: "#b45309", background: "#fff1d6" },
  Qualified: { color: "#047857", background: "#d9f7ea" },
  Lost: { color: "#dc2626", background: "#fee2e2" },
};

function LeadFlowMark() {
  return (
    <svg className="dashboard-brand-icon" viewBox="0 0 48 48" aria-hidden="true">
      <path d="M8 31C12 16 23 6 38 6c-8 6-13 14-16 23-2 6-7 10-14 12 1-3 1-6 0-10Z" fill="currentColor" />
      <path d="M21 36c4-11 12-18 23-20-5 5-8 10-10 16-2 5-6 8-13 10 1-2 1-4 0-6Z" fill="#fff" />
    </svg>
  );
}

export function Sidebar({ mobileOpen, onToggle, onLogout, activePage = "leads" }) {
  return (
    <aside className={`dashboard-sidebar leads-sidebar ${mobileOpen ? "mobile-open" : ""}`}>
      <div className="leads-sidebar-top">
        <Link className="dashboard-brand" to="/dashboard" aria-label="LeadFlow CRM dashboard">
          <LeadFlowMark />
          <span>LeadFlow CRM</span>
        </Link>
        <button
          className="leads-mobile-toggle"
          type="button"
          aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={mobileOpen}
          onClick={onToggle}
        >
          {mobileOpen ? <X size={21} /> : <Menu size={21} />}
        </button>
      </div>

      <nav className="dashboard-nav leads-nav" aria-label="Main navigation">
        <Link
          className={`dashboard-nav-link ${activePage === "dashboard" ? "active" : ""}`}
          to="/dashboard"
          aria-current={activePage === "dashboard" ? "page" : undefined}
        >
          <Home size={21} />
          <span>Dashboard</span>
        </Link>
        <Link className={`dashboard-nav-link ${activePage === "leads" ? "active" : ""}`} to="/leads" aria-current={activePage === "leads" ? "page" : undefined}>
          <UsersRound size={21} />
          <span>Leads</span>
        </Link>
        <Link className="dashboard-nav-link" to="/dashboard#analytics">
          <BarChart3 size={21} />
          <span>Analytics</span>
        </Link>
      </nav>

      <div className="dashboard-sidebar-divider leads-divider" />
      <button className="dashboard-nav-link dashboard-logout leads-logout" type="button" onClick={onLogout}>
        <LogOut size={21} />
        <span>Logout</span>
      </button>
      <div className="dashboard-sidebar-decoration" />
    </aside>
  );
}

export function TopNavigation({ search, onSearchChange, pageLabel = "", title, subtitle, action }) {
  const navigate = useNavigate();

  const submitSearch = (event) => {
    if (event.key !== "Enter") return;
    const query = search.trim();
    navigate(query ? `/leads?search=${encodeURIComponent(query)}` : "/leads");
  };

  return (
    <header className={`leads-topbar${title ? " leads-topbar-dashboard" : ""}`}>
      {title ? (
        <div className="dashboard-title-block">
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
      ) : (
        <div className="leads-breadcrumb">
          <Link to="/dashboard">Dashboard</Link>
          <span>/</span>
          <strong>Leads</strong>
          {pageLabel && (
            <>
              <span>/</span>
              <strong>{pageLabel}</strong>
            </>
          )}
        </div>
      )}
      <div className="leads-topbar-tools">
        {action}
        <label className="leads-global-search" htmlFor="leads-global-search">
          <Search size={19} aria-hidden="true" />
          <input
            id="leads-global-search"
            type="search"
            maxLength={100}
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            onKeyDown={submitSearch}
            placeholder="Search leads, companies..."
          />
        </label>
        <HeaderTools />
      </div>
    </header>
  );
}

function initialsFor(name = "") {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("") || "?";
}

function avatarColor(name = "") {
  const palette = [
    ["#e0eaff", "#2563eb"],
    ["#f0e8ff", "#6d28d9"],
    ["#dff7e9", "#047857"],
    ["#fff0dc", "#b45309"],
  ];
  const index = [...name].reduce((sum, character) => sum + character.charCodeAt(0), 0) % palette.length;
  const [background, color] = palette[index];
  return { backgroundColor: background, color };
}

function formatCreatedDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function StatusBadge({ status }) {
  const style = STATUS_STYLES[status] || { color: "#4b5563", background: "#f3f4f6" };
  return (
    <span className="leads-status-badge" style={{ color: style.color, backgroundColor: style.background }}>
      <i />
      {status || "Unknown"}
    </span>
  );
}

function SkeletonRows() {
  return Array.from({ length: PAGE_SIZE }, (_, index) => (
    <tr className="leads-skeleton-row" key={`skeleton-${index}`}>
      <td><span className="skeleton-check" /></td>
      <td><span className="skeleton-lead" /></td>
      <td><span className="skeleton-line" /></td>
      <td><span className="skeleton-line" /></td>
      <td><span className="skeleton-line" /></td>
      <td><span className="skeleton-pill" /></td>
      <td><span className="skeleton-pill" /></td>
      <td><span className="skeleton-line" /></td>
      <td><span className="skeleton-actions" /></td>
    </tr>
  ));
}

function LeadSearchInput({ value, onChange }) {
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionQuery, setSuggestionQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    const query = value.trim();
    if (query.length < 2) {
      return undefined;
    }

    const controller = new AbortController();
    let active = true;
    const timer = window.setTimeout(async () => {
      try {
        const response = await getLeads(query, "", 1, 5, { signal: controller.signal });
        if (!active || controller.signal.aborted) return;
        setSuggestions(Array.isArray(response.data) ? response.data : []);
        setSuggestionQuery(query);
        setIsOpen(true);
        setActiveIndex(-1);
      } catch (requestError) {
        if (active && !controller.signal.aborted && requestError.code !== "ERR_CANCELED") {
          setSuggestions([]);
          setSuggestionQuery(query);
          setIsOpen(false);
        }
      }
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [value]);

  const selectSuggestion = (lead) => {
    onChange(lead.email || lead.name || "");
    setIsOpen(false);
    setActiveIndex(-1);
  };

  const handleKeyDown = (event) => {
    if (event.key === "Escape") {
      setIsOpen(false);
      setActiveIndex(-1);
    } else if (event.key === "ArrowDown" && suggestions.length) {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((current) => (current + 1) % suggestions.length);
    } else if (event.key === "ArrowUp" && suggestions.length) {
      event.preventDefault();
      setActiveIndex((current) => (current <= 0 ? suggestions.length - 1 : current - 1));
    } else if (event.key === "Enter" && isOpen && activeIndex >= 0) {
      event.preventDefault();
      selectSuggestion(suggestions[activeIndex]);
    }
  };

  return (
    <div className="leads-search-autocomplete">
      <label className="leads-table-search" htmlFor="leads-table-search">
        <Search size={21} aria-hidden="true" />
        <input
          id="leads-table-search"
          type="search"
          maxLength={100}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onFocus={() => suggestions.length > 0 && setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search by name, email or company..."
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={isOpen && suggestions.length > 0}
          aria-controls="lead-search-suggestions"
          aria-activedescendant={activeIndex >= 0 ? `lead-suggestion-${activeIndex}` : undefined}
        />
      </label>
      {isOpen && suggestionQuery === value.trim() && suggestions.length > 0 && (
        <ul className="leads-search-suggestions" id="lead-search-suggestions" role="listbox" aria-label="Matching leads">
          {suggestions.map((lead, index) => (
            <li key={lead._id} role="presentation">
              <button
                id={`lead-suggestion-${index}`}
                type="button"
                role="option"
                aria-selected={index === activeIndex}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectSuggestion(lead)}
              >
                <span className="lead-suggestion-name">{lead.name}</span>
                <span className="lead-suggestion-details">
                  {[lead.email, lead.company].filter(Boolean).join(" · ")}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function pageItems(currentPage, totalPages) {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);
  if (currentPage <= 4) return [1, 2, 3, 4, 5, "…", totalPages];
  if (currentPage >= totalPages - 3) {
    return [1, "…", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }
  return [1, "…", currentPage - 1, currentPage, currentPage + 1, "…", totalPages];
}

function Pagination({ page, totalPages, onChange }) {
  const pages = useMemo(() => pageItems(page, totalPages), [page, totalPages]);
  return (
    <nav className="leads-pagination" aria-label="Lead pages">
      <button
        className="pagination-arrow"
        type="button"
        aria-label="Previous page"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        <ChevronLeft size={18} />
      </button>
      {pages.map((item, index) => item === "…" ? (
        <span className="pagination-ellipsis" key={`ellipsis-${index}`} aria-hidden="true">…</span>
      ) : (
        <button
          className={`pagination-page ${item === page ? "current" : ""}`}
          key={item}
          type="button"
          aria-current={item === page ? "page" : undefined}
          onClick={() => onChange(item)}
        >
          {item}
        </button>
      ))}
      <button
        className="pagination-arrow"
        type="button"
        aria-label="Next page"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
      >
        <ChevronRight size={18} />
      </button>
    </nav>
  );
}

export default function Leads() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(() => searchParams.get("search") || "");
  const [status, setStatus] = useState("");
  const [source, setSource] = useState("");
  const [page, setPage] = useState(1);
  const [backendTotalPages, setBackendTotalPages] = useState(1);
  const [backendTotalLeads, setBackendTotalLeads] = useState(0);
  const [backendLeads, setBackendLeads] = useState([]);
  const [sourceCache, setSourceCache] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [leadToDelete, setLeadToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    if (source) return undefined;

    const controller = new AbortController();
    let active = true;

    const loadLeads = async () => {
      setLoading(true);
      setError("");
      setBackendLeads([]);

      try {
        const response = await getLeads(search.trim(), status, page, PAGE_SIZE, {
          signal: controller.signal,
        });
        if (!active || controller.signal.aborted) return;

        const responsePages = Math.max(1, response.totalPages ?? 0);
        setBackendTotalLeads(response.totalLeads ?? 0);
        setBackendTotalPages(responsePages);

        if (page > responsePages) {
          setPage(responsePages);
          return;
        }

        setBackendLeads(Array.isArray(response.data) ? response.data : []);
      } catch (requestError) {
        if (!active || controller.signal.aborted || requestError.code === "ERR_CANCELED") return;

        setBackendLeads([]);
        setBackendTotalLeads(0);
        setBackendTotalPages(1);
        setError(
          requestError.response?.data?.message ||
            "Could not load leads. Check your connection and try again."
        );
      } finally {
        if (active && !controller.signal.aborted) setLoading(false);
      }
    };

    const timer = window.setTimeout(loadLeads, 250);
    return () => {
      active = false;
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [search, status, source, page, refreshKey]);

  useEffect(() => {
    if (!source) return undefined;

    const controller = new AbortController();
    let active = true;
    const cacheKey = JSON.stringify([search.trim(), status, source, refreshKey]);

    const loadSourceMatches = async () => {
      setLoading(true);
      setError("");
      setBackendLeads([]);
      setSourceCache(null);
      setBackendTotalLeads(0);

      try {
        // Source is client-filtered, so fetch each backend page once per filter set.
        const firstPage = await getLeads(search.trim(), status, 1, 100, {
          signal: controller.signal,
        });
        if (!active || controller.signal.aborted) return;

        const allMatches = Array.isArray(firstPage.data) ? [...firstPage.data] : [];
        const backendPageCount = firstPage.totalPages ?? 0;

        for (let backendPage = 2; backendPage <= backendPageCount; backendPage += 1) {
          if (!active || controller.signal.aborted) return;

          const response = await getLeads(search.trim(), status, backendPage, 100, {
            signal: controller.signal,
          });
          if (!active || controller.signal.aborted) return;
          if (Array.isArray(response.data)) allMatches.push(...response.data);
        }

        if (!active || controller.signal.aborted) return;

        const sourceMatches = allMatches.filter((lead) => lead.source === source);
        setSourceCache({ key: cacheKey, leads: sourceMatches });
      } catch (requestError) {
        if (!active || controller.signal.aborted || requestError.code === "ERR_CANCELED") return;

        setSourceCache(null);
        setBackendLeads([]);
        setBackendTotalLeads(0);
        setBackendTotalPages(1);
        setError(
          requestError.response?.data?.message ||
            "Could not load leads. Check your connection and try again."
        );
      } finally {
        if (active && !controller.signal.aborted) setLoading(false);
      }
    };

    const timer = window.setTimeout(loadSourceMatches, 250);
    return () => {
      active = false;
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [search, status, source, refreshKey]);

  const sourceCacheKey = JSON.stringify([search.trim(), status, source, refreshKey]);
  const cachedSourceLeads = source && sourceCache?.key === sourceCacheKey
    ? sourceCache.leads
    : null;
  const totalLeads = cachedSourceLeads
    ? cachedSourceLeads.length
    : backendTotalLeads;
  const totalPages = cachedSourceLeads
    ? Math.max(1, Math.ceil(cachedSourceLeads.length / PAGE_SIZE))
    : backendTotalPages;
  const currentPage = source ? Math.min(page, totalPages) : page;
  const leads = cachedSourceLeads
    ? cachedSourceLeads.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
    : backendLeads;

  const allVisibleSelected = leads.length > 0 && leads.every((lead) => selectedIds.has(lead._id));
  const someVisibleSelected = leads.some((lead) => selectedIds.has(lead._id));

  const clearDisplayedResults = () => {
    setBackendLeads([]);
    setBackendTotalLeads(0);
    setBackendTotalPages(1);
    setSourceCache(null);
    setError("");
    setLoading(true);
  };

  const handleSearchChange = (value) => {
    setSearch(value);
    setPage(1);
    clearDisplayedResults();
    setSelectedIds(new Set());
  };

  const handleStatusChange = (value) => {
    setStatus(value);
    setPage(1);
    clearDisplayedResults();
    setSelectedIds(new Set());
  };

  const handleSourceChange = (value) => {
    setSource(value);
    setPage(1);
    clearDisplayedResults();
    setSelectedIds(new Set());
  };

  const handleClearFilters = () => {
    setSearch("");
    setStatus("");
    setSource("");
    setPage(1);
    clearDisplayedResults();
    setSelectedIds(new Set());
  };

  const handleSelectAll = (event) => {
    const nextSelected = new Set(selectedIds);
    if (event.target.checked) {
      leads.forEach((lead) => nextSelected.add(lead._id));
    } else {
      leads.forEach((lead) => nextSelected.delete(lead._id));
    }
    setSelectedIds(nextSelected);
  };

  const handleSelectLead = (leadId, checked) => {
    const nextSelected = new Set(selectedIds);
    if (checked) nextSelected.add(leadId);
    else nextSelected.delete(leadId);
    setSelectedIds(nextSelected);
  };

  const handleDelete = async () => {
    if (!leadToDelete || deleting) return;

    setDeleting(true);
    try {
      await deleteLead(leadToDelete._id);
      toast.success("Lead deleted successfully");
      setSelectedIds((current) => {
        const nextSelected = new Set(current);
        nextSelected.delete(leadToDelete._id);
        return nextSelected;
      });
      setLeadToDelete(null);
      clearDisplayedResults();
      setRefreshKey((current) => current + 1);
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || "Could not delete this lead.");
    } finally {
      setDeleting(false);
    }
  };

  const handleLogout = () => {
    clearAuthToken();
    navigate("/login", { replace: true });
  };

  const handleRetry = () => {
    clearDisplayedResults();
    setRefreshKey((current) => current + 1);
  };
  const firstVisibleLead = totalLeads === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const lastVisibleLead = Math.min(currentPage * PAGE_SIZE, totalLeads);

  return (
    <div className="dashboard-shell leads-shell">
        <Sidebar
        mobileOpen={mobileNavOpen}
        onToggle={() => setMobileNavOpen((open) => !open)}
        onLogout={handleLogout}
      />

      <main className="dashboard-main leads-main">
        <TopNavigation search={search} onSearchChange={handleSearchChange} />

        <div className="leads-content">
          <header className="leads-page-heading">
            <div>
              <h1>Leads</h1>
              <p>Manage and track all your leads.</p>
            </div>
            <button className="leads-add-button" type="button" onClick={() => navigate("/leads/new")}>
              <Plus size={21} strokeWidth={2.5} />
              <span>Add Lead</span>
            </button>
          </header>

          <section className="leads-filter-card" aria-label="Search and filter leads">
            <LeadSearchInput value={search} onChange={handleSearchChange} />

            <label className="leads-filter-field">
              <span>Status</span>
              <span className="leads-select-wrap">
                <select value={status} onChange={(event) => handleStatusChange(event.target.value)}>
                  <option value="">All Statuses</option>
                  <option value="New">New</option>
                  <option value="Contacted">Contacted</option>
                  <option value="Qualified">Qualified</option>
                  <option value="Lost">Lost</option>
                </select>
                <ChevronDown size={17} aria-hidden="true" />
              </span>
            </label>

            <label className="leads-filter-field">
              <span>Source</span>
              <span className="leads-select-wrap">
                <select value={source} onChange={(event) => handleSourceChange(event.target.value)}>
                  <option value="">All Sources</option>
                  {SOURCE_OPTIONS.map((sourceOption) => (
                    <option value={sourceOption} key={sourceOption}>{sourceOption}</option>
                  ))}
                </select>
                <ChevronDown size={17} aria-hidden="true" />
              </span>
            </label>

            <button className="leads-clear-button" type="button" onClick={handleClearFilters}>
              <RotateCcw size={19} />
              <span>Clear Filters</span>
            </button>
          </section>

          <section className="leads-table-card" aria-label="Leads table">
            <div className="leads-table-scroll">
              <table className="leads-table">
                <thead>
                  <tr>
                    <th className="checkbox-column">
                      <input
                        type="checkbox"
                        aria-label="Select all leads on this page"
                        checked={allVisibleSelected}
                        aria-checked={someVisibleSelected && !allVisibleSelected ? "mixed" : allVisibleSelected}
                        ref={(checkbox) => {
                          if (checkbox) checkbox.indeterminate = someVisibleSelected && !allVisibleSelected;
                        }}
                        onChange={handleSelectAll}
                        disabled={loading || leads.length === 0}
                      />
                    </th>
                    <th>Lead Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Company</th>
                    <th>Source</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th className="actions-column">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <SkeletonRows />
                  ) : error ? (
                    <tr>
                      <td colSpan={9}>
                        <div className="leads-empty-state leads-error-state" role="alert">
                          <strong>Unable to load leads</strong>
                          <span>{error}</span>
                          <button type="button" onClick={handleRetry}>Retry</button>
                        </div>
                      </td>
                    </tr>
                  ) : leads.length === 0 ? (
                    <tr>
                      <td colSpan={9}>
                        <div className="leads-empty-state">
                          <UsersRound size={28} />
                          <strong>{search || status || source ? "No leads match these filters" : "No leads yet"}</strong>
                          <span>{search || status || source ? "Try clearing a filter or changing your search." : "New leads will appear here after you add them."}</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    leads.map((lead) => (
                      <tr key={lead._id}>
                        <td className="checkbox-column">
                          <input
                            type="checkbox"
                            aria-label={`Select ${lead.name}`}
                            checked={selectedIds.has(lead._id)}
                            onChange={(event) => handleSelectLead(lead._id, event.target.checked)}
                          />
                        </td>
                        <td className="lead-name-cell">
                          <div className="lead-name-content">
                            <span className="lead-initials" style={avatarColor(lead.name)}>
                              {initialsFor(lead.name)}
                            </span>
                            <span className="lead-name-text" title={lead.name}>{lead.name}</span>
                          </div>
                        </td>
                        <td className="truncate-cell" title={lead.email}>{lead.email}</td>
                        <td className="truncate-cell" title={lead.phone}>{lead.phone}</td>
                        <td className="truncate-cell" title={lead.company}>{lead.company}</td>
                        <td><span className="leads-source-badge">{lead.source}</span></td>
                        <td><StatusBadge status={lead.status} /></td>
                        <td className="created-date-cell">{formatCreatedDate(lead.createdAt)}</td>
                        <td className="actions-column">
                          <div className="lead-row-actions">
                            <button
                              type="button"
                              className="lead-edit-button"
                              aria-label={`Edit ${lead.name}`}
                              title="Edit lead"
                              onClick={() => navigate(`/leads/${lead._id}/edit`)}
                            >
                              <Pencil size={18} />
                            </button>
                            <button
                              type="button"
                              className="lead-delete-button"
                              aria-label={`Delete ${lead.name}`}
                              title="Delete lead"
                              onClick={() => setLeadToDelete(lead)}
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <footer className="leads-table-footer">
              <p>Showing {firstVisibleLead}–{lastVisibleLead} of {totalLeads.toLocaleString()} leads</p>
              <Pagination
                page={currentPage}
                totalPages={totalPages}
                onChange={(nextPage) => {
                  setPage(nextPage);
                  setSelectedIds(new Set());
                  if (!source) {
                    setBackendLeads([]);
                    setError("");
                    setLoading(true);
                  }
                }}
              />
            </footer>
          </section>
        </div>
      </main>

      {leadToDelete && (
        <DeleteModal
          lead={leadToDelete}
          loading={deleting}
          onClose={() => !deleting && setLeadToDelete(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
