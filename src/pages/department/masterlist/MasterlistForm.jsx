import React, { useState, useEffect, useRef } from 'react';
import api from "../../services/service";
import { useAuth } from "../../../context/AuthContext";

const MasterlistForm = () => {
  const [formData, setFormData] = useState({
    component: "",
    part_name: "",
    customer: "",
    customer_location: "",
    drawing_rev_number: "",
    drawing_rev_date: "",
    forging_line: "",
    drawing_sr_number: "",
    standerd: "",
    supplier: "",
    grade: "",
    slug_weight: "",
    dia: "",
    ht_process: "",
    hardness_required: "",
    running_status: "",
    packing_condition: "",
    ring_weight: "",
    cost: "",
    op_10_time: "",
    op_10_target: "",
    op_20_time: "",
    op_20_target: "",
    cnc_target_remark: "",
    verified_by: "",
  });

  const [allSuggestions, setAllSuggestions] = useState({
    customer: [],
    grade: [],
    supplier: [],
    customer_location: [],
    forging_line: [],
  });

  const [filteredSuggestions, setFilteredSuggestions] = useState({
    customer: [],
    grade: [],
    supplier: [],
    customer_location: [],
    forging_line: [],
  });

  const [activeDropdown, setActiveDropdown] = useState(null);
  const [selectedValues, setSelectedValues] = useState({
    customer: null,
    supplier: null,
    grade: null,
    customer_location: null,
    forging_line: null,
  });

  const dropdownRefs = useRef({});

  // Define dropdown options locally
  const dropdownOptions = {
    running_status: ["NPD", "Running", "Not Running"],
  };

  const { user } = useAuth();
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Fetch all suggestions on component mount
  useEffect(() => {
    fetchAllSuggestions();
  }, []);

  useEffect(() => {
    if (user) {
      const firstName = user.first_name || user.name || "";
      const lastName = user.last_name || user.lastname || "";
      setFormData((prev) => ({
        ...prev,
        verified_by: `${firstName} ${lastName}`.trim(),
      }));
    }
  }, [user]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      const isOutside = Object.values(dropdownRefs.current).every(ref => 
        ref && !ref.contains(event.target)
      );
      if (isOutside) {
        setActiveDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchAllSuggestions = async () => {
    try {
      setIsLoading(true);
      const types = ['CUSTOMER', 'GRADE', 'SUPPLIER', 'LOCATION', 'FORGING_LINE'];
      const responses = await Promise.all(
        types.map(type => 
          api.get("api/raw_material/", {
            params: { type: type, search: "" },
            headers: {
              Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
            },
          })
        )
      );

      const newAllSuggestions = {
        customer: responses[0].data || [],
        grade: responses[1].data || [],
        supplier: responses[2].data || [],
        customer_location: responses[3].data || [],
        forging_line: responses[4].data || [],
      };

      setAllSuggestions(newAllSuggestions);
      
      // Also populate dropdown options
      dropdownOptions.customer_location = newAllSuggestions.customer_location.map(item => getDisplayValue(item));
      dropdownOptions.forging_line = newAllSuggestions.forging_line.map(item => getDisplayValue(item));

    } catch (error) {
      console.error("Failed to fetch suggestions:", error);
      setErrorMessage("Failed to load form data. Please refresh the page.");
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to get display value from suggestion item
  const getDisplayValue = (item) => {
    if (!item) return "";
    return item?.name || item || "";
  };

  // Helper function to normalize string for comparison
  const normalizeString = (str) => {
    if (!str) return "";
    return str.toString().trim().toLowerCase();
  };

  const filterSuggestions = (field, value) => {
    if (!value) {
      setFilteredSuggestions(prev => ({ ...prev, [field]: allSuggestions[field].slice(0, 10) }));
      return;
    }

    const fieldSuggestions = allSuggestions[field];
    const normalizedValue = normalizeString(value);
    
    const filtered = fieldSuggestions.filter(item => {
      const itemValue = getDisplayValue(item);
      return normalizeString(itemValue).includes(normalizedValue);
    }).slice(0, 10); // Limit to 10 suggestions

    setFilteredSuggestions(prev => ({ ...prev, [field]: filtered }));
  };

  const handleInputFocus = (field) => {
    setActiveDropdown(field);
    // Show first 10 suggestions when focusing empty field
    if (!formData[field]) {
      setFilteredSuggestions(prev => ({ 
        ...prev, 
        [field]: allSuggestions[field].slice(0, 10) 
      }));
    }
  };

  const handleInputChange = async (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrorMessage("");

    // Clear selected value when user starts typing
    if (value !== getDisplayValue(selectedValues[field])) {
      setSelectedValues(prev => ({ ...prev, [field]: null }));
    }

    // Filter suggestions from pre-loaded data
    filterSuggestions(field, value);

    // Show dropdown
    setActiveDropdown(field);
  };

  const handleSuggestionClick = (field, item) => {
    const value = getDisplayValue(item);
    setFormData((prev) => ({ ...prev, [field]: value }));
    setSelectedValues(prev => ({ ...prev, [field]: item }));
    setActiveDropdown(null);
    setFilteredSuggestions(prev => ({ ...prev, [field]: [] }));
  };

  const handleInputBlur = (field, value) => {
    // Delay hiding dropdown to allow for click events
    setTimeout(() => {
      setActiveDropdown(null);
    }, 200);
  };

  const validateForm = () => {
    const errors = {};
    let isValid = true;

    // Check required fields
    const requiredFields = ['customer', 'supplier', 'grade'];
    requiredFields.forEach(field => {
      const value = formData[field];
      if (!value) {
        errors[field] = `${field.replace('_', ' ')} is required`;
        isValid = false;
      } else if (!selectedValues[field]) {
        errors[field] = `Please select a valid ${field.replace('_', ' ')} from the dropdown`;
        isValid = false;
      }
    });

    // Check optional suggestion fields (if they have value, they must have selected value)
    const optionalFields = ['customer_location', 'forging_line'];
    optionalFields.forEach(field => {
      const value = formData[field];
      if (value && !selectedValues[field]) {
        errors[field] = `Please select a valid ${field.replace('_', ' ')} from the dropdown`;
        isValid = false;
      }
    });

    // Basic field validations
    if (!formData.component) {
      errors.component = "Component is required";
      isValid = false;
    }
    if (!formData.part_name) {
      errors.part_name = "Part name is required";
      isValid = false;
    }

    return isValid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    // Validate form before submission
    if (!validateForm()) {
      setErrorMessage("Please fix the validation errors before submitting. Select From Drop Down");
      return;
    }

    try {
      const response = await api.post(
        "api/raw_material/api/masterlist/create/",
        formData,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        }
      );

      if (response.data.status === "success") {
        setSuccessMessage("Record added successfully!");
        // Reset form while keeping verified_by
        setFormData(prev => ({
          ...Object.fromEntries(
            Object.keys(prev).map((key) => [
              key,
              key === "verified_by" ? prev.verified_by : "",
            ])
          ),
        }));
        // Clear all selections and suggestions
        setSelectedValues({
          customer: null,
          supplier: null,
          grade: null,
          customer_location: null,
          forging_line: null,
        });
        setFilteredSuggestions({
          customer: [],
          grade: [],
          supplier: [],
          customer_location: [],
          forging_line: [],
        });
        setActiveDropdown(null);
      }
    } catch (error) {
      setErrorMessage(error.response?.data?.message || "An error occurred");
    }
  };

  // Common input field configuration
  const inputFields = [
    { id: "component", label: "Component*", type: "text", required: true },
    { id: "part_name", label: "Part Name*", type: "text", required: true },
    { id: "drawing_sr_number", label: "Drawing Number*", type: "number", required: true },
    { id: "drawing_rev_number", label: "Drawing Rev Number", type: "text", required: false },
    { id: "drawing_rev_date", label: "Drawing Rev Date", type: "text", required: false },
    { id: "standerd", label: "Standard*", type: "text", required: true },
    { id: "dia", label: "Bar Diameter(MM)*", type: "number", required: true },
    { id: "ht_process", label: "HT Process*", type: "text", required: true },
    { id: "slug_weight", label: "Slug Weight(Kg)*", type: "number", step: "0.01", required: true },
    { id: "ring_weight", label: "Ring Weight(Kg)*", type: "number", step: "0.01", required: true },
    { id: "cost", label: "Cost(Rs)*", type: "number", step: "0.01", required: true },
    { id: "hardness_required", label: "Hardness Required", type: "text", required: false },
    { id: "packing_condition", label: "Packing Condition", type: "text", required: false },
    { id: "op_10_time", label: "OP 10 Time (seconds)", type: "number", required: false },
    { id: "op_10_target", label: "OP 10 Target", type: "number", required: false },
    { id: "op_20_time", label: "OP 20 Time (seconds)", type: "number", required: false },
    { id: "op_20_target", label: "OP 20 Target", type: "number", required: false },
  ];

  // Fields with suggestions
  const suggestionFields = [
    { id: "customer", label: "Customer*", required: true },
    { id: "supplier", label: "Supplier*", required: true },
    { id: "grade", label: "Material Grade*", required: true },
    { id: "customer_location", label: "Delivery Location", required: false },
    { id: "forging_line", label: "Forging Line", required: false },
  ];

  if (isLoading) {
    return (
      <div className="container mx-auto p-2">
        <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading form data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-2">
      <form
        onSubmit={handleSubmit}
        className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4"
      >
        {successMessage && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            {successMessage}
          </div>
        )}

        {errorMessage && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {errorMessage}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2">
          {/* Render basic input fields */}
          {inputFields.map((field) => (
            <div key={field.id} className="mb-2">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor={field.id}>
                {field.label}
              </label>
              <input
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                id={field.id}
                name={field.id}
                type={field.type}
                step={field.step}
                value={formData[field.id]}
                onChange={(e) => handleInputChange(field.id, e.target.value)}
                autoComplete="off"
                required={field.required}
              />
            </div>
          ))}

          {/* Render suggestion fields with dropdowns */}
          {suggestionFields.map((field) => (
            <div 
              key={field.id} 
              className="mb-4 relative"
              ref={el => dropdownRefs.current[field.id] = el}
            >
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor={field.id}>
                {field.label}
              </label>
              <div className="relative">
                <input
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  id={field.id}
                  name={field.id}
                  type="text"
                  value={formData[field.id]}
                  onChange={(e) => handleInputChange(field.id, e.target.value)}
                  onFocus={() => handleInputFocus(field.id)}
                  onBlur={(e) => handleInputBlur(field.id, e.target.value)}
                  autoComplete="off"
                  required={field.required}
                  placeholder={`Type to search ${field.label.toLowerCase()}...`}
                />
                {formData[field.id] && (
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    onClick={() => {
                      setFormData(prev => ({ ...prev, [field.id]: "" }));
                      setSelectedValues(prev => ({ ...prev, [field.id]: null }));
                    }}
                  >
                    ×
                  </button>
                )}
              </div>

              {activeDropdown === field.id && filteredSuggestions[field.id].length > 0 && (
                <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                  {filteredSuggestions[field.id].map((item, index) => {
                    const displayValue = getDisplayValue(item);
                    return (
                      <div
                        key={index}
                        className={`px-4 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 ${
                          selectedValues[field.id] === item ? 'bg-blue-100' : ''
                        }`}
                        onClick={() => handleSuggestionClick(field.id, item)}
                        onMouseDown={(e) => e.preventDefault()} // Prevent blur before click
                      >
                        <div className="font-medium">{displayValue}</div>
                      </div>
                    );
                  })}
                </div>
              )}

              {activeDropdown === field.id && filteredSuggestions[field.id].length === 0 && formData[field.id] && (
                <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
                  <div className="px-4 py-2 text-gray-500 text-center">
                    No matches found
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Select fields */}
          <div className="mb-2">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="running_status">
              Running Status
            </label>
            <select
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="running_status"
              name="running_status"
              value={formData.running_status}
              onChange={(e) => handleInputChange('running_status', e.target.value)}
            >
              <option value="">Select Status</option>
              {dropdownOptions.running_status.map((option, index) => (
                <option key={index} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          {/* Textarea field */}
          <div className="mb-2 col-span-1 md:col-span-2 lg:col-span-1">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="cnc_target_remark">
              CNC Target Remark
            </label>
            <textarea
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="cnc_target_remark"
              name="cnc_target_remark"
              value={formData.cnc_target_remark}
              onChange={(e) => handleInputChange('cnc_target_remark', e.target.value)}
              autoComplete="off"
              rows="1"
            />
          </div>

          {/* Verified By (non-editable) */}
          <div className="mb-2">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="verified_by">
              Verified By*
            </label>
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 bg-gray-100 leading-tight focus:outline-none focus:shadow-outline"
              id="verified_by"
              name="verified_by"
              type="text"
              value={formData.verified_by}
              readOnly
              required
            />
          </div>
        </div>

        <div className="flex items-center justify-between mt-6">
          <button
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            type="submit"
          >
            Submit
          </button>
        </div>
      </form>
    </div>
  );
};

export default MasterlistForm;