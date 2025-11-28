import React, { useState, useEffect } from "react";
import {
  Dialog, DialogTitle, DialogContent,
  TextField, Button, MenuItem, Alert, Box,
  Typography, Divider, Autocomplete
} from "@mui/material";
import { stockIn, stockOut, getHoldMaterials, getAvailableMaterialsForOut, searchBatches, getBatchDetails } from "../api/inventoryApi";
import { useAuth } from "../../../context/AuthContext";

export default function AddTransactionModal({
  open, handleClose, mode, location, refresh
}) {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [debugInfo, setDebugInfo] = useState("");
  const [batchSearchTerm, setBatchSearchTerm] = useState("");
  const [batchSuggestions, setBatchSuggestions] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [componentOptions, setComponentOptions] = useState([]);
  const [showComponentDropdown, setShowComponentDropdown] = useState(false);
  const { user } = useAuth();
const firstName = user?.first_name || user?.name || "";
const lastName = user?.last_name || user?.lastname || "";
const fullName = `${firstName} ${lastName}`.trim();

  const [form, setForm] = useState({
    material: "",
    location: "",
    slug_weight: "",
    qty: "",
    verified_by: fullName,
    selected_component: ""
  });

  // Search batches when user types more than 2 characters
  useEffect(() => {
    const searchBatchesAsync = async () => {
      if (batchSearchTerm.length < 2) {
        setBatchSuggestions([]);
        return;
      }

      try {
        const response = await searchBatches(batchSearchTerm);
        setBatchSuggestions(response.data);
      } catch (err) {
        console.error('Error searching batches:', err);
        setBatchSuggestions([]);
      }
    };

    const debounceTimer = setTimeout(searchBatchesAsync, 300);
    return () => clearTimeout(debounceTimer);
  }, [batchSearchTerm]);

  // Load appropriate materials based on mode (IN/OUT)
  useEffect(() => {
    const loadMaterials = async () => {
      if (!open || !location) return;
      
      setLoading(true);
      setError("");
      setDebugInfo(`Loading materials for ${mode} transaction in location: ${location.code} (ID: ${location.id})`);
      
      try {
        if (mode === "IN") {
          // For IN transactions, we'll use batch search instead of showing all materials
          setMaterials([]);
          setDebugInfo("Use batch search above to find materials");
        } else {
          // For OUT transactions, show only materials available in this location
          console.log(`DEBUG: Fetching available materials for location ID: ${location.id}`);
          const response = await getAvailableMaterialsForOut(location.id);
          console.log('DEBUG: Available materials response:', response.data);
          setMaterials(response.data);
          setDebugInfo(prev => prev + `\nOUT: Loaded ${response.data.length} available materials`);
        }
      } catch (err) {
        const errorMsg = err.response?.data?.error || err.message;
        setError(`Failed to load materials: ${errorMsg}`);
        setDebugInfo(prev => prev + `\nError: ${errorMsg}`);
        console.error('DEBUG: Error loading materials:', err);
      } finally {
        setLoading(false);
      }
    };

    loadMaterials();
  }, [open, location, mode]);

  // Reset form when modal opens or mode changes
  useEffect(() => {
    if (open) {
      setForm({
        material: "",
        location: location?.id || "",
        slug_weight: "",
        qty: "",
       verified_by: fullName,
        selected_component: ""
      });
      setSelectedBatch(null);
      setBatchSearchTerm("");
      setBatchSuggestions([]);
      setComponentOptions([]);
      setShowComponentDropdown(false);
      setError("");
      setDebugInfo("");
    }
  }, [open, location, mode]);

  const handleBatchSelect = async (batchId) => {
    if (!batchId) return;
    
    setLoading(true);
    try {
      const response = await getBatchDetails(batchId);
      const batchData = response.data;
      
      setSelectedBatch(batchData);
      setComponentOptions(batchData.component_options);
      setShowComponentDropdown(batchData.has_parent_child);
      
      // Auto-fill form with batch data
      setForm(prev => ({
        ...prev,
        material: batchData.hold_material_id,
        slug_weight: batchData.slug_weight || "",
        selected_component: batchData.component_options[0] // Default to first option
      }));
      
      setDebugInfo(`Batch found: ${batchData.batch_id}. Component options: ${batchData.component_options.length}`);
      
    } catch (err) {
      const errorMsg = err.response?.data?.error || "Failed to load batch details";
      setError(errorMsg);
      setSelectedBatch(null);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === "material") {
      const selectedMaterial = materials.find(m => m.id === parseInt(value));
      setForm({ 
        ...form, 
        [name]: value,
        slug_weight: selectedMaterial ? selectedMaterial.slug_weight : ""
      });
    } else {
      setForm({ ...form, [name]: value });
    }
    setError("");
  };

  const handleSubmit = async () => {
    // Validation
    if (mode === "IN" && !selectedBatch) {
      setError("Please select a batch first");
      return;
    }

    if (!form.material || !form.location || !form.slug_weight || !form.qty || !form.verified_by) {
      setError("All fields are required");
      return;
    }

    if (form.qty <= 0) {
      setError("Quantity must be greater than 0");
      return;
    }

    // For IN transactions, validate against max pieces
    if (mode === "IN" && selectedBatch && form.qty > selectedBatch.max_qty) {
      setError(`Quantity exceeds maximum available pieces: ${selectedBatch.max_qty}`);
      return;
    }

    const payload = {
      ...form,
      material: parseInt(form.material),
      location: parseInt(form.location),
      slug_weight: parseFloat(form.slug_weight),
      qty: parseInt(form.qty),
    };

    try {
      if (mode === "IN") {
        await stockIn(payload);
      } else {
        await stockOut(payload);
      }
      refresh();
      handleClose();
    } catch (err) {
      const errorMsg = err.response?.data?.error || 
                      err.response?.data || 
                      "An error occurred";
      setError(typeof errorMsg === 'object' ? JSON.stringify(errorMsg) : errorMsg);
    }
  };

  const getMaterialDisplayText = (material) => {
    if (mode === "IN") {
      return `${material.component} — ${material.batch_id} (Remaining: ${material.remaining}kg)`;
    } else {
      return `${material.component} — ${material.batch_id} (Available: ${material.available_in_location})`;
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {mode === "IN" ? "Add Stock (IN)" : "Remove Stock (OUT)"}
        <Typography variant="body2" color="textSecondary">
          Location: {location?.code} (ID: {location?.id})
        </Typography>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mt: 1 }}>
            {error}
          </Alert>
        )}

        {/* Debug information - you can remove this in production */}
        {process.env.NODE_ENV === 'development' && debugInfo && (
          <Alert severity="info" sx={{ mt: 1, fontSize: '0.8rem' }}>
            <Typography variant="caption">
              Debug: {debugInfo}
              <br />
              Materials array length: {materials.length}
            </Typography>
          </Alert>
        )}

        {mode === "IN" && (
          <>
            <Autocomplete
              freeSolo
              options={batchSuggestions}
              inputValue={batchSearchTerm}
              onInputChange={(event, newValue) => {
                setBatchSearchTerm(newValue);
              }}
              onChange={(event, newValue) => {
                if (newValue) {
                  handleBatchSelect(newValue);
                }
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Search Batch ID"
                  sx={{ mt: 2 }}
                  helperText="Type at least 2 characters to search batches"
                />
              )}
            />

            {selectedBatch && (
              <Box sx={{ mt: 2, p: 2, border: '1px solid #ddd', borderRadius: 1 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Batch Details:
                </Typography>
                <Typography variant="body2">
                  <strong>Batch ID:</strong> {selectedBatch.batch_id}
                </Typography>
                <Typography variant="body2">
                  <strong>Original Component:</strong> {selectedBatch.original_component}
                </Typography>
                <Typography variant="body2">
                  <strong>Cleaned Component:</strong> {selectedBatch.cleaned_component}
                </Typography>
                <Typography variant="body2">
                  <strong>Max Pieces:</strong> {selectedBatch.max_qty}
                </Typography>
                <Typography variant="body2">
                  <strong>Remaining Weight:</strong> {selectedBatch.remaining} kg
                </Typography>
              </Box>
            )}

            {showComponentDropdown && (
              <TextField
                select
                label="Select Component"
                name="selected_component"
                fullWidth
                sx={{ mt: 2 }}
                value={form.selected_component}
                onChange={handleChange}
                required
                helperText="Multiple components found. Please select the correct one."
              >
                {componentOptions.map((component, index) => (
                  <MenuItem key={index} value={component}>
                    {component}
                  </MenuItem>
                ))}
              </TextField>
            )}
          </>
        )}

        {mode === "OUT" && materials.length === 0 && !loading && (
          <Alert severity="info" sx={{ mt: 1 }}>
            No materials available for OUT transaction in this location.
            {location && ` (Location: ${location.code}, ID: ${location.id})`}
          </Alert>
        )}

        {mode === "OUT" && (
          <TextField
            select
            label="Material"
            name="material"
            fullWidth
            sx={{ mt: 2 }}
            value={form.material}
            onChange={handleChange}
            required
            disabled={loading || materials.length === 0}
          >
            <MenuItem value="">Select Material</MenuItem>
            {materials.map((m) => (
              <MenuItem key={m.id} value={m.id}>
                {getMaterialDisplayText(m)}
              </MenuItem>
            ))}
          </TextField>
        )}

        <TextField
          label="Location"
          name="location"
          fullWidth
          sx={{ mt: 2 }}
          value={location?.code || ""}
          disabled
          helperText="Location is fixed for this transaction"
        />

        <TextField
          label="Slug Weight (kg)"
          name="slug_weight"
          type="number"
          fullWidth
          sx={{ mt: 2 }}
          value={form.slug_weight}
          onChange={handleChange}
          required
          disabled
          inputProps={{ step: "0.01" }}
        />

        <TextField
          label="Quantity"
          name="qty"
          type="number"
          fullWidth
          sx={{ mt: 2 }}
          value={form.qty}
          onChange={handleChange}
          required
          inputProps={{ 
            min: 1,
            max: mode === "IN" && selectedBatch ? selectedBatch.max_qty : undefined
          }}
          helperText={
            mode === "IN" && selectedBatch 
              ? `Max pieces: ${selectedBatch.max_qty}` 
              : mode === "OUT" && form.material 
                ? `Max available: ${materials.find(m => m.id === parseInt(form.material))?.available_in_location || 0}`
                : ""
          }
        />

        <TextField
          label="Verified By"
          name="verified_by"
          fullWidth
          sx={{ mt: 2 }}
          value={form.verified_by}
          onChange={handleChange}
          disabled   
          required
        />

        <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
          <Button 
            variant="outlined" 
            fullWidth 
            onClick={handleClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button 
            variant="contained" 
            fullWidth 
            onClick={handleSubmit}
            disabled={loading || (mode === "OUT" && materials.length === 0) || (mode === "IN" && !selectedBatch)}
          >
            {loading ? "Loading..." : `Submit ${mode}`}
          </Button>
        </Box>

        {mode === "OUT" && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="body2" color="textSecondary">
              <strong>Note:</strong> Only materials with available stock in this location are shown for OUT transactions.
            </Typography>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}