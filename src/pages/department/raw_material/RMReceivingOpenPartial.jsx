import { useEffect, useState, useMemo } from "react";
import api from "../../services/service";

export default function RMReceivingFIFO() {
  const [data, setData] = useState([]);
  const [usedRacks, setUsedRacks] = useState([]);
  const [missingRacks, setMissingRacks] = useState([]);

  const [filters, setFilters] = useState({
    supplier: "",
    grade: "",
    dia: "",
    customer: "",
    approval_status: "",   // ✅ NEW
    heatno: ""             // ✅ NEW
  });

  const [loading, setLoading] = useState(false);

  // Heat No LIVE Suggestions
  const [heatSuggestions, setHeatSuggestions] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      const json = await api.get("api/raw_material/rmreceiving/open-partial/");

      const payload = json.data ? json.data : json;

      if (!payload.rows || !Array.isArray(payload.rows)) {
        console.error("❌ API did NOT return rows as an array");
        setLoading(false);
        return;
      }

      setData(payload.rows);
      setUsedRacks(payload.used_racks || []);
      setMissingRacks(payload.missing_racks || []);

      setLoading(false);
    } catch (err) {
      console.error("Error fetching data:", err);
      setLoading(false);
    }
  };

  // 🔍 NEW: Heat search suggestions logic
  const handleHeatFilter = (text) => {
    setFilters({ ...filters, heatno: text });

    if (!text.trim()) {
      setHeatSuggestions([]);
      return;
    }

    const suggestions = Array.from(
      new Set(
        data
          .map((d) => d.heatno)
          .filter(
            (h) =>
              h &&
              h.toString().toLowerCase().includes(text.toLowerCase())
          )
      )
    );

    setHeatSuggestions(suggestions);
  };

  // FILTER LOGIC
  const filteredData = useMemo(() => {
    return data.filter((row) => {
      return (
        (filters.supplier ? row.supplier === filters.supplier : true) &&
        (filters.grade ? row.grade === filters.grade : true) &&
        (filters.dia ? row.dia === filters.dia : true) &&
        (filters.customer ? row.customer === filters.customer : true) &&
        
        // ✅ Approval Status Filter
        (filters.approval_status
          ? (row.approval_status || "").toLowerCase() ===
            filters.approval_status.toLowerCase()
          : true) &&

        // ✅ Heat No contains filter
        (filters.heatno
          ? row.heatno &&
            row.heatno.toString().toLowerCase().includes(filters.heatno.toLowerCase())
          : true)
      );
    });
  }, [data, filters]);

  // KPI Numbers
  const totalRows = filteredData.length;
  const totalRM = filteredData.reduce(
    (sum, r) => sum + Number(r.remaining || 0),
    0
  );

  const underInspectionCount = filteredData.filter(
    (r) => (r.approval_status || "").toLowerCase() === "under inspection"
  ).length;

  const holdCount = filteredData.filter(
    (r) => (r.approval_status || "").toLowerCase() === "hold"
  ).length;

  const rejectedCount = filteredData.filter(
    (r) => (r.approval_status || "").toLowerCase() === "rejected"
  ).length;

  return (
    <div className="p-6 bg-gray-50 min-h-screen">

      {/* FILTERS */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">

        {/* AUTO DROPDOWN FILTERS */}
        {["supplier", "grade", "dia", "customer"].map((key) => (
          <select
            key={key}
            value={filters[key]}
            onChange={(e) =>
              setFilters({ ...filters, [key]: e.target.value })
            }
            className="p-2 bg-white shadow rounded"
          >
            <option value="">{key.toUpperCase()}</option>
            {Array.from(new Set(data.map((d) => d[key]))).map(
              (v, i) => v && <option key={i}>{v}</option>
            )}
          </select>
        ))}

        {/* ✅ NEW APPROVAL FILTER */}
        <select
          value={filters.approval_status}
          onChange={(e) =>
            setFilters({ ...filters, approval_status: e.target.value })
          }
          className="p-2 bg-white shadow rounded"
        >
          <option value="">APPROVAL STATUS</option>
          <option value="Under Inspection">Under Inspection</option>
          <option value="Hold">Hold</option>
          <option value="Rejected">Rejected</option>
          <option value="Approved">Approved</option>
        </select>
         <div className=" relative">
        <input
          type="text"
          value={filters.heatno}
          onChange={(e) => handleHeatFilter(e.target.value)}
          placeholder="Search Heat No..."
          className="p-2 border rounded w-full bg-white shadow"
        />

        {/* Suggestions */}
        {heatSuggestions.length > 0 && filters.heatno && (
          <div className="absolute bg-white border shadow rounded w-full mt-1 z-50">
            {heatSuggestions.map((s, i) => (
              <p
                key={i}
                className="p-2 hover:bg-gray-100 cursor-pointer"
                onClick={() => {
                  setFilters({ ...filters, heatno: s });
                  setHeatSuggestions([]);
                }}
              >
                {s}
              </p>
            ))}
          </div>
        )}
      </div>
      </div>

      {/* 🔍 NEW HEAT FILTER */}
     

      {/* KPI SECTION */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 mb-6">
        <KpiCard title="Total Rows" value={totalRows} color="bg-blue-600" />
<KpiCard 
  title="Total Available RM" 
  value={`${(totalRM / 1000).toFixed(2)} ton`} 
  color="bg-green-600"
/>

        <KpiCard title="Under Inspection" value={underInspectionCount} color="bg-orange-500" />
        <KpiCard title="Hold" value={holdCount} color="bg-yellow-500" />
        <KpiCard title="Rejected" value={rejectedCount} color="bg-red-500" />
      </div>

     {/* TABLE */}
<div className="overflow-x-auto max-h-[70vh]">
  <table className="min-w-full bg-white rounded shadow text-center">
    <thead className="bg-gray-200 text-gray-700 sticky top-0 z-10">
      <tr>
        <th className="px-4 py-2">Date</th>
        <th className="px-4 py-2">Supplier</th>
        <th className="px-4 py-2">Customer</th>
        <th className="px-4 py-2">Grade</th>
        <th className="px-4 py-2">Dia</th>
        <th className="px-4 py-2">Heat No</th>
        <th className="px-4 py-2">Rack No</th>
        <th className="px-4 py-2">Approval</th>
        <th className="px-4 py-2">Receiving</th>
        <th className="px-4 py-2">Remaining</th>
     
        <th className="px-4 py-2">FIFO</th>
      </tr>
    </thead>

    <tbody>
      {loading ? (
        <tr>
          <td colSpan="13" className="p-4">Loading...</td>
        </tr>
      ) : filteredData.length === 0 ? (
        <tr>
          <td colSpan="13" className="p-4">No data found</td>
        </tr>
      ) : (
        filteredData.map((row, index) => (
          <tr key={index} className="border-b hover:bg-gray-100">

            {/* DATE */}
            <td className="px-4 py-2">{row.date}</td>

            {/* SUPPLIER */}
            <td className="px-4 py-2 truncate max-w-[120px]" title={row.supplier}>
              {row.supplier}
            </td>

            {/* CUSTOMER */}
            <td className="px-4 py-2 truncate max-w-[120px]" title={row.customer}>
              {row.customer}
            </td>

            {/* GRADE */}
            <td className="px-4 py-2 truncate max-w-[120px]" title={row.grade}>
              {row.grade}
            </td>

            {/* DIA */}
            <td className="px-4 py-2">{row.dia}</td>

            {/* HEAT NO – SHOW ... IF LONG */}
            <td className="px-4 py-2 truncate max-w-[120px]" title={row.heatno}>
              {row.heatno}
            </td>

            {/* RACK */}
            <td className="px-4 py-2">{row.rack_no}</td>

            {/* APPROVAL STATUS */}
            <td className="px-4 py-2">
              <span
                className={`px-2 py-1 rounded text-white text-xs ${
                  (row.approval_status || "").toLowerCase() === "rejected"
                    ? "bg-red-500"
                    : (row.approval_status || "").toLowerCase() === "under inspection"
                    ? "bg-orange-500"
                    : (row.approval_status || "").toLowerCase() === "hold"
                    ? "bg-yellow-500"
                    : "bg-green-600"
                }`}
              >
                {row.approval_status || "-"}
              </span>
            </td>

            {/* RECEIVING */}
            <td className="px-4 py-2">{row.reciving_weight_kg}</td>

            {/* REMAINING */}
            <td className="px-4 py-2">{row.remaining}</td>

         

            {/* FIFO */}
            <td className="px-4 py-2">{row.fifo_number}</td>

          </tr>
        ))
      )}
    </tbody>
  </table>
</div>

    </div>
  );
}

function KpiCard({ title, value, color }) {
  return (
    <div className={`shadow rounded p-4 text-center text-white font-semibold text-lg ${color}`}>
      <p>{title}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}
