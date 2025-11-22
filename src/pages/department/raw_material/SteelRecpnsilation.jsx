import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Box, 
  Typography, 
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Modal,
  IconButton,
  Chip,
  Grid,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  TextField,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Pagination,
  Tabs,
  Tab,
  TablePagination,
  styled
} from '@mui/material';
import { 
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
  Inventory as InventoryIcon,
  Factory as FactoryIcon,
  LocalShipping as LocalShippingIcon,
  FilterAlt as FilterAltIcon,
  Calculate as CalculateIcon,
  MonetizationOn as MonetizationOnIcon,
  List as ListIcon
} from '@mui/icons-material';
import api,{ BASE_URL } from "../../services/service";

// Sticky table header styles
const StickyTableHead = styled(TableHead)(({ theme }) => ({
  position: 'sticky',
  top: 0,
  backgroundColor: theme.palette.background.paper,
  zIndex: 1,
  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
}));


const SteelRecpnsilation = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [invoiceDetails, setInvoiceDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [filters, setFilters] = useState({
    invoice_no: '',
    heat_no: '',
    supplier: '',
    customer: '',
    date_from: '',
    date_to: '',
    material_type: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    per_page: 20,
    total_pages: 1,
    total_items: 0
  });
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    fetchInvoices();
  }, [filters, pagination.page, pagination.per_page]);

  const fetchInvoices = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = {
        ...filters,
        page: pagination.page,
        per_page: pagination.per_page
      };
      
      const response = await axios.get(`${BASE_URL}api/raw_material/invoice-list/`, { params });
      setInvoices(response.data.invoices);
      setPagination({
        ...pagination,
        total_pages: response.data.total_pages,
        total_items: response.data.total_items
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch invoices');
      console.error('Error fetching invoices:', err);
    } finally {
      setLoading(false);
    }
  };

  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  
    const toggleSidebar = () => {
      setIsSidebarVisible(!isSidebarVisible);
    };
    const pageTitle = "Steel Reconsilatation"; // Set the page title here

  const fetchInvoiceDetails = async (invoiceNo) => {
  setDetailsLoading(true);
  setSelectedInvoice(invoiceNo);
  setActiveTab(0);

  try {
    const response = await axios.get(`${BASE_URL}api/raw_material/invoice-details/?invoice_no=${invoiceNo}`);
    const data = response.data;

    // --- Compute total weights for Yield ---
    const totalForgingWeight = data.production_details?.reduce(
      (acc, item) => acc + (item.slug_weight || 0) * (item.production || 0),
      0
    ) || 0;

    const totalDispatchWeight = data.dispatch_details?.reduce(
      (acc, item) => acc + (item.total_weight || 0),
      0
    ) || 0;

    // Yield % (Dispatch vs Forging Output)
    const yieldPercentage = totalForgingWeight
      ? (totalDispatchWeight / totalForgingWeight) * 100
      : 0;

    // Add computed yield info
    data.dispatch_yield_summary = {
      total_forging_weight: totalForgingWeight,
      total_dispatch_weight: totalDispatchWeight,
      yield_percentage: yieldPercentage,
    };
    // --- Compute Total Weights ---
const totalRawMaterial = data.raw_materials?.reduce(
  (acc, item) => acc + (item.weight || 0),
  0
) || 0;

const totalPlanned = data.block_materials?.reduce(
  (acc, item) => acc + (item.weight || 0),
  0
) || 0;

const totalProduction = data.production_details?.reduce(
  (acc, item) => acc + (item.slug_weight || 0) * (item.production || 0),
  0
) || 0;

const totalDispatch = data.dispatch_details?.reduce(
  (acc, item) => acc + (item.slug_weight || 0) * (item.pices || 0),
  0
) || 0;

// --- Compute Multi-Stage Yields ---
const yield_planned_vs_raw = totalRawMaterial ? (totalPlanned / totalRawMaterial) * 100 : 0;
const yield_production_vs_raw = totalRawMaterial ? (totalProduction / totalRawMaterial) * 100 : 0;
const yield_production_vs_planned = totalPlanned ? (totalProduction / totalPlanned) * 100 : 0;
const yield_dispatch_vs_raw = totalRawMaterial ? (totalDispatch / totalRawMaterial) * 100 : 0;
const yield_dispatch_vs_production = totalProduction ? (totalDispatch / totalProduction) * 100 : 0;

// --- Attach Computed Summary ---
data.yield_summary = {
  totalRawMaterial,
  totalPlanned,
  totalProduction,
  totalDispatch,
  yield_planned_vs_raw,
  yield_production_vs_raw,
  yield_production_vs_planned,
  yield_dispatch_vs_raw,
  yield_dispatch_vs_production,
  total_forging_weight: totalForgingWeight,
      total_dispatch_weight: totalDispatchWeight,
      yield_percentage: yield_dispatch_vs_raw,
};


    setInvoiceDetails(data);
  } catch (err) {
    setError(err.response?.data?.error || `Failed to fetch details for invoice ${invoiceNo}`);
    console.error('Error fetching invoice details:', err);
  } finally {
    setDetailsLoading(false);
  }
};


  const handleCloseModal = () => {
    setSelectedInvoice(null);
    setInvoiceDetails(null);
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (event, newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const handlePerPageChange = (e) => {
    setPagination(prev => ({ ...prev, per_page: e.target.value, page: 1 }));
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const resetFilters = () => {
    setFilters({
      invoice_no: '',
      heat_no: '',
      supplier: '',
      customer: '',
      date_from: '',
      date_to: '',
      material_type: ''
    });
  };

  // Safe handling of heat numbers (array or string)
  const renderHeatNumbers = (heatNumbers) => {
    if (!heatNumbers) return null;
    
    // Convert to array if it's a string
    const heatArray = Array.isArray(heatNumbers) ? heatNumbers : 
                     typeof heatNumbers === 'string' ? [heatNumbers] : [];
    
    return (
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, maxWidth: 200 }}>
        {heatArray.slice(0, 3).map((heat, i) => (
          <Chip key={i} label={heat} size="small" />
        ))}
        {heatArray.length > 3 && (
          <Chip label={`+${heatArray.length - 3}`} size="small" />
        )}
      </Box>
    );
  };

  return (
    <div className="flex">
          {/* Sidebar */}
       
            <Box sx={{ width: '100%' }}>
      {/* Filters Section */}
      <Paper elevation={3} sx={{ p: 1, mb: 1, overflowX: 'auto' }}>
  <Box
    sx={{
      display: 'flex',
      alignItems: 'center',
      gap: 1,
      flexWrap: 'nowrap',
      minWidth: 'fit-content',
    }}
  >
    <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, whiteSpace: 'nowrap' }}>
      <FilterAltIcon fontSize="small" /> Filters:
    </Typography>

    <TextField
      label="Invoice No."
      name="invoice_no"
      value={filters.invoice_no}
      onChange={handleFilterChange}
      variant="outlined"
      size="small"
      sx={{ width: 120 }}
    />
    <TextField
      label="Heat No."
      name="heat_no"
      value={filters.heat_no}
      onChange={handleFilterChange}
      variant="outlined"
      size="small"
      sx={{ width: 120 }}
    />
    <TextField
      label="Supplier"
      name="supplier"
      value={filters.supplier}
      onChange={handleFilterChange}
      variant="outlined"
      size="small"
      sx={{ width: 120 }}
    />
    <TextField
      label="Customer"
      name="customer"
      value={filters.customer}
      onChange={handleFilterChange}
      variant="outlined"
      size="small"
      sx={{ width: 120 }}
    />
    <TextField
      label="From Date"
      name="date_from"
      type="date"
      value={filters.date_from}
      onChange={handleFilterChange}
      variant="outlined"
      size="small"
      InputLabelProps={{ shrink: true }}
      sx={{ width: 140 }}
    />
    <TextField
      label="To Date"
      name="date_to"
      type="date"
      value={filters.date_to}
      onChange={handleFilterChange}
      variant="outlined"
      size="small"
      InputLabelProps={{ shrink: true }}
      sx={{ width: 140 }}
    />
    <FormControl size="small" sx={{ minWidth: 140 }}>
      <InputLabel>Material Type</InputLabel>
      <Select
        name="material_type"
        value={filters.material_type}
        label="Material Type"
        onChange={handleFilterChange}
      >
        <MenuItem value="">All</MenuItem>
        <MenuItem value="Job Work">Job Work</MenuItem>
        <MenuItem value="Sale">Sale</MenuItem>
      </Select>
    </FormControl>

    <Button variant="outlined" onClick={resetFilters} size="small">
      Reset
    </Button>
    <Button variant="contained" onClick={fetchInvoices} size="small">
      Apply
    </Button>
  </Box>
</Paper>



      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Paper elevation={3} sx={{ p: 1, mb: 3, bgcolor: 'error.light' }}>
          <Typography color="error">{error}</Typography>
          <Button onClick={fetchInvoices} sx={{ mt: 1 }}>Retry</Button>
        </Paper>
      ) : (
        <>
          <Paper elevation={3} sx={{p:2}}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6">
                Total Invoices: {pagination.total_items}
              </Typography>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Per Page</InputLabel>
                <Select
                  value={pagination.per_page}
                  label="Per Page"
                  onChange={handlePerPageChange}
                >
                  <MenuItem value={10}>10</MenuItem>
                  <MenuItem value={20}>20</MenuItem>
                  <MenuItem value={50}>50</MenuItem>
                  <MenuItem value={100}>100</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <TableContainer sx={{ 
                 height: 'calc(100vh - 270px)', // Adjust height to fill screen minus 100px
                '& td, & th': { py: 0.5, px: 1 }, // Reduce vertical and horizontal padding
                }}>
              <Table>
                <StickyTableHead>
                  <TableRow>
                    <TableCell>Invoice No.</TableCell>
                    <TableCell>Supplier</TableCell>
                    <TableCell>Customer</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Heat Numbers</TableCell>
                    <TableCell>Total Weight (kg)</TableCell>
                    <TableCell>Heat Count</TableCell>
                    <TableCell>Date Range</TableCell>
                    <TableCell>Total Cost</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </StickyTableHead>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow key={invoice.invoice_no}>
                      <TableCell>{invoice.invoice_no}</TableCell>
                      <TableCell>{invoice.supplier}</TableCell>
                      <TableCell>{invoice.customer}</TableCell>
                      <TableCell>
                        <Chip 
                          label={invoice.material_type || 'Unknown'} 
                          color={invoice.material_type === 'Job Work' ? 'secondary' : 'primary'} 
                          size="small" 
                        />
                      </TableCell>
                      <TableCell>
                        {renderHeatNumbers(invoice.heat_numbers)}
                      </TableCell>
                      <TableCell>{invoice.total_weight?.toFixed(2)}</TableCell>
                      <TableCell>{invoice.heat_count}</TableCell>
                      <TableCell>
                        {new Date(invoice.first_date).toLocaleDateString()} - {' '}
                        {new Date(invoice.last_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {invoice.total_cost ? `₹${invoice.total_cost.toFixed(2)}` : 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="outlined" 
                          onClick={() => fetchInvoiceDetails(invoice.invoice_no)}
                          size="small"
                        >
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <Pagination
                count={pagination.total_pages}
                page={pagination.page}
                onChange={handlePageChange}
                color="primary"
                showFirstButton
                showLastButton
              />
            </Box>
          </Paper>

          {/* Invoice Details Modal */}
          <Modal
            open={Boolean(selectedInvoice)}
            onClose={handleCloseModal}
            aria-labelledby="invoice-details-modal"
            aria-describedby="invoice-details-description"
          >
            <Box sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '95%',
              maxWidth: 1600,
              maxHeight: '90vh',
              bgcolor: 'background.paper',
              boxShadow: 24,
              p: 4,
              borderRadius: 2,
              overflowY: 'auto'
            }}>
              {detailsLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                  <CircularProgress />
                </Box>
              ) : invoiceDetails ? (
                <>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h5" id="invoice-details-modal">
                      Invoice: {invoiceDetails.invoice_no}
                      <Chip 
                        label={invoiceDetails.material_type || 'Unknown'} 
                        color={invoiceDetails.material_type === 'Job Work' ? 'secondary' : 'primary'} 
                        size="small" 
                        sx={{ ml: 2 }}
                      />
                    </Typography>
                    <IconButton onClick={handleCloseModal}>
                      <CloseIcon />
                    </IconButton>
                  </Box>

                  <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle1">
                        <strong>Supplier:</strong> {invoiceDetails.supplier}
                      </Typography>
                      <Typography variant="subtitle1">
                        <strong>Customer:</strong> {invoiceDetails.customer}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle1">
                        <strong>Heat Numbers:</strong> {invoiceDetails.heat_numbers.join(', ')}
                      </Typography>
                    </Grid>
                  </Grid>

                  {/* Cost Summary Cards */}
                  <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid item xs={12} sm={6} md={3}>
                      <Paper elevation={2} sx={{ p: 2, textAlign: 'center' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                          <MonetizationOnIcon color="primary" />
                          <Typography variant="subtitle2" color="text.secondary">
                            Raw Material Cost
                          </Typography>
                        </Box>
                        <Typography variant="h5" color="primary">
                          ₹{invoiceDetails.cost_summary?.total_raw_material_cost?.toFixed(2) || '0.00'}
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <Paper elevation={2} sx={{ p: 2, textAlign: 'center' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                          <LocalShippingIcon />
                          <Typography variant="subtitle2" color="text.secondary">
                            Dispatch Value
                          </Typography>
                        </Box>
                        <Typography variant="h5">
                          ₹{invoiceDetails.cost_summary?.total_dispatch_value?.toFixed(2) || '0.00'}
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <Paper elevation={2} sx={{ p: 2, textAlign: 'center' }}>
                        <Typography variant="subtitle2" color="text.secondary">
                          Profit/Loss
                        </Typography>
                        <Typography variant="h5" sx={{
                          color: (invoiceDetails.cost_summary?.total_dispatch_value || 0) - 
                                 (invoiceDetails.cost_summary?.total_raw_material_cost || 0) >= 0 
                                 ? 'success.main' : 'error.main'
                        }}>
                          ₹{((invoiceDetails.cost_summary?.total_dispatch_value || 0) - 
                             (invoiceDetails.cost_summary?.total_raw_material_cost || 0)).toFixed(2)}
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <Paper elevation={2} sx={{ p: 2, textAlign: 'center' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                          <CalculateIcon color="info" />
                          <Typography variant="subtitle2" color="text.secondary">
                            Yield Percentage
                          </Typography>
                        </Box>
                        <Typography variant="h5" color="info.main">
                          {invoiceDetails.yield_summary?.yield_percentage?.toFixed(2) || '0.00'}%
                        </Typography>
                      </Paper>
                    </Grid>
                  </Grid>
<Accordion defaultExpanded sx={{ mt: 2 }}>
  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
    <Typography variant="h6" color="primary">Overall Yield Summary</Typography>
  </AccordionSummary>
  <AccordionDetails>
    <Grid container spacing={2}>
      {/* Raw Material */}
      <Grid item xs={12} md={3}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="subtitle2">Total Raw Material</Typography>
          <Typography variant="h6">
            {invoiceDetails.yield_summary?.totalRawMaterial?.toFixed(2) || '0.00'} kg
          </Typography>
        </Paper>
      </Grid>

      {/* Planned */}
      <Grid item xs={12} md={3}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="subtitle2">Total Planned</Typography>
          <Typography variant="h6">
            {invoiceDetails.yield_summary?.totalPlanned?.toFixed(2) || '0.00'} kg
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Yield vs Raw: {invoiceDetails.yield_summary?.yield_planned_vs_raw?.toFixed(2)}%
          </Typography>
        </Paper>
      </Grid>

      {/* Production */}
      <Grid item xs={12} md={3}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="subtitle2">Total Production</Typography>
          <Typography variant="h6">
            {invoiceDetails.yield_summary?.totalProduction?.toFixed(2) || '0.00'} kg
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Yield vs Raw: {invoiceDetails.yield_summary?.yield_production_vs_raw?.toFixed(2)}%
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Yield vs Planned: {invoiceDetails.yield_summary?.yield_production_vs_planned?.toFixed(2)}%
          </Typography>
        </Paper>
      </Grid>

      {/* Dispatch */}
      <Grid item xs={12} md={3}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="subtitle2">Total Dispatch</Typography>
          <Typography variant="h6">
            {invoiceDetails.yield_summary?.totalDispatch?.toFixed(2) || '0.00'} kg
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Yield vs Raw: {invoiceDetails.yield_summary?.yield_dispatch_vs_raw?.toFixed(2)}%
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Yield vs Production: {invoiceDetails.yield_summary?.yield_dispatch_vs_production?.toFixed(2)}%
          </Typography>
        </Paper>
      </Grid>
    </Grid>
  </AccordionDetails>
</Accordion>


                  <Divider sx={{ my: 3 }} />

                  {/* Reordered Tabs */}
                  <Tabs value={activeTab} onChange={handleTabChange} sx={{ mb: 2 }}>
                    <Tab label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <InventoryIcon /> Raw Materials
                        <Chip label={invoiceDetails.raw_materials?.length || 0} size="small" />
                      </Box>
                    } />
                    <Tab label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <ListIcon /> Batches/Plannings
                        <Chip label={invoiceDetails.block_materials?.length || 0} size="small" />
                      </Box>
                    } />
                    <Tab label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <FactoryIcon /> Production
                        <Chip label={invoiceDetails.production_details?.length || 0} size="small" />
                      </Box>
                    } />
                    <Tab label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LocalShippingIcon /> Dispatch
                        <Chip label={invoiceDetails.dispatch_details?.length || 0} size="small" />
                      </Box>
                    } />
                  </Tabs>

                  {/* Raw Materials Tab */}
                  {activeTab === 0 && (
  <>
    {/* Total Planned Display */}
    <Box sx={{ mb: 2, fontWeight: 'bold' }}>
      Total Planned: {
        invoiceDetails.block_materials?.reduce((acc, item) => acc + (item.weight || 0), 0).toFixed(2)
      } kg
    </Box>

    <TableContainer component={Paper} sx={{ maxHeight: '60vh' }}>
      <Table size="small" stickyHeader>
        <StickyTableHead>
          <TableRow>
            <TableCell>Date</TableCell>
            <TableCell>Heat No.</TableCell>
            <TableCell>Grade</TableCell>
            <TableCell>Dia</TableCell>
            <TableCell>Weight (kg)</TableCell>
            <TableCell>Cost/kg</TableCell>
            <TableCell>Total Cost</TableCell>
            <TableCell>Type</TableCell>
            <TableCell>Rack No.</TableCell>
          </TableRow>
        </StickyTableHead>
        <TableBody>
          {invoiceDetails.raw_materials?.map((item, index) => (
            <TableRow key={index}>
              <TableCell>{new Date(item.date).toLocaleDateString()}</TableCell>
              <TableCell>{item.heatno}</TableCell>
              <TableCell>{item.grade}</TableCell>
              <TableCell>{item.dia}</TableCell>
              <TableCell>{item.weight}</TableCell>
              <TableCell>{item.cost_per_kg ? `₹${item.cost_per_kg.toFixed(2)}` : 'N/A'}</TableCell>
              <TableCell>{item.total_cost ? `₹${item.total_cost.toFixed(2)}` : 'N/A'}</TableCell>
              <TableCell>
                <Chip 
                  label={item.is_job_work ? 'Job Work' : 'Sale'} 
                  color={item.is_job_work ? 'secondary' : 'primary'} 
                  size="small" 
                />
              </TableCell>
              <TableCell>{item.rack_no}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  </>
)}


                  {/* Batches/Plannings Tab */}
                  {activeTab === 1 && (
                    <TableContainer component={Paper} sx={{ maxHeight: '60vh' }}>
                      <Table size="small" stickyHeader>
                        <StickyTableHead>
                          <TableRow>
                            <TableCell>Block ID</TableCell>
                            <TableCell>Component</TableCell>
                            <TableCell>Grade</TableCell>
                            <TableCell>Heat No.</TableCell>
                            <TableCell>Pieces</TableCell>
                            <TableCell>Weight (kg)</TableCell>
                            <TableCell>Cost/Unit</TableCell>
                            <TableCell>Total Cost</TableCell>
                            <TableCell>Line</TableCell>
                            <TableCell>Created At</TableCell>
                          </TableRow>
                        </StickyTableHead>
                        <TableBody>
                          {invoiceDetails.block_materials?.map((item, index) => (
                            <TableRow key={index}>
                              <TableCell>
                                <span 
                                  style={{cursor: 'pointer', color: 'blue', textDecoration: 'underline'}}
                                  onClick={() => {
                                    const traceabilityUrl = `/TraceabilityCard?batch=${item.block_mt_id}`;
                                    window.open(traceabilityUrl, '_blank');
                                  }}
                                >
                                  {item.block_mt_id}
                                </span>
                              </TableCell>
                              <TableCell>{item.component}</TableCell>
                              <TableCell>{item.grade}</TableCell>
                              <TableCell>{item.heatno}</TableCell>
                              <TableCell>{item.pices}</TableCell>
                              <TableCell>{item.weight}</TableCell>
                              <TableCell>₹{(item.component_cost || 0).toFixed(2)}</TableCell>
                              <TableCell>₹{(item.total_cost || 0).toFixed(2)}</TableCell>
                              <TableCell>{item.line}</TableCell>
                              <TableCell>{new Date(item.created_at).toLocaleString()}</TableCell>
                              
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}

                  {/* Production Tab */}
                  {activeTab === 2 && (
                    <TableContainer component={Paper} sx={{ maxHeight: '60vh' }}>
                      <Table size="small" stickyHeader>
                        <StickyTableHead>
                          <TableRow>
                            <TableCell>Batch No.</TableCell>
                            <TableCell>Date</TableCell>
                            <TableCell>Component</TableCell>
                            <TableCell>Slug Weight (kg)</TableCell>
                            <TableCell>Heat No.</TableCell>
                            <TableCell>Line</TableCell>
                            <TableCell>Target</TableCell>
                            <TableCell>Production</TableCell>
                            <TableCell>Rework</TableCell>
                            <TableCell>Cost/Unit</TableCell>
                            <TableCell>Total Value</TableCell>
                          </TableRow>
                        </StickyTableHead>
                        <TableBody>
                          {invoiceDetails.production_details?.map((item, index) => (
                            <TableRow key={index}>
                              <TableCell>
                                <span 
                                  style={{cursor: 'pointer', color: 'blue', textDecoration: 'underline'}}
                                  onClick={() => {
                                    const traceabilityUrl = `/TraceabilityCard?batch=${item.batch_number}`;
                                    window.open(traceabilityUrl, '_blank');
                                  }}
                                >
                                  {item.batch_number}
                                </span>
                              </TableCell>
                              <TableCell>{new Date(item.date).toLocaleDateString()}</TableCell>
                              <TableCell>{item.component}</TableCell>
                              <TableCell>{item.slug_weight?.toFixed(2) || '0.00'}</TableCell>
                              <TableCell>{item.heat_number}</TableCell>
                              <TableCell>{item.line}</TableCell>
                              <TableCell>{item.target}</TableCell>
                              <TableCell>{item.production}</TableCell>
                              <TableCell>{item.rework}</TableCell>
                              <TableCell>₹{(item.component_cost || 0).toFixed(2)}</TableCell>
                              <TableCell>₹{(item.production_value || 0).toFixed(2)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}

                  {/* Dispatch Tab */}
                  {activeTab === 3 && (
                    <TableContainer component={Paper} sx={{ maxHeight: '60vh' }}>
                      <Table size="small" stickyHeader>
                        <StickyTableHead>
                          <TableRow>
                            <TableCell>Date</TableCell>
                            <TableCell>Component</TableCell>
                            <TableCell>Invoice No.</TableCell>
                            <TableCell>Heat No.</TableCell>
                            <TableCell>Batch No.</TableCell>
                            <TableCell>Pieces</TableCell>
                            <TableCell>Slug Weight</TableCell>
                            <TableCell>Weight (kg)</TableCell>
                            <TableCell>Cost/Unit</TableCell>
                            <TableCell>Total Value</TableCell>
                            <TableCell>Produced</TableCell>
                            <TableCell>Remaining</TableCell>
                          </TableRow>
                        </StickyTableHead>
                        <TableBody>
                          {invoiceDetails.dispatch_details?.map((item, index) => (
                            <TableRow key={index}>
                              <TableCell>{new Date(item.date).toLocaleDateString()}</TableCell>
                              <TableCell>{item.component}</TableCell>
                              <TableCell>{item.invoiceno}</TableCell>
                              <TableCell>{item.heat_no}</TableCell>
                              <TableCell>
                                <span 
                                  style={{cursor: 'pointer', color: 'blue', textDecoration: 'underline'}}
                                  onClick={() => {
                                    const traceabilityUrl = `/TraceabilityCard?batch=${item.batch_number}`;
                                    window.open(traceabilityUrl, '_blank');
                                  }}
                                >
                                  {item.batch_number}
                                </span>
                              </TableCell>
                              <TableCell>{item.pices}</TableCell>
                              <TableCell>{item.slug_weight}</TableCell>
                              <TableCell>{item.total_weight?.toFixed(2) || '0.00'}</TableCell>
                              <TableCell>₹{(item.component_cost || 0).toFixed(2)}</TableCell>
                              <TableCell>₹{(item.dispatch_value || 0).toFixed(2)}</TableCell>
                              <TableCell>{item.total_produced}</TableCell>
                              <TableCell>{item.remaining}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </>
              ) : (
                <Typography>No details available</Typography>
              )}
            </Box>
          </Modal>
        </>
      )}
    </Box>
  
    </div>
  );
};

export default SteelRecpnsilation;