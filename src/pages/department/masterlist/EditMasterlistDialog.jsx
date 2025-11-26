import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  MenuItem,
  Divider,
  Box,
  Paper,
  List,
  ListItem,
  ListItemText,
  InputAdornment,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
} from '@mui/material';
import { useAuth } from "../../../context/AuthContext";
import api from "../../services/service";

// Define dropdown options
const dropdownOptions = {
  running_status: ["Active", "Inactive", "On Hold", "Completed", "Discontinued", "Running", "Not Running", "NPD"],
};

const EditMasterlistDialog = ({ 
  open, 
  onClose, 
  selectedMasterlist, 
  onSave 
}) => {
  const { user } = useAuth();
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

  const [fieldErrors, setFieldErrors] = useState({
    customer: "",
    supplier: "",
    grade: "",
    customer_location: "",
    forging_line: "",
  });

  const [isLoading, setIsLoading] = useState(false);
  const dropdownRefs = useRef({});

  // Initialize form data when dialog opens or selectedMasterlist changes
  useEffect(() => {
    if (open && selectedMasterlist) {
      // Ensure all values are strings, not null
      const sanitizedData = {};
      Object.keys(formData).forEach(key => {
        sanitizedData[key] = selectedMasterlist[key] || "";
      });
      setFormData(sanitizedData);
      
      // Set selected values based on current data
      const newSelectedValues = {};
      Object.keys(selectedValues).forEach(field => {
        if (selectedMasterlist[field]) {
          newSelectedValues[field] = { name: selectedMasterlist[field] };
        }
      });
      setSelectedValues(prev => ({ ...prev, ...newSelectedValues }));
    } else if (open) {
      // Reset form for new component
      setFormData({
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
        verified_by: user ? `${user.first_name || user.name || ""} ${user.last_name || user.lastname || ""}`.trim() : "",
      });
    }
  }, [open, selectedMasterlist, user]);

  // Set verified_by from user data
  useEffect(() => {
    if (user && open && !selectedMasterlist) {
      const firstName = user.first_name || user.name || "";
      const lastName = user.last_name || user.lastname || "";
      setFormData(prev => ({
        ...prev,
        verified_by: `${firstName} ${lastName}`.trim()
      }));
    }
  }, [user, open, selectedMasterlist]);

  // Fetch all suggestions when dialog opens
  useEffect(() => {
    if (open) {
      fetchAllSuggestions();
    }
  }, [open]);

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

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

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
        customer: responses[0]?.data || [],
        grade: responses[1]?.data || [],
        supplier: responses[2]?.data || [],
        customer_location: responses[3]?.data || [],
        forging_line: responses[4]?.data || [],
      };

      setAllSuggestions(newAllSuggestions);
      
      // Also populate dropdown options
      dropdownOptions.customer_location = (newAllSuggestions.customer_location || []).map(item => getDisplayValue(item));
      dropdownOptions.forging_line = (newAllSuggestions.forging_line || []).map(item => getDisplayValue(item));

    } catch (error) {
      console.error("Failed to fetch suggestions:", error);
      // Initialize with empty arrays if API fails
      setAllSuggestions({
        customer: [],
        grade: [],
        supplier: [],
        customer_location: [],
        forging_line: [],
      });
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
    const fieldSuggestions = allSuggestions[field] || [];
    
    if (!value) {
      setFilteredSuggestions(prev => ({ ...prev, [field]: fieldSuggestions.slice(0, 10) }));
      return;
    }

    const normalizedValue = normalizeString(value);
    
    const filtered = fieldSuggestions.filter(item => {
      const itemValue = getDisplayValue(item);
      return normalizeString(itemValue).includes(normalizedValue);
    }).slice(0, 10);

    setFilteredSuggestions(prev => ({ ...prev, [field]: filtered }));
  };

  const handleInputFocus = (field) => {
    setActiveDropdown(field);
    if (!formData[field]) {
      const fieldSuggestions = allSuggestions[field] || [];
      setFilteredSuggestions(prev => ({ 
        ...prev, 
        [field]: fieldSuggestions.slice(0, 10) 
      }));
    }
  };

  const handleInputChange = async (field, value) => {
    // Ensure value is never null
    const safeValue = value === null ? "" : value;
    setFormData(prev => ({ ...prev, [field]: safeValue }));

    // Clear selected value when user starts typing
    if (safeValue !== getDisplayValue(selectedValues[field])) {
      setSelectedValues(prev => ({ ...prev, [field]: null }));
    }

    // Filter suggestions from pre-loaded data
    filterSuggestions(field, safeValue);

    // Show dropdown
    setActiveDropdown(field);

    // Clear error when user starts typing
    if (fieldErrors[field]) {
      setFieldErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  const handleSuggestionClick = (field, item) => {
    const value = getDisplayValue(item);
    setFormData(prev => ({ ...prev, [field]: value }));
    setSelectedValues(prev => ({ ...prev, [field]: item }));
    setActiveDropdown(null);
    setFilteredSuggestions(prev => ({ ...prev, [field]: [] }));
    
    // Clear any existing error for this field
    if (fieldErrors[field]) {
      setFieldErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  const handleInputBlur = (field, value) => {
    // Delay hiding dropdown to allow for click events
    setTimeout(() => {
      setActiveDropdown(null);
    }, 200);

    // Validate if the value exists in suggestions for ALL suggestion fields
    if (['customer', 'supplier', 'grade', 'customer_location', 'forging_line'].includes(field) && value) {
      const fieldSuggestions = allSuggestions[field] || [];
      const exactMatch = fieldSuggestions.find(item => {
        const suggestionValue = getDisplayValue(item);
        return normalizeString(suggestionValue) === normalizeString(value);
      });

      if (!exactMatch) {
        setFieldErrors(prev => ({ 
          ...prev, 
          [field]: `Please select a valid ${field.replace('_', ' ')} from the dropdown` 
        }));
        setFormData(prev => ({ ...prev, [field]: "" }));
        setSelectedValues(prev => ({ ...prev, [field]: null }));
      } else {
        // Clear error if valid and set selected value
        setFieldErrors(prev => ({ ...prev, [field]: "" }));
        setSelectedValues(prev => ({ ...prev, [field]: exactMatch }));
      }
    }
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

    setFieldErrors(errors);
    return isValid;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      await onSave(formData);
      handleClose();
    } catch (error) {
      console.error('Error saving component:', error);
    }
  };

  const handleClose = () => {
    setFormData({
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
    setSelectedValues({
      customer: null,
      supplier: null,
      grade: null,
      customer_location: null,
      forging_line: null,
    });
    setFieldErrors({
      customer: "",
      supplier: "",
      grade: "",
      customer_location: "",
      forging_line: "",
    });
    setActiveDropdown(null);
    onClose();
  };

  // Fields with suggestions
  const suggestionFields = [
    { id: "customer", label: "Customer*", required: true },
    { id: "supplier", label: "Supplier*", required: true },
    { id: "grade", label: "Material Grade*", required: true },
    { id: "customer_location", label: "Delivery Location", required: false },
    { id: "forging_line", label: "Forging Line", required: false },
  ];

  // Field groups for 4-column layout
  const fieldGroups = [
    // Row 1: Basic Information
    [
      { id: "component", label: "Component Name*", type: "text", required: true, readOnly: !!selectedMasterlist },
      { id: "part_name", label: "Part Name*", type: "text", required: true },
      { id: "drawing_sr_number", label: "Drawing Number", type: "text" },
      { id: "drawing_rev_number", label: "Drawing Rev Number", type: "text" },
    ],
    // Row 2: Suggestion Fields
    [
      { id: "customer", label: "Customer*", type: "suggestion", required: true },
      { id: "supplier", label: "Supplier*", type: "suggestion", required: true },
      { id: "grade", label: "Material Grade*", type: "suggestion", required: true },
      { id: "running_status", label: "Running Status", type: "select" },
    ],
    // Row 3: More Basic Info
    [
      { id: "customer_location", label: "Delivery Location", type: "suggestion" },
      { id: "forging_line", label: "Forging Line", type: "suggestion" },
      { id: "drawing_rev_date", label: "Drawing Rev Date", type: "date" },
      { id: "packing_condition", label: "Packing Condition", type: "text" },
    ],
    // Row 4: Specifications
    [
      { id: "slug_weight", label: "Slug Weight (Kg)", type: "number", step: "0.01" },
      { id: "ring_weight", label: "Ring Weight (Kg)", type: "number", step: "0.01" },
      { id: "dia", label: "Bar Diameter (MM)", type: "number" },
      { id: "cost", label: "Cost (Rs)", type: "number", step: "0.01" },
    ],
    // Row 5: Process Details
    [
      { id: "ht_process", label: "HT Process", type: "text" },
      { id: "hardness_required", label: "Hardness Required", type: "text" },
      { id: "op_10_time", label: "OP 10 Time (seconds)", type: "number" },
      { id: "op_10_target", label: "OP 10 Target", type: "number" },
    ],
    // Row 6: More Production Details
    [
      { id: "op_20_time", label: "OP 20 Time (seconds)", type: "number" },
      { id: "op_20_target", label: "OP 20 Target", type: "number" },
      { id: "component_cycle_time", label: "Component Cycle Time", type: "number" },
      { id: "standerd", label: "Standard", type: "text" },
    ],
    // Row 7: Remarks and Verification
    [
      { id: "cnc_target_remark", label: "CNC Target Remark", type: "textarea", rows: 2, fullWidth: true },
      { id: "verified_by", label: "Verified By*", type: "text", required: true, readOnly: true },
    ]
  ];

  const renderField = (fieldConfig) => {
    const { id, label, type, required, readOnly, step, rows, fullWidth } = fieldConfig;

    // Ensure formData value is never null
    const fieldValue = formData[id] || "";

    if (type === "suggestion") {
      return (
        <Box 
          key={id} 
          sx={{ position: 'relative' }}
          ref={el => dropdownRefs.current[id] = el}
        >
          <TextField
            fullWidth
            label={label}
            name={id}
            value={fieldValue}
            onChange={(e) => handleInputChange(id, e.target.value)}
            onFocus={() => handleInputFocus(id)}
            onBlur={(e) => handleInputBlur(id, e.target.value)}
            required={required}
            error={!!fieldErrors[id]}
            helperText={fieldErrors[id]}
            autoComplete="off"
            placeholder={`Type to search ${label.toLowerCase()}...`}
            size="small"
            InputProps={{
              endAdornment: isLoading && (
                <InputAdornment position="end">
                  <CircularProgress size={16} />
                </InputAdornment>
              ),
            }}
          />

          {activeDropdown === id && (filteredSuggestions[id] || []).length > 0 && (
            <Paper 
              elevation={3}
              sx={{
                position: 'absolute',
                zIndex: 9999,
                width: '100%',
                maxHeight: 160,
                overflow: 'auto',
                mt: 0.5
              }}
            >
              <List dense sx={{ py: 0 }}>
                {(filteredSuggestions[id] || []).map((item, index) => {
                  const displayValue = getDisplayValue(item);
                  return (
                    <ListItem
                      key={index}
                      button
                      onClick={() => handleSuggestionClick(id, item)}
                      onMouseDown={(e) => e.preventDefault()}
                      sx={{ py: 0.5, minHeight: 'auto' }}
                    >
                      <ListItemText 
                        primary={displayValue} 
                        primaryTypographyProps={{ fontSize: '0.875rem' }}
                      />
                    </ListItem>
                  );
                })}
              </List>
            </Paper>
          )}

          {activeDropdown === id && (filteredSuggestions[id] || []).length === 0 && fieldValue && (
            <Paper 
              elevation={3}
              sx={{
                position: 'absolute',
                zIndex: 9999,
                width: '100%',
                mt: 0.5,
                p: 1,
                textAlign: 'center'
              }}
            >
              No matches found
            </Paper>
          )}
        </Box>
      );
    }

    if (type === "select" && id === "running_status") {
      return (
        <FormControl fullWidth size="small" key={id}>
          <InputLabel>{label}</InputLabel>
          <Select
            value={fieldValue}
            onChange={(e) => handleInputChange(id, e.target.value)}
            label={label}
            size="small"
          >
            <MenuItem value="">Select Status</MenuItem>
            {dropdownOptions.running_status.map((option, index) => (
              <MenuItem key={index} value={option}>
                {option}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      );
    }

    if (type === "textarea") {
      return (
        <TextField
          key={id}
          fullWidth={fullWidth}
          label={label}
          name={id}
          value={fieldValue}
          onChange={(e) => handleInputChange(id, e.target.value)}
          multiline
          rows={rows || 2}
          required={required}
          error={!!fieldErrors[id]}
          helperText={fieldErrors[id]}
          size="small"
        />
      );
    }

    return (
      <TextField
        key={id}
        fullWidth
        label={label}
        name={id}
        type={type === "date" ? "date" : type === "number" ? "number" : "text"}
        value={fieldValue}
        onChange={(e) => handleInputChange(id, e.target.value)}
        required={required}
        error={!!fieldErrors[id]}
        helperText={fieldErrors[id]}
        InputProps={{
          readOnly: readOnly,
          inputProps: type === "number" ? { step: step || "1" } : {}
        }}
        InputLabelProps={type === "date" ? { shrink: true } : {}}
        size="small"
      />
    );
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="lg" 
      fullWidth
      sx={{
        '& .MuiDialog-paper': {
          margin: 1,
          width: '100%',
          maxWidth: '1200px',
        }
      }}
    >
      <DialogTitle sx={{ py: 1.5, px: 2 }}>
        {selectedMasterlist ? 'Edit Component' : 'Add New Component'}
      </DialogTitle>
      <DialogContent dividers sx={{ py: 1, px: 2 }}>
        <Grid container spacing={1.5}>
          {fieldGroups.map((row, rowIndex) => (
            <React.Fragment key={rowIndex}>
              {row.map((fieldConfig, colIndex) => (
                <Grid 
                  item 
                  xs={12} 
                  sm={6} 
                  md={fieldConfig.fullWidth ? 12 : 3} 
                  key={fieldConfig.id}
                  sx={{ 
                    display: 'flex',
                    alignItems: 'flex-start'
                  }}
                >
                  {renderField(fieldConfig)}
                </Grid>
              ))}
              {rowIndex < fieldGroups.length - 1 && row.some(field => !field.fullWidth) && (
                <Grid item xs={12} sx={{ py: 0.5 }}>
                  <Divider />
                </Grid>
              )}
            </React.Fragment>
          ))}
        </Grid>
      </DialogContent>
      <DialogActions sx={{ py: 1, px: 2 }}>
        <Button onClick={handleClose} size="small">Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" color="primary" size="small">
          {selectedMasterlist ? 'Update' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditMasterlistDialog;