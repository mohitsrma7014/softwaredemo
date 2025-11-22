import { useState, useEffect } from "react";
import { useAuth } from "../../../context/AuthContext";
import api from "../../services/service";

const BatchTrackingPage = () => {
  const { user } = useAuth();

  const [form, setForm] = useState({
    batch_id: "",
    customer: "",
    standard: "",
    component: "",
    grade: "",
    dia: "",
    heatno: "",
    rack_no: "",
    issue_bar_qty: "",
    issue_qty_kg: "",
    line: "",
    supplier: "",
    verified_by: "",
  });

  const [batchCode, setBatchCode] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [remainingQty, setRemainingQty] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 🧍 Auto-fill verified_by from local user
  useEffect(() => {
    if (user) {
      const verifiedBy = `${user.first_name} ${user.last_name}`;
      setForm((prev) => ({ ...prev, verified_by: verifiedBy }));
    }
  }, [user]);

  // 🔍 Fetch batch suggestions
  const fetchBatchSuggestions = async (query) => {
    if (!query || query.length < 1) {
      setSuggestions([]);
      return;
    }
    try {
      const res = await api.get(`/api/raw_material/batch/suggestions/?q=${query}`);
      setSuggestions(res.data);
      setShowSuggestions(true);
    } catch (err) {
      console.error("Suggestion fetch error:", err);
    }
  };

  // 📦 Fetch batch details
  const fetchBatchDetails = async (batch_id, batch_code) => {
    try {
      const res = await api.get(`/api/raw_material/batch/details/?batch_id=${batch_id}`);
      const data = res.data;

      setForm((prev) => ({
        ...prev,
        batch_id: data.id,
        grade: data.grade || "",
        dia: data.dia || "",
        customer: data.customer || "",
        standard: data.standerd || "",
        supplier: data.supplier || "",
        component: data.component || "",
        heatno: data.heatno || "",
        rack_no: data.rack_no || "",
      }));

      const remaining = parseFloat(data.remaining) || 0;
      setRemainingQty(remaining);

      setBatchCode(batch_code);
      setShowSuggestions(false);
    } catch (err) {
      console.error("Batch details fetch error:", err);
      setError("Failed to fetch batch details");
    }
  };

  // Handle batch code input
  const handleBatchCodeChange = (e) => {
    const value = e.target.value;
    setBatchCode(value);
    fetchBatchSuggestions(value);
  };

  // Handle suggestion selection
  const handleSuggestionClick = (batch) => {
    fetchBatchDetails(batch.id, batch.batch_id);
  };

  // 💾 Submit
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.batch_id) {
      setError("Please select a valid batch");
      return;
    }

    if (parseFloat(form.issue_qty_kg) > remainingQty) {
      setError(`Issue quantity cannot exceed remaining (${remainingQty} kg).`);
      return;
    }

    try {
      setLoading(true);
      setError("");
      await api.post("/api/raw_material/batchtracking/", form);

      alert("✅ Batch tracking entry created successfully!");

      // Reset form (keep verified_by)
      setForm({
        batch_id: "",
        customer: "",
        standard: "",
        component: "",
        grade: "",
        dia: "",
        heatno: "",
        rack_no: "",
        issue_bar_qty: "",
        issue_qty_kg: "",
        line: "",
        supplier: "",
        verified_by: `${user?.first_name || ""} ${user?.last_name || ""}`,
      });
      setBatchCode("");
      setRemainingQty(0);
    } catch (err) {
      console.error("Submission error:", err);
      const errorMsg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        "Error creating batch tracking entry.";
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Fields configuration (readOnly for auto-filled ones)
  const formFields = [
    { key: "customer", label: "Customer", readOnly: true },
    { key: "standard", label: "Standard", readOnly: true },
    { key: "component", label: "Component", readOnly: true },
    { key: "grade", label: "Grade", readOnly: true },
    { key: "dia", label: "Diameter", readOnly: true },
    { key: "heatno", label: "Heat No", readOnly: true },
    { key: "rack_no", label: "Rack No", readOnly: true },
    { key: "issue_bar_qty", label: "Issue Bar Qty", readOnly: false },
    { key: "issue_qty_kg", label: "Issue Qty (kg)", readOnly: false, type: "number" },
    { key: "line", label: "Line", readOnly: false },
    { key: "supplier", label: "Supplier", readOnly: true },
  ];

  return (
    <div className="p-6  mx-auto">
      <h2 className="text-xl font-bold mb-4">Batch Tracking Entry</h2>

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-3 gap-3 bg-gray-100 p-4 rounded-lg"
      >
        {/* 🔹 Batch Code */}
        <div className="relative col-span-1">
          <label className="block text-sm font-medium mb-1">Batch Code *</label>
          <input
            type="text"
            placeholder="Search batch code..."
            value={batchCode}
            onChange={handleBatchCodeChange}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            className="p-2 border rounded w-full"
            required
          />
          {showSuggestions && suggestions.length > 0 && (
            <ul className="absolute z-10 bg-white border rounded shadow-md w-full max-h-48 overflow-y-auto mt-1">
              {suggestions.map((batch) => (
                <li
                  key={batch.id}
                  onClick={() => handleSuggestionClick(batch)}
                  className="p-2 hover:bg-gray-200 cursor-pointer border-b last:border-b-0"
                >
                  {batch.batch_id}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 🔹 Remaining Qty */}
        <div className="col-span-1">
          <label className="block text-sm font-medium mb-1">Remaining Qty (kg)</label>
          <input
            type="number"
            value={remainingQty}
            readOnly
            className="p-2 border rounded w-full bg-gray-100 text-gray-700"
          />
        </div>

        {/* 🔹 Verified By */}
        <div className="col-span-1">
          <label className="block text-sm font-medium mb-1">Verified By</label>
          <input
            type="text"
            value={form.verified_by}
            readOnly
            className="p-2 border rounded w-full bg-gray-100 text-gray-700"
          />
        </div>

        {/* 🔹 Other Fields */}
        {formFields.map((field) => (
          <div key={field.key} className="col-span-1">
            <label className="block text-sm font-medium mb-1">{field.label}</label>
            <input
              type={field.type || "text"}
              placeholder={field.label}
              value={form[field.key]}
              onChange={(e) => {
                if (field.readOnly) return;
                const value = e.target.value;
                if (field.key === "issue_qty_kg") {
                  const num = parseFloat(value);
                  if (num > remainingQty) {
                    alert(`❌ Issue quantity cannot exceed remaining (${remainingQty} kg).`);
                    return;
                  }
                }
                setForm({ ...form, [field.key]: value });
              }}
              readOnly={field.readOnly}
              className={`p-2 border rounded w-full ${
                field.readOnly ? "bg-gray-100 text-gray-700" : ""
              }`}
              step={field.type === "number" ? "0.01" : undefined}
            />
          </div>
        ))}

        {/* 🔹 Submit + Error */}
        <div className="col-span-3 flex justify-between items-center mt-4">
          <button
            type="submit"
            disabled={loading}
            className="bg-purple-600 text-white p-2 rounded px-6 disabled:bg-purple-400"
          >
            {loading ? "Saving..." : "Issue Batch"}
          </button>

          {error && (
            <div className="text-red-500 text-sm bg-red-50 p-2 rounded">{error}</div>
          )}
        </div>
      </form>
    </div>
  );
};

export default BatchTrackingPage;
