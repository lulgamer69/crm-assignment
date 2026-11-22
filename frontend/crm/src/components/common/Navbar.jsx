import { Plus } from "lucide-react";

function Navbar({ onAddLead }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
          LeadFlow CRM
        </h1>

        <p className="text-slate-500 dark:text-slate-400">
          Manage and track your leads
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onAddLead}
          className="bg-indigo-600 text-white px-5 py-3 rounded-xl hover:scale-105 active:scale-95 transition-all dark:bg-indigo-600 dark:hover:bg-indigo-700"
        >
          + Add Lead
        </button>
      </div>
    </div>
  );
}

export default Navbar;