import React, { useState, useEffect } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { InputText } from 'primereact/inputtext';
import { Calendar } from 'primereact/calendar';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { ProgressSpinner } from 'primereact/progressspinner';
import { Toast } from 'primereact/toast';
import { MultiSelect } from 'primereact/multiselect';
import { InputNumber } from 'primereact/inputnumber';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import axios from 'axios';
import 'primereact/resources/themes/saga-blue/theme.css';
import 'primereact/resources/primereact.min.css';
import 'primeicons/primeicons.css';
import VisualDashboard from './VisualDashboard';
import BlockmtForm1 from './BlockmtForm1';
import api,{ BASE_URL } from "../../services/service";
import { useAuth } from "../../../context/AuthContext";


const ScheduleViewer = () => {
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [filteredSchedules, setFilteredSchedules] = useState([]);
  const [dateType, setDateType] = useState('range'); // Default to range
  const [dateValue, setDateValue] = useState(null);
  const [rangeDates, setRangeDates] = useState([null, null]);
  const [totalWeight, setTotalWeight] = useState(0);
  const [totalpices, setTotalpices] = useState(0);
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const [componentFilter, setComponentFilter] = useState([]);
  const [customerFilter, setCustomerFilter] = useState([]);
  const [availableComponents, setAvailableComponents] = useState([]);
  const [availableCustomers, setAvailableCustomers] = useState([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [existingSchedules, setExistingSchedules] = useState([]);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
const [showBlockmtForm, setShowBlockmtForm] = useState(false);
const [successMessage, setSuccessMessage] = useState('');
const [selectedSchedule, setSelectedSchedule] = useState(null);
const { user } = useAuth();

  const [formData, setFormData] = useState({
    component: '',
    customer: '',
    grade: '',
    standerd: '',
    dia: '',
    slug_weight: '',
    pices: 0,
    weight: 0,
    date1: '',
    location: '',
    verified_by: "",
    supplier: ''
  });
// 🧩 Auto-fill verified_by from localStorage user
  useEffect(() => {
    try {
      const storedUser = JSON.parse(localStorage.getItem("user"));
      if (storedUser && storedUser.first_name && storedUser.last_name) {
        setFormData((prev) => ({
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
  const toggleSidebar = () => {
    setIsSidebarVisible(!isSidebarVisible);
  };
  const pageTitle = "Schedule Viewer";

  const dateTypeOptions = [
    { label: 'Month', value: 'month' },
    { label: 'Single Date', value: 'date' },
    { label: 'Date Range', value: 'range' }
  ];

  const calculateTableHeight = () => {
    const windowHeight = window.innerHeight;
    const headerHeight = 64;
    const filterHeight = 200;
    const margin = 32;
    return `${windowHeight - headerHeight - filterHeight - margin}px`;
  };

  const [tableHeight, setTableHeight] = useState(calculateTableHeight());

  useEffect(() => {
    const handleResize = () => {
      setTableHeight(calculateTableHeight());
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Set default date range on component mount
  useEffect(() => {
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    const thirtyDaysLater = new Date();
    thirtyDaysLater.setDate(today.getDate() + 30);
    
    setRangeDates([thirtyDaysAgo, thirtyDaysLater]);
    
    // Fetch data automatically with default range
    fetchSchedulesWithDefaultRange(thirtyDaysAgo, thirtyDaysLater);
  }, []);
  const fetchSchedulesWithDefaultRange = async (startDate, endDate) => {
    setLoading(true);

    try {
      const dateParam = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}:${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;

      const response = await api.get(`api/raw_material/schedules?date=${dateParam}`);
      
      if (response.data.error) {
        throw new Error(response.data.error);
      }

      setSchedules(response.data);
      setFilteredSchedules(response.data);
      
      const components = [...new Set(response.data.map(item => item.component))];
      const customers = [...new Set(response.data.map(item => item.customer))];
      
      setAvailableComponents(components.map(c => ({ label: c, value: c })));
      setAvailableCustomers(customers.map(c => ({ label: c, value: c })));
      
      showToast('success', 'Success', 'Data fetched successfully');
    } catch (err) {
      showToast('error', 'Error', err.message || 'Failed to fetch schedules');
      setSchedules([]);
      setFilteredSchedules([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let filteredData = [...schedules];
    
    if (componentFilter.length > 0) {
      filteredData = filteredData.filter(item => 
        componentFilter.includes(item.component)
      );
    }
    
    if (customerFilter.length > 0) {
      filteredData = filteredData.filter(item => 
        customerFilter.includes(item.customer)
      );
    }
    
    setFilteredSchedules(filteredData);
    
    const sum = filteredData.reduce((acc, item) => acc + parseFloat(item.weight), 0);
    setTotalWeight(sum.toFixed(2));
    const sum1 = filteredData.reduce((acc, item) => acc + parseFloat(item.pices), 0);
    setTotalpices(sum1.toFixed(2));
  }, [schedules, componentFilter, customerFilter]);



  const showToast = (severity, summary, detail) => {
    toast.current.show({ severity, summary, detail, life: 3000 });
  };

  const fetchSchedules = async () => {
    if (
      (dateType === 'month' && !dateValue) ||
      (dateType === 'date' && !dateValue) ||
      (dateType === 'range' && (!rangeDates[0] || !rangeDates[1]))
    ) {
      showToast('error', 'Validation Error', 'Please select a valid date');
      return;
    }

    setLoading(true);

    try {
      let dateParam = '';
      
      if (dateType === 'month') {
        dateParam = `${dateValue.getFullYear()}-${String(dateValue.getMonth() + 1).padStart(2, '0')}`;
      } else if (dateType === 'date') {
        dateParam = `${dateValue.getFullYear()}-${String(dateValue.getMonth() + 1).padStart(2, '0')}-${String(dateValue.getDate()).padStart(2, '0')}`;
      } else if (dateType === 'range') {
        const start = rangeDates[0];
        const end = rangeDates[1];
        dateParam = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}:${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;
      }

      const response = await api.get(`api/raw_material/schedules?date=${dateParam}`);
      
      if (response.data.error) {
        throw new Error(response.data.error);
      }

      setSchedules(response.data);
      setFilteredSchedules(response.data);
      
      const components = [...new Set(response.data.map(item => item.component))];
      const customers = [...new Set(response.data.map(item => item.customer))];
      
      setAvailableComponents(components.map(c => ({ label: c, value: c })));
      setAvailableCustomers(customers.map(c => ({ label: c, value: c })));
      
      showToast('success', 'Success', 'Data fetched successfully');
    } catch (err) {
      showToast('error', 'Error', err.message || 'Failed to fetch schedules');
      setSchedules([]);
      setFilteredSchedules([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    fetchSchedules();
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
};


  const weightBodyTemplate = (rowData) => {
    return `${rowData.weight} kg`;
  };

  const dateBodyTemplate = (rowData) => {
    return formatDate(rowData.date1);
  };

  const createdBodyTemplate = (rowData) => {
    return formatDate(rowData.created_at);
  };

  const clearFilters = () => {
    setComponentFilter([]);
    setCustomerFilter([]);
    showToast('info', 'Filters Cleared', 'All filters have been reset');
  };

  const fetchComponentSuggestions = async (query) => {
    setLoadingSuggestions(true);
    try {
      const response = await api.get(`api/raw_material/masterlist/suggestions`, {
        params: { q: query },
      });
      setSuggestions(response.data);
    } catch (error) {
      console.error('Error fetching component suggestions:', error);
      showToast('error', 'Error', 'Failed to fetch component suggestions');
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleSelectSuggestion = async (component) => {
    setFormData(prev => ({
      ...prev,
      component,
    }));

    try {
      const detailsResponse = await api.get(
        `api/raw_material/masterlist/details/`,
        { params: { component } }
      );
      const data = detailsResponse.data;

      setFormData(prev => ({
        ...prev,
        component,
        standerd: data.standerd,
        customer: data.customer,
        grade: data.grade,
        dia: data.dia,
        slug_weight: data.slug_weight,
        location:data.location,
      }));
    } catch (error) {
      console.error('Error:', error);
      showToast('error', 'Error', 'Please enter a correct part number');
      setFormData(prev => ({
        ...prev,
        component: '',
        customer: '',
        grade: '',
        dia: '',
        slug_weight: '',
      }));
    }
    setSuggestions([]);
  };

  const checkForDuplicates = async () => {
    if (!formData.component || !formData.date1) return false;
    
    try {
      const dateStr = formData.date1.toISOString().split('T')[0];
      const response = await api.get(
        `api/raw_material/schedules/`,
        {
          params: {
            component: formData.component,
            exact_date: dateStr,
            check_duplicates: true
          }
        }
      );

      if (response.data.exists) {
        setExistingSchedules(response.data.schedules);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error checking duplicates:', error);
      showToast('error', 'Error', 'Failed to check for duplicates');
      return false;
    }
  };

  const handleSaveSchedule = async () => {
    if (!formData.component || !formData.date1 || formData.pices <= 0) {
      showToast('error', 'Validation Error', 'Please fill all required fields with valid values');
      return;
    }

    setLoading(true);
    
    try {
      const hasDuplicates = await checkForDuplicates();
      
      if (hasDuplicates) {
        setShowDuplicateDialog(true);
      } else {
        await createNewSchedule();
      }
    } catch (error) {
      console.error('Error:', error);
      showToast('error', 'Error', 'Failed to save schedule. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const createNewSchedule = async (forceCreate = false) => {
  try {
    const weight = formData.slug_weight * formData.pices;
    
    const payload = {
      ...formData,
      weight: weight.toFixed(2),
      date1: formData.date1.toISOString().split('T')[0],
    };

    const config = {
      params: {}
    };

    if (forceCreate) {
      config.params.force_create = true;
    }

    const response = await api.post(
      'api/raw_material/schedules/',
      payload,
      config
    );

    if (response.status === 201) {
      fetchSchedules();
      setShowAddDialog(false);
      setShowDuplicateDialog(false);
      resetForm();
      setSuccessMessage('Schedule created successfully! Do you want to plan this for forging production?');
      setShowSuccessPopup(true);
      
      // Create a complete schedule object with all necessary fields
      const newSchedule = {
        ...formData,
        id: response.data.id, // assuming the response includes the new ID
        weight: weight.toFixed(2),
        date1: formData.date1.toISOString().split('T')[0]
      };
      
      setSelectedSchedule(newSchedule);
    }
  } catch (error) {
    console.error('Error creating schedule:', error);
    showToast('error', 'Error', error.response?.data?.message || 'Failed to create schedule');
    throw error;
  }
};

const updateSchedule = async (schedule) => {
  try {
    const updatedPices = schedule.pices + formData.pices;
    const updatedWeight = parseFloat(schedule.weight) + (formData.slug_weight * formData.pices);
    
    const response = await api.put(
      `api/raw_material/schedules/${schedule.id}/`,
      {
        pices: updatedPices,
        weight: updatedWeight.toFixed(2),
        location: formData.location || schedule.location,
        supplier: formData.supplier || schedule.supplier,
        verified_by: formData.verified_by || schedule.verified_by
      }
    );

    if (response.status === 200) {
      fetchSchedules();
      setShowDuplicateDialog(false);
      setShowAddDialog(false);
      resetForm();
      setSuccessMessage('Schedule updated successfully! Do you want to plan this for forging production?');
      setShowSuccessPopup(true);
      
      // Create a complete schedule object with all necessary fields
      const updatedSchedule = {
        ...schedule,
        pices: updatedPices,
        weight: updatedWeight.toFixed(2),
        location: formData.location || schedule.location,
        supplier: formData.supplier || schedule.supplier,
        verified_by: formData.verified_by || schedule.verified_by
      };
      
      setSelectedSchedule(updatedSchedule);
    }
  } catch (error) {
    console.error('Error updating schedule:', error);
    showToast('error', 'Error', error.response?.data?.message || 'Failed to update schedule');
    throw error;
  }
};

  const resetForm = () => {
    setFormData({
      component: '',
      customer: '',
      grade: '',
      standerd: '',
      dia: '',
      slug_weight: '',
      pices: 0,
      weight: 0,
      date1: '',
      location: '',
      verified_by: user ? `${user.name} ${user.lastname}` : '', // Keep user's name
      supplier: ''
    });
    setExistingSchedules([]);
  };

  const addDialogFooter = (
    <div  className="flex justify-end gap-3 p-3 border-t border-gray-200">
      <Button 
        label="Cancel" 
        icon="pi pi-times" 
        onClick={() => {
          setShowAddDialog(false);
          resetForm();
        }} 
        className="p-button-text rounded-full bg-gray-200 hover:bg-blue-200 border-blue-600 rounded-full px-3 py-2" 
      />
      <Button 
        label="Save" 
        icon="pi pi-check" 
        onClick={handleSaveSchedule} 
        className="p-button-success bg-gray-200 hover:bg-blue-200 border-blue-200 rounded-full px-3 py-2 ml-2" 
        disabled={!formData.component || !formData.date1 || formData.pices <= 0}
      />
    </div>
  );

  const duplicateDialogFooter = (
    <div className="flex justify-end gap-3 p-3 border-t border-gray-200">
      <Button 
        label="Cancel" 
        icon="pi pi-times" 
        onClick={() => setShowDuplicateDialog(false)} 
        className="p-button-text rounded-full bg-gray-200 hover:bg-blue-200 border-blue-600 rounded-full px-3 py-2" 
      />
      <Button 
        label="Create New Anyway" 
        icon="pi pi-plus" 
        onClick={() => createNewSchedule(true)} 
        className="p-button-success rounded-full bg-gray-200 hover:bg-blue-200 border-blue-600 rounded-full px-3 py-2 ml-2" 
      />
    </div>
  );

  return (
    <div className="w-full mx-auto p-2 md:p-4">
    {/* Toast component for notifications */}
    <Toast ref={toast} position="bottom-center" className="md:bottom-right" />

    <div className="p-0 w-full mx-auto">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-3 gap-2">
  <h2 className="text-lg md:text-xl font-bold text-gray-800">Schedule Management</h2>
  
  <div className="flex flex-row items-center gap-2 w-full md:w-auto">
    <VisualDashboard 
      schedules={filteredSchedules} 
      totalWeight={totalWeight} 
      totalpices={totalpices} 
      className="w-full md:w-auto"
    />
    <Button 
      label="Add New Schedule" 
      icon="pi pi-plus" 
      onClick={() => setShowAddDialog(true)} 
      className="p-button-rounded p-button-info bg-gray-200 hover:bg-blue-200 border-blue-600 rounded-full px-3 py-2 text-xs"
    />
  </div>
</div>


      {/* Search Form */}
      <div className="w-full">
  <form
    onSubmit={handleSubmit}
    className="flex flex-col gap-2 bg-white p-2 rounded-lg shadow-sm border border-gray-200"
  >
    <div className="flex flex-wrap items-end gap-2 w-full">
      {/* Fetch Button (left) */}
      <div className="flex flex-col w-full max-w-[100px] sm:w-auto ">
        <label className="invisible text-xs">Fetch</label>
        <Button
          type="submit"
          label="Fetch"
          icon="pi pi-search"
          className="p-button-raised bg-blue-600 text-sl hover:bg-blue-700 border border-blue-600 text-white  px-3 py-1.5 shadow-sm w-full"
          disabled={loading}
        />
      </div>

      {/* Date Type Dropdown */}
      <div className="flex flex-col max-w-[180px] w-full space-y-1 p-2 border border-black">
        <Dropdown
          id="dateType"
          value={dateType}
          options={dateTypeOptions}
          onChange={(e) => setDateType(e.value)}
          placeholder="Select"
          showIcon
          view="dateType"
            className="w-full text-xs"
            touchUI={true}
        />
      </div>

      {/* Conditional Date Fields */}
      {dateType === 'month' && (
        <div className="flex flex-col max-w-[180px] w-full space-y-1  ">
          <label htmlFor="month" className="text-xs text-gray-600">Month</label>
          <Calendar
            id="month"
            value={dateValue}
            onChange={(e) => setDateValue(e.value)}
            view="month"
            dateFormat="mm/yy"
            showIcon
            placeholder="Month"
            className="w-full text-xs border border-black p-3"
            touchUI={true}
          />
        </div>
      )}

      {dateType === 'date' && (
        <div className="flex flex-col max-w-[180px] w-full space-y-1">
          <label htmlFor="date" className="text-xs text-gray-600">Date</label>
          <Calendar
            id="date"
            value={dateValue}
            onChange={(e) => setDateValue(e.value)}
            dateFormat="dd/mm/yy"
            showIcon
            placeholder="Date"
            className="w-full text-xs border border-black p-3"
            touchUI={true}
          />
        </div>
      )}

      {/* Start and End Date side by side */}
      {dateType === 'range' && (
        <div className="flex flex-row flex-wrap gap-2">
          <div className="flex flex-col max-w-[160px] w-full space-y-1">
            <label htmlFor="startDate" className="text-xs text-gray-600">Start</label>
            <Calendar
              id="startDate"
              value={rangeDates[0]}
              onChange={(e) => setRangeDates([e.value, rangeDates[1]])}
              dateFormat="dd/mm/yy"
              showIcon
              placeholder="Start Date"
              className="w-full text-xs border border-black p-3"
              touchUI={true}
            />
          </div>
          <div className="flex flex-col max-w-[160px] w-full space-y-1">
            <label htmlFor="endDate" className="text-xs text-gray-600">End</label>
            <Calendar
              id="endDate"
              value={rangeDates[1]}
              onChange={(e) => setRangeDates([rangeDates[0], e.value])}
              dateFormat="dd/mm/yy"
              showIcon
              placeholder="End Date"
              className="w-full text-xs border border-black p-3"
              touchUI={true}
            />
          </div>
        </div>
      )}
       {/* Summary */}
        <div className="text-sl font-bold bg-blue-50 px-4 py-3 rounded text-blue-700 w-full md:w-auto text-center">
          Total Weight: {totalWeight} kg | Total Pieces: {totalpices} Pcs.
        </div>
        </div>

      
      </form>
    </div>





      {loading && (
        <div className="flex justify-center mt-4">
          <ProgressSpinner />
        </div>
      )}

      {!loading && schedules.length > 0 && (
        <div className="mt-4">
          

          {/* Filter Section */}
          <div className="flex flex-col md:flex-row flex-wrap gap-2 mb-3 p-3 bg-gray-50 rounded border border-gray-200">
  <div className="field w-full md:flex-1">
    <MultiSelect
      id="componentFilter"
      value={componentFilter}
      options={availableComponents}
      onChange={(e) => setComponentFilter(e.value)}
      placeholder="Components"
      display="chip"
      className="w-full text-xs p-3"
      filter
      panelClassName="w-full md:w-64"
    />
  </div>

  <div className="field w-full md:flex-1">
    <MultiSelect
      id="customerFilter"
      value={customerFilter}
      options={availableCustomers}
      onChange={(e) => setCustomerFilter(e.value)}
      placeholder="Customers"
      display="chip"
      className="w-full text-xs p-3"
      filter
      panelClassName="w-full md:w-64"
    />
  </div>

  <div className="field w-full md:w-auto flex justify-end md:items-end">
    <Button
      label="Clear"
      icon="pi pi-filter-slash"
      className="p-button-text p-button-sm text-xs p-3 text-blue-600 hover:text-blue-800 w-full md:w-auto"
      onClick={clearFilters}
    />
  </div>
</div>


          {/* Data Table */}
          <div className="relative bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto p-3">
  <DataTable
    value={filteredSchedules}
    paginator
    rows={10}
    rowsPerPageOptions={[10, 20, 50]}
    paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
    paginatorClassName="flex items-center justify-between px-4 py-1"
    currentPageReportTemplate="Showing {first} to {last} of {totalRecords}"
    responsiveLayout="scroll"
    scrollable
    scrollHeight={tableHeight}
    className="p-datatable-sm text-[11px]  md:text-xs p-datatable-gridlines p-datatable-striped"
    headerClassName="sticky top-0 z-10 bg-gray-100 font-medium text-gray-700"
    rowClassName={() => 'hover:bg-gray-50'}
    emptyMessage="No data found"
  >
    <Column field="component" header="Component" style={{ minWidth: '90px' }} />
    <Column field="customer" header="Customer" style={{ minWidth: '90px' }} />
    <Column field="grade" header="Grade" style={{ minWidth: '70px' }} />
    <Column
      field="dia"
      header="Dia"
      style={{ minWidth: '60px' }}
      body={(rowData) => `${rowData.dia} mm`}
       bodyClassName="p-3" 
  headerClassName="p-3" 
    />
    <Column
      field="slug_weight"
      header="Slug Wt"
      style={{ minWidth: '70px' }}
      body={(rowData) => `${rowData.slug_weight} kg`}
    />
    <Column
      field="pices"
      header="Pieces"
      body={(rowData) => `${rowData.pices || 0} Pcs`}
      sortable
      style={{ minWidth: '70px' }}
    />
    <Column
      field="planned"
      header="Planned"
      body={(rowData) => `${rowData.planned || 0} Pcs`}
      sortable
      style={{ minWidth: '70px' }}
    />
    <Column
      field="date1"
      header="Delivery"
      body={dateBodyTemplate}
      sortable
      style={{ minWidth: '90px' }}
    />
    <Column field="location" header="Location" style={{ minWidth: '80px' }} />
    <Column field="verified_by" header="Verified By" style={{ minWidth: '90px' }} />
    <Column field="disclosure_status" header="Status" style={{ minWidth: '80px' }} />

    <Column
      header="Action"
      body={(rowData) => (
        <Button
          icon="pi pi-cog"
          className="p-button-sm p-button-rounded p-button-text p-button-secondary"
          onClick={() => {
            setSelectedSchedule(rowData);
            setShowBlockmtForm(true);
          }}
          tooltip="Plan Forging"
          tooltipOptions={{ position: 'top' }}
        />
      )}
      style={{ minWidth: '60px' }}
    />
  </DataTable>
</div>

        </div>
      )}

      {!loading && schedules.length === 0 && (
        <div className="mt-5 text-center bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="text-gray-500 text-base">
            No data available. Please select a date range and click 'Fetch Data'.
          </div>
        </div>
      )}
    </div>
      
      {/* Add Schedule Dialog */}
      <Dialog 
      visible={showAddDialog} 
      style={{ width: '95vw', maxWidth: '800px', }} 
      modal 
      className="p-fluid"
      footer={addDialogFooter}
      onHide={() => {
        setShowAddDialog(false);
        resetForm();
      }}
    >
        <ConfirmDialog />
        <div className="p-4 md:p-6 space-y-4">
        <div className="p-field mb-4 ">
          <label htmlFor="component" className="block text-lg  font-medium text-gray-700 mb-1">Component*</label>
          <div className="p-inputgroup relative">
            <InputText
              id="component"
              value={formData.component}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, component: e.target.value }));
                if (e.target.value.length > 1) {
                  fetchComponentSuggestions(e.target.value);
                } else {
                  setSuggestions([]);
                }
              }}
              placeholder="Start typing to search components"
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoComplete="off"
            />
            {loadingSuggestions && (
              <span className="p-inputgroup-addon">
                <i className="pi pi-spinner pi-spin" />
              </span>
            )}
          </div>
          {suggestions.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
              {suggestions.map((item, index) => (
                <div 
                  key={index} 
                  className="suggestion-item p-2 border-b border-gray-200 cursor-pointer hover:bg-blue-50"
                  onClick={() => handleSelectSuggestion(item)}
                >
                  {item}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="field">
            <label htmlFor="customer" className="block text-lg  font-medium text-gray-700 mb-1">Customer</label>
            <InputText 
              id="customer" 
              value={formData.customer} 
              readOnly 
              className="w-full bg-gray-100"
            />
          </div>
          <div className="field">
            <label htmlFor="grade" className="block text-lg  font-medium text-gray-700 mb-1">Grade</label>
            <InputText 
              id="grade" 
              value={formData.grade} 
              readOnly 
              className="w-full bg-gray-100"
            />
          </div>
          <div className="field hidden">
            <label htmlFor="standerd" className="block text-lg  font-medium text-gray-700 mb-1">Standard</label>
            <InputText 
              id="standerd" 
              value={formData.standerd} 
              readOnly 
              className="w-full bg-gray-100"
            />
          </div>
          <div className="field">
            <label htmlFor="dia" className="block text-lg  font-medium text-gray-700 mb-1">Diameter</label>
            <InputText 
              id="dia" 
              value={formData.dia} 
              readOnly 
              className="w-full bg-gray-100"
            />
          </div>
          <div className="field">
            <label htmlFor="slug_weight" className="block text-lg  font-medium text-gray-700 mb-1">Slug Weight (kg)</label>
            <InputText 
              id="slug_weight" 
              value={formData.slug_weight} 
              readOnly 
              className="w-full bg-gray-100"
            />
          </div>
          
          <div className="field">
            <label htmlFor="location" className="block text-lg  font-medium text-gray-700 mb-1">Location</label>
            <InputText 
              id="location" 
              value={formData.location} 
              onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
              className="w-full bg-gray-100"
              readOnly
            />
          </div>
          <div className="field">
            <label htmlFor="weight" className="block text-lg  font-medium text-gray-700 mb-1">Total Weight (kg)</label>
            <InputText 
              id="weight" 
              value={formData.weight} 
              readOnly 
              className="w-full bg-gray-100"
            />
          </div>
          <div className="field">
            <label htmlFor="pices" className="block text-lg  font-medium text-gray-700 mb-1">Pieces*</label>
            <InputNumber 
              id="pices" 
              value={formData.pices} 
              onValueChange={(e) => {
                const pieces = e.value || 0;
                const weight = pieces * formData.slug_weight;
                setFormData(prev => ({
                  ...prev,
                  pices: pieces,
                  weight: weight.toFixed(2)
                }));
              }}
              mode="decimal" 
              min={0}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="field">
            <label htmlFor="date1" className="block text-lg  font-medium text-gray-700 mb-1">Delivery Date*</label>
            <Calendar 
              id="date1" 
              value={formData.date1} 
              onChange={(e) => setFormData(prev => ({ ...prev, date1: e.value }))}
              dateFormat="dd/mm/yy" 
              showIcon 
              required 
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="field">
            <label htmlFor="verified_by" className="block text-lg  font-medium text-gray-700 mb-1">Verified By</label>
            <InputText 
              id="verified_by" 
              value={formData.verified_by} 
              readOnly 
              className="w-full bg-gray-100"
            />
          </div>
          </div>
        </div>
      </Dialog>

      {/* Success Popup Dialog */}
<Dialog
  visible={showSuccessPopup}
  onHide={() => setShowSuccessPopup(false)}
  header="Success"
  style={{ width: '50vw' }}
  className="success-dialog"
   contentStyle={{ padding: '20px', backgroundColor: '#fff' }}
  footer={
    <div className='p-3'>
      <Button 
        label="No, Thanks" 
        icon="pi pi-times" 
        onClick={() => setShowSuccessPopup(false)} 
        className="p-button-text rounded-full bg-gray-200 hover:bg-blue-200 border-blue-600 rounded-full px-3 py-2" 
      />
      <Button 
        label="Yes, Plan for Forging" 
        icon="pi pi-check" 
        onClick={() => {
          setShowSuccessPopup(false);
          setShowBlockmtForm(true);
        }} 
        className="p-button-success bg-green-500 hover:bg-green-600 border-green-600 rounded-full px-3 py-2 ml-2" 
      />
    </div>
  }
>
  <div className="flex items-center">
    <i className="pi pi-check-circle text-green-500 text-4xl mr-3"></i>
    <div>
      <p className="text-lg font-medium text-gray-800 p-5">{successMessage}</p>
    </div>
  </div>
</Dialog>

{/* Blockmt Form Dialog */}
<Dialog
  visible={showBlockmtForm}
  onHide={() => setShowBlockmtForm(false)}
  style={{ width: '80vw', maxWidth: '900px' }}
  modal
>
  <BlockmtForm1 
  schedule={selectedSchedule} 
  onClose={() => setShowBlockmtForm(false)}
  onSuccess={(plannedQuantity) => {
    setSchedules(prevSchedules => 
      prevSchedules.map(schedule => 
        schedule.id === selectedSchedule.id 
          ? { ...schedule, planned: (schedule.planned || 0) + parseInt(plannedQuantity) }
          : schedule
      )
    );
    setShowBlockmtForm(false);
    showToast('success', 'Success', 'Forging production planned successfully');
  }}
/>

</Dialog>

      {/* Duplicate Schedules Dialog */}
      <Dialog
        visible={showDuplicateDialog}
        onHide={() => setShowDuplicateDialog(false)}
        header="Duplicate Schedules Found"
        style={{ width: '70vw', maxWidth: '900px' }}
         contentStyle={{ padding: '20px', backgroundColor: '#fff' }}
        footer={duplicateDialogFooter}
      >
        <div style={{ padding: '20px' }}></div>
        <div className="mb-4 p-4 bg-yellow-50 border-l-4 border-yellow-400">
          <div className="flex">
            <div className="flex-shrink-0">
              <i className="pi pi-exclamation-triangle text-yellow-500 text-xl"></i>
            </div>
            <div className="ml-3">
              <p className="text-lg text-yellow-700">
                This component already has {existingSchedules.length} schedule(s) for the selected Month.
              </p>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1">
          <div className="col-span-1">
            <h4 className="text-lg font-medium text-gray-800 mb-3">Existing Schedules:</h4>
            <DataTable 
              value={existingSchedules} 
              paginator 
              rows={5}
              className="p-datatable-striped p-datatable-gridlines"
              rowClassName={() => 'hover:bg-gray-50'}
            >
              <Column field="component" header="Component" style={{ minWidth: '180px' }} />
              <Column field="pices" header="Pieces" style={{ minWidth: '100px' }} />
              <Column field="weight" header="Weight" body={weightBodyTemplate} style={{ minWidth: '120px' }} />
              <Column field="date1" header="Date" body={dateBodyTemplate} style={{ minWidth: '120px' }} />
              <Column field="verified_by" header="Verified By" style={{ minWidth: '150px' }} />
              <Column 
                header="Action" 
                body={(rowData) => (
                  <Button
                    label="Add to This"
                    icon="pi pi-plus"
                    className="p-button-success bg-green-100 hover:bg-green-300 border-blue-600 rounded-full px-3 py-2"
                    onClick={() => updateSchedule(rowData)}
                  />
                )}
                style={{ minWidth: '150px',padding:'2px' }}
              />
            </DataTable>
          </div>
        </div>
      </Dialog>
    </div>
  );
};

export default ScheduleViewer;