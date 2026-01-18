import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Container,
  Paper,
  Tab,
  Tabs,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  CircularProgress,
  Snackbar,
  Alert,
  Chip,
  Alert as MuiAlert
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Person,
  People,
  LocationOn,
  Close
} from '@mui/icons-material';
import PassengersTab from '../components/admin/PassengersTab';
import UsersTab from '../components/admin/UsersTab';
import SitesTab from '../components/admin/SitesTab';
import { API_ENDPOINTS } from '../config/api';

interface Passenger {
  _id: string;
  firstName: string;
  lastName: string;
  jobRole: string;
}

interface User {
  _id: string;
  userName: string;
  firstName: string;
  lastName: string;
  homeLocation: string;
  isAdmin: boolean;
  lastLogin?: string;
}

interface Site {
  _id: string;
  siteName: string;
  currentPOB: number;
  maximumPOB: number;
  pobUpdatedDate: string;
}

interface PassengerForm {
  _id: string;
  firstName: string;
  lastName: string;
  jobRole: string;
}

interface UserForm {
  _id: string;
  userName: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  homeLocation: string;
  isAdmin: boolean;
}

interface SiteForm {
  _id: string;
  siteName: string;
  currentPOB: number;
  maximumPOB: number;
}

// Define the available locations
const LOCATIONS = ['NTM', 'Ogle', 'NSC', 'NDT', 'NBD', 'STC'];

const AdminPage = () => {
  const { user, logout } = useAuth();
  const token = user?.token;
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState({
    passengers: false,
    users: false,
    sites: false
  });
  const [openDialog, setOpenDialog] = useState(false);
  const [currentItem, setCurrentItem] = useState<PassengerForm | UserForm | SiteForm | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error'
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [duplicateWarning, setDuplicateWarning] = useState<string>('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const headers = {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        };

        if (activeTab === 0) {
          setLoading(prev => ({ ...prev, passengers: true }));
          const response = await fetch(API_ENDPOINTS.PASSENGERS, { headers });
          const data = await response.json();
          setPassengers(data);
        } else if (activeTab === 1) {
          setLoading(prev => ({ ...prev, users: true }));
          const response = await fetch(API_ENDPOINTS.USERS, { headers });
          const data = await response.json();
          setUsers(data);
        } else if (activeTab === 2) {
          setLoading(prev => ({ ...prev, sites: true }));
          const response = await fetch(API_ENDPOINTS.SITES, { headers });
          const data = await response.json();
          setSites(data);
        }
      } catch (err) {
        setSnackbar({
          open: true,
          message: 'Failed to fetch data',
          severity: 'error'
        });
      } finally {
        setLoading({
          passengers: false,
          users: false,
          sites: false
        });
      }
    };

    fetchData();
  }, [activeTab, token]);

  // Check for duplicate passengers when form fields change
  useEffect(() => {
    if (activeTab === 0 && openDialog && currentItem && !isEditing) {
      const passengerForm = currentItem as PassengerForm;
      const { firstName, lastName } = passengerForm;
      
      if (firstName.trim() || lastName.trim()) {
        const duplicates = passengers.filter(p => 
          p.firstName.toLowerCase().includes(firstName.toLowerCase()) &&
          p.lastName.toLowerCase().includes(lastName.toLowerCase())
        );
        
        if (duplicates.length > 0) {
          if (firstName && lastName) {
            // Exact match found
            const exactMatch = duplicates.find(p => 
              p.firstName.toLowerCase() === firstName.toLowerCase() && 
              p.lastName.toLowerCase() === lastName.toLowerCase()
            );
            
            if (exactMatch) {
              setDuplicateWarning(`⚠️ Exact match found: "${exactMatch.firstName} ${exactMatch.lastName}" works as "${exactMatch.jobRole}"`);
            } else {
              // Partial matches
              const firstNameMatches = passengers.filter(p => 
                p.firstName.toLowerCase().includes(firstName.toLowerCase())
              ).length;
              
              const lastNameMatches = passengers.filter(p => 
                p.lastName.toLowerCase().includes(lastName.toLowerCase())
              ).length;
              
              setDuplicateWarning(
                `🔍 ${firstNameMatches} passenger(s) with similar first name, ${lastNameMatches} with similar last name. ` +
                `${duplicates.length} potential match(es) found.`
              );
            }
          } else if (firstName) {
            const firstNameMatches = passengers.filter(p => 
              p.firstName.toLowerCase().includes(firstName.toLowerCase())
            ).length;
            setDuplicateWarning(`🔍 ${firstNameMatches} passenger(s) with similar first name`);
          } else if (lastName) {
            const lastNameMatches = passengers.filter(p => 
              p.lastName.toLowerCase().includes(lastName.toLowerCase())
            ).length;
            setDuplicateWarning(`🔍 ${lastNameMatches} passenger(s) with similar last name`);
          }
        } else {
          setDuplicateWarning('');
        }
      } else {
        setDuplicateWarning('');
      }
    } else {
      setDuplicateWarning('');
    }
  }, [currentItem, passengers, activeTab, openDialog, isEditing]);

  const handleOpenDialog = (item: Passenger | User | Site | null = null) => {
    if (item && activeTab === 1) {
      setCurrentItem({
        ...item,
        password: '',
        confirmPassword: ''
      } as UserForm);
    } else if (item && activeTab === 0) {
      setCurrentItem(item as PassengerForm);
    } else if (item && activeTab === 2) {
      setCurrentItem(item as SiteForm);
    } else if (activeTab === 0) {
      setCurrentItem({
        _id: '',
        firstName: '',
        lastName: '',
        jobRole: ''
      });
    } else if (activeTab === 1) {
      setCurrentItem({
        _id: '',
        userName: '',
        password: '',
        confirmPassword: '',
        firstName: '',
        lastName: '',
        homeLocation: 'NSC', // Default to NSC
        isAdmin: false
      });
    } else if (activeTab === 2) {
      setCurrentItem({
        _id: '',
        siteName: '',
        currentPOB: 0,
        maximumPOB: 200
      });
    }
    setIsEditing(!!item);
    setOpenDialog(true);
    setDuplicateWarning('');
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setCurrentItem(null);
    setDuplicateWarning('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCurrentItem(prev => (prev ? { ...prev, [name]: value } : null));
  };

  const handleSave = async () => {
    try {
      if (activeTab === 1) {
        const userForm = currentItem as UserForm;
        
        // For new users, require password
        if (!isEditing && (!userForm.password || userForm.password.length < 6)) {
          throw new Error('Password must be at least 6 characters');
        }
        
        // For new users or when password is provided during edit, validate confirmation
        if ((!isEditing || userForm.password) && userForm.password !== userForm.confirmPassword) {
          throw new Error("Passwords don't match");
        }
      }

      let response;
      let url;
      let dataToSend;

      if (activeTab === 0) {
        url = API_ENDPOINTS.PASSENGERS;
        dataToSend = currentItem;
      } else if (activeTab === 1) {
        // Use different endpoints for creating vs editing users
        if (isEditing) {
          url = API_ENDPOINTS.USER_BY_ID((currentItem as UserForm)._id);
          const userForm = currentItem as UserForm;
          dataToSend = {
            userName: userForm.userName,
            ...(userForm.password && { password: userForm.password }),
            firstName: userForm.firstName,
            lastName: userForm.lastName,
            homeLocation: userForm.homeLocation,
            isAdmin: userForm.isAdmin
          };
        } else {
          // Use register endpoint for new users
          url = API_ENDPOINTS.REGISTER;
          const userForm = currentItem as UserForm;
          dataToSend = {
            userName: userForm.userName,
            password: userForm.password,
            firstName: userForm.firstName,
            lastName: userForm.lastName,
            homeLocation: userForm.homeLocation,
            isAdmin: userForm.isAdmin
          };
        }
      } else if (activeTab === 2) {
        const siteForm = currentItem as SiteForm;
        url = API_ENDPOINTS.SITE_POB(siteForm.siteName);
        dataToSend = {
          currentPOB: Number(siteForm.currentPOB)
        };
      }

      const id = currentItem?._id;
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      };

      if (activeTab === 1 && !isEditing) {
        // For new user registration, use POST to register endpoint
        response = await fetch(url!, {
          method: 'POST',
          headers,
          body: JSON.stringify(dataToSend),
        });
      } else if (isEditing && id && activeTab !== 2) {
        response = await fetch(`${url}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(dataToSend),
        });
      } else if (activeTab === 2) {
        response = await fetch(url!, {
          method: 'PUT',
          headers,
          body: JSON.stringify(dataToSend),
        });
      } else {
        response = await fetch(url!, {
          method: 'POST',
          headers,
          body: JSON.stringify(dataToSend),
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || errorData.error || 'Operation failed');
      }

      setSnackbar({
        open: true,
        message: `Successfully ${isEditing ? 'updated' : 'created'}`,
        severity: 'success'
      });

      // Refresh the data
      const headersForRefresh = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
      
      if (activeTab === 0) {
        const passengersResponse = await fetch(API_ENDPOINTS.PASSENGERS, { headers: headersForRefresh });
        const updatedPassengers = await passengersResponse.json();
        setPassengers(updatedPassengers);
        
        // Clear form fields but keep dialog open for adding more passengers
        if (!isEditing) {
          setCurrentItem({
            _id: '',
            firstName: '',
            lastName: '',
            jobRole: ''
          });
          setDuplicateWarning('');
        } else {
          handleCloseDialog();
        }
      } else if (activeTab === 1) {
        const usersResponse = await fetch(API_ENDPOINTS.USERS, { headers: headersForRefresh });
        setUsers(await usersResponse.json());
        handleCloseDialog();
      } else if (activeTab === 2) {
        const sitesResponse = await fetch(API_ENDPOINTS.SITES, { headers: headersForRefresh });
        setSites(await sitesResponse.json());
        handleCloseDialog();
      }

    } catch (err) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : 'Operation failed',
        severity: 'error'
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const url = activeTab === 0 
        ? API_ENDPOINTS.PASSENGER_BY_ID(id)
        : API_ENDPOINTS.USER_BY_ID(id);
      
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Delete failed');

      setSnackbar({
        open: true,
        message: 'Successfully deleted',
        severity: 'success'
      });

      if (activeTab === 0) {
        setPassengers(passengers.filter(p => p._id !== id));
      } else {
        setUsers(users.filter(u => u._id !== id));
      }
    } catch (err) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : 'Delete failed',
        severity: 'error'
      });
    }
  };

  const handleInitializeSites = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.INITIALIZE_SITES, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Initialization failed');

      setSnackbar({
        open: true,
        message: 'Sites initialized successfully',
        severity: 'success'
      });

      const sitesResponse = await fetch(API_ENDPOINTS.SITES, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      setSites(await sitesResponse.json());
    } catch (err) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : 'Initialization failed',
        severity: 'error'
      });
    }
  };

  const filterPassengers = (passenger: Passenger) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const firstName = passenger.firstName?.toLowerCase() || '';
    const lastName = passenger.lastName?.toLowerCase() || '';
    const jobRole = passenger.jobRole?.toLowerCase() || '';
    return (
      firstName.includes(term) ||
      lastName.includes(term) ||
      jobRole.includes(term)
    );
  };

  const filterUsers = (user: User) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const userName = user.userName?.toLowerCase() || '';
    const firstName = user.firstName?.toLowerCase() || '';
    const lastName = user.lastName?.toLowerCase() || '';
    const homeLocation = user.homeLocation?.toLowerCase() || '';
    const adminStatus = user.isAdmin ? 'admin' : '';
    return (
      userName.includes(term) ||
      firstName.includes(term) ||
      lastName.includes(term) ||
      homeLocation.includes(term) ||
      adminStatus.includes(term)
    );
  };

  const filterSites = (site: Site) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const siteName = site.siteName?.toLowerCase() || '';
    return siteName.includes(term);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const getPOBStatus = (currentPOB: number, maximumPOB: number) => {
    const percentage = (currentPOB / maximumPOB) * 100;
    if (percentage >= 90) return 'error';
    if (percentage >= 75) return 'warning';
    return 'success';
  };

  return (
    <Box sx={{ minHeight: '100vh' }}>
      <AppBar position="static" sx={{ backgroundColor: '#1E1E1E', color: 'white' }}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Admin Dashboard
          </Typography>
          <IconButton 
            color="inherit" 
            onClick={() => navigate('/heli')} 
            sx={{ ml: 2 }}
          >
            <DashboardIcon />
          </IconButton>
          <Typography variant="subtitle1">
            {user?.userName}
          </Typography>
          <Button variant="text" onClick={logout} color="inherit" size="small"
            sx={{ 
              textTransform: 'none',
              ml: 1,
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.08)'
              }
            }}
          >
            Logout
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ mt: 4 }}>
        <Paper sx={{ p: 2 }}>
          <Tabs
            value={activeTab}
            onChange={(_, newValue) => setActiveTab(newValue)}
            indicatorColor="secondary"
            textColor="primary"
            variant="fullWidth"
          >
            <Tab label="Passengers" icon={<Person />} />
            <Tab label="Users" icon={<People />} />
            <Tab label="Sites" icon={<LocationOn />} />
          </Tabs>

          <Box sx={{ mt: 3 }}>
            {loading.passengers || loading.users || loading.sites ? (
              <Box display="flex" justifyContent="center" p={4}>
                <CircularProgress />
              </Box>
            ) : (
              <>
                {activeTab === 0 && (
                  <PassengersTab
                    passengers={passengers}
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    onOpenDialog={handleOpenDialog}
                    onDelete={handleDelete}
                    filterPassengers={filterPassengers}
                  />
                )}
                {activeTab === 1 && (
                  <UsersTab
                    users={users}
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    onOpenDialog={handleOpenDialog}
                    onDelete={handleDelete}
                    filterUsers={filterUsers}
                  />
                )}
                {activeTab === 2 && (
                  <SitesTab
                    sites={sites}
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    onOpenDialog={handleOpenDialog}
                    onInitializeSites={handleInitializeSites}
                    filterSites={filterSites}
                    formatDate={formatDate}
                    getPOBStatus={getPOBStatus}
                  />
                )}
              </>
            )}
          </Box>
        </Paper>
      </Container>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {isEditing ? 'Edit' : 'Add New'} {activeTab === 0 ? 'Passenger' : activeTab === 2 ? 'Site' : 'User'}
          <IconButton onClick={handleCloseDialog} size="small">
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            {activeTab === 0 ? (
              <>
                <TextField
                  name="firstName"
                  label="First Name"
                  value={(currentItem as PassengerForm)?.firstName || ''}
                  onChange={handleInputChange}
                  fullWidth
                  required
                />
                <TextField
                  name="lastName"
                  label="Last Name"
                  value={(currentItem as PassengerForm)?.lastName || ''}
                  onChange={handleInputChange}
                  fullWidth
                  required
                />
                <TextField
                  name="jobRole"
                  label="Job Role"
                  value={(currentItem as PassengerForm)?.jobRole || ''}
                  onChange={handleInputChange}
                  fullWidth
                  required
                />
                
                {/* Duplicate Warning */}
                {duplicateWarning && (
                  <MuiAlert 
                    severity={duplicateWarning.includes('⚠️ Exact match found') ? 'warning' : 'info'}
                    sx={{ mt: 1 }}
                  >
                    {duplicateWarning}
                  </MuiAlert>
                )}
              </>
            ) : activeTab === 1 ? (
              <>
                <TextField
                  name="userName"
                  label="Username"
                  value={(currentItem as UserForm)?.userName || ''}
                  onChange={handleInputChange}
                  fullWidth
                  required
                  disabled={isEditing}
                  helperText="Letters, numbers, and hyphens only"
                />
                
                {/* Password fields - always show for new users, optional for editing */}
                <TextField
                  name="password"
                  label={isEditing ? "New Password (leave blank to keep current)" : "Password"}
                  type="password"
                  value={(currentItem as UserForm)?.password || ''}
                  onChange={handleInputChange}
                  fullWidth
                  required={!isEditing}
                  helperText={isEditing ? "Leave blank to keep current password" : "Password must be at least 6 characters"}
                />
                <TextField
                  name="confirmPassword"
                  label="Confirm Password"
                  type="password"
                  value={(currentItem as UserForm)?.confirmPassword || ''}
                  onChange={handleInputChange}
                  fullWidth
                  required={!isEditing || (currentItem as UserForm)?.password !== ''}
                  error={
                    (currentItem as UserForm)?.password !== 
                    (currentItem as UserForm)?.confirmPassword
                  }
                  helperText={
                    (currentItem as UserForm)?.password !== 
                    (currentItem as UserForm)?.confirmPassword ? 
                    "Passwords don't match" : ""
                  }
                />
                
                <TextField
                  name="firstName"
                  label="First Name"
                  value={(currentItem as UserForm)?.firstName || ''}
                  onChange={handleInputChange}
                  fullWidth
                  required
                />
                <TextField
                  name="lastName"
                  label="Last Name"
                  value={(currentItem as UserForm)?.lastName || ''}
                  onChange={handleInputChange}
                  fullWidth
                  required
                />
                
                {/* Updated: Changed from TextField to Select dropdown for homeLocation */}
                <TextField
                  name="homeLocation"
                  label="Home Location"
                  value={(currentItem as UserForm)?.homeLocation || ''}
                  onChange={handleInputChange}
                  select
                  fullWidth
                  required
                >
                  {LOCATIONS.map((location) => (
                    <MenuItem key={location} value={location}>
                      {location}
                    </MenuItem>
                  ))}
                </TextField>
                
                <TextField
                  name="isAdmin"
                  label="Is Admin"
                  value={(currentItem as UserForm)?.isAdmin ? 'true' : 'false'}
                  onChange={(e) => {
                    if (currentItem) {
                      setCurrentItem({
                        ...currentItem,
                        isAdmin: e.target.value === 'true'
                      } as UserForm);
                    }
                  }}
                  select
                  fullWidth
                >
                  <MenuItem value="false">No</MenuItem>
                  <MenuItem value="true">Yes</MenuItem>
                </TextField>
              </>
            ) : activeTab === 2 ? (
              <>
                <TextField
                  name="siteName"
                  label="Site Name"
                  value={(currentItem as SiteForm)?.siteName || ''}
                  onChange={handleInputChange}
                  fullWidth
                  required
                  disabled={isEditing}
                />
                <TextField
                  name="currentPOB"
                  label="Current POB"
                  type="number"
                  value={(currentItem as SiteForm)?.currentPOB || 0}
                  onChange={handleInputChange}
                  fullWidth
                  required
                  inputProps={{ min: 0 }}
                />
                <TextField
                  name="maximumPOB"
                  label="Maximum POB"
                  type="number"
                  value={(currentItem as SiteForm)?.maximumPOB || 200}
                  onChange={handleInputChange}
                  fullWidth
                  required
                  inputProps={{ min: 1 }}
                  disabled={true}
                  helperText="Maximum POB cannot be edited"
                />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" color="textSecondary">
                    Utilization:
                  </Typography>
                  <Chip
                    label={`${Math.round((((currentItem as SiteForm)?.currentPOB || 0) / ((currentItem as SiteForm)?.maximumPOB || 1)) * 100)}%`}
                    color={getPOBStatus((currentItem as SiteForm)?.currentPOB || 0, (currentItem as SiteForm)?.maximumPOB || 1) as any}
                    size="small"
                  />
                </Box>
              </>
            ) : null}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>
            {isEditing ? 'Cancel' : 'Close'}
          </Button>
          <Button onClick={handleSave} variant="contained" color="primary">
            {isEditing ? 'Update' : 'Add'} {activeTab === 0 ? 'Passenger' : activeTab === 2 ? 'Site' : 'User'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
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
    </Box>
  );
};

export default AdminPage;