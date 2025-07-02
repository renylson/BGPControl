import { Box, TextField, Paper, Typography, Autocomplete } from '@mui/material';
import type { ReactNode } from 'react';

export interface FormField {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  autoFocus?: boolean;
  multiline?: boolean;
  minRows?: number;
  fullWidth?: boolean;
  options?: { value: string | number; label: string }[];
}

interface FormProps {
  title?: string;
  fields: FormField[];
  values: Record<string, any>;
  errors?: Record<string, string>;
  onChange: (name: string, value: any) => void;
  onSubmit: (e: React.FormEvent) => void;
  children?: ReactNode;
  loading?: boolean;
}

export default function ReusableForm({
  title,
  fields,
  values,
  errors = {},
  onChange,
  onSubmit,
  children,
  loading = false,
}: FormProps) {
  return (
    <Paper sx={{
      p: { xs: 2, sm: 4 },
      maxWidth: 520,
      mx: 'auto',
      borderRadius: 4,
      boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.10)',
      background: 'linear-gradient(135deg, #232a36 0%, #181c24 100%)',
      color: 'text.primary',
    }}>
      {title && (
        <Typography variant="h5" color="primary" align="center" gutterBottom fontWeight={700}>
          {title}
        </Typography>
      )}
      <Box component="form" onSubmit={onSubmit} autoComplete="off">
        <Box sx={{ display: 'grid', gap: 2, mt: 2 }}>
          {fields.map((field) => (
            <Box key={field.name}>
              {field.type === 'checkbox' ? (
                <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                  <input
                    type="checkbox"
                    checked={!!values[field.name]}
                    onChange={e => onChange(field.name, e.target.checked)}
                    disabled={loading}
                    style={{ width: 20, height: 20, accentColor: '#43a047', marginRight: 8 }}
                  />
                  <Typography sx={{ color: '#bbb', fontWeight: 500 }}>{field.label}</Typography>
                </Box>
              ) : field.type === 'select-multiple' && field.options ? (
                <Autocomplete
                  multiple
                  options={field.options || []}
                  getOptionLabel={opt => typeof opt === 'string' ? opt : (opt.label ?? String(opt.value))}
                  isOptionEqualToValue={(opt, val) => opt.value === val.value}
                  value={(field.options || []).filter(opt => (values[field.name] || []).includes(opt.value))}
                  onChange={(_, newValue) => onChange(field.name, newValue ? newValue.map((v: any) => v.value) : [])}
                  renderInput={params => (
                    <TextField
                      {...params}
                      label={field.label}
                      required={field.required}
                      error={!!errors[field.name]}
                      helperText={errors[field.name]}
                      disabled={loading}
                      sx={{ bgcolor: '#181c24', borderRadius: 1, input: { color: '#fff' }, label: { color: '#bbb' } }}
                      InputLabelProps={{ style: { color: '#bbb' } }}
                      InputProps={{ ...params.InputProps, style: { color: '#fff' } }}
                    />
                  )}
                  disabled={loading}
                  fullWidth
                />
              ) : field.type === 'select' && field.options ? (
                <Autocomplete
                  options={field.options || []}
                  getOptionLabel={opt => typeof opt === 'string' ? opt : (opt.label ?? String(opt.value))}
                  isOptionEqualToValue={(opt, val) => opt.value === val.value}
                  value={(field.options || []).find(opt => opt.value === values[field.name]) || null}
                  onChange={(_, newValue) => onChange(field.name, newValue ? newValue.value : '')}
                  renderInput={params => (
                    <TextField
                      {...params}
                      label={field.label}
                      required={field.required}
                      error={!!errors[field.name]}
                      helperText={errors[field.name]}
                      disabled={loading}
                      sx={{ bgcolor: '#181c24', borderRadius: 1, input: { color: '#fff' }, label: { color: '#bbb' } }}
                      InputLabelProps={{ style: { color: '#bbb' } }}
                      InputProps={{ ...params.InputProps, style: { color: '#fff' } }}
                    />
                  )}
                  disabled={loading}
                  fullWidth
                />
              ) : (
                <TextField
                  label={field.label}
                  name={field.name}
                  type={field.type || 'text'}
                  value={values[field.name] || ''}
                  onChange={e => onChange(field.name, e.target.value)}
                  required={field.required}
                  autoFocus={field.autoFocus}
                  multiline={field.multiline}
                  minRows={field.minRows}
                  fullWidth={field.fullWidth !== false}
                  error={!!errors[field.name]}
                  helperText={errors[field.name]}
                  disabled={loading}
                  sx={{ bgcolor: '#181c24', borderRadius: 1, input: { color: '#fff' }, label: { color: '#bbb' } }}
                  InputLabelProps={{ style: { color: '#bbb' } }}
                  InputProps={{ style: { color: '#fff' } }}
                />
              )}
            </Box>
          ))}
        </Box>
        {children}
        {/* Os botões de ação (Salvar/Cancelar) agora são controlados pelo componente pai via children */}
      </Box>
    </Paper>
  );
}
