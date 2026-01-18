import { useState, useEffect, useCallback } from 'react';
import { format, addWeeks, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { AppBar, Toolbar, IconButton, Typography, Box, Button } from '@mui/material';
import { Settings, ChevronLeft, ChevronRight } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import LocationDropdown from './LocationDropdown';
import PassengerCard from './PassengerCard';
import AddTripModal from './AddTripModal';
import EditTripModal from './EditTripModal';
import { API_ENDPOINTS } from '../config/api';
import './HeliPage.css';

export interface Passenger {
  _id: string;
  firstName: string;
  lastName: string;
  jobRole: string;
}

export interface Trip {
  _id: string;
  passengerId: string;
  fromOrigin: string;
  toDestination: string;
  tripDate: string;
  confirmed: boolean;
  numberOfPassengers?: number;
}

interface Site {
  _id: string;
  siteName: string;
  currentPOB: number;
  maximumPOB: number;
  pobUpdatedDate: string;
}

interface DayData {
  date: Date;
  incoming: Trip[];
  outgoing: Trip[];
  pob: number;
  updateInfo?: string;
}

// Helper function to get passenger count from a trip
const getPassengerCount = (trip: Trip): number => {
  return trip.numberOfPassengers && trip.numberOfPassengers > 1 
    ? trip.numberOfPassengers 
    : 1;
};

// Calculate POB for a specific day with update history
const calculatePOB = (
  date: Date, 
  currentLocation: string, 
  allTrips: Trip[], 
  sites: Site[]
): { pob: number; updateInfo?: string } => {
  const dateStr = format(date, 'yyyy-MM-dd');
  
  // Find the site data for current location
  const site = sites.find(s => s.siteName === currentLocation);
  if (!site) return { pob: 0 };

  // Get the site's last update date and POB
  const siteLastUpdate = site.pobUpdatedDate ? new Date(site.pobUpdatedDate) : new Date();
  const siteLastUpdateStr = format(siteLastUpdate, 'yyyy-MM-dd');
  const sitePOBAtUpdate = site.currentPOB;

  // If the date is exactly the site's last update date
  if (dateStr === siteLastUpdateStr) {
    // On update day, POB is the manually set value + today's net change
    const todaysTrips = allTrips.filter(trip => 
      (trip.toDestination === currentLocation || trip.fromOrigin === currentLocation) &&
      trip.tripDate === dateStr
    );
    
    let todaysNetChange = 0;
    todaysTrips.forEach(trip => {
      const passengerCount = getPassengerCount(trip);
      if (trip.toDestination === currentLocation) {
        todaysNetChange += passengerCount;
      } else if (trip.fromOrigin === currentLocation) {
        todaysNetChange -= passengerCount;
      }
    });

    const endOfDayPOB = sitePOBAtUpdate + todaysNetChange;
    
    return { 
      pob: Math.max(0, endOfDayPOB),
      updateInfo: `updated to ${sitePOBAtUpdate}`
    };
  }

  // If the date is before the site's last update, calculate backwards
  if (dateStr < siteLastUpdateStr) {
    return calculatePOBBeforeUpdate(dateStr, siteLastUpdateStr, sitePOBAtUpdate, currentLocation, allTrips);
  }

  // If the date is after the last update, calculate forwards
  return calculatePOBAfterUpdate(dateStr, siteLastUpdateStr, sitePOBAtUpdate, currentLocation, allTrips);
};

// Calculate POB for dates before the last update (working backwards from update day START)
const calculatePOBBeforeUpdate = (
  targetDate: string,
  updateDate: string,
  pobAtUpdateStart: number,
  currentLocation: string,
  allTrips: Trip[]
): { pob: number; updateInfo?: string } => {
  const relevantTrips = allTrips
    .filter(trip => 
      (trip.toDestination === currentLocation || trip.fromOrigin === currentLocation) &&
      trip.tripDate >= targetDate &&
      trip.tripDate < updateDate
    )
    .sort((a, b) => new Date(b.tripDate).getTime() - new Date(a.tripDate).getTime());

  let currentPOB = pobAtUpdateStart;

  const tripsByDate: { [date: string]: Trip[] } = {};
  relevantTrips.forEach(trip => {
    if (!tripsByDate[trip.tripDate]) {
      tripsByDate[trip.tripDate] = [];
    }
    tripsByDate[trip.tripDate].push(trip);
  });

  const sortedDates = Object.keys(tripsByDate).sort().reverse();
  
  for (const tripDate of sortedDates) {
    const daysTrips = tripsByDate[tripDate];
    
    let dailyNetChange = 0;
    daysTrips.forEach(trip => {
      const passengerCount = getPassengerCount(trip);
      
      if (trip.toDestination === currentLocation) {
        dailyNetChange -= passengerCount;
      } else if (trip.fromOrigin === currentLocation) {
        dailyNetChange += passengerCount;
      }
    });

    currentPOB += dailyNetChange;
  }

  return { pob: Math.max(0, currentPOB) };
};

// Calculate POB for dates after the last update (working forwards from update day END)
const calculatePOBAfterUpdate = (
  targetDate: string,
  updateDate: string,
  pobAtUpdateStart: number,
  currentLocation: string,
  allTrips: Trip[]
): { pob: number; updateInfo?: string } => {
  const relevantTrips = allTrips
    .filter(trip => 
      (trip.toDestination === currentLocation || trip.fromOrigin === currentLocation) &&
      trip.tripDate >= updateDate &&
      trip.tripDate <= targetDate
    )
    .sort((a, b) => new Date(a.tripDate).getTime() - new Date(b.tripDate).getTime());

  let currentPOB = pobAtUpdateStart;

  const tripsByDate: { [date: string]: Trip[] } = {};
  relevantTrips.forEach(trip => {
    if (!tripsByDate[trip.tripDate]) {
      tripsByDate[trip.tripDate] = [];
    }
    tripsByDate[trip.tripDate].push(trip);
  });

  const sortedDates = Object.keys(tripsByDate).sort();
  
  for (const tripDate of sortedDates) {
    const daysTrips = tripsByDate[tripDate];
    
    let dailyNetChange = 0;
    daysTrips.forEach(trip => {
      const passengerCount = getPassengerCount(trip);
      
      if (trip.toDestination === currentLocation) {
        dailyNetChange += passengerCount;
      } else if (trip.fromOrigin === currentLocation) {
        dailyNetChange -= passengerCount;
      }
    });

    currentPOB += dailyNetChange;
  }

  return { pob: Math.max(0, currentPOB) };
};

const HeliPage = () => {
  const { logout, user } = useAuth();
  const isAdmin = user?.isAdmin || false;
  
  // Set initial location to user's homeLocation, fallback to 'NSC'
  const [currentLocation, setCurrentLocation] = useState(user?.homeLocation || 'NSC');
  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [weeksData, setWeeksData] = useState<DayData[][]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCellDate, setSelectedCellDate] = useState<Date>(new Date());
  const [tripType, setTripType] = useState<'incoming' | 'outgoing'>('outgoing');
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [draggedTrip, setDraggedTrip] = useState<Trip | null>(null);
  const [dragType, setDragType] = useState<'incoming' | 'outgoing' | null>(null);

  const navigate = useNavigate();

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Update location when user data loads or changes
  useEffect(() => {
    if (user?.homeLocation) {
      setCurrentLocation(user.homeLocation);
    }
  }, [user?.homeLocation]);

  const isToday = (date: Date) => {
    return format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const headers = {
        'Authorization': `Bearer ${user?.token}`,
        'Content-Type': 'application/json'
      };
      
      const [passengersRes, tripsRes, sitesRes] = await Promise.all([
        fetch(API_ENDPOINTS.PASSENGERS, { headers }),
        fetch(API_ENDPOINTS.TRIPS, { headers }),
        fetch(API_ENDPOINTS.SITES, { headers })
      ]);
      
      if (!passengersRes.ok) throw new Error('Failed to fetch passengers');
      if (!tripsRes.ok) throw new Error('Failed to fetch trips');
      if (!sitesRes.ok) throw new Error('Failed to fetch sites');
      
      const passengersData = await passengersRes.json();
      const tripsData = await tripsRes.json();
      const sitesData = await sitesRes.json();
      
      setPassengers(passengersData);
      setTrips(tripsData);
      setSites(sitesData);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [user?.token]);

  // Auto-refresh implementation
  useEffect(() => {
    let refreshInterval: NodeJS.Timeout;
    let isMounted = true;
    
    const startPolling = async () => {
      try {
        await fetchData();
        
        // Only set interval if component is still mounted
        if (isMounted) {
          refreshInterval = setInterval(async () => {
            try {
              await fetchData();
            } catch (error) {
              console.error('Error during auto-refresh:', error);
              // Don't stop polling on errors - try again next interval
            }
          }, 600000); // 10 minutes
        }
      } catch (error) {
        console.error('Initial data fetch failed:', error);
      }
    };
    
    startPolling();
    
    return () => {
      isMounted = false;
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [fetchData]);

  // Updated POB status function
  const getPOBStatus = (currentPOB: number, maximumPOB: number): 'normal' | 'warning' | 'critical' => {
    if (currentPOB === 0) return 'normal';
    
    const percentage = (currentPOB / maximumPOB) * 100;
    if (currentPOB > maximumPOB) return 'critical';
    if (percentage >= 95) return 'warning';
    return 'normal';
  };

  const generateWeeks = useCallback(() => {
    // Show only 2 weeks: current week (0) and next week (1)
    return [0, 1].map(relativeOffset => {
      const weekStart = startOfWeek(addWeeks(new Date(), weekOffset + relativeOffset));
      const weekEnd = endOfWeek(weekStart);
      const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
      
      return days.map(date => {
        const dateStr = format(date, 'yyyy-MM-dd');
        const relevantTrips = trips.filter(trip => trip.tripDate === dateStr);
        
        const sortByConfirmed = (a: Trip, b: Trip) => {
          if (a.confirmed && !b.confirmed) return -1;
          if (!a.confirmed && b.confirmed) return 1;
          return 0;
        };

        const pobResult = calculatePOB(date, currentLocation, trips, sites);
        
        return {
          date,
          incoming: relevantTrips
            .filter(trip => trip.toDestination === currentLocation)
            .sort(sortByConfirmed),
          outgoing: relevantTrips
            .filter(trip => trip.fromOrigin === currentLocation)
            .sort(sortByConfirmed),
          pob: pobResult.pob,
          updateInfo: pobResult.updateInfo
        };
      });
    });
  }, [trips, currentLocation, weekOffset, sites]);

  useEffect(() => {
    const generatedWeeks = generateWeeks();
    setWeeksData(generatedWeeks);
  }, [generateWeeks]);

  const getPassengerById = (passengerId: string): Passenger | undefined => {
    return passengers.find(p => p._id === passengerId);
  };

// In HeliPage.tsx - Update the handleAddPassenger function
const handleAddPassenger = async (passengerData: { firstName: string; lastName: string; jobRole: string }) => {
  try {
    const response = await fetch(API_ENDPOINTS.PASSENGERS, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user?.token}`
      },
      body: JSON.stringify(passengerData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to add passenger');
    }

    const newPassenger = await response.json();
    
    // Force update the passengers list by refetching all passengers
    // This ensures we have the complete, up-to-date list
    const passengersResponse = await fetch(API_ENDPOINTS.PASSENGERS, {
      headers: {
        'Authorization': `Bearer ${user?.token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (passengersResponse.ok) {
      const allPassengers = await passengersResponse.json();
      setPassengers(allPassengers);
    } else {
      // Fallback: just add the new passenger to the existing list
      setPassengers(prev => [...prev, newPassenger]);
    }
    
    return newPassenger;
  } catch (error) {
    console.error('Error adding passenger:', error);
    throw error;
  }
};

const handleAddTrip = async (tripData: {
  passengerId: string;
  fromOrigin: string;
  toDestination: string;
  tripDate: string;
  confirmed: boolean;
  numberOfPassengers?: number;
}) => {
  if (!isAdmin) return;
  
  try {
    const response = await fetch(API_ENDPOINTS.TRIPS, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user?.token}`
      },
      body: JSON.stringify(tripData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to add trip');
    }

    const newTrip = await response.json();
    setTrips(prev => [...prev, newTrip]);
    
    // Don't close the modal here - let AddTripModal handle it
    // setModalOpen(false); // REMOVE THIS LINE
  } catch (error) {
    console.error('Error adding trip:', error);
  }
};

  const handleUpdateTrip = async (updatedTrip: Trip) => {
    if (!isAdmin) return;
    
    try {
      const response = await fetch(API_ENDPOINTS.TRIP_BY_ID(updatedTrip._id), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.token}`
        },
        body: JSON.stringify(updatedTrip),
      });

      if (!response.ok) throw new Error('Failed to update trip');

      setTrips(trips.map(t => t._id === updatedTrip._id ? updatedTrip : t));
      setEditingTrip(null);
    } catch (error) {
      console.error('Error updating trip:', error);
    }
  };

  const handleDeleteTrip = async (tripId: string) => {
    if (!isAdmin) return;
    
    try {
      setTrips(prevTrips => prevTrips.filter(t => t._id !== tripId));
      
      const response = await fetch(API_ENDPOINTS.TRIP_BY_ID(tripId), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${user?.token}`
        }
      });

      if (!response.ok && response.status !== 404) {
        const tripsRes = await fetch(API_ENDPOINTS.TRIPS);
        if (tripsRes.ok) {
          const tripsData = await tripsRes.json();
          setTrips(tripsData);
        }
        throw new Error('Failed to delete trip');
      }
    } catch (error) {
      console.error('Error deleting trip:', error);
    }
  };

  const handleDragStart = (trip: Trip, type: 'incoming' | 'outgoing') => {
    if (!isAdmin) return;
    setDraggedTrip(trip);
    setDragType(type);
  };

  const handleDragOver = (e: React.DragEvent, _date: Date, type: 'incoming' | 'outgoing') => {
    if (!isAdmin) return;
    if (dragType === type) {
      e.preventDefault();
      e.currentTarget.classList.add('drop-target');
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('drop-target');
  };

  const handleDrop = async (e: React.DragEvent, date: Date, type: 'incoming' | 'outgoing') => {
    if (!isAdmin) return;
    
    e.currentTarget.classList.remove('drop-target');
    
    if (!draggedTrip || dragType !== type) return;

    try {
      const updatedTrip = {
        ...draggedTrip,
        tripDate: format(date, 'yyyy-MM-dd')
      };

      await handleUpdateTrip(updatedTrip);
    } catch (error) {
      console.error('Error moving trip:', error);
    }
  };

  const handlePrevWeek = () => {
    setWeekOffset(prev => prev - 1);
  };

  const handleNextWeek = () => {
    setWeekOffset(prev => prev + 1);
  };

  const handleToday = () => {
    setWeekOffset(0); // Reset to show current week + next week
  };

  const getWeekRangeDisplay = () => {
    if (weeksData.length === 0) return '';
    const firstWeek = weeksData[0][0].date;
    const lastWeek = weeksData[weeksData.length - 1][6].date;
    return `${format(firstWeek, 'MMM d')} - ${format(lastWeek, 'MMM d, yyyy')}`;
  };

  if (loading) {
    return <div className="loading-container">Loading dashboard data...</div>;
  }

  if (error) {
    return <div className="error-container">Error: {error}</div>;
  }

  return (
    <div className="dashboard-container">
      <AppBar 
        position="static" 
        sx={{ 
          backgroundColor: '#121212',
          color: 'white',
          backgroundImage: 'none',
          boxShadow: 'none',
          borderBottom: '1px solid rgba(255, 255, 255, 0.12)'
        }}
      >
        <Toolbar sx={{ 
          justifyContent: 'space-between', 
          gap: 2,
          minHeight: '64px'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="h6" component="h1" sx={{ fontWeight: 'bold' }}>
              Helicopter Passengers
            </Typography>
            
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1,
              '& .MuiButton-root': {
                color: 'white',
                borderColor: 'rgba(255, 255, 255, 0.23)',
                '&:hover': {
                  borderColor: 'white'
                }
              },
              '& .MuiIconButton-root': {
                color: 'white'
              }
            }}>
              <IconButton onClick={handlePrevWeek} size="small">
                <ChevronLeft />
              </IconButton>
              
              <Button 
                variant="outlined" 
                size="small" 
                onClick={handleToday}
                sx={{ textTransform: 'none' }}
              >
                Today
              </Button>
              
              <Typography variant="body2" sx={{ 
                minWidth: 150, 
                textAlign: 'center',
                color: 'rgba(255, 255, 255, 0.7)'
              }}>
                {getWeekRangeDisplay()}
              </Typography>
              
              <IconButton onClick={handleNextWeek} size="small">
                <ChevronRight />
              </IconButton>
            </Box>
          </Box>

          <Box sx={{ 
            flex: 1, 
            maxWidth: 200,
            '& .MuiInputLabel-root': {
              color: 'rgba(255, 255, 255, 0.7)'
            },
            '& .MuiOutlinedInput-root': {
              color: 'white',
              '& fieldset': {
                borderColor: 'rgba(255, 255, 255, 0.23)'
              },
              '&:hover fieldset': {
                borderColor: 'white'
              }
            },
            '& .MuiSelect-icon': {
              color: 'white'
            }
          }}>
            <LocationDropdown 
              currentLocation={currentLocation} 
              onLocationChange={setCurrentLocation}
              size="small"
            />
          </Box>

          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1,
            '& .MuiButton-root': {
              color: 'white'
            }
          }}>
            {isAdmin && (
              <IconButton 
                onClick={() => navigate('/admin')}
                title="Admin Settings"
                sx={{ 
                  color: 'white',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.08)'
                  }
                }}
              >
                <Settings />
              </IconButton>
            )}
            
            <Typography variant="body2" noWrap sx={{ 
              maxWidth: 300,
              color: 'white'
            }}>
              {user?.userName}
              {isAdmin && " (admin)"}
            </Typography>
            
            <Button 
              variant="text" 
              onClick={logout}
              size="small"
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
          </Box>
        </Toolbar>
      </AppBar>
      
      <div className="days-header">
        {daysOfWeek.map((day, index) => (
          <div key={index} className="day-cell">
            {day}
          </div>
        ))}
      </div>
      
      <div className="week-container">
        {weeksData.length > 0 ? (
          weeksData.map((week, weekIndex) => (
            <div key={weekIndex} className="week-row">
              {week.map((day, dayIndex) => {
                const site = sites.find(s => s.siteName === currentLocation);
                const maximumPOB = site?.maximumPOB || 200;
                const pobStatus = getPOBStatus(day.pob, maximumPOB);
                const isTodayDate = isToday(day.date);
                
                return (
                  <div 
                    key={dayIndex} 
                    className="day-column"
                  >
                    <div className={`date-header ${isTodayDate ? 'today' : ''}`}>
                      {format(day.date, 'MMM d')}
                    </div>
                    
                    <div className="passenger-lists">
                      <div className="sections-container">
                        <div 
                          className="incoming-section"
                          onDragOver={(e) => isAdmin && handleDragOver(e, day.date, 'incoming')}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => isAdmin && handleDrop(e, day.date, 'incoming')}
                        >
                          <div className="passenger-cards-container">
                            {day.incoming.map((trip, i) => (
                              <div 
                                key={i}
                                onClick={() => isAdmin && setEditingTrip(trip)}
                                className={`passenger-card-container ${!isAdmin ? 'readonly' : ''}`}
                                draggable={isAdmin}
                                onDragStart={() => isAdmin && handleDragStart(trip, 'incoming')}
                              >
                                <PassengerCard
                                  firstName={getPassengerById(trip.passengerId)?.firstName || ''}
                                  lastName={getPassengerById(trip.passengerId)?.lastName || ''}
                                  jobRole={getPassengerById(trip.passengerId)?.jobRole || ''}
                                  fromOrigin={trip.fromOrigin}
                                  toDestination={trip.toDestination}
                                  type='incoming'
                                  confirmed={trip.confirmed}
                                  numberOfPassengers={trip.numberOfPassengers}
                                />
                              </div>
                            ))}
                          </div>
                          {isAdmin && (
                            <button
                              onClick={() => {
                                setSelectedCellDate(day.date);
                                setModalOpen(true);
                                setTripType('incoming');
                              }}
                              className="add-button"
                              title="Add incoming passenger"
                            >
                              +
                            </button>
                          )}
                        </div>
                        
                        <div 
                          className="outgoing-section"
                          onDragOver={(e) => isAdmin && handleDragOver(e, day.date, 'outgoing')}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => isAdmin && handleDrop(e, day.date, 'outgoing')}
                        >
                          <div className="passenger-cards-container">
                            {day.outgoing.map((trip, i) => (
                              <div 
                                key={i}
                                onClick={() => isAdmin && setEditingTrip(trip)}
                                className={`passenger-card-container ${!isAdmin ? 'readonly' : ''}`}
                                draggable={isAdmin}
                                onDragStart={() => isAdmin && handleDragStart(trip, 'outgoing')}
                              >
                                <PassengerCard
                                  firstName={getPassengerById(trip.passengerId)?.firstName || ''}
                                  lastName={getPassengerById(trip.passengerId)?.lastName || ''}
                                  jobRole={getPassengerById(trip.passengerId)?.jobRole || ''}
                                  fromOrigin={trip.fromOrigin}
                                  toDestination={trip.toDestination}
                                  type='outgoing'
                                  confirmed={trip.confirmed}
                                  numberOfPassengers={trip.numberOfPassengers}
                                />
                              </div>
                            ))}
                          </div>
                          {isAdmin && (
                            <button
                              onClick={() => {
                                setSelectedCellDate(day.date);
                                setModalOpen(true);
                                setTripType('outgoing');
                              }}
                              className="add-button"
                              title="Add outgoing passenger"
                            >
                              +
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className={`pob-footer ${pobStatus}`}>
                      POB: {day.pob}
                      {day.updateInfo && (
                        <span style={{ 
                          fontSize: '0.6rem', 
                          marginLeft: '4px',
                          opacity: 0.8,
                          fontStyle: 'italic'
                        }}>
                          ({day.updateInfo})
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        ) : (
          <div className="no-data-message">
            No trip data available for the selected location and date range
          </div>
        )}
      </div>

      {isAdmin && (
        <>
          <AddTripModal
            isOpen={modalOpen}
            onClose={() => setModalOpen(false)}
            passengers={passengers}
            selectedDate={selectedCellDate}
            tripType={tripType}
            currentLocation={currentLocation}
            userHomeBase={user?.homeLocation || 'NSC'}
            onSubmit={handleAddTrip}
            onAddPassenger={handleAddPassenger}
          />
          <EditTripModal
            isOpen={editingTrip !== null}
            onClose={() => setEditingTrip(null)}
            passengers={passengers}
            trip={editingTrip}
            currentLocation={currentLocation}
            onUpdate={handleUpdateTrip}
            onDelete={handleDeleteTrip}
          />
        </>
      )}
    </div>
  );
};

export default HeliPage;