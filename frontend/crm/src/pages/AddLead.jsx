import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Activity,
  Building2,
  ChevronDown,
  Mail,
  Pencil,
  Phone,
  Plus,
  Tag,
  UserRound,
  UserRoundPlus,
  UserRoundPen,
} from "lucide-react";
import { clearAuthToken } from "../api/authStorage";
import { createLead, getLeadById, updateLead } from "../api/leadApi";
import { Sidebar, TopNavigation } from "./Leads";
import "./Dashboard.css";
import "./Leads.css";
import "./AddLead.css";

const SOURCE_OPTIONS = [
  "Website",
  "Referral",
  "LinkedIn",
  "Social Media",
  "Cold Call",
  "Email",
  "Other",
];

const STATUS_OPTIONS = ["New", "Contacted", "Qualified", "Lost"];

const INITIAL_FORM = {
  name: "",
  email: "",
  phone: "",
  company: "",
  source: "",
  status: "New",
};

function RequiredLabel({ htmlFor, children }) {
  return (
    <label className="add-lead-label" htmlFor={htmlFor}>
      {children} <span aria-hidden="true">*</span>
    </label>
  );
}

function TextField({ id, label, icon: Icon, ...inputProps }) {
  return (
    <div className="add-lead-field">
      <RequiredLabel htmlFor={id}>{label}</RequiredLabel>
      <div className={`add-lead-control ${inputProps["aria-invalid"] ? "has-error" : ""}`}>
        <Icon size={21} aria-hidden="true" />
        <input id={id} {...inputProps} required />
      </div>
    </div>
  );
}

function SelectField({ id, name, label, icon: Icon, value, onChange, children, invalid, errorId }) {
  return (
    <div className="add-lead-field">
      <RequiredLabel htmlFor={id}>{label}</RequiredLabel>
      <div className={`add-lead-control add-lead-select ${invalid ? "has-error" : ""}`}>
        <Icon size={21} aria-hidden="true" />
        <select
          id={id}
          name={name}
          value={value}
          onChange={onChange}
          required
          aria-invalid={invalid}
          aria-describedby={invalid ? errorId : undefined}
        >
          {children}
        </select>
        <ChevronDown className="add-lead-chevron" size={18} aria-hidden="true" />
      </div>
    </div>
  );
}

function LeadFormPage({ isEditing = false }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [loading, setLoading] = useState(false);
  const [leadLoadState, setLeadLoadState] = useState({
    id: null,
    attempt: -1,
    status: "idle",
    message: "",
  });
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [topSearch, setTopSearch] = useState("");

  useEffect(() => {
    if (!isEditing) return undefined;

    const controller = new AbortController();
    let active = true;

    getLeadById(id, { signal: controller.signal })
      .then((response) => {
        if (!active || controller.signal.aborted) return;
        if (!response?.success || !response.data) {
          setLeadLoadState({
            id,
            attempt: loadAttempt,
            status: "error",
            message: "This lead could not be found or is no longer available.",
          });
          return;
        }

        setForm({
          name: response.data.name || "",
          email: response.data.email || "",
          phone: response.data.phone || "",
          company: response.data.company || "",
          source: response.data.source || "",
          status: response.data.status || "New",
        });
        setLeadLoadState({ id, attempt: loadAttempt, status: "loaded", message: "" });
      })
      .catch((requestError) => {
        if (!active || controller.signal.aborted || requestError.code === "ERR_CANCELED") return;
        setLeadLoadState({
          id,
          attempt: loadAttempt,
          status: "error",
          message: [400, 404].includes(requestError.response?.status)
            ? "This lead could not be found or is no longer available."
            : requestError.response?.data?.message || "Could not load this lead. Please try again.",
      });
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [id, isEditing, loadAttempt]);

  const leadIsLoading = isEditing && (
    leadLoadState.id !== id || leadLoadState.attempt !== loadAttempt
  );
  const leadLoadError = isEditing &&
    leadLoadState.id === id &&
    leadLoadState.attempt === loadAttempt &&
    leadLoadState.status === "error"
    ? leadLoadState.message
    : "";

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: "" }));
    setSubmitError("");
  };

  const validate = () => {
    const nextErrors = {};

    if (!form.name.trim()) nextErrors.name = "Full name is required.";
    if (!form.email.trim()) {
      nextErrors.email = "Email is required.";
    } else if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) {
      nextErrors.email = "Enter a valid email address.";
    }
    if (!form.phone.trim()) {
      nextErrors.phone = "Phone number is required.";
    }
    if (!form.company.trim()) nextErrors.company = "Company is required.";
    if (!SOURCE_OPTIONS.includes(form.source)) nextErrors.source = "Select a valid source.";
    if (!STATUS_OPTIONS.includes(form.status)) nextErrors.status = "Select a valid status.";

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (loading || !validate()) return;

    setLoading(true);
    setSubmitError("");

    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      company: form.company.trim(),
      source: form.source,
      status: form.status,
    };

    try {
      const response = isEditing
        ? await updateLead(id, payload)
        : await createLead(payload);
      if (!response?.success) {
        setSubmitError(response?.message || `Could not ${isEditing ? "update" : "add"} this lead. Please try again.`);
        return;
      }

      toast.success(response.message || (isEditing ? "Lead updated successfully" : "Lead created successfully"));
      navigate("/leads", { replace: true, state: { refreshLeads: true } });
    } catch (requestError) {
      const message = requestError.response?.data?.message;
      setSubmitError(message || `Could not ${isEditing ? "update" : "add"} this lead. Check your connection and try again.`);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    clearAuthToken();
    navigate("/login", { replace: true });
  };

  return (
    <div className="dashboard-shell leads-shell add-lead-shell">
      <Sidebar
        mobileOpen={mobileNavOpen}
        onToggle={() => setMobileNavOpen((open) => !open)}
        onLogout={handleLogout}
      />

      <main className="dashboard-main leads-main">
        <TopNavigation
          search={topSearch}
          onSearchChange={setTopSearch}
          pageLabel={isEditing ? "Edit Lead" : "Add Lead"}
        />

        <div className="leads-content add-lead-content">
          <header className="leads-page-heading add-lead-page-heading">
            <div>
              <h1>{isEditing ? "Edit Lead" : "Add New Lead"}</h1>
              <p>{isEditing ? "Update the lead details and keep their information current." : "Capture a new lead and add it to your pipeline."}</p>
            </div>
          </header>

          {leadIsLoading ? (
            <section className="add-lead-card add-lead-load-state" aria-live="polite">
              Loading lead details…
            </section>
          ) : leadLoadError ? (
            <section className="add-lead-card add-lead-load-state" role="alert">
              <p>{leadLoadError}</p>
              <div className="add-lead-load-actions">
                <button className="add-lead-cancel" type="button" onClick={() => navigate("/leads")}>Back to Leads</button>
                <button className="add-lead-submit" type="button" onClick={() => setLoadAttempt((attempt) => attempt + 1)}>Retry</button>
              </div>
            </section>
          ) : (
          <section className="add-lead-card" aria-labelledby="lead-details-title">
            <header className="add-lead-card-heading">
              <span className="add-lead-title-icon">
                {isEditing ? <UserRoundPen size={30} /> : <UserRoundPlus size={30} />}
              </span>
              <div>
                <h2 id="lead-details-title">Lead Details</h2>
                <p>{isEditing ? "Modify the lead information below." : "Enter the lead information below."}</p>
              </div>
            </header>

            <form onSubmit={handleSubmit} noValidate>
              <div className="add-lead-grid">
                <div className="add-lead-column">
                  <TextField
                    id="lead-name"
                    name="name"
                    label="Full Name"
                    icon={UserRound}
                    type="text"
                    autoComplete="name"
                    placeholder="Enter lead name"
                    value={form.name}
                    onChange={updateField}
                    aria-invalid={Boolean(errors.name)}
                    aria-describedby={errors.name ? "lead-name-error" : undefined}
                  />
                  {errors.name && <p className="add-lead-field-error" id="lead-name-error">{errors.name}</p>}

                  <TextField
                    id="lead-phone"
                    name="phone"
                    label="Phone"
                    icon={Phone}
                    type="tel"
                    autoComplete="tel"
                    placeholder="Enter phone number"
                    value={form.phone}
                    onChange={updateField}
                    aria-invalid={Boolean(errors.phone)}
                    aria-describedby={errors.phone ? "lead-phone-error" : undefined}
                  />
                  {errors.phone && <p className="add-lead-field-error" id="lead-phone-error">{errors.phone}</p>}

                  <SelectField
                    id="lead-source"
                    name="source"
                    label="Source"
                    icon={Tag}
                    value={form.source}
                    onChange={updateField}
                    invalid={Boolean(errors.source)}
                    errorId="lead-source-error"
                  >
                    <option value="">Select source</option>
                    {SOURCE_OPTIONS.map((source) => <option key={source} value={source}>{source}</option>)}
                  </SelectField>
                  {errors.source && <p className="add-lead-field-error" id="lead-source-error">{errors.source}</p>}
                </div>

                <div className="add-lead-column">
                  <TextField
                    id="lead-email"
                    name="email"
                    label="Email"
                    icon={Mail}
                    type="email"
                    autoComplete="email"
                    placeholder="Enter email address"
                    value={form.email}
                    onChange={updateField}
                    aria-invalid={Boolean(errors.email)}
                    aria-describedby={errors.email ? "lead-email-error" : undefined}
                  />
                  {errors.email && <p className="add-lead-field-error" id="lead-email-error">{errors.email}</p>}

                  <TextField
                    id="lead-company"
                    name="company"
                    label="Company"
                    icon={Building2}
                    type="text"
                    autoComplete="organization"
                    placeholder="Enter company name"
                    value={form.company}
                    onChange={updateField}
                    aria-invalid={Boolean(errors.company)}
                    aria-describedby={errors.company ? "lead-company-error" : undefined}
                  />
                  {errors.company && <p className="add-lead-field-error" id="lead-company-error">{errors.company}</p>}

                  <SelectField
                    id="lead-status"
                    name="status"
                    label="Status"
                    icon={Activity}
                    value={form.status}
                    onChange={updateField}
                    invalid={Boolean(errors.status)}
                    errorId="lead-status-error"
                  >
                    <option value="">Select status</option>
                    {STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status}</option>)}
                  </SelectField>
                  {errors.status && <p className="add-lead-field-error" id="lead-status-error">{errors.status}</p>}
                </div>
              </div>

              {submitError && <p className="add-lead-submit-error" role="alert">{submitError}</p>}

              <footer className="add-lead-actions">
                <button
                  className="add-lead-cancel"
                  type="button"
                  disabled={loading}
                  onClick={() => navigate("/leads")}
                >
                  Cancel
                </button>
                <button className="add-lead-submit" type="submit" disabled={loading}>
                  {isEditing ? <Pencil size={20} /> : <Plus size={21} />}
                  {loading ? (isEditing ? "Updating Lead…" : "Adding Lead…") : (isEditing ? "Update Lead" : "Add Lead")}
                </button>
              </footer>
            </form>
          </section>
          )}
        </div>
      </main>
    </div>
  );
}

export default function AddLead() {
  return <LeadFormPage />;
}

export function EditLead() {
  return <LeadFormPage isEditing />;
}
