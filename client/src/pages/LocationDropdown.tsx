import { FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { styled } from '@mui/material/styles';
import type { SelectChangeEvent } from '@mui/material/Select';

interface LocationDropdownProps {
  currentLocation: string;
  onLocationChange: (location: string) => void;
  variant?: 'standard' | 'outlined' | 'filled';
  size?: 'small' | 'medium';
  fullWidth?: boolean;
  label?: string;
}

// Styled components for light theme on dark background
const LightFormControl = styled(FormControl)(({ theme }) => ({
  '& .MuiInputLabel-root': {
    color: theme.palette.common.white,
  },
  '& .MuiOutlinedInput-root': {
    '& fieldset': {
      borderColor: theme.palette.common.white,
    },
    '&:hover fieldset': {
      borderColor: theme.palette.grey[300],
    },
    '&.Mui-focused fieldset': {
      borderColor: theme.palette.common.white,
    },
  },
}));

const LightSelect = styled(Select<string>)(({ theme }) => ({
  color: theme.palette.common.white,
  '& .MuiSelect-icon': {
    color: theme.palette.common.white,
  },
}));

const LightMenuItem = styled(MenuItem)(({ theme }) => ({
  color: theme.palette.text.primary,
  backgroundColor: theme.palette.background.paper,
}));

export default function LocationDropdown({ 
  currentLocation, 
  onLocationChange,
  variant = 'outlined',
  size = 'small',
  fullWidth = true,
  label = 'Location'
}: LocationDropdownProps) {
  const locations = ['NTM', 'Ogle', 'NSC', 'NDT', 'NBD', 'STC'];

  const handleChange = (e: SelectChangeEvent<string>) => {
    onLocationChange(e.target.value);
  };

  return (
    <LightFormControl variant={variant} size={size} fullWidth={fullWidth}>
      <InputLabel>{label}</InputLabel>
      <LightSelect
        value={currentLocation}
        onChange={handleChange}
        label={label}
        MenuProps={{
          PaperProps: {
            sx: {
              bgcolor: 'background.paper',
              '& .MuiMenuItem-root': {
                '&.Mui-selected': {
                  backgroundColor: 'action.selected',
                },
                '&:hover': {
                  backgroundColor: 'action.hover',
                },
              },
            },
          },
        }}
      >
        {locations.map(location => (
          <LightMenuItem key={location} value={location}>
            {location}
          </LightMenuItem>
        ))}
      </LightSelect>
    </LightFormControl>
  );
}