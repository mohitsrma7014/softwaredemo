import React, { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Box, Typography, IconButton,
  Table, TableHead, TableBody, TableRow, TableCell,
  useTheme, useMediaQuery, MenuItem, Select, InputLabel, 
  FormControl, Chip, Stack, Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  Remove as RemoveIcon,
  HelpOutline as HelpIcon
} from '@mui/icons-material';
import api,{ BASE_URL } from "../../services/service";
import { useAuth } from "../../../context/AuthContext";

// Constants
const DIMENSION_TYPES = [
  { value: 'Critical', label: 'Critical' },
  { value: 'Important', label: 'Important' },
  { value: 'Safety', label: 'Safety' }
];

const SPC_PERIODS = [
  { value: 30, label: 'Monthly' },
  { value: 90, label: 'Quarterly' },
  { value: 180, label: 'Half Yearly' },
  { value: 365, label: 'Yearly' },
  { value: 'custom', label: 'Custom Days' }
];

const initialDimension = {
  dimension: '',
  name: '',
  type: '',
  instrument: '',
  remark: '',
  spc_time_period_days: 30,
  customDays: ''
};

function AddSPCDimensionsDialog({ open, onClose, component }) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'));
  const { user } = useAuth();
  const [dimensions, setDimensions] = useState([{ ...initialDimension }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const createdBy = user ? `${user.name} ${user.lastname}` : 'Unknown';

  const handleChange = (index, field) => (e) => {
    const newDimensions = [...dimensions];
    newDimensions[index][field] = e.target.value;
    
    // Reset custom days when selecting a predefined period
    if (field === 'spc_time_period_days' && e.target.value !== 'custom') {
      newDimensions[index].customDays = '';
    }
    
    setDimensions(newDimensions);
  };

  const addRow = () => {
    setDimensions([...dimensions, { ...initialDimension }]);
  };

  const removeRow = (index) => {
    if (dimensions.length > 1) {
      const newDimensions = [...dimensions];
      newDimensions.splice(index, 1);
      setDimensions(newDimensions);
    }
  };


// ...

const handleSubmit = async () => {
  setLoading(true);
  setError(null);
  
  try {
    // Prepare data with proper SPC period conversion
    const dataToSend = dimensions.map(dim => ({
      ...dim,
      component: component,
      created_by: createdBy,  // This is where created_by is set from frontend
      spc_time_period_days: dim.spc_time_period_days === 'custom' 
        ? parseInt(dim.customDays) || 30
        : parseInt(dim.spc_time_period_days)
    }));

    const response = await api.post('/raw_material/api/spc-dimensions/bulk-create/', {
      dimensions: dataToSend
    });

    onClose(true);
  } catch (err) {
    setError(err.response?.data?.message || 'Failed to save dimensions');
    console.error('Error saving SPC dimensions:', err);
  } finally {
    setLoading(false);
  }
};

  return (
    <Dialog 
      open={open} 
      onClose={() => onClose(false)} 
      fullWidth 
      maxWidth="lg"
      fullScreen={fullScreen}
      sx={{ '& .MuiDialog-paper': { minHeight: fullScreen ? '100vh' : '80vh' } }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" component="span" fontWeight="bold">
          Add SPC Dimensions
        </Typography>
        <Typography variant="subtitle1" component="span" color="text.secondary">
          {component}
        </Typography>
      </DialogTitle>

      <DialogContent dividers>
        <Stack direction="row" spacing={2} mb={3}>
          <Chip label={`Component: ${component}`} variant="outlined" />
          <Chip label={`Created By: ${createdBy}`} variant="outlined" />
        </Stack>

        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>Dimension</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Instrument</TableCell>
              <TableCell>Remark</TableCell>
              <TableCell>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <span>SPC Period</span>
                  <Tooltip title="Select from predefined periods or enter custom days">
                    <HelpIcon fontSize="small" color="action" />
                  </Tooltip>
                </Stack>
              </TableCell>
              <TableCell>Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {dimensions.map((dimension, index) => (
              <TableRow key={index} hover>
                <TableCell>
                  <TextField
                    fullWidth
                    size="small"
                    value={dimension.dimension}
                    onChange={handleChange(index, 'dimension')}
                    placeholder="e.g., Diameter"
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    fullWidth
                    size="small"
                    value={dimension.name}
                    onChange={handleChange(index, 'name')}
                    placeholder="e.g., Outer Diameter"
                  />
                </TableCell>
                <TableCell>
                  <FormControl fullWidth size="small">
                    <Select
                      value={dimension.type}
                      onChange={handleChange(index, 'type')}
                      displayEmpty
                    >
                      <MenuItem value="" disabled>Select Type</MenuItem>
                      {DIMENSION_TYPES.map((type) => (
                        <MenuItem key={type.value} value={type.value}>
                          {type.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </TableCell>
                <TableCell>
                  <TextField
                    fullWidth
                    size="small"
                    value={dimension.instrument}
                    onChange={handleChange(index, 'instrument')}
                    placeholder="e.g., Micrometer"
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    fullWidth
                    size="small"
                    value={dimension.remark}
                    onChange={handleChange(index, 'remark')}
                    placeholder="Optional notes"
                  />
                </TableCell>
                <TableCell>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <FormControl sx={{ minWidth: 120 }} size="small">
                      <Select
                        value={dimension.spc_time_period_days}
                        onChange={handleChange(index, 'spc_time_period_days')}
                      >
                        {SPC_PERIODS.map((period) => (
                          <MenuItem key={period.value} value={period.value}>
                            {period.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    {dimension.spc_time_period_days === 'custom' && (
                      <TextField
                        size="small"
                        type="number"
                        value={dimension.customDays}
                        onChange={handleChange(index, 'customDays')}
                        sx={{ width: 100 }}
                        placeholder="Days"
                      />
                    )}
                  </Stack>
                </TableCell>
                <TableCell>
                  <IconButton 
                    onClick={() => removeRow(index)}
                    disabled={dimensions.length === 1}
                    color="error"
                    size="small"
                  >
                    <RemoveIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <Box mt={2}>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={addRow}
            size="small"
          >
            Add Row
          </Button>
        </Box>

        {error && (
          <Box mt={2}>
            <Typography color="error" variant="body2">
              {error}
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button 
          onClick={() => onClose(false)} 
          disabled={loading}
          variant="outlined"
        >
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit} 
          color="primary" 
          variant="contained"
          disabled={loading}
        >
          {loading ? 'Saving...' : 'Save Dimensions'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default React.memo(AddSPCDimensionsDialog);