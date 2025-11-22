import React, { useState, useMemo } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Table, TableHead, TableRow, TableCell, TableBody,
  Typography, useMediaQuery, useTheme, Box, Button,
  IconButton, Tooltip, Chip, Stack
} from '@mui/material';
import {
  Add as AddIcon,
  Close as CloseIcon,
  FileOpen as FileOpenIcon,
  Info as InfoIcon,
  PictureAsPdf as PdfIcon
} from '@mui/icons-material';
import AddSPCDimensionsDialog from './AddSPCDimensionsDialog';
import api,{ BASE_URL } from "../../services/service";
import { useAuth } from "../../../context/AuthContext";

const SpcDetailsDialog = ({ open, onClose, data }) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'));
  const [addDimensionsOpen, setAddDimensionsOpen] = useState(false);
  const [pdfPreview, setPdfPreview] = useState(null);
  const [pdfError, setPdfError] = useState(null);

  const handleAddDimensionsClose = (success) => {
    setAddDimensionsOpen(false);
    if (success) onClose(true);
  };

  const handlePdfOpen = (filePath) => {
    if (!filePath) {
      setPdfError('No file available');
      return;
    }

    // Construct full URL (adjust this based on your backend configuration)
    const baseUrl = BASE_URL;
    const pdfUrl = `${baseUrl}${filePath}`;
    
    // Check if it's a PDF (simple check)
    if (filePath.toLowerCase().endsWith('.pdf')) {
      setPdfPreview(pdfUrl);
      setPdfError(null);
    } else {
      // For non-PDF files, open in new tab
      window.open(pdfUrl, '_blank');
    }
  };

  const handleClosePdfPreview = () => {
    setPdfPreview(null);
    setPdfError(null);
  };

  // Memoize table rows for better performance with large datasets
  const tableRows = useMemo(() => {
    if (!data?.dimensions?.length) return null;

    return data.dimensions.map((dim, idx) => (
      <React.Fragment key={`dim-${dim.dimension}-${idx}`}>
        {/* Main Dimension Row */}
        <TableRow hover>
          <TableCell>{dim.dimension}</TableCell>
          <TableCell>{dim.name}</TableCell>
          <TableCell>{dim.type}</TableCell>
          <TableCell>{dim.instrument}</TableCell>
          <TableCell>
            {dim.remark && (
              <Tooltip title={dim.remark}>
                <InfoIcon color="action" fontSize="small" />
              </Tooltip>
            )}
          </TableCell>
          <TableCell>
            <Chip 
              label={`${dim.spc_time_period_days} days`} 
              size="small" 
              color="primary" 
              variant="outlined" 
            />
          </TableCell>
          <TableCell>
            <Stack direction="column" spacing={0.5}>
              <Typography variant="body2">{dim.created_at}</Typography>
              <Typography variant="caption" color="text.secondary">
                {dim.created_by}
              </Typography>
            </Stack>
          </TableCell>
          
          {dim.latest_record ? (
            <>
              <TableCell>{dim.latest_record.uploaded_at}</TableCell>
              <TableCell>
                <Chip 
                  label={dim.latest_record.cp_value || 'N/A'} 
                  size="small" 
                  color={dim.latest_record.cp_value > 1.33 ? 'success' : 'error'} 
                />
              </TableCell>
              <TableCell>
                <Chip 
                  label={dim.latest_record.cpk_value || 'N/A'} 
                  size="small" 
                  color={dim.latest_record.cpk_value > 1.33 ? 'success' : 'error'} 
                />
              </TableCell>
              <TableCell>
                <Tooltip title={dim.latest_record.spc_file ? "View file" : "No file available"}>
                  <IconButton 
                    size="small" 
                    onClick={() => handlePdfOpen(dim.latest_record.spc_file)}
                    disabled={!dim.latest_record.spc_file}
                  >
                    {dim.latest_record.spc_file?.toLowerCase().endsWith('.pdf') ? (
                      <PdfIcon fontSize="small" color="error" />
                    ) : (
                      <FileOpenIcon fontSize="small" />
                    )}
                  </IconButton>
                </Tooltip>
              </TableCell>
              <TableCell>{dim.latest_record.uploaded_by}</TableCell>
            </>
          ) : (
            <TableCell colSpan={5} align="center">
              <Typography variant="caption" color="text.secondary">
                No SPC Data
              </Typography>
            </TableCell>
          )}
        </TableRow>

        {/* Previous Records */}
        {dim.previous_records?.map((rec, i) => (
          <TableRow key={`prev-${idx}-${i}`} sx={{ bgcolor: 'action.hover' }}>
            <TableCell colSpan={7} />
            <TableCell>{rec.uploaded_at}</TableCell>
            <TableCell>{rec.cp_value}</TableCell>
            <TableCell>{rec.cpk_value}</TableCell>
            <TableCell>
              <Tooltip title={rec.spc_file ? "View file" : "No file available"}>
                <IconButton 
                  size="small" 
                  onClick={() => handlePdfOpen(rec.spc_file)}
                  disabled={!rec.spc_file}
                >
                  {rec.spc_file?.toLowerCase().endsWith('.pdf') ? (
                    <PdfIcon fontSize="small" color="error" />
                  ) : (
                    <FileOpenIcon fontSize="small" />
                  )}
                </IconButton>
              </Tooltip>
            </TableCell>
            <TableCell>{rec.uploaded_by}</TableCell>
          </TableRow>
        ))}
      </React.Fragment>
    ));
  }, [data]);

  return (
    <>
      <Dialog 
        open={open} 
        onClose={onClose} 
        fullWidth 
        maxWidth="xl" 
        fullScreen={fullScreen}
        sx={{ '& .MuiDialog-paper': { minHeight: fullScreen ? '100vh' : '80vh' } }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h6" component="span" fontWeight="bold">
              {data?.component || 'Component'}
            </Typography>
            <Typography variant="subtitle1" component="span" ml={2} color="text.secondary">
              {data?.customer || 'N/A'}
            </Typography>
          </Box>
          <Box>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={() => setAddDimensionsOpen(true)}
              sx={{ mr: 1 }}
            >
              Add Dimensions
            </Button>
            <IconButton edge="end" onClick={onClose}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent dividers sx={{ p: 0, overflowX: 'auto' }}>
          {data?.dimensions?.length ? (
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Dimension</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Instrument</TableCell>
                  <TableCell>Remark</TableCell>
                  <TableCell>SPC Period</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell>Uploaded At</TableCell>
                  <TableCell>CP</TableCell>
                  <TableCell>CPK</TableCell>
                  <TableCell>File</TableCell>
                  <TableCell>Uploaded By</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {tableRows}
              </TableBody>
            </Table>
          ) : (
            <Box 
              display="flex" 
              flexDirection="column" 
              alignItems="center" 
              justifyContent="center" 
              p={4}
              minHeight="200px"
            >
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No SPC Dimensions Found
              </Typography>
              <Button
                variant="outlined"
                color="primary"
                startIcon={<AddIcon />}
                onClick={() => setAddDimensionsOpen(true)}
              >
                Add New Dimensions
              </Button>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={onClose} color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* PDF Preview Dialog */}
      <Dialog
        open={Boolean(pdfPreview)}
        onClose={handleClosePdfPreview}
        fullWidth
        maxWidth="md"
        fullScreen={fullScreen}
      >
        <DialogTitle>
          PDF Preview
          <IconButton
            edge="end"
            onClick={handleClosePdfPreview}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ height: '80vh' }}>
          {pdfError ? (
            <Box display="flex" justifyContent="center" alignItems="center" height="100%">
              <Typography color="error">{pdfError}</Typography>
            </Box>
          ) : (
            <iframe 
              src={pdfPreview} 
              width="100%" 
              height="100%"
              title="PDF Preview"
              style={{ border: 'none' }}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => window.open(pdfPreview, '_blank')}
            startIcon={<FileOpenIcon />}
          >
            Open in New Tab
          </Button>
          <Button 
            onClick={handleClosePdfPreview}
            color="primary"
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      <AddSPCDimensionsDialog
        open={addDimensionsOpen}
        onClose={handleAddDimensionsClose}
        component={data?.component}
      />
    </>
  );
};

export default React.memo(SpcDetailsDialog);