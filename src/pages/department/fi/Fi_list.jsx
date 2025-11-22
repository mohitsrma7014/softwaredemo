import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Filter, FileSpreadsheet } from "lucide-react";
import api from "../../services/service";

const Fi_list = () => {
  const [records, setRecords] = useState([]);
  const [filters, setFilters] = useState({
    batch_number: "",
    component: "",
    shift: "",
    chaker: "",
   
    date_from: "",
    date_to: "",
  });
  const [fields, setFields] = useState([]);
  const [selectedFields, setSelectedFields] = useState([]);
  const [selected, setSelected] = useState(null);
  const [exportModal, setExportModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showFilters, setShowFilters] = useState(true);
  const [pagination, setPagination] = useState({
    count: 0,
    next: null,
    previous: null,
    page: 1,
  });

  // ✅ Fetch model fields dynamically
  const fetchFields = async () => {
    try {
      const res = await api.get("/api/fi/fields/");
      const fieldList = res.data || [];
      setFields(fieldList);
      setSelectedFields(fieldList.map((f) => f.name));
    } catch (err) {
      console.error("Failed to fetch model fields", err);
    }
  };

  // ✅ Fetch paginated records
  const fetchRecords = async (page = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => value && params.append(key, value));
      params.append("page", page);

      const res = await api.get(`/api/fi/FiListAPIView/?${params.toString()}`);
      const data = res.data;

      setRecords(data.results || []);
      setPagination({
        count: data.count || 0,
        next: data.next,
        previous: data.previous,
        page,
      });
      setError("");
    } catch (err) {
      console.error(err);
      setError("Error fetching Forging data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFields();
    fetchRecords(1);
  }, []);

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchRecords(1);
  };

  const toggleField = (field) => {
    setSelectedFields((prev) =>
      prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field]
    );
  };

  const handleExport = async () => {
    if (selectedFields.length === 0) {
      alert("Please select at least one field to export.");
      return;
    }

    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => value && params.append(key, value));
    params.append("fields", selectedFields.join(","));

    try {
      const res = await api.get(`/api/fi/export/?${params.toString()}`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "fi_data.xlsx");
      document.body.appendChild(link);
      link.click();
      link.remove();
      setExportModal(false);
    } catch (err) {
      console.error("Export failed", err);
      alert("Export failed. Please try again.");
    }
  };

  const handlePageChange = (direction) => {
    if (direction === "next" && pagination.next) {
      fetchRecords(pagination.page + 1);
    } else if (direction === "previous" && pagination.previous) {
      fetchRecords(pagination.page - 1);
    }
  };

  return (
    <div className="p-2 bg-gray-50 min-h-screen">

      {/* 🔍 Filter Section */}
      <div className="bg-white border rounded-xl shadow-sm mb-2">
        <div
          className="flex justify-between items-center p-4 cursor-pointer border-b bg-gray-100 rounded-t-xl"
          onClick={() => setShowFilters(!showFilters)}
        >
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-700" />
            <h2 className="text-gray-800 font-medium">Filters</h2>
          </div>
          {showFilters ? (
            <ChevronUp className="w-5 h-5 text-gray-600" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-600" />
          )}
        </div>

        {showFilters && (
          <form
            onSubmit={handleSearch}
            className="p-4 bg-white space-y-3"
          >
            {/* 🔹 Filter fields */}
            <div className="grid grid-cols-6 gap-2">
              {Object.entries(filters).map(([key, value]) => (
                <input
                  key={key}
                  name={key}
                  type={key.includes("date") ? "date" : "text"}
                  placeholder={key.replaceAll("_", " ")}
                  value={value}
                  onChange={handleFilterChange}
                  className="p-2 border rounded focus:ring focus:ring-blue-200 text-sm"
                />
              ))}
            </div>

            {/* 🔹 Buttons row (left + right alignment) */}
            <div className="flex justify-between items-center pt-2">
              <button
                type="submit"
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
              >
                {loading ? "Loading..." : "Apply Filters"}
              </button>

              <button
                type="button"
                onClick={() => setExportModal(true)}
                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Export
              </button>
            </div>
          </form>
        )}

      </div>

      {error && <p className="text-red-500 mb-3">{error}</p>}

      {/* 📋 Data Table */}
      <div className="overflow-x-auto bg-white rounded-xl shadow-sm border relative max-h-[70vh] overflow-y-auto">
        {loading ? (
          <p className="text-center p-6 text-gray-600">Loading...</p>
        ) : records.length > 0 ? (
          <table className="w-full border-collapse text-sm">
            <thead className="bg-gray-100 text-gray-700 sticky top-0 z-10">
              <tr>
                <th className="p-3 border">Date</th>
                <th className="p-3 border">Shift</th>
                <th className="p-3 border">Batch</th>
                <th className="p-3 border">Component</th>
                <th className="p-3 border">Chaker</th>
                <th className="p-3 border">Production</th>
                <th className="p-3 border">Verified By</th>
                <th className="p-3 border">Action</th>
              </tr>
            </thead>
            <tbody>
              {records.map((item, i) => (
                <tr key={i} className="border-t hover:bg-gray-50 transition">
                  <td className="p-2 border text-center">{item.date}</td>
                  <td className="p-2 border text-center">{item.shift}</td>
                  <td className="p-2 border text-center">{item.batch_number}</td>
                  <td className="p-2 border">{item.component}</td>
                  <td className="p-2 border">{item.chaker}</td>
                  <td className="p-2 border text-center">{item.production}</td>
                  <td className="p-2 border text-center">{item.verified_by}</td>
                  <td className="p-2 border text-center">
                    <button
                      onClick={() => setSelected(item)}
                      className="text-blue-600 hover:text-blue-800 underline"
                    >
                      View
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

      {/* 🔸 Pagination */}
      {pagination.count > 0 && (
        <div className="flex justify-between items-center mt-4 text-sm">
          <p className="text-gray-600">
            Showing page {pagination.page} | Total: {pagination.count} records
          </p>
          <div className="flex gap-2">
            <button
              disabled={!pagination.previous}
              onClick={() => handlePageChange("previous")}
              className={`px-4 py-1 rounded border ${
                pagination.previous
                  ? "bg-gray-200 hover:bg-gray-300"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              }`}
            >
              Previous
            </button>
            <button
              disabled={!pagination.next}
              onClick={() => handlePageChange("next")}
              className={`px-4 py-1 rounded border ${
                pagination.next
                  ? "bg-gray-200 hover:bg-gray-300"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              }`}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* 🧾 Details Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
          <div className="bg-white rounded-lg p-6 w-1/2 shadow-lg relative max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4 border-b pb-2">
              Batch Details — {selected.batch_number}
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {Object.entries(selected).map(([key, value]) => (
                <div key={key} className="border-b pb-1">
                  <strong className="capitalize">{key.replaceAll("_", " ")}:</strong>{" "}
                  {String(value)}
                </div>
              ))}
            </div>
            <div className="text-right mt-4">
              <button
                onClick={() => setSelected(null)}
                className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🧩 Export Modal */}
      {exportModal && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
          <div className="bg-white rounded-lg p-6 w-1/2 shadow-lg max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">Select Fields to Export</h3>

            {fields.length === 0 ? (
              <p className="text-gray-500">Loading fields...</p>
            ) : (
              <div className="grid grid-cols-2 gap-2 text-sm mb-4">
                {fields.map(({ name, label }) => (
                  <label key={name} className="flex items-center gap-2 border-b py-1">
                    <input
                      type="checkbox"
                      checked={selectedFields.includes(name)}
                      onChange={() => toggleField(name)}
                      className="accent-blue-600"
                    />
                    {label}
                  </label>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setExportModal(false)}
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleExport}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Export Selected
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Fi_list;
