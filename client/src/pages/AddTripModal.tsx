import { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Checkbox,
  FormControlLabel,
  Button,
  Alert,
  Box,
  Typography,
  IconButton,
  Snackbar,
  List,
  ListItem,
  ListItemText,
  Paper
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { Close, Add, PersonAdd, SwapHoriz } from '@mui/icons-material';
import type { Passenger } from './HeliPage';

interface AddTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  passengers: Passenger[];
  selectedDate: Date;
  tripType: 'incoming' | 'outgoing';
  currentLocation: string;
  userHomeBase: string;
  onSubmit: (tripData: {
    passengerId: string;
    fromOrigin: string;
    toDestination: string;
    tripDate: string;
    confirmed: boolean;
    numberOfPassengers?: number;
  }) => void;
  onAddPassenger?: (passenger: { firstName: string; lastName: string; jobRole: string }) => Promise<Passenger>;
}

const locations = ['NTM', 'Ogle', 'NSC', 'NDT', 'NBD', 'STC'];

// Helper function to normalize dates (fix timezone issues)
const normalizeDate = (date: Date) => {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

export default function AddTripModal({
  isOpen,
  onClose,
  passengers,
  selectedDate,
  tripType,
  currentLocation,
  userHomeBase,
  onSubmit,
  onAddPassenger
}: AddTripModalProps) {
  const [passengerSearch, setPassengerSearch] = useState('');
  const [selectedPassenger, setSelectedPassenger] = useState<Passenger | null>(null);
  const [fromOrigin, setFromOrigin] = useState('Ogle');
  const [toDestination, setToDestination] = useState(userHomeBase);
  const [tripDate, setTripDate] = useState<Date | null>(normalizeDate(selectedDate));
  const [confirmed, setConfirmed] = useState(true);
  const [numberOfPassengers, setNumberOfPassengers] = useState<number | ''>('');
  const [showAddPassenger, setShowAddPassenger] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [newPassenger, setNewPassenger] = useState({
    firstName: '',
    lastName: '',
    jobRole: ''
  });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error'
  });

  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTripDate(normalizeDate(selectedDate));
      setFromOrigin('Ogle');
      setToDestination(userHomeBase);
      setConfirmed(true);
      setNumberOfPassengers('');
      setShowAddPassenger(false);
      setShowDropdown(false);
      setNewPassenger({ firstName: '', lastName: '', jobRole: '' });
      setSelectedPassenger(null);
      setPassengerSearch('');
    }
  }, [selectedDate, tripType, currentLocation, isOpen, userHomeBase]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Function to swap origin and destination
  const handleSwapLocations = () => {
    setFromOrigin(toDestination);
    setToDestination(fromOrigin);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let finalPassengerId = selectedPassenger?._id;

    // If we're in add passenger mode, create the passenger first
    if (showAddPassenger && onAddPassenger) {
      if (!newPassenger.firstName || !newPassenger.lastName || !newPassenger.jobRole) {
        setSnackbar({
          open: true,
          message: 'Please fill in all passenger details',
          severity: 'error'
        });
        return;
      }

      try {
        const createdPassenger = await onAddPassenger(newPassenger);
        finalPassengerId = createdPassenger._id;
        setSnackbar({
          open: true,
          message: 'Passenger added successfully',
          severity: 'success'
        });
        // Switch back to search view and select the new passenger
        setShowAddPassenger(false);
        setSelectedPassenger(createdPassenger);
        setPassengerSearch(`${createdPassenger.firstName} ${createdPassenger.lastName} - ${createdPassenger.jobRole}`);
      } catch (error) {
        setSnackbar({
          open: true,
          message: 'Failed to add passenger',
          severity: 'error'
        });
        return;
      }
    }

    if (!finalPassengerId || !tripDate || fromOrigin === toDestination) return;

    const tripData = {
      passengerId: finalPassengerId,
      fromOrigin,
      toDestination,
      tripDate: format(tripDate, 'yyyy-MM-dd'),
      confirmed,
      ...(numberOfPassengers !== '' && { numberOfPassengers: Number(numberOfPassengers) })
    };

    onSubmit(tripData);
    
    // Clear only the passenger field and keep modal open
    setSelectedPassenger(null);
    setPassengerSearch('');
    setShowDropdown(false);
    setSnackbar({
      open: true,
      message: 'Trip added successfully',
      severity: 'success'
    });
  };

  // Handle number input changes
  const handlePassengerCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow empty string or positive integers
    if (value === '' || (/^\d+$/.test(value) && parseInt(value) > 0)) {
      setNumberOfPassengers(value === '' ? '' : parseInt(value));
    }
  };

  const handleClose = () => {
    setShowAddPassenger(false);
    setShowDropdown(false);
    setNewPassenger({ firstName: '', lastName: '', jobRole: '' });
    setSelectedPassenger(null);
    setPassengerSearch('');
    onClose();
  };

  const handleNewPassengerInputChange = (field: string, value: string) => {
    setNewPassenger(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Custom search logic
  const filteredPassengers = passengers.filter(passenger => {
    const searchLower = passengerSearch.toLowerCase().trim();
    
    if (!searchLower) return false;
    
    const firstName = passenger.firstName.toLowerCase();
    const lastName = passenger.lastName.toLowerCase();
    const jobRole = passenger.jobRole.toLowerCase();
    const fullName = `${firstName} ${lastName}`;
    
    // Split search into words to handle multiple terms
    const searchWords = searchLower.split(/\s+/).filter(word => word.length > 0);
    
    // If only one search word, check individual fields
    if (searchWords.length === 1) {
      const word = searchWords[0];
      return firstName.includes(word) || 
             lastName.includes(word) || 
             jobRole.includes(word) ||
             fullName.includes(word);
    }
    
    // If multiple search words, require ALL words to match somewhere
    return searchWords.every(word => 
      firstName.includes(word) || 
      lastName.includes(word) || 
      jobRole.includes(word) ||
      fullName.includes(word)
    );
  });

  const handlePassengerSelect = (passenger: Passenger) => {
    setSelectedPassenger(passenger);
    setPassengerSearch(`${passenger.firstName} ${passenger.lastName} - ${passenger.jobRole}`);
    setShowDropdown(false);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPassengerSearch(value);
    setSelectedPassenger(null);
    setShowDropdown(value.length > 0);
  };

  const handleSearchFocus = () => {
    if (passengerSearch.length > 0) {
      setShowDropdown(true);
    }
  };

  if (!isOpen) return null;

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Dialog open={isOpen} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Add New Trip
          <IconButton onClick={handleClose} size="small">
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <form onSubmit={handleSubmit}>
            {/* Passenger Selection/Addition Section */}
            <FormControl fullWidth margin="normal">
              {!showAddPassenger ? (
                <Box>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', width: '100%' }} ref={searchRef}>
                    <Box sx={{ flex: 1, position: 'relative' }}>
                      <TextField
                        label="Search Passenger"
                        value={passengerSearch}
                        onChange={handleSearchChange}
                        onFocus={handleSearchFocus}
                        required
                        helperText="Search by first name, last name, or job role"
                        fullWidth
                        sx={{ minWidth: 0 }}
                      />
                      
                      {/* Custom Dropdown */}
                      {showDropdown && (
                        <Paper 
                          sx={{ 
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            right: 0,
                            zIndex: 1000,
                            maxHeight: 200,
                            overflow: 'auto',
                            mt: 0.5,
                            boxShadow: 3
                          }}
                        >
                          <List dense>
                            {filteredPassengers.length > 0 ? (
                              filteredPassengers.map((passenger) => (
                                <ListItem
                                  key={passenger._id}
                                  onClick={() => handlePassengerSelect(passenger)}
                                  sx={{
                                    cursor: 'pointer',
                                    '&:hover': {
                                      backgroundColor: 'action.hover'
                                    }
                                  }}
                                >
                                  <ListItemText
                                    primary={`${passenger.firstName} ${passenger.lastName}`}
                                    secondary={passenger.jobRole}
                                  />
                                </ListItem>
                              ))
                            ) : (
                              <ListItem>
                                <ListItemText 
                                  primary="No passengers found"
                                  secondary={
                                    onAddPassenger && passengerSearch ? (
                                      <Button
                                        startIcon={<Add />}
                                        variant="outlined"
                                        size="small"
                                        onClick={() => {
                                          const names = passengerSearch.split(' ');
                                          setNewPassenger({
                                            firstName: names[0] || '',
                                            lastName: names.slice(1).join(' ') || '',
                                            jobRole: ''
                                          });
                                          setShowAddPassenger(true);
                                          setShowDropdown(false);
                                        }}
                                        sx={{ mt: 1 }}
                                      >
                                        Add "{passengerSearch}" as new passenger
                                      </Button>
                                    ) : null
                                  }
                                />
                              </ListItem>
                            )}
                          </List>
                        </Paper>
                      )}
                    </Box>
                    
                    <Button
                      startIcon={<PersonAdd />}
                      variant="outlined"
                      onClick={() => {
                        setShowAddPassenger(true);
                        setShowDropdown(false);
                      }}
                      sx={{ 
                        height: '56px', 
                        minWidth: '140px',
                        flexShrink: 0 
                      }}
                    >
                      Add New
                    </Button>
                  </Box>
                </Box>
              ) : (
                <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">Add New Passenger</Typography>
                    <Button 
                      size="small" 
                      onClick={() => {
                        setShowAddPassenger(false);
                        setShowDropdown(false);
                      }}
                    >
                      Back to Search
                    </Button>
                  </Box>
                  
                  <TextField
                    label="First Name"
                    value={newPassenger.firstName}
                    onChange={(e) => handleNewPassengerInputChange('firstName', e.target.value)}
                    fullWidth
                    required
                    margin="normal"
                  />
                  
                  <TextField
                    label="Last Name"
                    value={newPassenger.lastName}
                    onChange={(e) => handleNewPassengerInputChange('lastName', e.target.value)}
                    fullWidth
                    required
                    margin="normal"
                  />
                  
                  <TextField
                    label="Job Role"
                    value={newPassenger.jobRole}
                    onChange={(e) => handleNewPassengerInputChange('jobRole', e.target.value)}
                    fullWidth
                    required
                    margin="normal"
                  />
                </Box>
              )}
            </FormControl>

            {/* Trip Details Section */}
            <Box sx={{ display: 'flex', gap: '16px', marginTop: '16px' }}>
              <FormControl fullWidth>
                <DatePicker
                  label="Trip Date"
                  value={tripDate}
                  onChange={(newValue) => setTripDate(newValue ? normalizeDate(newValue) : null)}
                  slotProps={{
                    textField: {
                      required: true
                    }
                  }}
                />
              </FormControl>
              
              <FormControlLabel
                control={
                  <Checkbox
                    checked={confirmed}
                    onChange={(e) => setConfirmed(e.target.checked)}
                  />
                }
                label="Confirmed"
                sx={{ mt: 1 }}
              />
            </Box>

            {/* Location Selection with Swap Button */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '16px' }}>
              <FormControl fullWidth>
                <InputLabel>From</InputLabel>
                <Select
                  value={fromOrigin}
                  onChange={(e) => setFromOrigin(e.target.value)}
                  label="From"
                >
                  {locations.map(loc => (
                    <MenuItem key={loc} value={loc}>{loc}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <IconButton 
                onClick={handleSwapLocations}
                sx={{ 
                  mt: 2, 
                  backgroundColor: 'primary.main', 
                  color: 'white',
                  '&:hover': {
                    backgroundColor: 'primary.dark'
                  }
                }}
                title="Swap locations"
              >
                <SwapHoriz />
              </IconButton>

              <FormControl fullWidth>
                <InputLabel>To</InputLabel>
                <Select
                  value={toDestination}
                  onChange={(e) => setToDestination(e.target.value)}
                  label="To"
                >
                  {locations.map(loc => (
                    <MenuItem key={loc} value={loc}>{loc}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            {/* Add Number of Passengers Field */}
            <FormControl fullWidth sx={{ mt: 2 }}>
              <TextField
                label="Number of Passengers (Optional)"
                type="number"
                value={numberOfPassengers}
                onChange={handlePassengerCountChange}
                inputProps={{ 
                  min: 1,
                  step: 1
                }}
                helperText="Leave empty if not applicable"
                placeholder="Enter number of passengers"
              />
            </FormControl>

            {fromOrigin === toDestination && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                Origin and destination cannot be the same
              </Alert>
            )}

            <DialogActions sx={{ mt: 2 }}>
              <Button onClick={handleClose} variant="outlined">
                Close
              </Button>
              <Button
                type="submit"
                disabled={
                  (!selectedPassenger && !showAddPassenger) || 
                  fromOrigin === toDestination || 
                  !tripDate ||
                  (showAddPassenger && (!newPassenger.firstName || !newPassenger.lastName || !newPassenger.jobRole))
                }
                variant="contained"
              >
                {showAddPassenger ? 'Add Passenger & Create Trip' : 'Add Trip'}
              </Button>
            </DialogActions>
          </form>
        </DialogContent>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </LocalizationProvider>
  );
}