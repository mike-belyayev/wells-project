import { useState } from 'react';
import { 
  Box, 
  TextField, 
  Button, 
  Typography, 
  Paper, 
  Alert
} from '@mui/material';
import { useAuth } from '../auth/AuthContext';

const HomePage = () => {
  const [userName, setUserName] = useState(''); // Changed from email to userName
  const [password, setPassword] = useState('');
  const { login, error, isLoading } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await login(userName, password); // Changed from email to userName
  };

  return (
    <Box 
      sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)'
      }}
    >
      <Paper 
        elevation={3} 
        sx={{ 
          p: 4, 
          width: 400,
          borderRadius: 2,
          boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.1)'
        }}
      >
        <Typography variant="h4" gutterBottom sx={{ 
          textAlign: 'center', 
          color: 'primary.main', 
          fontWeight: 600 
        }}>
          Login
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <TextField
            label="Username" // Changed from "Email Address"
            type="text" // Changed from "email"
            fullWidth
            margin="normal"
            value={userName} // Changed from email to userName
            onChange={(e) => setUserName(e.target.value)} // Changed from setEmail to setUserName
            required
            helperText="Enter your username (letters, numbers, and hyphens only)"
          />
          
          <TextField
            label="Password"
            type="password"
            fullWidth
            margin="normal"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          
          <Button 
            type="submit" 
            variant="contained" 
            fullWidth 
            sx={{ mt: 3, py: 1.5 }}
            disabled={isLoading}
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </Button>
        </form>

        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Typography variant="body2" color="textSecondary">
            Contact an administrator to create an account
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
};

export default HomePage;