import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import api,{ BASE_URL } from "../../services/service";
import { useAuth } from "../../../context/AuthContext";

const Dispatch_form = () => {
  

  const [batchSuggestions, setBatchSuggestions] = useState([]);
  const [componentSuggestions, setComponentSuggestions] = useState([]);
  const [loadingBatchSuggestions, setLoadingBatchSuggestions] = useState(false);
  const [loadingComponentSuggestions, setLoadingComponentSuggestions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const [activeRow, setActiveRow] = useState(null);
  const fileInputRef = useRef(null);
  const [childComponents, setChildComponents] = useState([]);

  const { user } = useAuth();
  const [formData, setFormData] = useState({
    date: '',
    component: '',
    pices: '',
    invoiceno: '',
      verified_by: '',     // ✅ Add this

    addpdf: null,
    heat_no: '',
    target1: 0,
    total_produced: '',
    remaining: 0,
    batch_number: '',
    price: '',
  });
  // ✅ Auto-fill verified_by once user data is loaded
useEffect(() => {
  if (user) {
    setFormData((prev) => ({
      ...prev,
      verified_by: `${user.first_name || user.name || ''} ${user.last_name || user.lastname || ''}`.trim(),
    }));
  }
}, [user]);
  
  const toggleSidebar = () => {
    setIsSidebarVisible(!isSidebarVisible);
  };

  const pageTitle = "Add Dispatch";

  useEffect(() => {
    let timer;
    if (showSuccessPopup) {
      timer = setTimeout(() => {
        setShowSuccessPopup(false);
        resetForm();
      }, 300);
    }
    return () => clearTimeout(timer);
  }, [showSuccessPopup, formData.verified_by]);

  const resetForm = () => {
    setFormData({
      date: '',
      component: '',
      pices: '',
      invoiceno: '',
      addpdf: null,
     
      target1: 0,
      total_produced: '',
      remaining: 0,
      batch_number: '',
      price: '',
      verified_by: user
      ? `${user.first_name || user.name || ''} ${user.last_name || user.lastname || ''}`.trim()
      : '', // ✅ Keep verified_by populated
    });
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleChange = (e) => {
  const { name, value } = e.target;

  // Restrict "pices" input
  if (name === "pices") {
    const enteredValue = Number(value);
    const remaining = Number(formData.remaining);

    // Prevent any entry if remaining is zero or negative
    if (remaining <= 0) {
      alert("No remaining quantity available for dispatch.");
      return;
    }

    // Prevent value above remaining
    if (enteredValue > remaining) {
      alert(`❌ Pieces cannot exceed remaining quantity (${remaining}).`);
      return;
    }

    // Prevent negative or decimal
    if (enteredValue < 0 || !Number.isInteger(enteredValue)) {
      alert("Invalid quantity entered.");
      return;
    }
  }

  setFormData((prevData) => ({
    ...prevData,
    [name]: value,
  }));
};


  const handleFileChange = (e) => {
    setFormData((prevData) => ({
      ...prevData,
      addpdf: e.target.files[0],
    }));
  };

  const handleBatchNumberChange = async (e) => {
    const query = e.target.value;
    setFormData((prevData) => ({
      ...prevData,
      batch_number: query,
    }));

    if (!query) {
      setBatchSuggestions([]);
      return;
    }

    setLoadingBatchSuggestions(true);
    try {
      const response = await api.get(
                `${BASE_URL}api/raw_material/issuebatch/suggestions/?q=${query}`
              );
      setBatchSuggestions(response.data);
    } catch (error) {
      console.error('Error fetching batch suggestions:', error);
    } finally {
      setLoadingBatchSuggestions(false);
    }
  };
const handleBatchSuggestionSelect = async (batchNumber) => {
  setFormData((prevData) => ({
    ...prevData,
    batch_number: batchNumber,
  }));
  setBatchSuggestions([]);

  try {
    // ✅ Fetch batch details
    const partDetailsResponse = await api.get(
      `${BASE_URL}api/raw_material/batch_details/?batch_id=${batchNumber}`
    );
    const partData = partDetailsResponse.data;

    // ✅ Fetch possible child components
    let childList = [];
    try {
      const childRes = await api.get(
        `${BASE_URL}api/raw_material/get_child_components/?parent_component=${partData.component}`
      );
      childList = childRes.data || [];
    } catch (err) {
      console.error("Error fetching child components:", err);
    }

    // ✅ Fetch remaining qty from dispatch API
    const remainingRes = await api.get(
      `${BASE_URL}api/raw_material/batch_remaining_qty_dispatch/?batch_id=${batchNumber}&current_department=dispatch`
    );

    const remainingData = remainingRes.data;

    // ✅ Update state
    setChildComponents(childList);
    setFormData((prevData) => ({
      ...prevData,
      component: childList.length === 1 ? childList[0] : partData.component,
      heat_no: partData.heat_no,
      total_produced: remainingData.prodction_enterd || 0,
      remaining: remainingData.remaining || 0, // ✅ add remaining
    }));
  } catch (error) {
    console.error("Error fetching batch details or remaining:", error);
  }
};



  const handleComponentChange = async (e) => {
    const query = e.target.value;
    setFormData((prevData) => ({
      ...prevData,
      component: query,
    }));
  
    if (!query) {
      setComponentSuggestions([]);
      return;
    }
  
    setLoadingComponentSuggestions(true);
    try {
      const response = await api.get(
        '/raw_material/components/',
        { params: { component: query } }
      );
      setComponentSuggestions(response.data);
    } catch (error) {
      console.error('Error fetching component suggestions:', error);
    } finally {
      setLoadingComponentSuggestions(false);
    }
  };
  
  const handleComponentSelect = (selectedComponent) => {
    setFormData((prevData) => ({
      ...prevData,
      component: selectedComponent,
    }));
    setComponentSuggestions([]);
  };
  
  const handleComponentBlur = () => {
    const { component } = formData;
    
    if (!componentSuggestions.includes(component)) {
      setFormData((prevData) => ({
        ...prevData,
        component: '',
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
  
    if (isSubmitting) return;
  
    setIsSubmitting(true);
  
    if (!formData.date || !formData.component || !formData.pices || !formData.invoiceno || !formData.addpdf || !formData.verified_by) {
      alert('Please fill in all required fields.');
      setIsSubmitting(false);
      return;
    }
  
    const form = new FormData();
    for (const key in formData) {
      form.append(key, formData[key]);
    }
  
    try {
      await api.post('api/dispatch/add/', form, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setShowSuccessPopup(true);
    } catch (error) {
      console.error('Error:', error.response?.data || error);
      alert('There was an error submitting the form.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex">
      {/* Sidebar */}
    
          {/* Success Popup */}
          {showSuccessPopup && (
            <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
              <div className="bg-white p-6 rounded-lg shadow-xl animate-fade-in">
                <div className="flex items-center justify-center mb-4">
                  <svg className="w-12 h-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-center text-gray-900">Success!</h3>
                <p className="mt-2 text-sm text-gray-500 text-center">Form submitted successfully.</p>
                <p className="mt-1 text-sm text-gray-500 text-center">The form will reset shortly.</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="container mx-auto  p-8 bg-gray-100 rounded shadow-lg ">
            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="block mb-2 font-semibold">Date:</label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-300 rounded"
                  required
                />
              </div>

              <div>
                <label className="block mb-2 font-semibold">Batch Number:</label>
                <input
                  type="text"
                  name="batch_number"
                  value={formData.batch_number}
                  onChange={handleBatchNumberChange}
                  className="w-full p-2 border border-gray-300 rounded"
                  required
                />
                {loadingBatchSuggestions && <p className="text-sm text-gray-500">Loading suggestions...</p>}
                {batchSuggestions.length > 0 && (
                  <ul className="absolute bg-white border border-gray-300 rounded mt-1 w-full max-h-40 overflow-y-auto z-10 shadow-lg">
                    {batchSuggestions.map((suggestion, index) => (
                      <li
                        key={index}
                        onClick={() => handleBatchSuggestionSelect(suggestion.batch_id)}
                        className="p-2 hover:bg-gray-200 cursor-pointer"
                      >
                        {suggestion.batch_id}
                      </li>
                    ))}

                  </ul>
                )}
              </div>

              <div>
  <label className="block mb-2 font-semibold">Component:</label>

  {childComponents.length > 1 ? (
    // ✅ Dropdown when child components are available
    <select
      name="component"
      value={formData.component}
      onChange={(e) =>
        setFormData((prev) => ({ ...prev, component: e.target.value }))
      }
      className="w-full p-2 border border-gray-300 rounded"
      required
    >
      <option value="">Select Component</option>
      {childComponents.map((comp, i) => (
        <option key={i} value={comp}>
          {comp}
        </option>
      ))}
    </select>
  ) : (
    // ✅ Read-only input when no child components
    <input
      type="text"
      name="component"
      value={formData.component}
      readOnly
      className="w-full p-2 border border-gray-300 rounded bg-gray-100 cursor-not-allowed"
      required
    />
  )}
</div>

              <div>
                <label className="block mb-2 font-semibold">Heat No:</label>
                <input
                  type="text"
                  name="heat_no"
                  value={formData.heat_no}
                  readOnly
                  className="w-full p-2 border border-gray-300 rounded bg-gray-100"
                />
              </div>
              <div>
                <label className="block mb-2 font-semibold">Price/pcs:</label>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-300 rounded"
                  required
                />
              </div>
              <div>
  <label className="block mb-2 font-semibold">Pieces:</label>
  <input
    type="number"
    name="pices"
    value={formData.pices}
    onChange={handleChange}
    className={`w-full p-2 border border-gray-300 rounded ${
      formData.remaining <= 0 ? "bg-gray-100 cursor-not-allowed" : ""
    }`}
    min="0"
    max={formData.remaining > 0 ? formData.remaining : 0}
    required
    disabled={formData.remaining <= 0}
  />

  {/* ✅ Remaining quantity display */}
  <p
    className={`text-sm mt-1 ${
      formData.remaining > 0 ? "text-green-600" : "text-red-600 font-semibold"
    }`}
  >
    {formData.remaining > 0
      ? `Remaining quantity: ${formData.remaining}`
      : "No remaining quantity available"}
  </p>
</div>

              <div>
                <label className="block mb-2 font-semibold">Invoice No:</label>
                <input
                  type="text"
                  name="invoiceno"
                  value={formData.invoiceno}
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-300 rounded"
                  required
                />
              </div>
              <div>
                <label className="block mb-2 font-semibold">Upload PDF:</label>
                <input
                  type="file"
                  name="addpdf"
                  onChange={handleFileChange}
                  ref={fileInputRef}
                  className="w-full p-2 border border-gray-300 rounded"
                  required
                />
              </div>
              <div>
                <label className="block mb-2 font-semibold">Verified By:</label>
                <input
                  type="text"
                  name="verified_by"
                  value={formData.verified_by}
                  readOnly
                  className="w-full p-2 border border-gray-300 rounded bg-gray-100"
                />
              </div>
              
              <div style={{ display: 'none' }}>
                <label className="block mb-2 font-semibold">Target1:</label>
                <input
                  type="number"
                  name="target1"
                  value={formData.target1}
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-300 rounded"
                />
              </div>
              <div style={{ display: 'none' }}>
                <label className="block mb-2 font-semibold">Total Produced:</label>
                <input
                  type="number"
                  name="total_produced"
                  value={formData.total_produced}
                  readOnly
                  className="w-full p-2 border border-gray-300 rounded bg-gray-100"
                />
              </div>
              <div style={{ display: 'none' }}>
                <label className="block mb-2 font-semibold">Remaining:</label>
                <input
                  type="number"
                  name="remaining"
                  value={formData.remaining}
                  readOnly
                  className="w-full p-2 border border-gray-300 rounded bg-gray-100"
                />
              </div>
            </div>
            <div className="mt-6">
              <button
                type="submit"
                className="w-full p-3 bg-blue-500 text-white font-semibold rounded hover:bg-blue-600 disabled:bg-blue-300 transition-colors duration-300"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </span>
                ) : 'Submit'}
              </button>
            </div>
          </form>
     
    </div>
  );
};

export default Dispatch_form;