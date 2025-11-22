import React, { useState, useEffect } from "react";
import axios from "axios";
import api,{ BASE_URL } from "../../services/service";
import { useAuth } from "../../../context/AuthContext";


const Heat_Treatment_Prodction_Sheet = () => {
  const [date, setDate] = useState("");
  const [verifiedBy, setVerifiedBy] = useState("");
  const [rows, setRows] = useState([
    {
      shift: "",
      batch_number: "",
      component: "",
      heat_no: "",
      ringweight: "",
      furnace: "",
      process: "",
      supervisor: "",
      operator: "",
      target: "",
      total_produced: "",
      production: "",
      cycle_time: "",
      unit: "",
      hardness: "",
      remark: "",
    },
  ]);
  const [rowSuggestions, setRowSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [furnaceUnits, setFurnaceUnits] = useState({}); // Store total units for each furnace-shift combination
  const shiftOptions = ["DAY", "NIGHT"];
  const lineOptions = [
    "Pusher Furnace-01", 
    "Pusher Furnace-02", 
    "Annealing Furnace", 
    "Coneyor Type Normalizing Furnace(N1)", 
    "Coneyor Type Normalizing Furnace(N2)", 
    "Coneyor Type Normalizing Furnace(N3)", 
    "Silver-EX", 
    "Lopan"
  ];
  const formanOptions = ["Jitendra Kumar Chodhary"];
  const lineInchargeOptions = ["Normalize", "Iso Thermal", "H&T", "Annelling"];

  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const toggleSidebar = () => setIsSidebarVisible(!isSidebarVisible);
  const pageTitle = "Add Heat Treatment Data";

  // Calculate and distribute units based on production ratio
  const calculateUnits = () => {
    const furnaceShiftMap = {};
    
    // Group rows by furnace and shift
    rows.forEach(row => {
      if (row.furnace && row.shift) {
        const key = `${row.furnace}-${row.shift}`;
        if (!furnaceShiftMap[key]) {
          furnaceShiftMap[key] = [];
        }
        furnaceShiftMap[key].push(row);
      }
    });
    
    // Process each furnace-shift group
    Object.keys(furnaceShiftMap).forEach(key => {
      const groupRows = furnaceShiftMap[key];
      const totalUnit = furnaceUnits[key] || 0;
      
      // Calculate total production in kg
      let totalProductionKg = 0;
      const productionData = [];
      
      groupRows.forEach(row => {
        const ringWeight = parseFloat(row.ringweight) || 0;
        const production = parseFloat(row.production) || 0;
        const productionKg = ringWeight * production;
        totalProductionKg += productionKg;
        productionData.push({
          index: rows.indexOf(row),
          productionKg,
          ringWeight,
          production
        });
      });
      
      // Distribute units based on ratio if we have a total unit value
      if (totalUnit > 0 && totalProductionKg > 0) {
        productionData.forEach(data => {
          const ratio = data.productionKg / totalProductionKg;
          const calculatedUnit = (totalUnit * ratio).toFixed(2);
          
          setRows(prevRows => {
            const updatedRows = [...prevRows];
            updatedRows[data.index].unit = calculatedUnit;
            return updatedRows;
          });
        });
      }
    });
  };

  // Handle furnace unit input change
  const handleFurnaceUnitChange = (furnace, shift, value) => {
    const key = `${furnace}-${shift}`;
    setFurnaceUnits(prev => ({
      ...prev,
      [key]: parseFloat(value) || 0
    }));
  };

  // Get furnace unit value
  const getFurnaceUnit = (furnace, shift) => {
    const key = `${furnace}-${shift}`;
    return furnaceUnits[key] || "";
  };

  // Recalculate units whenever relevant data changes
  useEffect(() => {
    calculateUnits();
  }, [rows, furnaceUnits]);

  const fetchComponentSuggestions = async (query, index) => {
  if (!query) {
    setRowSuggestions((prevSuggestions) => {
      const newSuggestions = [...prevSuggestions];
      newSuggestions[index] = [];
      return newSuggestions;
    });
    return;
  }

  setLoadingSuggestions(true);
  try {
    const response = await api.get(
      `${BASE_URL}api/raw_material/issuebatch/suggestions/?q=${query}` // updated param name
    );

    // response.data now contains objects like { batch_id: "PP-20251104-ZF-12" }
    setRowSuggestions((prevSuggestions) => {
      const newSuggestions = [...prevSuggestions];
      newSuggestions[index] = response.data.map(item => item.batch_id); // store only batch strings
      return newSuggestions;
    });
  } catch (error) {
    console.error("Error fetching component suggestions:", error);
  } finally {
    setLoadingSuggestions(false);
  }
};
  const fetchPartDetails = async (batch_number, index) => {
    try {
      const partDetailsResponse = await api.get(`${BASE_URL}api/raw_material/batch_details/?batch_id=${batch_number}`);
      const partData = partDetailsResponse.data;

      const targetDetailsResponse = await api.get(
                      `${BASE_URL}api/raw_material/batch_remaining_qty_heat_treatment/?batch_id=${batch_number}&current_department=Heat Treatment`
                    );
            const targetData = targetDetailsResponse.data.total_received || 0;
            const targetData1 = targetDetailsResponse.data.prodction_enterd || 0;

      setRows((prevRows) => {
        const updatedRows = [...prevRows];
        updatedRows[index] = {
          ...updatedRows[index],
          component: partData.component || "",
          heat_no: partData.heat_no || "",
          target: targetData || "",
          total_produced: targetData1 || "",
        };
        return updatedRows;
      });

      setRowSuggestions((prevSuggestions) => {
        const newSuggestions = [...prevSuggestions];
        newSuggestions[index] = [];
        return newSuggestions;
      });
    } catch (error) {
      console.error("Error fetching part details or target details:", error);
      alert("Please enter a correct batch number.");
      setRows((prevRows) => {
        const updatedRows = [...prevRows];
        updatedRows[index] = {
          ...updatedRows[index],
          batch_number: "",
          component: "",
          heat_no: "",
          target: "",
          total_produced: "",
        };
        return updatedRows;
      });
      setRowSuggestions((prevSuggestions) => {
        const newSuggestions = [...prevSuggestions];
        newSuggestions[index] = [];
        return newSuggestions;
      });
    }
  };

  const handleRowChange = (index, field, value, skipSuggestions = false) => {

    const readOnlyFields = ["component", "heat_no", "total_produced", "target"];
    if (readOnlyFields.includes(field)) {
      return;
    }

    if (field === "production") {
      const currentRow = rows[index];
      const totalProduction = parseFloat(currentRow.total_produced) || 0;
      const target = parseFloat(currentRow.target) || 0;
      const production = parseFloat(value) || 0;
      const productionLimit = target - totalProduction ;

      if (production > productionLimit) {
        alert("Production cannot exceed Forging Production.");
        return;
      }
    }

    const updatedRows = [...rows];
    updatedRows[index][field] = value;
    setRows(updatedRows);

    if (field === "batch_number" && value && !skipSuggestions) {
  fetchComponentSuggestions(value, index);
}

  };

  const handleSelectSuggestion = (index, suggestion) => {
   handleRowChange(index, "batch_number", suggestion, true);

    fetchPartDetails(suggestion, index);
  };

  const addRow = () => {
    setRows([
      ...rows,
      {
        shift: "",
        batch_number: "",
        component: "",
        heat_no: "",
        ringweight: "",
        furnace: "",
        process: "",
        supervisor: "",
        operator: "",
        target: "",
        total_produced: "",
        production: "",
        cycle_time: "",
        unit: "",
        hardness: "",
        remark: "",
      },
    ]);
    setRowSuggestions([...rowSuggestions, []]);
  };

  const removeRow = (index) => {
    setRows(rows.filter((_, i) => i !== index));
    setRowSuggestions(rowSuggestions.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row.furnace || !row.process || !row.supervisor || !row.operator || !row.production || !row.cycle_time || !row.unit) {
        alert(`Please fill in all required fields for row ${i + 1}.`);
        return;
      }
    }

    const updatedRows = rows.map((row) => ({
      ...row,
      remark: row.remark || "Na",
      total_produced: row.total_produced || 0,
    }));

    if (!date) {
      alert("Please fill in the date and shift fields.");
      return;
    }

    const dataToSubmit = updatedRows.map(({ total_production, ...row }) => ({
      ...row,
      date,
      verified_by: verifiedBy,
    }));

    try {
      await api.post(
        `${BASE_URL}api/heat_treatment/bulk-add/`,
        dataToSubmit
      );
      alert("Data submitted successfully!");
      setTimeout(() => {
        window.location.reload();
      }, 2);
    } catch (error) {
      console.error("Error submitting data:", error);
      alert("Failed to submit data.");
    }
  };

  const { user } = useAuth();
  
  useEffect(() => {
    if (user) {
      setVerifiedBy(`${user.first_name} ${user.last_name}`);
    }
  }, [user]);

   

  // Get unique furnace-shift combinations
  const getFurnaceShiftCombinations = () => {
    const combinations = {};
    rows.forEach(row => {
      if (row.furnace && row.shift) {
        const key = `${row.furnace}-${row.shift}`;
        combinations[key] = { furnace: row.furnace, shift: row.shift };
      }
    });
    return Object.values(combinations);
  };

  return (
    <div className="flex flex-col p-3">
      <form onSubmit={handleSubmit}>
        <div className="mb-6 flex space-x-4">
          <div className="flex-.5">
            <label className="block text-sm font-medium text-gray-600 mb-1">Date:</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full px-1 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex-.5">
            <label className="block text-sm font-medium text-gray-600 mb-1">Verified By:</label>
            <input
              type="text"
              value={verifiedBy}
              readOnly
              className="w-full px-1 py-1 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
            />
          </div>
        </div>

        {/* Furnace Unit Inputs */}
        <div className="mb-4">
          <h3 className="text-lg font-medium text-gray-700 mb-2">Furnace Unit Consumption</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {getFurnaceShiftCombinations().map((combo, index) => (
              <div key={index} className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-600">
                  {combo.furnace} ({combo.shift}):
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={getFurnaceUnit(combo.furnace, combo.shift)}
                  onChange={(e) => handleFurnaceUnitChange(combo.furnace, combo.shift, e.target.value)}
                  className="w-24 px-2 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Total Units"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto mb-6" style={{ maxHeight: "calc(100vh - 200px)", maxWidth: "100vw" }}>
          <table className="table-auto border-collapse min-w-full table-layout-auto">
            <thead>
              <tr className="bg-gray-100">
                <th className="min-w-[150px] text-left text-sm text-gray-600">Shift</th>
                <th className="min-w-[150px] text-left text-sm text-gray-600">Batch Number</th>
                <th className="min-w-[125px] text-left text-sm text-gray-600">Component</th>
                <th className="min-w-[90px] text-left text-sm text-gray-600">Heat-No.</th>
                <th className="min-w-[75px] text-left text-sm text-gray-600">Ring Weight</th>
                <th className="min-w-[125px] text-left text-sm text-gray-600">Furnace</th>
                <th className="min-w-[90px] text-left text-sm text-gray-600">Process</th>
                <th className="min-w-[125px] text-left text-sm text-gray-600">Supervisor</th>
                <th className="min-w-[125px] text-left text-sm text-gray-600">Operator</th>
                <th className="min-w-[75px] text-left text-sm text-gray-600">Target</th>
                <th className="min-w-[75px] text-left text-sm text-gray-600">Previous Production</th>
                <th className="min-w-[75px] text-left text-sm text-gray-600">Production</th>
                <th className="min-w-[75px] text-left text-sm text-gray-600">Cycle Time</th>
                <th className="min-w-[75px] text-left text-sm text-gray-600">Unit</th>
                <th className="min-w-[50px] text-left text-sm text-gray-600">Hardness</th>
                <th className="min-w-[125px] text-left text-sm text-gray-600">Remark</th>
                <th className="text-left text-sm text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={index} className="border-b hover:bg-gray-50">
                  <td>
                    <select
                      value={row.shift}
                      onChange={(e) => handleRowChange(index, "shift", e.target.value)}
                      className="w-full py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="" disabled>Select shift</option>
                      {shiftOptions.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      type="text"
                      value={row.batch_number}
                      onChange={(e) => handleRowChange(index, "batch_number", e.target.value)}
                      className="w-full px-1 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {rowSuggestions[index] && rowSuggestions[index].length > 0 && (
                      <ul className="absolute bg-white border border-gray-300 mt-1 w-[170px] max-h-40 overflow-y-auto z-10">
                        {rowSuggestions[index].map((suggestion, i) => (
                          <li
                            key={i}
                            onClick={() => handleSelectSuggestion(index, suggestion)}
                            className="py-2 cursor-pointer hover:bg-gray-100"
                          >
                            {suggestion}
                          </li>
                        ))}
                      </ul>
                    )}
                  </td>
                  <td>
                    <input
                      type="text"
                      value={row.component}
                      readOnly
                      className="w-full px-1 py-1 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={row.heat_no}
                      readOnly
                      className="w-full px-1 py-1 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      step="0.01"
                      value={row.ringweight}
                      onChange={(e) => handleRowChange(index, "ringweight", e.target.value)}
                      className="w-full px-1 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </td>
                  <td>
                    <select
                      value={row.furnace}
                      onChange={(e) => handleRowChange(index, "furnace", e.target.value)}
                      className="w-full py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="" disabled>Select furnace</option>
                      {lineOptions.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select
                      value={row.process}
                      onChange={(e) => handleRowChange(index, "process", e.target.value)}
                      className="w-full py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="" disabled>Select process</option>
                      {lineInchargeOptions.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select
                      value={row.supervisor}
                      onChange={(e) => handleRowChange(index, "supervisor", e.target.value)}
                      className="w-full py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="" disabled>Select supervisor</option>
                      {formanOptions.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      type="text"
                      value={row.operator}
                      onChange={(e) => handleRowChange(index, "operator", e.target.value)}
                      className="w-full px-1 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      value={row.target}
                      readOnly
                      className="w-full px-1 py-1 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      value={row.total_produced}
                      readOnly
                      className="w-full px-1 py-1 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      value={row.production}
                      onChange={(e) => handleRowChange(index, "production", e.target.value)}
                      className="w-full px-1 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      step="0.01"
                      value={row.cycle_time}
                      onChange={(e) => handleRowChange(index, "cycle_time", e.target.value)}
                      className="w-full px-1 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      step="0.01"
                      value={row.unit}
                      readOnly
                      className="w-full px-1 py-1 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      step="0.01"
                      value={row.hardness}
                      onChange={(e) => handleRowChange(index, "hardness", e.target.value)}
                      className="w-full px-1 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={row.remark}
                      onChange={(e) => handleRowChange(index, "remark", e.target.value)}
                      className="w-full px-1 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-4 py-2 text-center">
                    <button
                      type="button"
                      onClick={() => removeRow(index)}
                      className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-between">
          <button
            type="button"
            onClick={addRow}
            className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600"
          >
            Add Row
          </button>
          <button
            type="submit"
            className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600"
          >
            Submit
          </button>
        </div>
      </form>
    </div>
  );
};

export default Heat_Treatment_Prodction_Sheet;