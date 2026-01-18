import './PassengerCard.css';

interface PassengerCardProps {
  firstName: string;
  lastName: string;
  jobRole: string;
  fromOrigin: string;
  toDestination: string;
  type: 'incoming' | 'outgoing';
  confirmed: boolean;
  numberOfPassengers?: number;
}

export default function PassengerCard({ 
  firstName, 
  lastName, 
  jobRole, 
  fromOrigin, 
  toDestination,
  type,
  confirmed,
  numberOfPassengers
}: PassengerCardProps) {
  const fullName = `${firstName} ${lastName}`;
  
  // Get the relevant location for color coding
  const location = type === 'incoming' ? fromOrigin : toDestination;
  
  // Site color mapping
  const getSiteColor = (site: string): string => {
    const siteUpper = site.toUpperCase();
    switch (siteUpper) {
      case 'STC': return '#000000'; // black
      case 'NTM': return '#2e7d32'; // green
      case 'NBD': return '#1565c0'; // blue
      case 'NSC': return '#ff8f00'; // dark yellow
      case 'OGLE': return '#9575cd'; // calm light purple
      case 'NDT': return '#ffffff'; // white
      default: return '#666666'; // default gray
    }
  };

  const siteColor = getSiteColor(location);

  return (
    <div 
      className={`passenger-card ${type} ${confirmed ? 'confirmed' : 'unconfirmed'}`}
      style={{ borderRightColor: siteColor }}
    >
      <div className="passenger-content">
        <div className="passenger-main-info">
          {numberOfPassengers && numberOfPassengers > 0 && (
            <span className="passenger-count">[{numberOfPassengers}]</span>
          )}
          <div className="passenger-text">
            <div className="passenger-name">
              {fullName}
            </div>
            {jobRole && (
              <div className="passenger-job">
                {jobRole}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}