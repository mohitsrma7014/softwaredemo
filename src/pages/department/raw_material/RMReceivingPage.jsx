import { useState, useEffect } from "react";
import {
  ChevronDown,
  ChevronUp,
  Filter,
  FileSpreadsheet,
  Download,
} from "lucide-react";
import api from "../../services/service";

const RMReceivingPage = () => {
  const [data, setData] = useState([]);
  const [filters, setFilters] = useState({
    grade: "",
    dia: "",
    supplier: "",
    approval_status: "",
    customer: "",
    invoice_no: "",
    heatno: "",
    date_from: "",
    date_to: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showDetails, setShowDetails] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState("");

  const [showFilters, setShowFilters] = useState(true);
  const [exportModal, setExportModal] = useState(false);
  const [fields, setFields] = useState([]);
  const [selectedFields, setSelectedFields] = useState([]);

  const [masterData, setMasterData] = useState({
    grade: [],
    supplier: [],
    location: [],
    material: [],
    customer: [],
  });

  const [form, setForm] = useState({
    date: new Date().toISOString().split("T")[0],
    supplier: "",
    grade: "",
    dia: "",
    customer: "",
    standerd: "",
    heatno: "",
    reciving_weight_kg: "",
    rack_no: "",
    location: "",
    type_of_material: "",
    cost_per_kg: "",
    invoice_no: "",
  });

   // Autocomplete states
  const [suggestions, setSuggestions] = useState({
    grade: [],
    supplier: [],
    location: [],
    type_of_material: [],
    customer: []
  });

  const [activeSuggestions, setActiveSuggestions] = useState({
    grade: false,
    supplier: false,
    location: false,
    type_of_material: false,
    customer: false
  });

  // Track selected values to prevent clearing
  const [selectedValues, setSelectedValues] = useState({
    grade: false,
    supplier: false,
    location: false,
    type_of_material: false,
    customer: false
  });

  // Pagination state
  const [pagination, setPagination] = useState({
    count: 0,
    next: null,
    previous: null,
    page: 1,
    page_size: 25,
  });

  // ---------- Helpers (kept from original) ----------
  const isFilePath = (value) => {
    if (!value || typeof value !== "string") return false;
    const fileExtensions = [".pdf", ".jpg", ".jpeg", ".png", ".doc", ".docx"];
    return fileExtensions.some((ext) => value.toLowerCase().endsWith(ext));
  };

  const hasFiles = (item) => {
    if (!item) return false;
    const fileFields = ["milltc", "spectro", "ssb_inspection_report", "customer_approval"];
    return fileFields.some((field) => item[field] && item[field] !== "");
  };

  const getFileUrl = (filePath) => {
    if (!filePath) return null;
    if (filePath.startsWith("http")) return filePath;
    if (filePath.startsWith("/media/")) return `http://127.0.0.1:8000${filePath}`;
    return `http://127.0.0.1:8000/media/${filePath}`;
  };

  // ---------- Master data & fields ----------
  const fetchMasterData = async (type) => {
    try {
      const res = await api.get(`/api/raw_material/?type=${type}`);
      return res.data;
    } catch (err) {
      console.error(`Error fetching ${type}:`, err);
      return [];
    }
  };

  const loadMasterData = async () => {
    const types = ['GRADE', 'SUPPLIER', 'LOCATION', 'MATERIAL', 'CUSTOMER'];
    const promises = types.map(type => fetchMasterData(type));
    const results = await Promise.all(promises);
    
    setMasterData({
      grade: results[0],
      supplier: results[1],
      location: results[2],
      material: results[3],
      customer: results[4]
    });
  };

  const fetchFields = async () => {
    try {
      const res = await api.get("/api/raw_material/recivingfields/");
      const fl = res.data || [];
      setFields(fl);
      setSelectedFields(fl.map((f) => f.name));
    } catch (err) {
      console.error("Failed to fetch fields", err);
    }
  };

  // ---------- Data fetching with pagination ----------
  const fetchData = async (page = 1) => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => v && params.append(k, v));
      params.append("page", page);
      params.append("page_size", pagination.page_size);

      const res = await api.get(`/api/raw_material/rmreceiving/?${params.toString()}`);
      const d = res.data || {};
      setData(d.results || d || []);
      setPagination((prev) => ({
        ...prev,
        count: d.count || 0,
        next: d.next || null,
        previous: d.previous || null,
        page,
      }));
    } catch (err) {
      console.error("Fetch error:", err);
      setError("Failed to load data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMasterData();
    fetchFields();
    fetchData(1);
  }, []);

  // ---------- Form helpers (kept/cleaned) ----------
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: value
    }));

    // Reset selection flag when user types
    if (['grade', 'supplier', 'location', 'type_of_material', 'customer'].includes(name)) {
      setSelectedValues(prev => ({
        ...prev,
        [name]: false
      }));
    }

    // Show suggestions based on input
    if (['grade', 'supplier', 'location', 'type_of_material', 'customer'].includes(name)) {
      const masterType = name === 'type_of_material' ? 'material' : name;
      const masterItems = masterData[masterType] || [];
      
      const filtered = masterItems.filter(item => {
        const itemName = item.name?.toLowerCase() || item.toString().toLowerCase();
        const itemCode = item.code?.toLowerCase() || '';
        const searchValue = value.toLowerCase();
        
        return itemName.includes(searchValue) || itemCode.includes(searchValue);
      }).slice(0, 10);

      setSuggestions(prev => ({
        ...prev,
        [name]: filtered
      }));

      setActiveSuggestions(prev => ({
        ...prev,
        [name]: value.length > 0 && filtered.length > 0
      }));
    }
  };

  // ✅ Select suggestion - FIXED
  const handleSuggestionSelect = (field, item) => {
    const displayValue = item.name || item;
    
    setForm(prev => ({
      ...prev,
      [field]: displayValue
    }));

    // Mark as selected to prevent clearing
    setSelectedValues(prev => ({
      ...prev,
      [field]: true
    }));

    setActiveSuggestions(prev => ({
      ...prev,
      [field]: false
    }));
  };

  // ✅ Handle blur - FIXED clearing logic
  const handleInputBlur = (field) => {
    setTimeout(() => {
      const currentValue = form[field];
      
      // Only clear if not selected from suggestions and value doesn't match any master data
      if (!selectedValues[field] && currentValue) {
        const masterType = field === 'type_of_material' ? 'material' : field;
        const masterItems = masterData[masterType] || [];
        
        const existsInMaster = masterItems.some(item => {
          const itemName = item.name || item.toString();
          return itemName === currentValue;
        });
        
        if (!existsInMaster) {
          setForm(prev => ({
            ...prev,
            [field]: ""
          }));
        }
      }
      
      setActiveSuggestions(prev => ({
        ...prev,
        [field]: false
      }));
    }, 200);
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleSearch = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    fetchData(1);
  };

  const handlePageChange = (direction) => {
    if (direction === "next" && pagination.next) {
      fetchData(pagination.page + 1);
    } else if (direction === "previous" && pagination.previous) {
      fetchData(pagination.page - 1);
    }
  };

  // ---------- Create record (kept) ----------
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError("");
      
      // Validate required fields have valid selections - FIXED validation
      const requiredFields = ['supplier', 'grade', 'customer', 'location', 'type_of_material'];
      const invalidFields = [];
      
      requiredFields.forEach(field => {
        const value = form[field];
        const masterType = field === 'type_of_material' ? 'material' : field;
        const masterItems = masterData[masterType] || [];
        
        const isValid = masterItems.some(item => {
          const itemName = item.name || item.toString();
          return itemName === value;
        });
        
        if (!value || !isValid) {
          invalidFields.push(field);
        }
      });

      if (invalidFields.length > 0) {
        setError(`Please select valid values for: ${invalidFields.join(', ')}`);
        return;
      }

      // ✅ Prepare form data
        const formData = new FormData();
        Object.keys(form).forEach(key => {
        if (form[key] !== "") {
            formData.append(key, form[key]);
        }
        });

        // ✅ Auto-fill verified_by from logged-in user
        const storedUser = JSON.parse(localStorage.getItem("user"));
        if (!storedUser || !storedUser.first_name || !storedUser.last_name) {
        setError("You must be logged in to create a record. Please log in first.");
        setLoading(false);
        return;
        }

        const verifiedBy = `${storedUser.first_name} ${storedUser.last_name}`.trim();
        formData.append("verified_by", verifiedBy);



      await api.post("/api/raw_material/rmreceiving/", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      
      setSuccess("RM Receiving record created successfully!");
      setShowForm(false);
      // Reset form and selection flags
      setForm({
        date: new Date().toISOString().split('T')[0],
        supplier: "",
        grade: "",
        dia: "",
        customer: "",
        standerd: "",
        heatno: "",
        reciving_weight_kg: "",
        rack_no: "",
        location: "",
        type_of_material: "",
        cost_per_kg: "",
        invoice_no: "",
      });
      setSelectedValues({
        grade: false,
        supplier: false,
        location: false,
        type_of_material: false,
        customer: false
      });
      fetchData();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error("Create error:", err);
      const errorMsg = err.response?.data?.error || 
                      err.response?.data?.details || 
                      "Error creating RM Receiving entry.";
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // ---------- File upload & approval update (kept) ----------
  const handleFileUpload = async (uid, fieldName, file) => {
    if (!file) return;
    const formData = new FormData();
    formData.append(fieldName, file);
    try {
      setUploading(true);
      setError("");
      const response = await api.patch(`/api/raw_material/rmreceiving/${uid}/`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setShowDetails(response.data);
      fetchData(pagination.page);
      setSuccess("File uploaded successfully!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error("Upload failed:", err);
      setError("File upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleApprovalChange = async (uid, value) => {
    try {
      setError("");
      const payload = { approval_status: value };
      const response = await api.patch(`/api/raw_material/rmreceiving/${uid}/`, payload, {
        headers: { "Content-Type": "application/json" },
      });
      setShowDetails(response.data);
      fetchData(pagination.page);
      setSuccess("Approval status updated successfully!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error("Approval update failed:", err);
      setError("Failed to update approval status.");
    }
  };

  // ---------- Export ----------
  const toggleField = (field) => {
    setSelectedFields((prev) => (prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field]));
  };

  const handleExport = async () => {
    if (selectedFields.length === 0) {
      alert("Please select at least one field to export.");
      return;
    }

    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => v && params.append(k, v));
    params.append("fields", selectedFields.join(","));

    try {
      const res = await api.get(`/api/raw_material/recivingexport/?${params.toString()}`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "rm_receiving_export.xlsx");
      document.body.appendChild(link);
      link.click();
      link.remove();
      setExportModal(false);
    } catch (err) {
      console.error("Export failed", err);
      alert("Export failed. Please try again.");
    }
  };

  // ---------- Render helpers ----------
  const renderAutocompleteInput = (field, label) => (
    <div className="flex flex-col relative">
      <label className="text-sm font-medium mb-1 capitalize">
        {label || field.replaceAll("_", " ")}
      </label>
      <input
        type="text"
        name={field}
        value={form[field]}
        onChange={handleInputChange}
        onBlur={() => handleInputBlur(field)}
        onFocus={() => {
          const masterType = field === 'type_of_material' ? 'material' : field;
          const masterItems = masterData[masterType] || [];
          const currentValue = form[field];
          
          if (currentValue) {
            const filtered = masterItems.filter(item => {
              const itemName = item.name?.toLowerCase() || item.toString().toLowerCase();
              const itemCode = item.code?.toLowerCase() || '';
              const searchValue = currentValue.toLowerCase();
              
              return itemName.includes(searchValue) || itemCode.includes(searchValue);
            }).slice(0, 10);

            setSuggestions(prev => ({
              ...prev,
              [field]: filtered
            }));

            setActiveSuggestions(prev => ({
              ...prev,
              [field]: filtered.length > 0
            }));
          } else {
            // Show all options when focused and empty
            setSuggestions(prev => ({
              ...prev,
              [field]: masterItems.slice(0, 10)
            }));
            setActiveSuggestions(prev => ({
              ...prev,
              [field]: masterItems.length > 0
            }));
          }
        }}
        className="border p-2 rounded"
        required
      />
      {activeSuggestions[field] && suggestions[field].length > 0 && (
        <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-b shadow-lg z-20 max-h-60 overflow-y-auto">
          {suggestions[field].map((item, index) => (
            <div
              key={index}
              className="p-2 hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
              onClick={() => handleSuggestionSelect(field, item)}
              onMouseDown={(e) => e.preventDefault()} // Prevent blur before click
            >
              {item.name || item.toString()} 
              {item.code && ` (${item.code})`}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ---------- JSX ----------
  return (
    <div className="p-4 bg-gray-50 min-h-screen">
      {success && <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">{success}</div>}
      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}

      {/* Filters panel (collapsible) */}
      <div className="bg-white border rounded-xl shadow-sm mb-4">
        <div
          className="flex justify-between items-center p-4 cursor-pointer border-b bg-gray-100 rounded-t-xl"
          onClick={() => setShowFilters(!showFilters)}
        >
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-700" />
            <h2 className="text-gray-800 font-medium">Filters</h2>
          </div>
          {showFilters ? <ChevronUp className="w-5 h-5 text-gray-600" /> : <ChevronDown className="w-5 h-5 text-gray-600" />}
        </div>

        {showFilters && (
          <form onSubmit={handleSearch} className="p-4 bg-white space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-9 gap-3">
              {/* Render inputs from filters state; convert date fields to date input */}
              {Object.entries(filters).map(([key, value]) => {
                const isDate = key === "date_from" || key === "date_to";
                return (
                  <input
                    key={key}
                    type={isDate ? "date" : "text"}
                    name={key}
                    placeholder={key.replaceAll("_", " ")}
                    value={value}
                    onChange={handleFilterChange}
                    className="p-2 border rounded text-sm focus:ring focus:ring-blue-200"
                  />
                );
              })}
            </div>

            <div className="flex justify-between items-center pt-2">
              <div className="flex gap-2">
                <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition">
                  {loading ? "Loading..." : "Apply Filters"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setFilters({
                      grade: "",
                      dia: "",
                      supplier: "",
                      approval_status: "",
                      customer: "",
                      invoice_no: "",
                      heatno: "",
                      date_from: "",
                      date_to: "",
                    });
                    fetchData(1);
                  }}
                  className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition"
                >
                  Clear
                </button>

                <button
                  type="button"
                  onClick={() => setShowForm(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                >
                  + Add RM Receiving
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setExportModal(true)}
                  className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
                >
                  <FileSpreadsheet className="w-4 h-4" /> Export
                </button>

                <button
                  type="button"
                  onClick={() => {
                    // quick download all visible fields (if API supports)
                    setExportModal(true);
                  }}
                  title="Export quick"
                  className="flex items-center gap-2 bg-gray-200 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-300 transition"
                >
                  <Download className="w-4 h-4" /> Quick
                </button>
              </div>
            </div>
          </form>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto bg-white rounded-xl shadow-sm border relative max-h-[65vh] overflow-y-auto">
        {loading ? (
          <p className="text-center p-6 text-gray-600">Loading...</p>
        ) : data.length > 0 ? (
          <table className="w-full border-collapse text-sm">
            <thead className="bg-gray-100 text-gray-700 sticky top-0 z-10">
                <tr>
                  <th className="p-3 border">Date</th>
                  <th className="p-3 border">Supplier</th>
                  <th className="p-3 border">Material Type</th>
                  <th className="p-3 border">Grade</th>
                  <th className="p-3 border">Invoice</th>
                  <th className="p-3 border">Heat No</th>
                  <th className="p-3 border">Weight (kg)</th>
                  <th className="p-3 border">Approval</th>
                  <th className="p-3 border">Mill TC</th>
                  <th className="p-3 border">Spectro</th>
                  <th className="p-3 border">SSB Report</th>
                  <th className="p-3 border">Customer Approval</th>
                  <th className="p-3 border">Action</th>
                </tr>
              </thead>

              <tbody>
                {data.map((item) => (
                  <tr key={item.uid || item.id} className="border-t hover:bg-gray-50 transition">
                    <td className="p-2 border text-center">{item.date}</td>
                    <td className="p-2 border">{item.supplier}</td>
                    <td className="p-2 border">{item.type_of_material}</td>
                    <td className="p-2 border">{item.grade}</td>
                    <td className="p-2 border">{item.invoice_no}</td>
                    <td className="p-2 border">{item.heatno}</td>
                    <td className="p-2 border text-right">{item.reciving_weight_kg}</td>
                    <td className="p-2 border text-center">{item.approval_status || "-"}</td>

                    {/* File Columns */}
                    {["milltc", "spectro", "ssb_inspection_report", "customer_approval"].map((field) => (
                      <td key={field} className="p-2 border text-center">
                        {item[field] ? (
                          <a
                            href={getFileUrl(item[field])}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 hover:text-blue-800"
                            title={`View ${field.replaceAll("_", " ")}`}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="w-3 h-3 inline-block"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </a>
                        ) : (
                          <span className="text-black text-[10px]">✖</span>
                        )}
                      </td>
                    ))}

                    {/* Action */}
                    <td className="p-2 border text-center">
                      <button
                        onClick={() => setShowDetails(item)}
                        className="text-blue-600 hover:text-blue-800 underline text-sm"
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>

          </table>
        ) : (
          <p className="text-gray-500 text-center p-6">No records found.</p>
        )}
      </div>

      {/* Pagination */}
      {pagination.count > 0 && (
        <div className="flex justify-between items-center mt-4 text-sm">
          <p className="text-gray-600">Showing page {pagination.page} | Total: {pagination.count} records</p>
          <div className="flex gap-2">
            <button
              disabled={!pagination.previous}
              onClick={() => handlePageChange("previous")}
              className={`px-4 py-1 rounded border ${pagination.previous ? "bg-gray-200 hover:bg-gray-300" : "bg-gray-100 text-gray-400 cursor-not-allowed"}`}
            >
              Previous
            </button>
            <button
              disabled={!pagination.next}
              onClick={() => handlePageChange("next")}
              className={`px-4 py-1 rounded border ${pagination.next ? "bg-gray-200 hover:bg-gray-300" : "bg-gray-100 text-gray-400 cursor-not-allowed"}`}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Create Modal (kept simplified) */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Add RM Receiving</h3>
            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3">
              {/* Date */}
              <div className="flex flex-col">
                <label className="text-sm font-medium mb-1">Date</label>
                <input
                  type="date"
                  name="date"
                  value={form.date}
                  onChange={handleInputChange}
                  className="border p-2 rounded"
                  required
                />
              </div>

              {/* Autocomplete Fields */}
              {renderAutocompleteInput("supplier", "Supplier")}
              {renderAutocompleteInput("grade", "Grade")}
              {renderAutocompleteInput("customer", "Customer")}
              {renderAutocompleteInput("location", "Location")}
              {renderAutocompleteInput("type_of_material", "Material Type")}

              {/* Regular Input Fields */}
              {[
                { key: "dia", type: "text", label: "Dia" },
                { key: "standerd", type: "text", label: "Standard" },
                { key: "heatno", type: "text", label: "Heat No" },
                { key: "rack_no", type: "text", label: "Rack No" },
                { key: "invoice_no", type: "text", label: "Invoice No" },
              ].map(({ key, type, label }) => (
                <div key={key} className="flex flex-col">
                  <label className="text-sm font-medium mb-1">{label}</label>
                  <input
                    type={type}
                    name={key}
                    value={form[key]}
                    onChange={handleInputChange}
                    className="border p-2 rounded"
                    required={key !== "invoice_no"}
                  />
                </div>
              ))}

              <div className="flex flex-col">
                <label className="text-sm font-medium mb-1">Receiving Weight (kg)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  name="reciving_weight_kg"
                  value={form.reciving_weight_kg}
                  onChange={handleInputChange}
                  className="border p-2 rounded"
                  required
                />
              </div>

              <div className="flex flex-col">
                <label className="text-sm font-medium mb-1">Cost per kg</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  name="cost_per_kg"
                  value={form.cost_per_kg}
                  onChange={handleInputChange}
                  className="border p-2 rounded"
                />
              </div>

              <div className="col-span-2 flex justify-end gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-300"
                >
                  {loading ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Details Modal (kept) */}
      {showDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">RM Receiving Details</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {Object.entries(showDetails).map(([key, value]) => (
                <div key={key} className="border-b pb-2">
                  <div className="font-medium capitalize text-sm text-gray-600">{key.replaceAll("_", " ")}</div>
                  <div className="break-all mt-1">{isFilePath(value) ? (
                    <a href={getFileUrl(value)} target="_blank" rel="noreferrer" className="text-blue-600 underline hover:text-blue-800">View File</a>
                  ) : value?.toString() || "-"}</div>
                </div>
              ))}
            </div>

            <div className="mb-6 border-t pt-4">
              <h4 className="font-semibold mb-3">Upload Documents</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {["milltc", "spectro", "ssb_inspection_report", "customer_approval"].map((key) => (
                  <div key={key} className="flex flex-col">
                    <label className="font-medium mb-1 capitalize">{key.replaceAll("_", " ")}</label>
                    <div className="flex gap-2">
                      {showDetails[key] ? (
                        <a href={getFileUrl(showDetails[key])} target="_blank" rel="noreferrer" className="bg-green-500 text-white px-3 py-2 rounded hover:bg-green-600 whitespace-nowrap">View Uploaded File</a>
                      ) : (
                        <input type="file" onChange={(e) => handleFileUpload(showDetails.uid, key, e.target.files[0])} className="border p-2 rounded flex-1" disabled={uploading} accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" />
                      )}
                    </div>
                    {uploading && <p className="text-sm text-blue-600 mt-1">Uploading...</p>}
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-6 border-t pt-4">
              <h4 className="font-semibold mb-3">Approval Status</h4>
              <select value={showDetails.approval_status || ""} onChange={(e) => handleApprovalChange(showDetails.uid, e.target.value)} className="border p-2 rounded w-full md:w-64">
                <option value="">Select Status</option>
                <option value="Under Inspection">Under Inspection</option>
                <option value="Hold">Hold</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </select>
              {hasFiles(showDetails) && <p className="text-sm text-gray-600 mt-2">Files have been uploaded. You can now update the approval status.</p>}
            </div>

            <div className="flex justify-end border-t pt-4">
              <button onClick={() => setShowDetails(null)} className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {exportModal && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl shadow-lg max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">Select Fields to Export</h3>

            {fields.length === 0 ? (
              <p className="text-gray-500">Loading fields...</p>
            ) : (
              <div className="grid grid-cols-2 gap-2 text-sm mb-4">
                {fields.map(({ name, label }) => (
                  <label key={name} className="flex items-center gap-2 border-b py-1">
                    <input type="checkbox" checked={selectedFields.includes(name)} onChange={() => toggleField(name)} className="accent-blue-600" />
                    {label}
                  </label>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button onClick={() => setExportModal(false)} className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600">Cancel</button>
              <button onClick={handleExport} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Export Selected</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RMReceivingPage;
