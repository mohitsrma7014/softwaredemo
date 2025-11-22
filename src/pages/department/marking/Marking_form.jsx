import React, { useState, useEffect } from "react";
import axios from "axios";
import api,{ BASE_URL } from "../../services/service";
import { useAuth } from "../../../context/AuthContext";

const Marking_form = () => {
  const [date, setDate] = useState("");
  const [activeRow, setActiveRow] = useState(null);
  const [shift, setShift] = useState("");
  const [verifiedBy, setVerifiedBy] = useState("");
  const [rows, setRows] = useState([
    {
        batch_number: "",
        heat_no: "",
        component: "",
        machine: "",
        operator: "",
        target: "",
        total_produced:"",
        qty: "",
    },
  ]);
  const [rowSuggestions, setRowSuggestions] = useState([]); // To store suggestions for each row
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const shiftOptions = ["DAY", "NIGHT"]; // Dropdown options for shift
  const lineOptions = ["Kamal", "Anil", "Anoop","Sandeep","Sorav","Chetan","Mahaveer","Deendyal","Satish","Shyamu","Keshav","Guddu","Manoj","Vinod","Aniket","Ritik"]; // Dropdown options for line
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
          `${BASE_URL}api/raw_material/batch_remaining_qty_marking/?batch_id=${batch_number}&current_department=Marking`
        );
        const targetData = targetDetailsResponse.data.total_received || 0;
        const targetData1 = targetDetailsResponse.data.prodction_enterd || 0;
  
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
            target: targetData || "",
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
  
  

  const handleRowChange = (index, field, value) => {
    // Define fields that should be read-only
    const readOnlyFields = [ "heat_no","total_produced","target"];
    // Prevent updating read-only fields
    if (readOnlyFields.includes(field)) {
      return;
    }

    // Validate the 'production' field
    if (field === "qty") {
      const currentRow = rows[index];
      const totalProduction = parseFloat(currentRow.total_produced) || 0;
      const target = parseFloat(currentRow.target) || 0;
      const production = parseFloat(value) || 0;
      const productionLimit = target - totalProduction + 0;
      // Check if production exceeds the sum of target + total_production
      if (production > productionLimit) {
        alert("Production cannot exceed.");
        return;
      }
    }
   
  
    const updatedRows = [...rows];
    updatedRows[index][field] = value;
    setRows(updatedRows);
  
    // Only fetch suggestions when 'batch_number' field changes
    if (field === "batch_number" && value) {
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
        heat_no: "",
        component: "",
        machine: "",
        operator: "",
        target: "",
        total_produced:"",
        qty: "",
     
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
      if (!row.qty| !row.operator  ) {
        alert(`Please fill in all required fields for row ${i + 1}.`);
        return;
      }
    }

    // Automatically set missing values to 0
    const updatedRows = rows.map((row) => ({
      ...row,
      total_produced: row.total_produced || 0,
      
    }));

    if (!date || !shift ) {
      alert("Please fill in the date fields.");
      return;
    }

    const dataToSubmit = updatedRows.map(({ total_production, ...row }) => ({
      ...row,
      date,
      shift,
      verified_by: verifiedBy,
    }));

    console.log(dataToSubmit)

    try {
      await axios.post(
                `${BASE_URL}api/marking/bulk-add/`,
        
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
                <th className="min-w-[125px] text-left text-sm text-gray-600">Heat No.</th>
                <th className="min-w-[125px] text-left text-sm text-gray-600">Component</th>
                <th className="min-w-[90px] text-left text-sm text-gray-600">Machine</th>
                <th className="min-w-[90px] text-left text-sm text-gray-600">Operator</th>
                <th className="min-w-[50px] text-left text-sm text-gray-600">Batch Size</th>
                <th className="min-w-[50px] text-left text-sm text-gray-600">Privious production</th>
                <th className="min-w-[50px] text-left text-sm text-gray-600">Pcs.</th>
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

export default Marking_form;