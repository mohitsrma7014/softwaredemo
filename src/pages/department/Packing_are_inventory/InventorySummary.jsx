import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Autocomplete,
  TextField
} from "@mui/material";
import {
  getInventorySummary,
  getInventoryLocations,
  getInventoryComponents
} from "../api/inventoryApi";

const InventorySummary = () => {
  const [inventoryData, setInventoryData] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [filters, setFilters] = useState({
    location: "",
    component: ""
  });

  const [locations, setLocations] = useState([]);
  const [components, setComponents] = useState([]);

  // Load dropdown data only once
  useEffect(() => {
    const loadOptions = async () => {
      try {
        const [locRes, compRes] = await Promise.all([
          getInventoryLocations(),
          getInventoryComponents()
        ]);

        setLocations(locRes.data);
        setComponents(compRes.data);
      } catch (err) {
        console.error("Error loading filters", err);
      }
    };

    loadOptions();
  }, []);

  // Load inventory
  useEffect(() => {
    const loadInventory = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await getInventorySummary(filters);
        setInventoryData(res.data.inventory);
        setSummary(res.data.summary);
      } catch (err) {
        setError(err.response?.data?.error || "Failed to load inventory");
      }
      setLoading(false);
    };

    loadInventory();
  }, [filters]);

  const handleClearFilters = () => {
    setFilters({ location: "", component: "" });
  };

  // Memoized dropdown options → prevents rerender cost
  const locationOptions = useMemo(
    () => locations.map((l) => ({ label: l.code, value: l.code })),
    [locations]
  );

  const componentOptions = useMemo(
    () => components.map((c) => ({ label: c, value: c })),
    [components]
  );

  if (loading)
    return (
      <Box display="flex" alignItems="center" justifyContent="center" minHeight={300}>
        <CircularProgress />
      </Box>
    );

  return (
    <Box p={3}>
      <Typography variant="h4" fontWeight="600" gutterBottom>
        Inventory Summary
      </Typography>

      {/* Summary Cards */}
      <Grid container spacing={2} mb={3}>
        {[
          { label: "Total Items", value: summary.total_items },
          { label: "Total Quantity", value: summary.total_quantity },
          { label: "Total Weight (Kg)", value: summary.total_weight_kg },
          { label: "Total Weight (Ton)", value: summary.total_weight_ton }
        ].map((item, idx) => (
          <Grid key={idx} item xs={12} sm={6} md={3}>
            <Card elevation={1} sx={{ borderRadius: 2 }}>
              <CardContent>
                <Typography variant="body2" color="text.secondary">
                  {item.label}
                </Typography>
                <Typography variant="h6">{item.value || 0}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }} elevation={0}>
        <Typography variant="h6" mb={2}>
          Filters
        </Typography>

        <Grid container spacing={2}>
          {/* Searchable Location */}
          <Grid item xs={12} sm={6} md={3}>
            <Autocomplete
              options={locationOptions}
              size="small"
              value={
                filters.location
                  ? locationOptions.find((x) => x.value === filters.location)
                  : null
              }
              onChange={(e, v) =>
                setFilters((prev) => ({ ...prev, location: v?.value || "" }))
              }
              renderInput={(params) => (
                <TextField {...params} label="Location" fullWidth />
              )}
            />
          </Grid>

          {/* Searchable Component */}
          <Grid item xs={12} sm={6} md={3}>
            <Autocomplete
              options={componentOptions}
              size="small"
              value={
                filters.component
                  ? componentOptions.find((x) => x.value === filters.component)
                  : null
              }
              onChange={(e, v) =>
                setFilters((prev) => ({ ...prev, component: v?.value || "" }))
              }
              renderInput={(params) => (
                <TextField {...params} label="Component" fullWidth />
              )}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Chip
              label="Clear Filters"
              onClick={handleClearFilters}
              color="error"
              variant="outlined"
              disabled={!filters.location && !filters.component}
              sx={{ mt: 1 }}
            />
          </Grid>
        </Grid>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Table */}
     <TableContainer
  component={Paper}
  elevation={0}
  sx={{
    borderRadius: 2,
    maxHeight: "65vh",        // scroll area height
    overflow: "auto"
  }}
>
  <Table stickyHeader>
    <TableHead>
      <TableRow>
        {[
          "Batch ID",
          "Component",
          "Customer",
          "Location",
          "Slug Weight (kg)",
          "Available Qty",
          "Weight (kg)",
          "Weight (ton)",
          "Verified By"
        ].map((head) => (
          <TableCell
            key={head}
            sx={{
              fontWeight: 600,
              background: "#f4f6f8",     // sticky header background
              top: 0,
              zIndex: 1
            }}
          >
            {head}
          </TableCell>
        ))}
      </TableRow>
    </TableHead>

    <TableBody>
      {inventoryData.length === 0 ? (
        <TableRow>
          <TableCell colSpan={9} align="center" sx={{ py: 3 }}>
            No inventory data available
          </TableCell>
        </TableRow>
      ) : (
        inventoryData.map((item) => (
          <TableRow key={item.id} hover>
            <TableCell>{item.batch_id}</TableCell>
            <TableCell>{item.component}</TableCell>
            <TableCell>{item.customer}</TableCell>

            <TableCell>
              <Chip label={item.location} variant="outlined" size="small" />
            </TableCell>

            <TableCell align="right">{item.slug_weight}</TableCell>
            <TableCell align="right">{item.available_qty}</TableCell>
            <TableCell align="right">{item.weight_kg}</TableCell>
            <TableCell align="right">{item.weight_ton}</TableCell>

            <TableCell>{item.verified_by}</TableCell>
          </TableRow>
        ))
      )}
    </TableBody>
  </Table>
</TableContainer>


      {/* Footer Summary */}
      {inventoryData.length > 0 && (
        <Paper
          elevation={0}
          sx={{ p: 2, mt: 2, borderRadius: 2, background: "#fafafa" }}
        >
          <Grid container>
            <Grid item xs={12} md={4}>
              Showing {inventoryData.length} items
            </Grid>
            <Grid item xs={12} md={8}>
              <Box display="flex" gap={4} flexWrap="wrap">
                <strong>Total Qty:</strong> {summary.total_quantity}
                <strong>Total Kg:</strong> {summary.total_weight_kg}
                <strong>Total Ton:</strong> {summary.total_weight_ton}
              </Box>
            </Grid>
          </Grid>
        </Paper>
      )}
    </Box>
  );
};

export default InventorySummary;
