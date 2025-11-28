import React, { useEffect, useState } from "react";
import { 
  Card, 
  CardContent, 
  Typography, 
  Grid, 
  Alert,
  CircularProgress,
  Box,
  TextField
} from "@mui/material";
import axios from "axios";
import api,{ BASE_URL } from "../../services/service";

export default function LocationList({ onSelectLocation }) {
  const [locations, setLocations] = useState([]);
  const [filteredLocations, setFilteredLocations] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const naturalSort = (a, b) => {
    const regex = /^([A-Za-z]*)(\d*)$/;

    const [, aAlpha, aNum] = a.code.match(regex) || [];
    const [, bAlpha, bNum] = b.code.match(regex) || [];

    // Compare alphabetic prefix
    const alphaCompare = (aAlpha || "").localeCompare(bAlpha || "");
    if (alphaCompare !== 0) return alphaCompare;

    // Compare numeric part (if both have numbers)
    const numA = parseInt(aNum || "0", 10);
    const numB = parseInt(bNum || "0", 10);

    return numA - numB;
    };


  useEffect(() => {
    axios
      .get(`${BASE_URL}api/packing_area_inventory/inventory/locations/`)
      .then((res) => {
        // 🔥 Sort A → Z by code
        const sorted = [...res.data].sort(naturalSort);


        setLocations(sorted);
        setFilteredLocations(sorted);
        setLoading(false);
      })
      .catch((err) => {
        setError("Failed to load locations");
        setLoading(false);
        console.error(err);
      });
  }, []);

  // Filter + keep sorted results
  useEffect(() => {
    const term = search.toLowerCase();

    const filtered = locations.filter(
      (loc) =>
        loc.code.toLowerCase().includes(term) ||
        (loc.description && loc.description.toLowerCase().includes(term))
    );

    // Keep alphabetical order even after search
    const sortedFiltered = [...filtered].sort(naturalSort);

    setFilteredLocations(sortedFiltered);
  }, [search, locations]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <>
      {/* 🔍 Search Box */}
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          label="Search Location"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by code or description..."
        />
      </Box>

      {/* Location Cards */}
      <Grid container spacing={2}>
        {filteredLocations.length > 0 ? (
          filteredLocations.map((loc) => (
            <Grid item xs={12} sm={6} md={3} key={loc.id}>
              <Card
                sx={{
                  cursor: "pointer",
                  transition: "0.3s",
                  "&:hover": {
                    transform: "translateY(-4px)",
                    boxShadow: 4,
                  },
                }}
                onClick={() => onSelectLocation(loc)}
              >
                <CardContent>
                  <Typography variant="h5" gutterBottom>
                    {loc.code}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {loc.description || "No description"}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))
        ) : (
          <Grid item xs={12}>
            <Alert severity="info">No locations found.</Alert>
          </Grid>
        )}
      </Grid>
    </>
  );
}
