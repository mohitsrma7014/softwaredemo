// src/pages/DocumentMasterlist.jsx
import { useEffect, useState, useMemo } from 'react';
import api,{ BASE_URL } from "../../services/service";
import { useAuth } from "../../../context/AuthContext";import { 
  Box, 
  Button, 
  Paper, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Typography,
  CircularProgress,
  Chip,
  Snackbar,
  Alert,
  TextField
} from '@mui/material';
import { Download, Refresh } from '@mui/icons-material';

const DocumentMasterlist = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState(""); // 🔍 search state
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info'
  });

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/raw_material/api/masterlist/running-npd-documents/');
      setDocuments(response.data);
    } catch (err) {
      setError(err.message || 'Failed to fetch documents');
      setSnackbar({
        open: true,
        message: err.message || 'Failed to fetch documents',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleDownload = (url) => {
    window.open(url, '_blank');
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  // ✅ Optimized search with useMemo (only recalculates when docs/search changes)
  const filteredDocuments = useMemo(() => {
    if (!search.trim()) return documents;
    const lower = search.toLowerCase();
    return documents.filter(doc =>
      doc.component?.toLowerCase().includes(lower)
    );
  }, [documents, search]);

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        mb: 3,
        gap: 2
      }}>
        <Typography variant="h5" component="h1">
          Active Component Packing Standard (Running/NPD)
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          {/* 🔍 Search by Component */}
          <TextField
            size="small"
            variant="outlined"
            placeholder="Search by Component"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Button
            variant="contained"
            startIcon={<Refresh />}
            onClick={fetchDocuments}
            disabled={loading}
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </Box>
      </Box>

      <TableContainer component={Paper} sx={{ 
        maxHeight: 'calc(100vh - 200px)',
        boxShadow: 3
      }}>
        <Table stickyHeader aria-label="document masterlist table">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold' }}>Component</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Part Name</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Document Type</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Version</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Uploaded At</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <CircularProgress size={24} />
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ color: 'error.main' }}>
                  {error}
                </TableCell>
              </TableRow>
            ) : filteredDocuments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  No documents found
                </TableCell>
              </TableRow>
            ) : (
              filteredDocuments.map((doc, index) => (
                <TableRow key={index} hover>
                  <TableCell>{doc.component}</TableCell>
                  <TableCell>{doc.part_name}</TableCell>
                  <TableCell>
                    <Chip
                      label={doc.running_status}
                      color={doc.running_status === 'Running' ? 'success' : 'warning'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{doc.document_type}</TableCell>
                  <TableCell>v{doc.version}</TableCell>
                  <TableCell>
                    {new Date(doc.uploaded_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </TableCell>
                  <TableCell>
  {/* View Button */}
  <Button
    variant="outlined"
    size="small"
    onClick={() => handleDownload(doc.document)}
    disabled={!doc.document}
    sx={{ minWidth: '100px', mr: 1 }}
  >
    View
  </Button>

  {/* Download Button */}
  <Button
    variant="contained"
    size="small"
    startIcon={<Download />}
    onClick={() => {
      if (doc.document) {
        const link = document.createElement("a");
        link.href = doc.document;
        link.setAttribute("download", doc.component || "document.pdf");
        document.body.appendChild(link);
        link.click();
        link.remove();
      }
    }}
    disabled={!doc.document}
    sx={{ minWidth: '120px' }}
  >
    Download
  </Button>
</TableCell>

                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default DocumentMasterlist;
