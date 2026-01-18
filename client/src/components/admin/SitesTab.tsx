import { Box, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, Typography, Chip, TextField } from '@mui/material';
import { Edit, Search } from '@mui/icons-material';

// Define interfaces locally
interface Site {
  _id: string;
  siteName: string;
  currentPOB: number;
  maximumPOB: number;
  pobUpdatedDate: string;
}

interface SitesTabProps {
  sites: Site[];
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onOpenDialog: (site?: Site | null) => void;
  onInitializeSites: () => void;
  filterSites: (site: Site) => boolean;
  formatDate: (dateString: string) => string;
  getPOBStatus: (currentPOB: number, maximumPOB: number) => 'success' | 'warning' | 'error';
}

const SitesTab = ({
  sites,
  searchTerm,
  onSearchChange,
  onOpenDialog,
  onInitializeSites,
  filterSites,
  formatDate,
  getPOBStatus
}: SitesTabProps) => {
  return (
    <>
      <Box display="flex" justifyContent="space-between" mb={2} alignItems="center">
        <TextField
          variant="outlined"
          size="small"
          placeholder="Search sites..."
          InputProps={{
            startAdornment: <Search color="action" sx={{ mr: 1 }} />
          }}
          sx={{ width: 300 }}
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        <Button
          variant="outlined"
          onClick={onInitializeSites}
        >
          Initialize Sites
        </Button>
      </Box>
      <TableContainer sx={{ maxHeight: 'calc(100vh - 300px)', overflow: 'auto' }}>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>Site Name</TableCell>
              <TableCell align="center">Current POB</TableCell>
              <TableCell align="center">Maximum POB</TableCell>
              <TableCell align="center">Status</TableCell>
              <TableCell align="center">Last Updated</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sites.filter(filterSites).map((site) => (
              <TableRow key={site._id}>
                <TableCell>
                  <Typography variant="subtitle1" fontWeight="bold">
                    {site.siteName}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <Typography variant="h6" color="primary">
                    {site.currentPOB}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <Typography variant="body1">
                    {site.maximumPOB}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <Chip
                    label={`${Math.round((site.currentPOB / site.maximumPOB) * 100)}%`}
                    color={getPOBStatus(site.currentPOB, site.maximumPOB)}
                    variant="filled"
                  />
                </TableCell>
                <TableCell align="center">
                  <Typography variant="body2" color="textSecondary">
                    {formatDate(site.pobUpdatedDate)}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <IconButton
                    color="primary"
                    onClick={() => onOpenDialog(site)}
                  >
                    <Edit />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
};

export default SitesTab;