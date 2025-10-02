import * as React from 'react';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import CssBaseline from '@mui/material/CssBaseline';
import TextField from '@mui/material/TextField';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import Typography from '@mui/material/Typography';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { AuthContext } from '../contexts/AuthContext';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';

const defaultTheme = createTheme();

export default function Authentication() {
  // use empty strings as initial values for controlled inputs
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [name, setName] = React.useState('');
  const [error, setError] = React.useState('');
  const [message, setMessage] = React.useState('');

  // 0 -> login, 1 -> register
  const [formState, setFormState] = React.useState(0);

  const [open, setOpen] = React.useState(false);

  const { handleRegister, handleLogin } = React.useContext(AuthContext);

  // clear errors on field change
  React.useEffect(() => {
    if (error) setError('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username, password, name, formState]);

  const handleAuth = async () => {
    setError('');
    try {
      if (formState === 0) {
        // Sign in flow
        const result = await handleLogin(username, password);
        // if your handleLogin returns a message, you can show it
        if (result) {
          setMessage(result);
          setOpen(true);
        }
      } else {
        // Sign up flow
        const result = await handleRegister(name, username, password);
        // show returned message (if any)
        setMessage(result || 'Registered successfully');
        setOpen(true);

        // reset relevant fields and switch to login
        setPassword('');
        setName('');
        setFormState(0);
      }
    } catch (err) {
      // attempt safe extraction of server error message
      let serverMessage = 'Something went wrong';
      try {
        if (err?.response?.data?.message) serverMessage = err.response.data.message;
        else if (err?.message) serverMessage = err.message;
      } catch (e) {}
      setError(serverMessage);
    }
  };

  const handleCloseSnackbar = (event, reason) => {
    if (reason === 'clickaway') return;
    setOpen(false);
  };

  // simple validations: disable submit when required fields empty
  const isLoginDisabled = !username.trim() || !password;
  const isRegisterDisabled = !name.trim() || !username.trim() || !password;

  return (
    <ThemeProvider theme={defaultTheme}>
      <Grid container component="main" sx={{ height: '100vh' }}>
        <CssBaseline />

        {/* Left image / illustration */}
        <Grid
          item
          xs={false}
          sm={4}
          md={7}
          sx={{
            backgroundImage: 'url(https://source.unsplash.com/random?technology)',
            backgroundRepeat: 'no-repeat',
            backgroundColor: (t) =>
              t.palette.mode === 'light' ? t.palette.grey[50] : t.palette.grey[900],
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />

        {/* Right form */}
        <Grid item xs={12} sm={8} md={5} component={Paper} elevation={6} square>
          <Box
            sx={{
              my: 6,
              mx: 4,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <Avatar sx={{ m: 1, bgcolor: 'secondary.main' }}>
              <LockOutlinedIcon />
            </Avatar>

            <Typography component="h1" variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
              {formState === 0 ? 'Sign in' : 'Create account'}
            </Typography>

            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <Button
                variant={formState === 0 ? 'contained' : 'outlined'}
                onClick={() => setFormState(0)}
                size="small"
              >
                Sign In
              </Button>
              <Button
                variant={formState === 1 ? 'contained' : 'outlined'}
                onClick={() => setFormState(1)}
                size="small"
              >
                Sign Up
              </Button>
            </Box>

            <Box component="form" noValidate sx={{ mt: 1, width: '100%' }}>
              {formState === 1 && (
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  id="fullName"
                  label="Full name"
                  name="fullName"
                  value={name}
                  autoFocus
                  onChange={(e) => setName(e.target.value)}
                />
              )}

              <TextField
                margin="normal"
                required
                fullWidth
                id="username"
                label="Username or email"
                name="username"
                value={username}
                autoFocus={formState === 0}
                onChange={(e) => setUsername(e.target.value)}
              />

              <TextField
                margin="normal"
                required
                fullWidth
                id="password"
                name="password"
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              {error && (
                <Typography sx={{ color: 'error.main', mt: 1, mb: 1 }} variant="body2">
                  {error}
                </Typography>
              )}

              <Button
                type="button"
                fullWidth
                variant="contained"
                sx={{ mt: 3, mb: 2, py: 1.1 }}
                onClick={handleAuth}
                disabled={formState === 0 ? isLoginDisabled : isRegisterDisabled}
              >
                {formState === 0 ? 'Login' : 'Register'}
              </Button>

              {/* optional small links */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  {formState === 0 ? "Don't have an account?" : 'Already registered?'}
                </Typography>
                <Button
                  size="small"
                  onClick={() => setFormState((s) => (s === 0 ? 1 : 0))}
                >
                  {formState === 0 ? 'Sign Up' : 'Sign In'}
                </Button>
              </Box>
            </Box>
          </Box>
        </Grid>
      </Grid>

      <Snackbar open={open} autoHideDuration={4000} onClose={handleCloseSnackbar}>
        <Alert onClose={handleCloseSnackbar} severity="success" sx={{ width: '100%' }}>
          {message || 'Success'}
        </Alert>
      </Snackbar>
    </ThemeProvider>
  );
}
