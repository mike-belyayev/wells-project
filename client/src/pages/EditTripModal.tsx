import { useState, useEffect } from 'react';
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
  CircularProgress,
  Autocomplete,
  Alert
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import type { Passenger, Trip } from './HeliPage';
import { API_ENDPOINTS } from '../config/api'; // Add this import

// Helper function to normalize dates (fix timezone issues)
const normalizeDate = (dateString: string) => {
  // Parse the date in local time but ignore timezone offset
  const [year, month, day] = dateString.split('T')[0].split('-').map(Number);
  return new Date(year, month - 1, day);
};

interface EditTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  passengers: Passenger[];
  trip: Trip | null;
  currentLocation: string;
  onUpdate: (updatedTrip: Trip) => void;
  onDelete: (tripId: string) => void;
}

const locations = ['Ogle', 'NTM', 'NSC', 'NDT', 'NBD', 'STC'];

export default function EditTripModal({
  isOpen,
  onClose,
  passengers,
  trip,
  onUpdate,
  onDelete
}: EditTripModalProps) {
  const [passengerSearch, setPassengerSearch] = useState('');
  const [selectedPassenger, setSelectedPassenger] = useState<Passenger | null>(null);
  const [fromOrigin, setFromOrigin] = useState('NTM');
  const [toDestination, setToDestination] = useState('NSC');
  const [tripDate, setTripDate] = useState<Date | null>(new Date());
  const [confirmed, setConfirmed] = useState(false);
  const [numberOfPassengers, setNumberOfPassengers] = useState<number | ''>('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (trip) {
      const passenger = passengers.find(p => p._id === trip.passengerId);
      setPassengerSearch(
        passenger ? `${passenger.firstName} ${passenger.lastName}` : ''
      );
      setSelectedPassenger(passenger || null);
      setFromOrigin(trip.fromOrigin);
      setToDestination(trip.toDestination);
      // Use the normalizeDate helper to avoid timezone issues
      setTripDate(trip.tripDate ? normalizeDate(trip.tripDate) : new Date());
      setConfirmed(trip.confirmed || false);
      // Set numberOfPassengers from trip data, handle null/undefined
      setNumberOfPassengers(trip.numberOfPassengers ?? '');
    }
    
    return () => {
      setPassengerSearch('');
      setSelectedPassenger(null);
      setFromOrigin('NTM');
      setToDestination('NSC');
      setTripDate(new Date());
      setConfirmed(false);
      setNumberOfPassengers('');
      setError(null);
      setIsUpdating(false);
      setIsDeleting(false);
    };
  }, [trip, passengers]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isUpdating || !trip || !tripDate) return;
    setIsUpdating(true);
    setError(null);
    
    if (!selectedPassenger) {
      setError('Please select a passenger');
      setIsUpdating(false);
      return;
    }
    if (fromOrigin === toDestination) {
      setError('Origin and destination cannot be the same');
      setIsUpdating(false);
      return;
    }

    // Format the date as YYYY-MM-DD without timezone conversion
    const formattedDate = format(tripDate, 'yyyy-MM-dd');

    const updatedTrip = {
      ...trip,
      passengerId: selectedPassenger._id,
      fromOrigin,
      toDestination,
      tripDate: formattedDate,
      confirmed,
      // Only include numberOfPassengers if it's a valid number, otherwise set to null
      numberOfPassengers: numberOfPassengers !== '' ? Number(numberOfPassengers) : null
    };

    try {
      // Use environment-based URL
      const response = await fetch(API_ENDPOINTS.TRIP_BY_ID(trip._id), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedTrip),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update trip');
      }

      const data = await response.json();
      onUpdate(data);
      onClose();
    } catch (error) {
      console.error('Error updating trip:', error);
      setError(error instanceof Error ? error.message : 'Failed to update trip. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (isDeleting || !trip) return;
    
    setIsDeleting(true);
    setError(null);
    
    try {
      // Use environment-based URL
      const response = await fetch(API_ENDPOINTS.TRIP_BY_ID(trip._id), {
        method: 'DELETE',
      });

      if (!response.ok && response.status !== 404) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete trip');
      }

      onDelete(trip._id);
      onClose();
    } catch (error) {
      console.error('Error deleting trip:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete trip. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle number input changes
  const handlePassengerCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow empty string or positive integers
    if (value === '' || (/^\d+$/.test(value) && parseInt(value) > 0)) {
      setNumberOfPassengers(value === '' ? '' : parseInt(value));
    }
  };

  if (!isOpen || !trip) return null;

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Dialog open={isOpen} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Trip</DialogTitle>
        <DialogContent>
          <form onSubmit={handleUpdate}>
            <FormControl fullWidth margin="normal">
              <Autocomplete
                options={passengers}
                getOptionLabel={(option) => `${option.firstName} ${option.lastName}`}
                value={selectedPassenger}
                onChange={(_, newValue) => {
                  setSelectedPassenger(newValue);
                  setPassengerSearch(newValue ? `${newValue.firstName} ${newValue.lastName}` : '');
                }}
                inputValue={passengerSearch}
                onInputChange={(_, newInputValue) => {
                  setPassengerSearch(newInputValue);
                }}
                renderInput={(params) => (
                  <TextField {...params} label="Passenger" required />
                )}
              />
            </FormControl>

            <div style={{ display: 'flex', gap: '16px', marginTop: '16px' }}>
              <FormControl fullWidth margin="normal">
                <DatePicker
                  label="Trip Date"
                  value={tripDate}
                  onChange={(newValue) => setTripDate(newValue)}
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
                style={{ marginTop: '16px' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '16px', marginTop: '16px' }}>
              <FormControl fullWidth margin="normal">
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

              <FormControl fullWidth margin="normal">
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
            </div>

            {/* Add Number of Passengers Field */}
            <FormControl fullWidth margin="normal">
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

            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}

            <DialogActions sx={{ mt: 2 }}>
              <Button
                onClick={handleDelete}
                disabled={isDeleting}
                color="error"
                variant="outlined"
              >
                {isDeleting ? <CircularProgress size={24} /> : 'Delete Trip'}
              </Button>
              <Button
                type="submit"
                disabled={!selectedPassenger || fromOrigin === toDestination || isUpdating || !tripDate}
                variant="contained"
              >
                {isUpdating ? <CircularProgress size={24} /> : 'Update Trip'}
              </Button>
            </DialogActions>
          </form>
        </DialogContent>
      </Dialog>
    </LocalizationProvider>
  );
}