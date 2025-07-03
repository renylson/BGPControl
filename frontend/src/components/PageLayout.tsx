import React from 'react';
import { Box, Container, Typography } from '@mui/material';

interface PageLayoutProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | false;
  actions?: React.ReactNode;
}

const PageLayout: React.FC<PageLayoutProps> = ({
  title,
  subtitle,
  icon,
  children,
  maxWidth = 'xl',
  actions
}) => {
  return (
    <Container maxWidth={maxWidth} sx={{ py: 3 }}>
      {/* Header */}
      <Box mb={4}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography 
            variant="h4" 
            component="h1" 
            gutterBottom
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 2,
              color: '#f5f5f5',
              fontWeight: 700,
              m: 0
            }}
          >
            {icon && <Box sx={{ color: '#1976d2' }}>{icon}</Box>}
            {title}
          </Typography>
          {actions && <Box>{actions}</Box>}
        </Box>
        
        {subtitle && (
          <Typography 
            variant="body1" 
            sx={{ 
              color: '#b0b8c1',
              fontSize: '1.1rem',
              maxWidth: '80%'
            }}
          >
            {subtitle}
          </Typography>
        )}
      </Box>

      {/* Content */}
      <Box sx={{ color: '#f5f5f5' }}>
        {children}
      </Box>
    </Container>
  );
};

export default PageLayout;
