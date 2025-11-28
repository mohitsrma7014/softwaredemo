import React, { useState } from "react";
import { Box, Button, Typography, Alert } from "@mui/material";
import LocationList from "./LocationList";
import LocationDetail from "./LocationDetail";

export default function PackingHome() {
  const [activePage, setActivePage] = useState("list");
  const [selectedLocation, setSelectedLocation] = useState(null);

  const handleLocationSelect = (location) => {
    setSelectedLocation(location);
    setActivePage("detail");
  };

  const handleBackToList = () => {
    setActivePage("list");
    setSelectedLocation(null);
  };

  return (
    <Box p={3}>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Packing Area Inventory
      </Typography>

      {/* Navigation Buttons */}
      <Box sx={{ mb: 3, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Button
          variant={activePage === "list" ? "contained" : "outlined"}
          onClick={handleBackToList}
        >
          Location List
        </Button>

        <Button
          variant={activePage === "detail" ? "contained" : "outlined"}
          onClick={() => setActivePage("detail")}
          disabled={!selectedLocation}
        >
          Location Detail
        </Button>

        {selectedLocation && (
          <Typography variant="h6" sx={{ ml: 2, alignSelf: 'center' }}>
            Current: {selectedLocation.code}
          </Typography>
        )}
      </Box>

      {/* Content Area */}
      <Box sx={{ mt: 2 }}>
        {activePage === "list" && (
          <LocationList onSelectLocation={handleLocationSelect} />
        )}

        {activePage === "detail" && (
          <LocationDetail location={selectedLocation} />
        )}

        {activePage === "detail" && !selectedLocation && (
          <Alert severity="warning">
            Please select a location from the list
          </Alert>
        )}
      </Box>
    </Box>
  );
}