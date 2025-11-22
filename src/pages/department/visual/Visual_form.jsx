import React, { useState, useEffect } from "react";
import axios from "axios";
import api,{ BASE_URL } from "../../services/service";
import { useAuth } from "../../../context/AuthContext";

const Visual_form = () => {
  const [date, setDate] = useState("");
  const [shift, setShift] = useState("");
    const [activeRow, setActiveRow] = useState(null);
  
  const [verifiedBy, setVerifiedBy] = useState("");
  const [rows, setRows] = useState([
    {
      batch_number: "",
      component: "",
      heat_no: "",
      chaker: "",
      chaker1: "",
      target1: "",
      total_produced:"",
      target: "",
      production: "",
      remark: "",
      marking: "",
      cnc_height: "",
      cnc_od: "",
      cnc_bore: "",
      cnc_groove: "",
      cnc_dent: "",
      cnc_rust:"",
      forging_height: "",
      forging_od: "",
      forging_bore: "",
      forging_crack: "",
      forging_dent: "",
      pre_mc_height: "",
      pre_mc_od: "",
      pre_mc_bore: "",
      rework_height: "",
      rework_od: "",
      rework_bore: "",
      rework_groove: "",
      rework_dent: "",
    
      
    },
  ]);
  const [rowSuggestions, setRowSuggestions] = useState([]); // To store suggestions for each row
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const shiftOptions = ["DAY", "NIGHT"]; // Dropdown options for shift
  const lineOptions = ["HAMMER1", "HAMMER2", "FFL", "NHF-1000", "1600 TON", "A-SET", "W-SET"]; // Dropdown options for line
  const formanOptions = ["Jitendra", "Ram", "Shambhu","Rajkumar"]; // Dropdown options for forman
  const lineInchargeOptions = ["Santosh", "Devendra", "Rahul","Neeraj","Somveer","Lal Chand"];
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const [componentSuggestions, setComponentSuggestions] = useState([]);
      const [childComponentOptions, setChildComponentOptions] = useState([]);

const [highlightedIndices, setHighlightedIndices] = useState({
    batch: rows.map(() => -1),
    component: rows.map(() => -1)
  });



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
            `${BASE_URL}api/raw_material/batch_remaining_qty_visual/?batch_id=${batch_number}&current_department=Visual`
          );
          const targetData = targetDetailsResponse.data.total_received || 0;
          const targetData1 = targetDetailsResponse.data.total_entered || 0;
    
          let childComponents = [];
          try {
            const childRes = await api.get(
              `${BASE_URL}api/raw_material/get_child_components/?parent_component=${partData.component}`
            );
            childComponents = childRes.data || [];
          } catch (err) {
            console.error("Error fetching child components:", err);
          }
    
          setRows((prevRows) => {
            const updatedRows = [...prevRows];
            updatedRows[index] = {
              ...updatedRows[index],
              component:
                childComponents.length === 1
                  ? childComponents[0]
                  : partData.component || "",
              heat_no: partData.heat_no || "",
              target1: targetData || "",
              total_produced: targetData1 || "",
            };
            return updatedRows;
          });
    
          setChildComponentOptions((prev) => {
            const newOptions = [...prev];
            newOptions[index] = childComponents;
            return newOptions;
          });
    
          setRowSuggestions((prevSuggestions) => {
            const newSuggestions = [...prevSuggestions];
            newSuggestions[index] = [];
            return newSuggestions;
          });
        } catch (error) {
          console.error("Error fetching batch or target details:", error);
          alert("Please enter a correct batch number.");
    
          setRows((prevRows) => {
            const updatedRows = [...prevRows];
            updatedRows[index] = {
              ...updatedRows[index],
              batch_number: "",
              component: "",
              heat_no: "",
              target1: "",
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
    // Define fields that should be read-only
    const readOnlyFields = ["heat_no","total_produced","target1"];
  
    // Prevent updating read-only fields
    if (readOnlyFields.includes(field)) {
      return;
    }
    if (field === "component" && value) {
      fetchComponentSuggestionss(value, index);
    }

     
    // Validate the 'production' field
    if (field === "production") {
      const currentRow = rows[index];
      const totalProduction = parseFloat(currentRow.total_produced) || 0;
      const target = parseFloat(currentRow.target1) || 0;
      const production = parseFloat(value) || 0;
      const productionLimit = target - totalProduction;

      // Check if production exceeds the sum of target + total_production
      if (production > productionLimit) {
        alert("Production cannot exceed .");
        return;
      }
    }
  
    const updatedRows = [...rows];
    updatedRows[index][field] = value;
    setRows(updatedRows);
  
    // Only fetch suggestions when 'batch_number' field changes
    if (field === "batch_number" && value && !skipSuggestions) {
      fetchComponentSuggestions(value, index);
    }
  };
  
  const handleKeyDown = (event, index, field) => {
    const suggestions = field === 'batch_number' 
      ? rowSuggestions[index] 
      : componentSuggestions[index];
    
    if (suggestions && suggestions.length > 0) {
      const currentHighlighted = highlightedIndices[field === 'batch_number' ? 'batch' : 'component'][index];
      
      if (event.key === "ArrowDown") {
        setHighlightedIndices(prev => ({
          ...prev,
          [field === 'batch_number' ? 'batch' : 'component']: prev[field === 'batch_number' ? 'batch' : 'component'].map((item, i) => 
            i === index 
              ? (item < suggestions.length - 1 ? item + 1 : 0)
              : item
          )
        }));
        event.preventDefault();
      } else if (event.key === "ArrowUp") {
        setHighlightedIndices(prev => ({
          ...prev,
          [field === 'batch_number' ? 'batch' : 'component']: prev[field === 'batch_number' ? 'batch' : 'component'].map((item, i) => 
            i === index 
              ? (item > 0 ? item - 1 : suggestions.length - 1)
              : item
          )
        }));
        event.preventDefault();
      } else if (event.key === "Enter") {
        if (currentHighlighted >= 0) {
          if (field === 'batch_number') {
            handleSelectSuggestion(index, suggestions[currentHighlighted]);
          } else {
            handleSelectComponent(index, suggestions[currentHighlighted]);
          }
          setHighlightedIndices(prev => ({
            ...prev,
            [field === 'batch_number' ? 'batch' : 'component']: prev[field === 'batch_number' ? 'batch' : 'component'].map((item, i) => 
              i === index ? -1 : item
            )
          }));
          event.preventDefault();
        }
      }
    }
  };
  
  const handleSelectSuggestion = (index, suggestion) => {
    handleRowChange(index, "batch_number", suggestion, true);
    fetchPartDetails(suggestion, index);
    setRowSuggestions(prevSuggestions => {
      const newSuggestions = [...prevSuggestions];
      newSuggestions[index] = [];
      return newSuggestions;
    });
    setHighlightedIndices(prev => ({
      ...prev,
      batch: prev.batch.map((item, i) => i === index ? -1 : item)
    }));
  };

  const handleSelectComponent = (index, suggestion) => {
    setRows(prevRows => {
      const updatedRows = [...prevRows];
      updatedRows[index].component = suggestion;
      return updatedRows;
    });
    setComponentSuggestions(prev => {
      const newSuggestions = [...prev];
      newSuggestions[index] = [];
      return newSuggestions;
    });
    setHighlightedIndices(prev => ({
      ...prev,
      component: prev.component.map((item, i) => i === index ? -1 : item)
    }));
  };


  const addRow = () => {
    setRows([
      ...rows,
      {
        batch_number: "",
      component: "",
      heat_no: "",
      chaker: "",
      chaker1: "",
      target1: "",
      total_produced:"",
      target: "",
      
      production: "",
      remark: "",
      marking: "",
      cnc_height: "",
      cnc_od: "",
      cnc_bore: "",
      cnc_groove: "",
      cnc_dent: "",
      cnc_rust: "",
      forging_height: "",
      forging_od: "",
      forging_bore: "",
      forging_crack: "",
      forging_dent: "",
      pre_mc_height: "",
      pre_mc_od: "",
      pre_mc_bore: "",
      rework_height: "",
      rework_od: "",
      rework_bore: "",
      rework_groove: "",
      rework_dent: "",
      },
    ]);
    setRowSuggestions([...rowSuggestions, []]);
    setComponentSuggestions([...componentSuggestions, []]);
    setHighlightedIndices(prev => ({
      batch: [...prev.batch, -1],
      component: [...prev.component, -1]
    }));
  };

  const removeRow = (index) => {
    setRows(rows.filter((_, i) => i !== index));
    setRowSuggestions(rowSuggestions.filter((_, i) => i !== index)); // Remove the suggestions for the deleted row
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation for required fields (line, line_incharge, and forman)
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row.chaker   ) {
        alert(`Please fill in all required fields for row ${i + 1}.`);
        return;
      }
    }

    // Automatically set missing values to 0
    const updatedRows = rows.map((row) => ({
      ...row,
      remark: row.remark || "Na",
      marking: row.marking || 0,
      total_produced: row.total_produced || 0,
      cnc_height: row.cnc_height || 0,
      cnc_od: row.cnc_od || 0,
      cnc_bore: row.cnc_bore || 0,
      cnc_groove: row.cnc_groove || 0,
      cnc_dent: row.cnc_dent || 0,
      forging_height: row.forging_height || 0,
      forging_od: row.forging_od || 0,
      forging_bore: row.forging_bore || 0,
      forging_crack: row.forging_crack || 0,
      forging_dent: row.forging_dent || 0,
      pre_mc_height: row.pre_mc_height || 0,
      pre_mc_od: row.pre_mc_od || 0,
      pre_mc_bore: row.pre_mc_bore || 0,
      rework_height: row.rework_height || 0,
      rework_od: row.rework_od || 0,
      rework_bore: row.rework_bore || 0,
      rework_groove: row.rework_groove || 0,
      rework_dent: row.rework_dent || 0,
      cnc_rust: row.cnc_rust || 0,
      
    }));

    if (!date || !shift) {
      alert("Please fill in the date and shift fields.");
      return;
    }

    const dataToSubmit = updatedRows.map(({ total_production, ...row }) => ({
      ...row,
      date,
      shift,
      verified_by: verifiedBy,
    }));

    try {
      await axios.post(
                `${BASE_URL}api/visual/bulk-add/`,
        
        dataToSubmit
      );
      alert("Data submitted successfully!");
      setTimeout(() => {
        window.location.reload();
      }, 2);  // 1000 milliseconds = 1 second
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
      
  

  return (
    <div className="flex flex-col p-3">
    
        <form onSubmit={handleSubmit}>
          <div className="mb-6 flex space-x-4"> {/* Flex container for Date, Shift, Verified By */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-600 mb-1">Date:</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full px-1 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
    
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-600 mb-1">Shift:</label>
              <select
                value={shift}
                onChange={(e) => setShift(e.target.value)}
                required
                className="w-full px-1 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="" disabled>Select Shift</option>
                {shiftOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
    
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-600 mb-1">Verified By:</label>
              <input
                type="text"
                value={verifiedBy}
                readOnly
                className="w-full px-1 py-1 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
              />
            </div>
          </div> {/* End of flex container */}
    
        <div className="overflow-x-visible overflow-y-visible mb-6" style={{ maxHeight: "calc(100vh - 200px)", maxWidth: "100vw" }}>
  <table className="table-auto border-collapse min-w-full table-layout-auto">
              <thead>
                <tr className="bg-gray-100">
                  <th className="min-w-[150px] text-left text-sm text-gray-600">Batch Number</th>
                  <th className="min-w-[125px] text-left text-sm text-gray-600">Component</th>
                  <th className="min-w-[90px] text-left text-sm text-gray-600">Heat-No.</th>
                  <th className="min-w-[125px] text-left text-sm text-gray-600">Chaker</th>
                  <th className="min-w-[125px] text-left text-sm text-gray-600">Chaker2</th>
                  <th className="min-w-[75px] text-left text-sm text-gray-600">Batch Size</th>

                  <th className="min-w-[75px] text-left text-sm text-gray-600">Privious Production</th>
                  <th className="min-w-[75px] text-left text-sm text-gray-600">Chq. Qty.</th>
                  
                  <th className="min-w-[75px] text-left text-sm text-gray-600"> Ok Qty.</th>
                  <th className="min-w-[75px] text-left text-sm text-gray-600">Remark</th>
                  <th className="min-w-[75px] text-left text-sm text-gray-600">Marking</th>
                  <th className="min-w-[75px] text-left text-sm text-gray-600 ">Cnc Height</th>
                  <th className="min-w-[50px] text-left text-sm text-gray-600">Cnc Od</th>
                  <th className="min-w-[50px] text-left text-sm text-gray-600">Cnc Bore</th>
                  <th className="min-w-[50px] text-left text-sm text-gray-600">Cnc Groove</th>
                  <th className="min-w-[75px] text-left text-sm text-gray-600"> Cnc Dent</th>
                  <th className="min-w-[75px] text-left text-sm text-gray-600"> Cnc Rust</th>
                  <th className="min-w-[75px] text-left text-sm text-gray-600">Forging Height</th>
                  <th className="min-w-[75px] text-left text-sm text-gray-600">Forging Od</th>
                  <th className="min-w-[50px] text-left text-sm text-gray-600">Forging Bore</th>
                  <th className="min-w-[50px] text-left text-sm text-gray-600">Forging Crack</th>
                  <th className="min-w-[50px] text-left text-sm text-gray-600">Forging Dent</th>
                  <th className="min-w-[75px] text-left text-sm text-gray-600"> Pre m/c Height</th>
                  <th className="min-w-[75px] text-left text-sm text-gray-600"> Pre m/c Od</th>
                  <th className="min-w-[75px] text-left text-sm text-gray-600"> Pre m/c Bore</th>
                  <th className="min-w-[75px] text-left text-sm text-gray-600">Rework Height</th>
                  <th className="min-w-[75px] text-left text-sm text-gray-600">Rework Od</th>
                  <th className="min-w-[75px] text-left text-sm text-gray-600">Rework Bore</th>
                  <th className="min-w-[75px] text-left text-sm text-gray-600">Rework Groove</th>
                  <th className="min-w-[75px] text-left text-sm text-gray-600">Rework Dent</th>                 
                  <th className="text-left text-sm text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                <tr key={index} className="border-b hover:bg-gray-50">
                  {Object.keys(row).map((field) => (
                    <td key={field} className="relative">
                      {field === "component" ? (
                        // SINGLE COMPONENT CELL WITH CONDITIONAL RENDERING
                        <div className="relative">
                          {childComponentOptions[index] && childComponentOptions[index].length > 1 ? (
                            // DROPDOWN WHEN CHILD COMPONENTS EXIST
                            <select
                              value={row.component}
                              onChange={(e) => handleRowChange(index, "component", e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value={row.component}>{row.component}</option>
                              {childComponentOptions[index].map((comp, i) => (
                                <option key={i} value={comp}>
                                  {comp}
                                </option>
                              ))}
                            </select>
                          ) : (
                            // READ-Only INPUT WHEN NO CHILD COMPONENTS
                            <input
                              type="text"
                              value={row.component}
                              readOnly
                              className="w-full px-2 py-1 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
                            />
                          )}
                        </div>
                      ) : field === "mc_type" || field === "setup" ? (
                        <select
                          value={row[field]}
                          disabled={["component", "customer", "heat_number", "rm_grade", "total_production", "target"].includes(field)}
                          onChange={(e) => handleRowChange(index, field, e.target.value)}
                          className="w-full py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="" disabled>Select {field}</option>
                          {(field === "mc_type" ? lineOptions : field === "setup" ? lineInchargeOptions : formanOptions).map((option) => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={row[field]}
                          onKeyDown={(e) => handleKeyDown(e, index, field)}
                          onChange={(e) => handleRowChange(index, field, e.target.value)}
                          className="w-full px-1 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          readOnly={field === "target" && (row.setup === "I" || row.setup === "II")}
                        />
                      )}
                      
                      {/* Batch number suggestions */}
                      {field === "batch_number" &&
                        rowSuggestions[index] &&
                        rowSuggestions[index].length > 0 && (
                          <ul className="absolute bg-white border border-gray-300 mt-1 w-[170px] max-h-40 overflow-y-auto z-999">
                            {rowSuggestions[index].map((suggestion, i) => (
                              <li
                                key={i}
                                onClick={() => handleSelectSuggestion(index, suggestion)}
                                onMouseEnter={() => setHighlightedIndices(prev => ({
                                  ...prev,
                                  batch: prev.batch.map((item, idx) => idx === index ? i : item)
                                }))}
                                className={`py-1 cursor-pointer ${
                                  i === highlightedIndices.batch[index] ? "bg-gray-200" : "hover:bg-gray-100"
                                }`}
                              >
                                {suggestion}
                              </li>
                            ))}
                          </ul>
                      )}
                    </td>
                  ))}
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
          </div> {/* End of overflow-x-auto */}
    
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
  
  export default Visual_form;