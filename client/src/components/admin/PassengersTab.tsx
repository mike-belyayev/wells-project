import { Box, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, TextField } from '@mui/material';
import { Add, Edit, Delete, Search } from '@mui/icons-material';

// Define interface locally
interface Passenger {
  _id: string;
  firstName: string;
  lastName: string;
  jobRole: string;
}

interface PassengersTabProps {
  passengers: Passenger[];
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onOpenDialog: (passenger?: Passenger | null) => void;
  onDelete: (id: string) => void;
  filterPassengers: (passenger: Passenger) => boolean;
}

const PassengersTab = ({
  passengers,
  searchTerm,
  onSearchChange,
  onOpenDialog,
  onDelete,
  filterPassengers
}: PassengersTabProps) => {
  return (
    <>
      <Box display="flex" justifyContent="space-between" mb={2} alignItems="center">
        <TextField
          variant="outlined"
          size="small"
          placeholder="Search passengers..."
          InputProps={{
            startAdornment: <Search color="action" sx={{ mr: 1 }} />
          }}
          sx={{ width: 300 }}
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => onOpenDialog(null)}
        >
          Add Passenger
        </Button>
      </Box>
      <TableContainer sx={{ maxHeight: 'calc(100vh - 300px)', overflow: 'auto' }}>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>First Name</TableCell>
              <TableCell>Last Name</TableCell>
              <TableCell>Job Role</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {passengers.filter(filterPassengers).map((passenger) => (
              <TableRow key={passenger._id}>
                <TableCell>{passenger.firstName}</TableCell>
                <TableCell>{passenger.lastName}</TableCell>
                <TableCell>{passenger.jobRole}</TableCell>
                <TableCell>
                  <IconButton
                    color="primary"
                    onClick={() => onOpenDialog(passenger)}
                  >
                    <Edit />
                  </IconButton>
                  <IconButton
                    color="error"
                    onClick={() => onDelete(passenger._id)}
                  >
                    <Delete />
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

export default PassengersTab;