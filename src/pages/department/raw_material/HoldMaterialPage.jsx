import { useEffect, useState } from "react";
import api from "../../services/service";

const HoldMaterialPage = () => {
  const [suggestions, setSuggestions] = useState([]);
  const [rmReceivingList, setRMReceivingList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    batch_id: "",
    component: "",
    customer: "",
    supplier: "",
    grade: "",
    standerd: "",
    heatno: "",
    dia: "",
    rack_no: "",
    pieces: "",
    hold_material_qty_kg: "",
    line: "",
    verified_by: "",
    remaining_reference: "",
    slug_weight: "",
  });

  // 🧩 Auto-fill verified_by from localStorage user
  useEffect(() => {
    try {
      const storedUser = JSON.parse(localStorage.getItem("user"));
      if (storedUser && storedUser.first_name && storedUser.last_name) {
        setForm((prev) => ({
          ...prev,
          verified_by: `${storedUser.first_name} ${storedUser.last_name}`,
        }));
      } else {
        setError("Please login first — user info not found.");
      }
    } catch {
      setError("Error reading user data from local storage.");
    }
  }, []);

  // 🔍 Handle component input change + fetch suggestions
  const handleComponentChange = async (e) => {
    const value = e.target.value;
    setForm((prev) => ({ ...prev, component: value }));

    if (value.length > 1) {
      try {
        const res = await api.get(
          `/api/raw_material/masterlist/suggestions/?q=${value}`
        );
        setSuggestions(res.data);
      } catch {
        setSuggestions([]);
      }
    } else {
      setSuggestions([]);
    }
  };

  // 🧠 Handle suggestion select → fetch component & RMReceiving details
  const handleSelectComponent = async (component) => {
    setForm((prev) => ({ ...prev, component }));
    setSuggestions([]);
    setError("");

    try {
      const res = await api.get(
        `/api/raw_material/masterlist/details/?component=${component}`
      );
      const compDetails = res.data;

      const rmRes = await api.get(
        `/api/raw_material/rmreceiving/filter/?grade=${compDetails.grade}&dia=${compDetails.dia}&supplier=${compDetails.supplier}&customer=${compDetails.customer}`
      );
      const rmList = rmRes.data || [];
      setRMReceivingList(rmList);

      if (rmList.length > 0) {
        const firstRM = rmList[0];
        setForm((prev) => ({
          ...prev,
          rm_receiving: firstRM.id,
          grade: firstRM.grade || "",
          dia: firstRM.dia || "",
          standerd: firstRM.standerd || "",
          supplier: firstRM.supplier || "",
          rack_no: firstRM.rack_no || "",
          heatno: firstRM.heatno || "",
          customer: firstRM.customer || compDetails.customer || "",
          remaining_reference: firstRM.remaining || "",
          slug_weight: compDetails.slug_weight || firstRM.slug_weight || 0,
        }));
      } else {
        setError("No matching RMReceiving records found for this component.");
      }
    } catch {
      setError("Failed to fetch component or RMReceiving details.");
    }
  };

  // 🧮 Validate hold qty — cannot exceed remaining_reference
  const handleHoldQtyChange = (e) => {
    const value = e.target.value;
    const remaining = parseFloat(form.remaining_reference || 0);

    if (parseFloat(value) > remaining) {
      setError(`Hold weight cannot exceed remaining weight (${remaining} kg).`);
    } else {
      setError("");
    }

    setForm((prev) => ({ ...prev, hold_material_qty_kg: value }));
  };

  // 💾 Submit new Hold Material record
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.verified_by) {
      setError("User not verified. Please login first.");
      return;
    }

    if (parseFloat(form.hold_material_qty_kg) > parseFloat(form.remaining_reference)) {
      setError("Hold weight exceeds remaining reference weight.");
      return;
    }

    try {
      setLoading(true);
      await api.post("/api/raw_material/holdmaterial/", form);

      setForm((prev) => ({
        batch_id: "",
        component: "",
        customer: "",
        supplier: "",
        grade: "",
        standerd: "",
        heatno: "",
        dia: "",
        rack_no: "",
        pieces: "",
        hold_material_qty_kg: "",
        line: "",
        verified_by: prev.verified_by,
        remaining_reference: "",
        slug_weight: "",
      }));

      setRMReceivingList([]);
      setError("");
    } catch {
      setError("Error creating Hold Material record.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">Hold Material Form</h2>

      {/* 🧾 Form Section */}
      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-3 gap-3 bg-gray-100 p-4 rounded-lg relative"
      >
        {/* Component Input */}
        <div className="relative col-span-1">
          <input
            placeholder="Component"
            value={form.component}
            onChange={handleComponentChange}
            className="p-2 border rounded w-full"
            required
          />
          {/* Suggestion Dropdown */}
          {suggestions.length > 0 && (
            <ul className="absolute bg-white border rounded mt-1 z-20 w-full max-h-40 overflow-y-auto shadow-md">
              {suggestions.map((s, i) => (
                <li
                  key={i}
                  onClick={() => handleSelectComponent(s)}
                  className="p-2 hover:bg-gray-200 cursor-pointer"
                >
                  {s}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Other Inputs */}
        {[
          "grade",
          "dia",
          "standerd",
          "supplier",
          "rack_no",
          "heatno",
          "customer",
          "slug_weight",
          "pieces",
          "hold_material_qty_kg",
          "line",
          "verified_by",
        ].map((key) => (
          <input
            key={key}
            type={key === "hold_material_qty_kg" ? "number" : "text"}
            placeholder={key.replaceAll("_", " ")}
            value={form[key]}
            onChange={
              key === "hold_material_qty_kg"
                ? handleHoldQtyChange
                : (e) => setForm({ ...form, [key]: e.target.value })
            }
            className={`p-2 border rounded ${
              key === "verified_by" ? "bg-gray-200 cursor-not-allowed" : ""
            }`}
            required={key !== "verified_by" && key !== "pieces"}
            readOnly={
              [
                "grade",
                "dia",
                "standerd",
                "supplier",
                "rack_no",
                "heatno",
                "customer",
                "verified_by",
              ].includes(key)
            }
          />
        ))}

        {/* Remaining Reference (read-only display) */}
        <div className="col-span-3 text-gray-700 font-semibold">
          Remaining Weight Reference:{" "}
          <span className="text-blue-700">{form.remaining_reference || "N/A"} kg</span>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="bg-green-600 text-white p-2 rounded col-span-3 hover:bg-green-700 transition-all"
        >
          {loading ? "Saving..." : "Add Hold Material"}
        </button>
      </form>

      {/* 🔴 Error Display */}
      {error && <p className="text-red-500 mt-3">{error}</p>}
    </div>
  );
};

export default HoldMaterialPage;
