import { useState } from "react";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import { createLead, updateLead } from "../../api/leadApi";

export default function AddLeadModal({
  onClose,
  onLeadCreated,
  editingLead,
}) {
  const [formData, setFormData] = useState(
    editingLead || {
      name: "",
      email: "",
      phone: "",
      company: "",
      source: "",
      status: "New",
      notes: "",
    }
  );

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    setErrors((prev) => ({
      ...prev,
      [name]: "",
    }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        formData.email
      )
    ) {
      newErrors.email = "Invalid email";
    }

    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required";
    } else if (!/^\d{10}$/.test(formData.phone)) {
      newErrors.phone = "Phone must contain 10 digits";
    }

    if (!formData.company.trim()) {
      newErrors.company = "Company name is required";
    }

    if (!formData.source) {
      newErrors.source = "Lead source is required";
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      if (editingLead) {
        await updateLead(
          editingLead._id,
          formData
        );
        toast.success(
          "Lead updated successfully"
        );
      } else {
        await createLead(formData);
        toast.success(
          "Lead created successfully"
        );
      }
      await onLeadCreated();
      onClose();
    } catch (error) {
      console.error(error);
      toast.error(
        "Failed to save lead"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-xl p-6 w-full max-w-2xl shadow-xl border border-slate-200 dark:border-slate-800"
        onClick={(e) =>
          e.stopPropagation()
        }
      >
        <motion.div
          initial={{
            opacity: 0,
            scale: 0.95
          }}
          animate={{
            opacity: 1,
            scale: 1
          }}
          exit={{
            opacity: 0,
            scale: 0.95
          }}
        >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {editingLead
              ? "Edit Lead"
              : "Add New Lead"}
          </h2>

          <button
            onClick={onClose}
            className="text-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
            ✕
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">

          <div>
            <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">
              Name
            </label>

            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter full name"
              className={`w-full border rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 ${
                errors.name
                  ? "border-red-500"
                  : "border-slate-300 dark:border-slate-700"
              }`}
            />

            {errors.name && (
              <p className="text-red-500 text-sm mt-1">
                {errors.name}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">
              Email
            </label>

            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter email"
              className={`w-full border rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 ${
                errors.email
                  ? "border-red-500"
                  : "border-slate-300 dark:border-slate-700"
              }`}
            />

            {errors.email && (
              <p className="text-red-500 text-sm mt-1">
                {errors.email}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">
              Phone
            </label>

            <input
              type="text"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="Enter phone"
              className={`w-full border rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 ${
                errors.phone
                  ? "border-red-500"
                  : "border-slate-300 dark:border-slate-700"
              }`}
            />

            {errors.phone && (
              <p className="text-red-500 text-sm mt-1">
                {errors.phone}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">
              Company
            </label>

            <input
              type="text"
              name="company"
              value={formData.company}
              onChange={handleChange}
              placeholder="Enter company"
              className={`w-full border rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 ${
                errors.company
                  ? "border-red-500"
                  : "border-slate-300 dark:border-slate-700"
              }`}
            />

            {errors.company && (
              <p className="text-red-500 text-sm mt-1">
                {errors.company}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">
              Source
            </label>

            <select
              name="source"
              value={formData.source || ""}
              onChange={handleChange}
              className={`w-full border rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white ${
                errors.source
                  ? "border-red-500"
                  : "border-slate-300 dark:border-slate-700"
              }`}
            >
              <option value="">Select source</option>
              <option value="Website">Website</option>
              <option value="Referral">Referral</option>
              <option value="LinkedIn">LinkedIn</option>
              <option value="Social Media">Social Media</option>
              <option value="Cold Call">Cold Call</option>
              <option value="Email">Email</option>
              <option value="Other">Other</option>
            </select>

            {errors.source && (
              <p className="text-red-500 text-sm mt-1">{errors.source}</p>
            )}
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">
              Status
            </label>

            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            >
              <option>New</option>
              <option>Contacted</option>
              <option>Qualified</option>
              <option>Lost</option>
            </select>
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">
              Notes
            </label>

            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows="3"
              placeholder="Additional notes..."
              className="w-full border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
            />
          </div>

        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-5 py-2 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition disabled:opacity-50 text-slate-900 dark:text-white"
          >
            Cancel
          </button>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-5 py-2 bg-indigo-600 hover:shadow-lg hover:scale-[1.02] text-white rounded-lg transition disabled:opacity-50 dark:bg-indigo-600 dark:hover:bg-indigo-700"
          >
            {loading ? "Saving..." : "Save Lead"}
          </button>
        </div>
        </motion.div>
      </div>
    </div>
  );
}
