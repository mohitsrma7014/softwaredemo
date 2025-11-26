import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
  Typography,
  Box,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  CloudUpload as CloudUploadIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import axios from 'axios';
import { format } from 'date-fns';
import { useAuth } from "../../../context/AuthContext";
import api from "../../services/service";

const ManualDocumentsPage = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [currentDocument, setCurrentDocument] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [searchTerm, setSearchTerm] = useState('');
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState('');
  const navigate = useNavigate();
const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  
    const toggleSidebar = () => {
      setIsSidebarVisible(!isSidebarVisible);
    };
    const pageTitle = "Manual Document Managment"; // Set the page title here
  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const response = await api.get('api/ims_documents/manuals/');
      setDocuments(response.data || []);

      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
      showSnackbar('Failed to fetch documents', 'error');
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleOpenDialog = (document = null) => {
    setCurrentDocument(document || {
      document_name: '',
      document_type: 'manual',
      status: 'current',
      document_file: null
    });
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setCurrentDocument(null);
    setFile(null);
    setFileError('');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCurrentDocument({ ...currentDocument, [name]: value });
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (selectedFile.type !== 'application/pdf') {
        setFileError('Only PDF files are allowed');
        return;
      }
      if (selectedFile.size > 5 * 1024 * 1024) { // 5MB
        setFileError('File size should be less than 5MB');
        return;
      }
      setFile(selectedFile);
      setFileError('');
    }
  };

  const handleSubmit = async () => {
    try {
      const formData = new FormData();
      formData.append('document_name', currentDocument.document_name);
      formData.append('document_type', currentDocument.document_type);
      formData.append('status', currentDocument.status);
      if (file) {
        formData.append('document_file', file);
      }

      if (currentDocument.id) {
        // Update existing document
        await api.patch(`api/ims_documents/manuals/${currentDocument.id}/`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
        showSnackbar('Document updated successfully');
      } else {
        // Create new document
        await api.post('api/ims_documents/manuals/', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
        showSnackbar('Document created successfully');
      }

      fetchDocuments();
      handleCloseDialog();
    } catch (err) {
      showSnackbar(err.response?.data?.message || 'Error saving document', 'error');
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`api/ims_documents/manuals/${id}/`);
      showSnackbar('Document deleted successfully');
      fetchDocuments();
    } catch (err) {
      showSnackbar('Error deleting document', 'error');
    }
  };

  const handleViewDocument = (documentUrl) => {
    window.open(documentUrl, '_blank');
  };

  const filteredDocuments = documents.filter(doc =>
    doc.document_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col  justify-center flex-grow ">
      
    <Box sx={{ p:1 }}>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <TextField
          label="Search Documents"
          variant="outlined"
          size="small"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ width: 300 }}
        />
        <Box>
          <Button
            variant="contained"
            color="primary"
            startIcon={<RefreshIcon />}
            onClick={fetchDocuments}
            sx={{ mr: 2 }}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Add Manual
          </Button>
        </Box>
      </Box>

      {loading ? (
        <Typography>Loading...</Typography>
      ) : error ? (
        <Typography color="error">{error}</Typography>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Document Name</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Uploaded On</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredDocuments.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell>{doc.document_name}</TableCell>
                  <TableCell>{doc.document_type}</TableCell>
                  <TableCell>
                    <Box
                      sx={{
                        display: 'inline-block',
                        px: 1,
                        py: 0.5,
                        borderRadius: 1,
                        bgcolor: doc.status === 'current' ? 'success.light' : 'warning.light',
                        color: doc.status === 'current' ? 'success.contrastText' : 'warning.contrastText'
                      }}
                    >
                      {doc.status}
                    </Box>
                  </TableCell>
                  <TableCell>{format(new Date(doc.created_at), 'MMM dd, yyyy HH:mm')}</TableCell>
                  <TableCell>
                    <Tooltip title="View">
                      <IconButton onClick={() => handleViewDocument(doc.document_url)}>
                        <VisibilityIcon color="primary" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit">
                      <IconButton onClick={() => handleOpenDialog(doc)}>
                        <EditIcon color="secondary" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton onClick={() => handleDelete(doc.id)}>
                        <DeleteIcon color="error" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {currentDocument?.id ? 'Edit Manual Document' : 'Add New Manual Document'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <TextField
              label="Document Name"
              name="document_name"
              value={currentDocument?.document_name || ''}
              onChange={handleInputChange}
              fullWidth
              required
            />
            
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                name="status"
                value={currentDocument?.status || 'current'}
                onChange={handleInputChange}
                label="Status"
                required
              >
                <MenuItem value="current">Current</MenuItem>
                <MenuItem value="old">Old</MenuItem>
              </Select>
            </FormControl>

            <Box>
              <Button
                variant="outlined"
                component="label"
                startIcon={<CloudUploadIcon />}
                fullWidth
              >
                Upload PDF File
                <input
                  type="file"
                  hidden
                  accept="application/pdf"
                  onChange={handleFileChange}
                />
              </Button>
              {fileError && (
                <Typography color="error" variant="caption">
                  {fileError}
                </Typography>
              )}
              {file && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Selected file: {file.name}
                </Typography>
              )}
              {currentDocument?.document_url && !file && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Current file: <a href={currentDocument.document_url} target="_blank" rel="noopener noreferrer">
                    View current file
                  </a>
                </Typography>
              )}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" color="primary">
            {currentDocument?.id ? 'Update' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  
    </div>
  );
};

export default ManualDocumentsPage;