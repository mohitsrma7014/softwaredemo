import React, { useState, useEffect } from "react";
import { useAuth } from "../../../context/AuthContext";
import api,{ BASE_URL } from "../../services/service";
import TagPreview from "./TagPreview";

const TagSystem = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("generate");
  const [formData, setFormData] = useState({
    generated_by: "",
    current_process: "",
    next_process: "",
    qty: "",
    grade: "",
    heat_no: "",
    customer: "",
    component: "",
    batch_id: "",
    max_qty: 0,
    status: "ok", // New status field
  });
  const [generatedTag, setGeneratedTag] = useState(null);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [availableComponents, setAvailableComponents] = useState([]);

  // Autocomplete states
  const [batchSuggestions, setBatchSuggestions] = useState([]);
  const [batchLoading, setBatchLoading] = useState(false);

  // Search states
  const [searchUid, setSearchUid] = useState("");
  const [searchBatchId, setSearchBatchId] = useState("");
  const [searchComponent, setSearchComponent] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");

  // Department-based process mapping
  const departmentProcesses = {
    admin: ["Forging","Heat Treatment", "Pre Machining","Machining","Final Inspection","Marking","Visual",],
    forging: ["Forging"],
    ht: ["Heat Treatment", "Pre Machining"],
    pre_mc: ["Pre Machining"],
    cnc: ["Machining"],
    fi: ["Final Inspection","Visual",],
    marking: ["Marking"],
    visual: ["Visual"],
  };

  const forgingSequence = [
    "Heat Treatment",
    "Pre Machining",
    "Machining",
    "Final Inspection",
    "Marking",
    "Visual",
    "Dispatch",
  ];

  const processSequenceMap = {
    admin: ["Heat Treatment", "Pre Machining", "Machining", "Final Inspection", "Marking", "Visual", "Dispatch"],
    forging: ["Heat Treatment", "Pre Machining", "Machining", "Final Inspection", "Marking", "Visual", "Dispatch"],
    ht: ["Pre Machining", "Machining", "Final Inspection", "Marking", "Visual", "Dispatch"],
    pre_mc: ["Machining", "Final Inspection", "Marking", "Visual", "Dispatch"],
    cnc: ["Final Inspection", "Marking", "Visual", "Dispatch"],
    marking: ["Visual", "Final Inspection","Dispatch"],
    fi: ["Visual", "Marking","Dispatch"],
    visual: ["Dispatch"],
  };
  const CHILD_COMPONENT_PROCESSES = ["machining", "visual", "fi", "marking"];

  // Status options
  const statusOptions = [
    { value: "ok", label: "OK", color: "bg-green-100 text-green-800" },
    { value: "reject", label: "Reject", color: "bg-red-100 text-red-800" },
    { value: "rework", label: "Rework", color: "bg-yellow-100 text-yellow-800" },
  ];

  // Auto-fill generated_by and current_process based on user
  useEffect(() => {
    if (user) {
      const firstName = user.first_name || user.name || "";
      const lastName = user.last_name || user.lastname || "";
      const fullName = `${firstName} ${lastName}`.trim();
      const dept = user.department?.toLowerCase() || "";
      const processes = departmentProcesses[dept] || [];
      const defaultProcess = processes.length === 1 ? processes[0] : "";

      let nextProcess = "";
      if (dept === "forging") {
        const index = forgingSequence.findIndex((p) =>
          p.toLowerCase().includes("forging")
        );
        nextProcess = forgingSequence[index + 1] || "";
      }

      setFormData((prev) => ({
        ...prev,
        generated_by: fullName,
        current_process: defaultProcess,
        next_process: nextProcess,
        status: "ok",
      }));
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Restrict quantity to max_qty
    if (name === "qty" && formData.max_qty > 0) {
      const numericValue = Number(value);
      if (numericValue > formData.max_qty) return;
    }

    // Prevent batch entry if current_process is empty
    if (name === "batch_id") {
      if (!formData.current_process) {
        alert("⚠️ Please select Current Process before entering Batch ID.");
        return;
      }
      if (value.trim().length > 0) {
        fetchBatchSuggestions(value);
      }
    }
     // Handle Status change logic
  if (name === "status") {
    let updatedNextProcess = formData.next_process;

    if (value.toLowerCase() === "rework" || value.toLowerCase() === "reject") {
      updatedNextProcess = value.charAt(0).toUpperCase() + value.slice(1); // Rework / Reject
    } else if (value.toLowerCase() === "ok") {
      // Keep next process as per sequence
      const dept = user?.department?.toLowerCase() || "";
      const sequence = processSequenceMap[dept] || [];
      const current = formData.current_process;
      const index = sequence.findIndex((p) =>
        p.toLowerCase().includes(current?.toLowerCase())
      );
      updatedNextProcess = index >= 0 ? sequence[index + 1] || "" : "";
    }

    setFormData({
      ...formData,
      status: value,
      next_process: updatedNextProcess,
    });
    return;
  }

    setFormData({
      ...formData,
      [name]: value,
    });

    // Autocomplete for batch ID
    if (name === "batch_id" && value.trim().length > 0) {
      fetchBatchSuggestions(value);
    }
  };

  // Fetch batch suggestions
  const fetchBatchSuggestions = async (term) => {
    setBatchLoading(true);
    try {
      const response = await api.get(
        `${BASE_URL}api/raw_material/issuebatch/suggestions/?q=${term}`
      );
      setBatchSuggestions(response.data);
    } catch (error) {
      console.error("Batch autocomplete error:", error);
      setBatchSuggestions([]);
    } finally {
      setBatchLoading(false);
    }
  };

  // Fetch batch details and autofill
  const handleBatchSelect = async (batchId) => {
    setFormData({ ...formData, batch_id: batchId });
    try {
      // Fetch batch base details
      const response = await api.get(`${BASE_URL}api/raw_material/batch_details/?batch_id=${batchId}`);
      const batch = response.data;

      let remainingQty = 0;

      // For forging, take remaining quantity directly from Blockmt
      if (formData.current_process?.toLowerCase() === "forging") {
        remainingQty = batch.max_qty || 0;
      } else {
        // For other processes, fetch remaining qty for current department
        const remainingResponse = await api.get(
          `${BASE_URL}api/raw_material/batch_remaining_qty/?batch_id=${batchId}&current_department=${formData.current_process}`
        );
        remainingQty = remainingResponse.data.remaining_qty || 0;
      }

      let childComponents = [];

      // Fetch child components only for machining, visual, fi, marking
      if (
        formData.current_process &&
        CHILD_COMPONENT_PROCESSES.includes(formData.current_process.toLowerCase())
      ) {
        const childRes = await api.get(
          `${BASE_URL}api/raw_material/get_child_components/?parent_component=${batch.component}`
        );
        childComponents = childRes.data || [];
      }

      setFormData((prev) => ({
        ...prev,
        grade: batch.grade,
        heat_no: batch.heat_no,
        customer: batch.customer,
        component: batch.component,
        max_qty: remainingQty,
        qty: remainingQty > 0 ? "" : "0",
        status: "ok", // Reset status when batch changes
      }));

      setBatchSuggestions([]);
      setAvailableComponents(childComponents);

      if (remainingQty === 0) {
        alert("⚠️ Remaining quantity is 0. No more tags can be generated for this batch.");
      }
    } catch (error) {
      console.error("Fetch batch details or remaining qty error:", error);
    }
  };



  // Get next process options
  const getNextProcessOptions = () => {
    const dept = user?.department?.toLowerCase() || "";
    const sequence = processSequenceMap[dept] || [];
    const current = formData.current_process;
    
    if (!current) return sequence;
    
    const index = sequence.findIndex((p) =>
      p.toLowerCase().includes(current.toLowerCase())
    );
    
    // If status is not OK, don't allow proceeding to next process
    if (formData.status !== 'ok') {
      return [];
    }
    
    return index >= 0 ? sequence.slice(index + 1) : sequence;
  };

  const nextProcessOptions = getNextProcessOptions();

  // Submit new tag
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.generated_by.trim()) {
      alert("User not available. Please log in again.");
      return;
    }

    // Validate that if status is OK, next process must be selected
    if (formData.status === 'ok' && !formData.next_process) {
      alert("⚠️ Please select Next Process when status is OK.");
      return;
    }

    // If status is not OK, clear next process
    const submitData = { ...formData };
    if (formData.status === "reject") {
    submitData.next_process = "Reject";
  } else if (formData.status === "rework") {
    submitData.next_process = "Rework";
  }
    // 🧾 Log full data before sending
  console.log("Submitting Tag Data:", submitData);

    setLoadingSubmit(true);

    try {
      const response = await api.post(`${BASE_URL}api/raw_material/api/tags/`, submitData);
      const newTag = response.data;

      setGeneratedTag(newTag);
      setActiveTab("preview");

      // Reset form
      const firstName = user?.first_name || user?.name || "";
      const lastName = user?.last_name || user?.lastname || "";
      const dept = user?.department?.toLowerCase() || "";
      const processes = departmentProcesses[dept] || [];
      const defaultProcess = processes.length === 1 ? processes[0] : "";

      let nextProcess = "";
      if (dept === "forging") {
        const index = forgingSequence.findIndex((p) =>
          p.toLowerCase().includes("forging")
        );
        nextProcess = forgingSequence[index + 1] || "";
      }

      setFormData({
        generated_by: `${firstName} ${lastName}`.trim(),
        current_process: defaultProcess,
        next_process: nextProcess,
        qty: "",
        grade: "",
        heat_no: "",
        customer: "",
        component: "",
        batch_id: "",
        max_qty: 0,
        status: "ok",
      });

      setBatchSuggestions([]);
      setAvailableComponents([]);
    } catch (error) {
      console.error("Error generating tag:", error);
      alert("Error generating tag. Please try again.");
    } finally {
      setLoadingSubmit(false);
    }
  };



  

  // Format UID and Date helpers
  const formatDate = (dateString) => {
    if (!dateString) return "Invalid Date";
    try {
      const date = new Date(dateString);
      return date.toLocaleString("en-IN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch (error) {
      return "Invalid Date";
    }
  };
  const formatUid = (uid) => {
    if (!uid) return "";
    const uidString = String(uid);
    return uidString.length > 8
      ? uidString.substring(0, 8).toUpperCase()
      : uidString.toUpperCase();
  };
// const handlePrint = async () => {
//     window.print();

//     if (generatedTag && !generatedTag.is_printed) {
//       try {
//         await api.post(
//           `${BASE_URL}/raw_material/api/tags/${generatedTag.id}/mark_printed/`
//         );
//       } catch (error) {
//         console.error("Error marking tag as printed:", error);
//       }
//     }
//   };
  const handleSearchByUid = async (e) => {
  e.preventDefault();

  if (!searchUid.trim()) {
    setSearchError("Please enter a Tag UID");
    return;
  }

  setSearchLoading(true);
  setSearchError("");

  try {
    const response = await api.get(
      `${BASE_URL}api/raw_material/api/tags/search_by_uid/?uid=${searchUid}`
    );
    setGeneratedTag(response.data);
    setActiveTab("preview");
  } catch (error) {
    console.error("Search error:", error);
    if (error.response && error.response.status === 404) {
      setSearchError("Tag not found with the provided UID");
    } else {
      setSearchError("Error searching for tag. Please try again.");
    }
  } finally {
    setSearchLoading(false);
  }
};

const handleAdvancedSearch = async (e) => {
  e.preventDefault();

  if (!searchBatchId.trim() && !searchComponent.trim()) {
    setSearchError("Please enter either Batch ID or Component");
    return;
  }

  setSearchLoading(true);
  setSearchError("");

  try {
    let url = `${BASE_URL}api/raw_material/api/tags/search_by_batch_component/?`;
    const params = [];

    if (searchBatchId.trim()) {
      params.push(`batch_id=${encodeURIComponent(searchBatchId)}`);
    }
    if (searchComponent.trim()) {
      params.push(`component=${encodeURIComponent(searchComponent)}`);
    }

    url += params.join("&");

    const response = await api.get(url);
    setSearchResults(response.data);
  } catch (error) {
    console.error("Advanced search error:", error);
    setSearchError("Error searching for tags. Please try again.");
  } finally {
    setSearchLoading(false);
  }
};


  // Reset form
  const resetForm = () => {
    const firstName = user?.first_name || user?.name || "";
    const lastName = user?.last_name || user?.lastname || "";
    const dept = user?.department?.toLowerCase() || "";
    const processes = departmentProcesses[dept] || [];
    const defaultProcess = processes.length === 1 ? processes[0] : "";

    let nextProcess = "";
    if (dept === "forging") {
      const index = forgingSequence.findIndex((p) =>
        p.toLowerCase().includes("forging")
      );
      nextProcess = forgingSequence[index + 1] || "";
    }

    setFormData({
      generated_by: `${firstName} ${lastName}`.trim(),
      current_process: defaultProcess,
      next_process: nextProcess,
      qty: "",
      grade: "",
      heat_no: "",
      customer: "",
      component: "",
      batch_id: "",
      max_qty: 0,
    });
    setGeneratedTag(null);
    setSearchUid("");
    setSearchBatchId("");
    setSearchComponent("");
    setSearchResults([]);
    setSearchError("");
    setActiveTab("generate");
    setBatchSuggestions([]);
  };

  // Current process options
  const currentDept = user?.department?.toLowerCase() || "";
  const processOptions = departmentProcesses[currentDept] || [];

  return (
    <div className="flex-col container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Tag Generation System</h1>

      {/* Tabs */}
      <div className="flex border-b mb-6">
        <button
          className={`py-2 px-4 font-medium ${
            activeTab === "generate"
              ? "border-b-2 border-blue-500 text-blue-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
          onClick={() => setActiveTab("generate")}
        >
          Generate New Tag
        </button>
        <button
          className={`py-2 px-4 font-medium ${
            activeTab === "search"
              ? "border-b-2 border-blue-500 text-blue-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
          onClick={() => setActiveTab("search")}
        >
          Search & Reprint
        </button>
        {generatedTag && (
          <button
            className={`py-2 px-4 font-medium ${
              activeTab === "preview"
                ? "border-b-2 border-blue-500 text-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setActiveTab("preview")}
          >
            Tag Preview
          </button>
        )}
      </div>

      {/* Generate New Tag */}
      {activeTab === "generate" && (
        <form
          onSubmit={handleSubmit}
          className="bg-white shadow-md rounded px-8 pt-2 pb-2 mb-1"
        >
          <div className="grid grid-cols-3 gap-2">
            {/* Generated By */}
            <div className="mb-1 col-span-2 hidden">
              <label className="block text-gray-700 text-sm font-bold mb-1">
                Generated By *
              </label>
              <input
                type="text"
                name="generated_by"
                value={formData.generated_by}
                readOnly
                className="shadow border rounded w-full py-2 px-3 bg-gray-100 text-gray-700 cursor-not-allowed"
              />
            </div>

            {/* Current Process */}
            <div className="mb-1">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Current Process *
              </label>
              {processOptions.length > 1 ? (
                <select
                  name="current_process"
                  value={formData.current_process}
                  onChange={handleChange}
                  className="shadow border rounded w-full py-2 px-3 text-gray-700"
                  required
                >
                  <option value="">-- Select Process --</option>
                  {processOptions.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  name="current_process"
                  value={formData.current_process}
                  readOnly
                  className="shadow border rounded w-full py-2 px-3 bg-gray-100 text-gray-700 cursor-not-allowed"
                />
              )}
            </div>

            {/* Status Field */}
            <div className="mb-1">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Status *
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="shadow border rounded w-full py-2 px-3 text-gray-700"
                required
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Next Process */}
            <div className="mb-1">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Next Process {formData.status === 'ok' && '*'}
              </label>
              {nextProcessOptions.length > 0 ? (
                <select
                  name="next_process"
                  value={formData.next_process}
                  onChange={handleChange}
                  className="shadow border rounded w-full py-2 px-3 text-gray-700"
                  required={formData.status === 'ok'}
                  disabled={formData.status !== 'ok'}
                >
                  <option value="">-- Select Next Process --</option>
                  {nextProcessOptions.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  name="next_process"
                  value={formData.next_process}
                  readOnly
                  className="shadow border rounded w-full py-2 px-3 bg-gray-100 text-gray-700 cursor-not-allowed"
                  placeholder={formData.status !== 'ok' ? "Select OK status to enable" : "No next process available"}
                />
              )}
              {formData.status !== 'ok' && (
                <p className="text-xs text-gray-500 mt-1">
                  Next process is only available when status is OK
                </p>
              )}
            </div>

            {/* Batch ID with autocomplete */}
            <div className="mb-1 relative">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Batch ID *
              </label>
              <input
                type="text"
                name="batch_id"
                value={formData.batch_id}
                onChange={handleChange}
                className="shadow border rounded w-full py-2 px-3 text-gray-700"
                autoComplete="off"
                required
              />
              {batchSuggestions.length > 0 && (
                <ul className="absolute z-10 bg-white border shadow-md w-full max-h-40 overflow-auto">
  {batchSuggestions.map((b, index) => (
    <li
      key={b.batch_id || index}
      className="p-2 hover:bg-gray-200 cursor-pointer"
      onClick={() => handleBatchSelect(b.batch_id)}
    >
      {b.batch_id}
    </li>
  ))}
</ul>
              )}
            </div>

            {/* Component */}
            <div className="mb-1">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Component *
              </label>
              {availableComponents.length > 0 ? (
                <select
                  name="component"
                  value={formData.component}
                  onChange={handleChange}
                  className="shadow border rounded w-full py-2 px-3 text-gray-700"
                  required
                >
                  {availableComponents.map((comp) => (
                    <option key={comp} value={comp}>
                      {comp}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  name="component"
                  value={formData.component}
                  onChange={handleChange}
                  className="shadow border rounded w-full py-2 px-3 text-gray-700"
                  required
                />
              )}
            </div>

            {/* Quantity */}
            <div className="mb-1">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Quantity *
              </label>
              <input
                type="number"
                name="qty"
                value={formData.qty}
                onChange={handleChange}
                className="shadow border rounded w-full py-2 px-3 text-gray-700"
                required
                max={formData.max_qty || undefined}
                disabled={formData.max_qty === 0}
              />
              {formData.max_qty > 0 ? (
                <p className="text-xs text-gray-500">Max Qty: {formData.max_qty}</p>
              ) : (
                <p className="text-xs text-red-500 font-semibold">No quantity available</p>
              )}
            </div>

            {/* Grade */}
            <div className="mb-1">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Grade *
              </label>
              <input
                type="text"
                name="grade"
                value={formData.grade}
                onChange={handleChange}
                className="shadow border rounded w-full py-2 px-3 text-gray-700"
                required
              />
            </div>

            {/* Heat No */}
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Heat No *
              </label>
              <input
                type="text"
                name="heat_no"
                value={formData.heat_no}
                onChange={handleChange}
                className="shadow border rounded w-full py-2 px-3 text-gray-700"
                required
              />
            </div>

            {/* Customer */}
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Customer *
              </label>
              <input
                type="text"
                name="customer"
                value={formData.customer}
                onChange={handleChange}
                className="shadow border rounded w-full py-2 px-3 text-gray-700"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loadingSubmit || !formData.generated_by || !formData.qty || Number(formData.qty) <= 0}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
          >
            {loadingSubmit ? "Generating..." : "Generate Tag"}
          </button>
        </form>
      )}

      {/* Search & Reprint */}
      {activeTab === "search" && (
        <div className="space-y-6">
          {/* Search by UID */}
          <div className="bg-white shadow-md rounded px-8 pt-6 pb-8">
            <h3 className="text-lg font-semibold mb-4">Search by Tag UID</h3>
            <form onSubmit={handleSearchByUid} className="flex gap-4">
              <input
                type="text"
                placeholder="Enter Tag UID"
                value={searchUid}
                onChange={(e) => setSearchUid(e.target.value)}
                className="shadow border rounded w-full py-2 px-3 text-gray-700"
              />
              <button
                type="submit"
                disabled={searchLoading}
                className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
              >
                {searchLoading ? "Searching..." : "Search"}
              </button>
            </form>
          </div>

          {/* Advanced Search */}
          <div className="bg-white shadow-md rounded px-8 pt-6 pb-8">
            <h3 className="text-lg font-semibold mb-4">Advanced Search</h3>
            <form onSubmit={handleAdvancedSearch} className="grid grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Enter Batch ID"
                value={searchBatchId}
                onChange={(e) => setSearchBatchId(e.target.value)}
                className="shadow border rounded py-2 px-3 text-gray-700"
              />
              <input
                type="text"
                placeholder="Enter Component"
                value={searchComponent}
                onChange={(e) => setSearchComponent(e.target.value)}
                className="shadow border rounded py-2 px-3 text-gray-700"
              />
              <button
                type="submit"
                disabled={searchLoading}
                className="col-span-2 bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded"
              >
                {searchLoading ? "Searching..." : "Search"}
              </button>
            </form>
          </div>

          {searchError && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {searchError}
            </div>
          )}

          {searchResults.length > 0 && (
            <div className="bg-white shadow-md rounded px-8 pt-6 pb-8">
              <h3 className="text-lg font-semibold mb-4">Search Results</h3>
              <div className="space-y-3">
                {searchResults.map((tag) => (
                  <div key={tag.id} className="border rounded p-4 hover:bg-gray-50 flex justify-between">
                    <div>
                      <p><strong>UID:</strong> {formatUid(tag.tag_uid)}</p>
                      <p><strong>Component:</strong> {tag.component}</p>
                      <p><strong>Batch ID:</strong> {tag.batch_id}</p>
                      <p><strong>Generated By:</strong> {tag.generated_by}</p>
                      <p><strong>Date:</strong> {formatDate(tag.generated_at)}</p>
                    </div>
                    <button
                      onClick={() => {
                        setGeneratedTag(tag);
                        setActiveTab("preview");
                      }}
                      className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                    >
                      View & Print
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Preview */}
      {activeTab === "preview" && generatedTag && (
  <TagPreview
   generatedTag={generatedTag}
     resetForm={resetForm}
   />
 )}
    </div>
  );
};

export default TagSystem;
