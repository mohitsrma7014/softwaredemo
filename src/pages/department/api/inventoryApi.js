import axios from 'axios';
import api,{ BASE_URL } from "../../services/service";

export const stockIn = (data) => 
  axios.post(`${BASE_URL}api/packing_area_inventory/inventory/in/`, data);

export const stockOut = (data) => 
  axios.post(`${BASE_URL}api/packing_area_inventory/inventory/out/`, data);

export const getLocationInventory = (code) => 
  axios.get(`${BASE_URL}api/packing_area_inventory/inventory/location/${code}/`);

export const getAvailableMaterialsForOut = (locationId) => 
  axios.get(`${BASE_URL}api/packing_area_inventory/inventory/available-out/${locationId}/`);

export const getHoldMaterials = () => 
  axios.get(`${BASE_URL}api/packing_area_inventory/inventory/materials/`);

export const getInHistory = () => 
  axios.get(`${BASE_URL}api/packing_area_inventory/inventory/history/in/`);

export const getOutHistory = () => 
  axios.get(`${BASE_URL}api/packing_area_inventory/inventory/history/out/`);

export const getLocations = () => 
  axios.get(`${BASE_URL}api/packing_area_inventory/inventory/locations/`);

// New API functions for batch search
export const searchBatches = (searchTerm) => 
  axios.get(`${BASE_URL}api/packing_area_inventory/inventory/search-batches/?search=${encodeURIComponent(searchTerm)}`);

export const getBatchDetails = (batchId) => 
  axios.get(`${BASE_URL}api/packing_area_inventory/inventory/batch-details/?batch_id=${encodeURIComponent(batchId)}`);

// inventoryApi.js - Add these functions
export const getInventorySummary = (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.location) params.append('location', filters.location);
  if (filters.component) params.append('component', filters.component);
  
  return axios.get(`${BASE_URL}api/packing_area_inventory/inventory/summary/?${params.toString()}`);
};

export const getInventoryLocations = () => 
  axios.get(`${BASE_URL}api/packing_area_inventory/inventory/summary/locations/`);

export const getInventoryComponents = () => 
  axios.get(`${BASE_URL}api/packing_area_inventory/inventory/summary/components/`);