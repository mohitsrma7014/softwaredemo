import React, { useEffect, useState } from "react";
import {
  Box, Typography, Button, Table, TableHead,
  TableCell, TableRow, TableBody, Alert, Paper
} from "@mui/material";
import AddTransactionModal from "./AddTransactionModal";
import { getLocationInventory } from "../api/inventoryApi";

export default function LocationDetail({ location }) {
  const [inventory, setInventory] = useState([]);
  const [openModal, setOpenModal] = useState(false);
  const [mode, setMode] = useState("IN");
  const [error, setError] = useState("");

  const loadData = () => {
    if (location && location.code) {
      getLocationInventory(location.code)
        .then((res) => setInventory(res.data))
        .catch(err => {
          setError("Failed to load inventory data");
          console.error(err);
        });
    }
  };

  useEffect(() => {
    if (location) {
      loadData();
      setError("");
    }
  }, [location]);

  if (!location) {
    return (
      <Box p={3}>
        <Alert severity="info">Please select a location first</Alert>
      </Box>
    );
  }

  return (
    <Box p={0}>
      <Typography variant="h4" gutterBottom>
        Location: {location.code}
      </Typography>
      <Typography variant="subtitle1" color="textSecondary" gutterBottom>
        {location.description}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ mt: 2, mb: 3 }}>
        <Button 
          variant="contained" 
          sx={{ mr: 2 }}
          onClick={() => { setMode("IN"); setOpenModal(true); }}
        >
          Add Stock (IN)
        </Button>

        <Button 
          variant="outlined" 
          onClick={() => { setMode("OUT"); setOpenModal(true); }}
        >
          Remove Stock (OUT)
        </Button>
      </Box>

      <Paper>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong>Component</strong></TableCell>
              <TableCell><strong>Batch</strong></TableCell>
              <TableCell><strong>Slug Weight (kg)</strong></TableCell>
              <TableCell><strong>Available Qty</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {inventory.length > 0 ? (
              inventory.map((item) => (
                <TableRow key={`${item.material}-${item.batch}`}>
                  <TableCell>{item.component}</TableCell>
                  <TableCell>{item.batch}</TableCell>
                  <TableCell>{item.slug_weight}</TableCell>
                  <TableCell>
                    <Typography 
                      variant="body1" 
                      fontWeight="bold"
                      color={item.available_qty > 0 ? "success.main" : "error.main"}
                    >
                      {item.available_qty}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  <Typography variant="body1" color="textSecondary">
                    No inventory found for this location
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <AddTransactionModal
        open={openModal}
        handleClose={() => setOpenModal(false)}
        mode={mode}
        location={location}
        refresh={loadData}
      />
    </Box>
  );
}