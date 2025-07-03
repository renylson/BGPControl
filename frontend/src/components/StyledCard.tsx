import React from 'react';
import { Paper, Box, Typography } from '@mui/material';

interface StyledCardProps {
  title?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  sx?: any;
  elevation?: number;
}

const StyledCard: React.FC<StyledCardProps> = ({
  title,
  children,
  actions,
  sx = {},
  elevation = 1
}) => {
  return (
    <Paper 
      elevation={elevation}
      sx={{
        p: 3,
        backgroundColor: '#232a36',
        color: '#f5f5f5',
        borderRadius: 2,
        border: '1px solid rgba(255, 255, 255, 0.05)',
        boxShadow: '0 4px 24px 0 rgba(31, 38, 135, 0.10)',
        ...sx
      }}
    >
      {(title || actions) && (
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          mb: title ? 3 : 0 
        }}>
          {title && (
            <Typography 
              variant="h6" 
              component="h2"
              sx={{ 
                color: '#f5f5f5',
                fontWeight: 600
              }}
            >
              {title}
            </Typography>
          )}
          {actions && <Box>{actions}</Box>}
        </Box>
      )}
      
      <Box sx={{ color: '#f5f5f5' }}>
        {children}
      </Box>
    </Paper>
  );
};

export default StyledCard;
