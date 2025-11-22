import React, { useState, useEffect } from 'react';
import axios from 'axios';
import api,{ BASE_URL } from "../../services/service";
import { useAuth } from "../../../context/AuthContext";


const MasterlistForm = () => {
  const [formData, setFormData] = useState({
    component: '',
    part_name: '',
    customer: '',
    customer_location: '',
    drawing_rev_number: '',
    drawing_rev_date: '',
    forging_line: '',
    drawing_sr_number: '',
    standerd: '',
    supplier:'',
    grade: '',
    slug_weight: '',
    dia: '',
    ht_process: '',
    hardness_required: '',
    running_status: '',
    packing_condition: '',
    ring_weight: '',
    cost: '',
    op_10_time: '',
    op_10_target: '',
    op_20_time: '',
    op_20_target: '',
    cnc_target_remark: '',
    verified_by: ''
  });

  const [suggestions, setSuggestions] = useState({
    customer: [],
    grade: []
  });

  // Dropdown options
  const dropdownOptions = {
    customer_location: [
      
      'Bawal',
      'Brazil',
      'Bhiwadi',
      'Belgaum',
      'Faridabad',
      'GHAZIABAD',
      'Jaipur',
      'Noida',
      'NAWA SHEVA',
      'Sanand'
    ],
    forging_line: [
      'A-Set',
      'W-Set',
      'FFL',
      '1600 TON',
      '1000 Ton',
      'Hammer',
    ],
    running_status: [
      'Running',
      'NPD',
      
    ]
  };
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  
    const toggleSidebar = () => {
      setIsSidebarVisible(!isSidebarVisible);
    };
    const pageTitle = "Add New Component";
const { user } = useAuth();

  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Auto-fill verified_by when component mounts
    useEffect(() => {
    if (user) {
      const firstName = user.first_name || user.name || "";
      const lastName = user.last_name || user.lastname || "";

      setFormData(prev => ({
        ...prev,
        verified_by: `${firstName} ${lastName}`.trim()
      }));
    }
  }, [user]);


  const handleInputChange = async (field, value) => {
    setErrorMessage('');
    setFormData(prev => ({ ...prev, [field]: value }));

    // Fetch suggestions only for the specified fields
    const suggestionFields = ['customer', 'grade'];
    if (suggestionFields.includes(field) && value.length > 1) {
      try {
        const endpointField = field === 'grade' ? 'grades' : `${field}s`;
        const response = await api.get(
            `/raw_material/${endpointField}_suggestions/`,
          {
            params: { q: value },
            headers: {
              Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
            }
          }
        );
        setSuggestions(prev => ({ ...prev, [field]: response.data }));
      } catch (error) {
        console.error(`Failed to fetch ${field} suggestions:`, error);
      }
    } else {
      // Clear suggestions if input is too short or not a suggestion field
      setSuggestions(prev => ({ ...prev, [field]: [] }));
    }
  };

  const handleSuggestionClick = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setSuggestions(prev => ({ ...prev, [field]: [] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const response = await api.post(
        'api/raw_material/api/masterlist/create/',
        formData,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
          }
        }
      );

      if (response.data.status === 'success') {
        setSuccessMessage('Record added successfully!');
        // Reset form (except verified_by)
        setFormData(prev => ({
          ...Object.fromEntries(
            Object.keys(prev).map(key => [key, key === 'verified_by' ? prev.verified_by : ''])
          )
        }));
      }
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'An error occurred');
    }
  };

  return (
    <div className="flex">
        
    <div className="container mx-auto p-2">
      
     

      <form onSubmit={handleSubmit} className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-2">
          {/* Basic Information */}
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="component">
              Component*
            </label>
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="component"
              name="component"
              type="text"
              value={formData.component}
              onChange={(e) => handleInputChange('component', e.target.value)}
              autoComplete="off" // <- This disables browser autocomplete
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="part_name">
              Part Name*
            </label>
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="part_name"
              name="part_name"
              type="text"
              value={formData.part_name}
              onChange={(e) => handleInputChange('part_name', e.target.value)}
              autoComplete="off" // <- This disables browser autocomplete
              required
            />
          </div>

          {/* Customer with suggestions */}
          <div className="mb-4 relative">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="customer">
              Customer*
            </label>
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="customer"
              name="customer"
              type="text"
              value={formData.customer}
              onChange={(e) => handleInputChange('customer', e.target.value)}
              autoComplete="off" // <- This disables browser autocomplete
              required
            />
            {suggestions.customer.length > 0 && (
              <ul className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                {suggestions.customer.map((item, index) => (
                  <li
                    key={index}
                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                    onClick={() => handleSuggestionClick('customer', item)}
                  >
                    {item}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Drawing Information */}
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="drawing_sr_number">
              Drawing Number*
            </label>
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="drawing_sr_number"
              name="drawing_sr_number"
              type="number"
              value={formData.drawing_sr_number}
              onChange={(e) => handleInputChange('drawing_sr_number', e.target.value)}
              autoComplete="off" // <- This disables browser autocomplete
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="drawing_rev_number">
              Drawing Rev Number
            </label>
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="drawing_rev_number"
              name="drawing_rev_number"
              type="text"
              value={formData.drawing_rev_number}
              autoComplete="off" // <- This disables browser autocomplete
              onChange={(e) => handleInputChange('drawing_rev_number', e.target.value)}
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="drawing_rev_date">
              Drawing Rev Date
            </label>
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="drawing_rev_date"
              name="drawing_rev_date"
              type="text"
              value={formData.drawing_rev_date}
              onChange={(e) => handleInputChange('drawing_rev_date', e.target.value)}
              autoComplete="off" // <- This disables browser autocomplete
            />
          </div>

          {/* Material Information */}
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="standerd">
              Standard*
            </label>
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="standerd"
              name="standerd"
              type="text"
              value={formData.standerd}
              onChange={(e) => handleInputChange('standerd', e.target.value)}
              autoComplete="off" // <- This disables browser autocomplete
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="supplier">
              Supplier*
            </label>
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="supplier"
              name="supplier"
              type="text"
              value={formData.supplier}
              onChange={(e) => handleInputChange('supplier', e.target.value)}
              autoComplete="off" // <- This disables browser autocomplete
              required
            />
          </div>

          {/* Material Grade with suggestions */}
          <div className="mb-4 relative">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="grade">
              Material Grade*
            </label>
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="grade"
              name="grade"
              type="text"
              value={formData.grade}
              onChange={(e) => handleInputChange('grade', e.target.value)}
              autoComplete="off" // <- This disables browser autocomplete
              required
            />
            {suggestions.grade.length > 0 && (
              <ul className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                {suggestions.grade.map((item, index) => (
                  <li
                    key={index}
                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                    onClick={() => handleSuggestionClick('grade', item)}
                  >
                    {item}
                  </li>
                ))}
              </ul>
            )}
          </div>

         

          {/* Additional Fields */}
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="dia">
              Bar Diameter(MM)*
            </label>
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="dia"
              name="dia"
              type="number"
              value={formData.dia}
              onChange={(e) => handleInputChange('dia', e.target.value)}
              autoComplete="off" // <- This disables browser autocomplete
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="ht_process">
              HT Process*
            </label>
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="ht_process"
              name="ht_process"
              type="text"
              value={formData.ht_process}
              onChange={(e) => handleInputChange('ht_process', e.target.value)}
              autoComplete="off" // <- This disables browser autocomplete
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="slug_weight">
              Slug Weight(Kg)*
            </label>
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="slug_weight"
              name="slug_weight"
              type="number"
              step="0.01"
              value={formData.slug_weight}
              onChange={(e) => handleInputChange('slug_weight', e.target.value)}
              autoComplete="off" // <- This disables browser autocomplete
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="ring_weight">
              Ring Weight(Kg)*
            </label>
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="ring_weight"
              name="ring_weight"
              type="number"
              step="0.01"
              value={formData.ring_weight}
              onChange={(e) => handleInputChange('ring_weight', e.target.value)}
              autoComplete="off" // <- This disables browser autocomplete
              required
            />
          </div>

          {/* Cost and Time Information */}
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="cost">
              Cost(Rs)*
            </label>
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="cost"
              name="cost"
              type="number"
              step="0.01"
              value={formData.cost}
              autoComplete="off" // <- This disables browser autocomplete
              onChange={(e) => handleInputChange('cost', e.target.value)}
              required
            />
          </div>

        

          {/* Optional Fields */}
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="customer_location">
              Delivery Location
            </label>
            <select
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="customer_location"
              name="customer_location"
              value={formData.customer_location}
              onChange={(e) => handleInputChange('customer_location', e.target.value)}
            >
              <option value="">Select Location</option>
              {dropdownOptions.customer_location.map((option, index) => (
                <option key={index} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="forging_line">
              Forging Line
            </label>
            <select
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="forging_line"
              name="forging_line"
              value={formData.forging_line}
              onChange={(e) => handleInputChange('forging_line', e.target.value)}
            >
              <option value="">Select Forging Line</option>
              {dropdownOptions.forging_line.map((option, index) => (
                <option key={index} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="hardness_required">
              Hardness Required
            </label>
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="hardness_required"
              name="hardness_required"
              type="text"
              value={formData.hardness_required}
              autoComplete="off" // <- This disables browser autocomplete
              onChange={(e) => handleInputChange('hardness_required', e.target.value)}
            />
          </div>

          <div className="mb-4">
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

          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="packing_condition">
              Packing Condition
            </label>
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="packing_condition"
              name="packing_condition"
              type="text"
              value={formData.packing_condition}
              autoComplete="off" // <- This disables browser autocomplete
              onChange={(e) => handleInputChange('packing_condition', e.target.value)}
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="op_10_time">
              OP 10 Time (seconds)
            </label>
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="op_10_time"
              name="op_10_time"
              type="number"
              value={formData.op_10_time}
              autoComplete="off" // <- This disables browser autocomplete
              onChange={(e) => handleInputChange('op_10_time', e.target.value)}
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="op_10_target">
              OP 10 Target
            </label>
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="op_10_target"
              name="op_10_target"
              type="number"
              value={formData.op_10_target}
              autoComplete="off" // <- This disables browser autocomplete
              onChange={(e) => handleInputChange('op_10_target', e.target.value)}
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="op_20_time">
              OP 20 Time (seconds)
            </label>
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="op_20_time"
              name="op_20_time"
              type="number"
              value={formData.op_20_time}
              autoComplete="off" // <- This disables browser autocomplete
              onChange={(e) => handleInputChange('op_20_time', e.target.value)}
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="op_20_target">
              OP 20 Target
            </label>
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="op_20_target"
              name="op_20_target"
              type="number"
              value={formData.op_20_target}
              autoComplete="off" // <- This disables browser autocomplete
              onChange={(e) => handleInputChange('op_20_target', e.target.value)}
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="cnc_target_remark">
              CNC Target Remark
            </label>
            <textarea
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="cnc_target_remark"
              name="cnc_target_remark"
              value={formData.cnc_target_remark}
              autoComplete="off" // <- This disables browser autocomplete
              onChange={(e) => handleInputChange('cnc_target_remark', e.target.value)}
              rows="1"
            />
          </div>

          {/* Verified By (non-editable) */}
          <div className="mb-4">
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
    
    </div>
  );
};

export default MasterlistForm;