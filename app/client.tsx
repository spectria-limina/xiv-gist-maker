'use client';
import { Dispatch, SetStateAction, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { inflate } from 'pako';
import { GitHubGist } from './types';
import { fetchUserGists, createGist, updateGist, logout } from './server';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import Paper from '@mui/material/Paper';
import Snackbar, { SnackbarCloseReason } from '@mui/material/Snackbar';
import IconButton from '@mui/material/IconButton';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CloseIcon from '@mui/icons-material/Close';
import CircularProgress from '@mui/material/CircularProgress';
import GitHubIcon from '@mui/icons-material/GitHub';
import LogoutIcon from '@mui/icons-material/Logout';

const defaultName = 'Kefka Phase N';

/* ---- Device Flow login component ---- */

interface DeviceCodeResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval: number;
}

function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [deviceData, setDeviceData] = useState<DeviceCodeResponse | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);

  const startLogin = async () => {
    setError(null);
    const res = await fetch('/api/github/device/code', { method: 'POST' });
    if (!res.ok) {
      setError('Failed to start login. Is the app configured?');
      return;
    }
    const data: DeviceCodeResponse = await res.json();
    setDeviceData(data);
    setIsPolling(true);
    window.open(data.verification_uri, '_blank');
  };

  const copyCode = async () => {
    if (!deviceData) return;
    await navigator.clipboard.writeText(deviceData.user_code);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  useEffect(() => {
    if (!isPolling || !deviceData) return;

    let active = true;
    const intervalMs = (deviceData.interval + 1) * 1000;

    const poll = async () => {
      while (active) {
        await new Promise(r => setTimeout(r, intervalMs));
        if (!active) break;
        const res = await fetch('/api/github/device/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ device_code: deviceData.device_code }),
        });
        const data = await res.json();
        if (data.success) {
          onLogin();
          active = false;
        } else if (data.error === 'authorization_pending') {
          // keep polling
        } else if (data.error === 'slow_down') {
          await new Promise(r => setTimeout(r, 5000));
        } else if (data.error === 'expired_token') {
          setError('Login session expired. Please try again.');
          setDeviceData(null);
          active = false;
        } else {
          setError(data.error_description || 'Login failed. Please try again.');
          setDeviceData(null);
          active = false;
        }
      }
      setIsPolling(false);
    };

    poll();
    return () => { active = false; };
  }, [isPolling, deviceData, onLogin]);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 3,
        padding: 4,
        minHeight: '60vh',
      }}
    >
      <Typography variant="h4">XIVPlan Sharelink Creator</Typography>
      <Typography variant="body1" color="text.secondary">
        Sign in with GitHub to manage your gists.
      </Typography>

      {!deviceData ? (
        <>
          <Button
            variant="contained"
            size="large"
            startIcon={<GitHubIcon />}
            onClick={startLogin}
          >
            Sign in with GitHub
          </Button>
          {error && (
            <Typography color="error" variant="body2">{error}</Typography>
          )}
        </>
      ) : (
        <Paper elevation={3} sx={{ padding: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, maxWidth: 400 }}>
          <Typography variant="h6">Authorize on GitHub</Typography>
          <Typography variant="body2" color="text.secondary" textAlign="center">
            Enter this code at <strong>{deviceData.verification_uri}</strong> (opened in new tab):
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h4" fontFamily="monospace" letterSpacing={4}>
              {deviceData.user_code}
            </Typography>
            <IconButton onClick={copyCode} size="small" title="Copy code">
              <ContentCopyIcon />
            </IconButton>
          </Box>
          {codeCopied && <Typography variant="caption" color="success.main">Copied!</Typography>}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CircularProgress size={20} />
            <Typography variant="body2" color="text.secondary">Waiting for authorization…</Typography>
          </Box>
          <Button variant="text" size="small" onClick={() => window.open(deviceData.verification_uri, '_blank')}>
            Reopen GitHub
          </Button>
          {error && <Typography color="error" variant="body2">{error}</Typography>}
        </Paper>
      )}
    </Box>
  );
}

/* ---- Main app ---- */

export default function AppMain({ isAuthenticated }: { isAuthenticated: boolean }) {
  const router = useRouter();
  const [gists, setGists] = useState<GitHubGist[]>([]);
  const [gistsLoading, setGistsLoading] = useState(false);
  const [gistsError, setGistsError] = useState<string | null>(null);
  const [selectedGist, setSelectedGist] = useState<string>('new');
  const [sharelink, setSharelink] = useState('');
  const [isError, setIsError] = useState(false);
  const [submitButtonActive, setSubmitButtonActive] = useState(false);
  const [newGistName, setNewGistName] = useState(defaultName);
  const [displayedXIVPlanUrl, setDisplayedXIVPlanUrl] = useState('');
  const [recentlyCreatedXIVPlanUrl, setRecentlyCreatedXIVPlanUrl] = useState('');
  const [snackbarActive, setSnackbarActive] = useState(false);

  const loadGists = useCallback(async () => {
    setGistsLoading(true);
    setGistsError(null);
    try {
      const data = await fetchUserGists();
      setGists(data);
    } catch {
      setGistsError('Failed to load gists. Your session may have expired.');
      router.refresh();
    } finally {
      setGistsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (isAuthenticated) loadGists();
  }, [isAuthenticated, loadGists]);

  const handleLogin = () => {
    router.refresh();
  };

  const handleLogout = async () => {
    await logout();
    router.refresh();
  };

  const handleSubmit = async () => {
    const planJson = JSON.stringify(parseJSONfromUrl(sharelink));
    if (selectedGist === 'new') {
      const result = await createGist(newGistName, planJson);
      if (result.success && result.data) {
        const newUrl = parseGistUrl(result.data);
        setDisplayedXIVPlanUrl(newUrl);
        setRecentlyCreatedXIVPlanUrl(newUrl);
        copyToClipboard(constructXIVPlanSharelink(newUrl));
        setSnackbarActive(true);
        setSharelink('');
        loadGists();
      } else {
        setIsError(true);
        setSharelink('');
      }
    } else {
      const selectedObj = gists.find((g: GitHubGist) => g.id === selectedGist);
      if (!selectedObj?.description) return;
      const result = await updateGist(selectedGist, selectedObj.description, planJson);
      if (result.success && result.data) {
        const newUrl = parseGistUrl(result.data);
        setDisplayedXIVPlanUrl(newUrl);
        setRecentlyCreatedXIVPlanUrl(newUrl);
        copyToClipboard(constructXIVPlanSharelink(newUrl));
        setSnackbarActive(true);
        setSharelink('');
        loadGists();
      } else {
        setIsError(true);
        setSharelink('');
      }
    }
  };

  const handleCardClick = (event: React.MouseEvent, id: string) => {
    if (event.detail > 0) {
      setSelectedGist(id);
      if (id === 'new') {
        setDisplayedXIVPlanUrl(recentlyCreatedXIVPlanUrl);
      } else {
        const gist = gists.find((g: GitHubGist) => g.id === id);
        if (gist && 'XIVPlan.json' in gist.files) {
          setDisplayedXIVPlanUrl(parseGistUrl(gist));
        }
      }
    }
  };

  const handleCopyClick = () => {
    copyToClipboard(constructXIVPlanSharelink(displayedXIVPlanUrl));
    setSnackbarActive(true);
  };

  const handleSnackbarClose = (_event: React.SyntheticEvent | Event, reason?: SnackbarCloseReason) => {
    if (reason !== 'clickaway') setSnackbarActive(false);
  };

  const handleEnterPress = (event: { key: string; preventDefault: () => void }) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleValidation();
    }
  };

  const handleValidation = () => {
    const isValid = validateInput(sharelink);
    setIsError(!isValid);
    setSubmitButtonActive(sharelink !== '' && isValid);
  };

  if (!isAuthenticated) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  const snackbarAction = (
    <IconButton size="small" aria-label="close" color="inherit" onClick={handleSnackbarClose}>
      <CloseIcon fontSize="small" />
    </IconButton>
  );

  return (
    <>
      <Snackbar
        open={snackbarActive}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        message="XIVPlan URL saved!"
        action={snackbarAction}
      />
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', padding: 1 }}>
        <Button
          size="small"
          startIcon={<LogoutIcon />}
          onClick={handleLogout}
          color="inherit"
        >
          Sign out
        </Button>
      </Box>
      <Paper
        elevation={3}
        sx={{
          width: { xs: '100vw', sm: '80vw' },
          minWidth: { xs: 'auto', sm: '600px' },
          height: { xs: '20vh', sm: '20vh' },
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 4,
          margin: '0 auto 16px',
          boxSizing: 'border-box',
        }}
      >
        <SharelinkInput
          sharelink={sharelink}
          isError={isError}
          setSharelink={setSharelink}
          handleValidation={handleValidation}
          handleKeyDown={handleEnterPress}
          submitButtonActive={submitButtonActive}
          selected={selectedGist}
          clickHandler={handleSubmit}
        />
        <DisplayXIVPlanUrl url={displayedXIVPlanUrl} clickHandler={handleCopyClick} />
      </Paper>
      {gistsError && (
        <Typography color="error" textAlign="center" sx={{ mb: 2 }}>{gistsError}</Typography>
      )}
      {gistsLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', padding: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <DisplayGists
          data={gists}
          selected={selectedGist}
          handleCardClick={handleCardClick}
          newGistName={newGistName}
          setNewGistName={setNewGistName}
        />
      )}
    </>
  );
}

function SharelinkInput({ sharelink, isError, setSharelink, handleValidation, handleKeyDown, submitButtonActive, selected, clickHandler }:
  { sharelink: string; isError: boolean; setSharelink: (v: string) => void; handleValidation: () => void; handleKeyDown: (e: any) => void; submitButtonActive: boolean; selected: string; clickHandler: () => Promise<void> }) {
  return (
    <>
      <Box
        component="form"
        sx={{ '& .MuiTextField-root': { m: 1, width: '50ch' } }}
        noValidate
        autoComplete="off"
      >
        <div>
          <TextField
            label="XIVPlan Share Link"
            value={sharelink}
            error={isError}
            id="xivplan-input-textarea"
            placeholder="Paste link here"
            helperText={isError ? 'Not an XIVPlan share link or malformed link' : ''}
            variant="outlined"
            onChange={e => setSharelink(e.target.value)}
            onBlur={handleValidation}
            onKeyDown={handleKeyDown}
          />
        </div>
      </Box>
      <Button disabled={!submitButtonActive} variant="contained" onClick={clickHandler}>
        {selected === 'new' ? 'Create New' : 'Update Gist'}
      </Button>
    </>
  );
}

function DisplayXIVPlanUrl({ url, clickHandler }: { url: string; clickHandler: () => void }) {
  const formattedUrl = constructXIVPlanSharelink(url);
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        boxSizing: 'border-box',
        padding: 1,
      }}
    >
      <TextField
        sx={{ width: '45ch' }}
        aria-readonly
        id="XIVPlan-formatted-url"
        placeholder="Formatted XIVPlan Link"
        variant="standard"
        value={formattedUrl}
      />
      <IconButton size="large" onClick={clickHandler}>
        <ContentCopyIcon />
      </IconButton>
    </Box>
  );
}

function DisplayGists({ data, selected, handleCardClick, newGistName, setNewGistName }:
  { data: GitHubGist[]; selected: string | null; handleCardClick: (event: any, id: any) => void; newGistName: string; setNewGistName: Dispatch<SetStateAction<string>> }) {
  const handleUpdate = (event: { target: { value: SetStateAction<string> } }) => {
    setNewGistName(event.target.value);
  };
  const handleResetToDefault = () => setNewGistName(defaultName);

  return (
    <div
      style={{
        width: '100vw',
        display: 'flex',
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Card
        key="newGistCreationCard"
        onClick={e => handleCardClick(e, 'new')}
        sx={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'start',
          alignItems: 'start',
          width: '200px',
          height: '220px',
          padding: 2,
          margin: 1,
          overflow: 'hidden',
          border: selected === 'new' ? '2px solid #1976d2' : '2px solid transparent',
          backgroundColor: selected === 'new' ? '#e3f2fd' : 'background.paper',
          boxShadow: selected === 'new' ? 6 : 1,
          transform: selected === 'new' ? 'scale(1.02)' : 'none',
          '&:focus': { outline: 'none' },
        }}
      >
        <Typography variant="h6" gutterBottom>Create New Gist</Typography>
        <TextField
          required
          id="new-gist-name"
          label="New Gist Name"
          placeholder="Be Descriptive!"
          variant="standard"
          value={newGistName}
          onChange={handleUpdate}
        />
        <Button sx={{ margin: 'auto', padding: 1, size: 'small' }} onClick={handleResetToDefault}>
          Default Name
        </Button>
      </Card>
      {data.map(jsonData => {
        const isSelected = jsonData.id === selected;
        return (
          <Card
            key={jsonData.url}
            onClick={e => handleCardClick(e, jsonData.id)}
            sx={{
              justifyContent: 'start',
              alignItems: 'start',
              width: '200px',
              height: '220px',
              padding: 2,
              margin: 1,
              overflow: 'hidden',
              border: isSelected ? '2px solid #1976d2' : '2px solid transparent',
              backgroundColor: isSelected ? '#e3f2fd' : 'background.paper',
              boxShadow: isSelected ? 6 : 1,
              transform: isSelected ? 'scale(1.02)' : 'none',
              '&:focus': { outline: 'none' },
            }}
          >
            <Typography variant="h6" gutterBottom>{jsonData.description}</Typography>
            <Typography variant="body2" gutterBottom>
              <strong>Created On: </strong>
              {new Date(jsonData.created_at).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </Typography>
            <Typography variant="body2" gutterBottom>
              <strong>Last Updated: </strong>
              {new Date(jsonData.updated_at).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </Typography>
            <Typography variant="caption" style={{ overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
              <a href={jsonData.html_url} target="_blank">Click to view Gist online</a>
            </Typography>
          </Card>
        );
      })}
    </div>
  );
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch (err) {
    console.error('Failed to copy text: ', err);
  }
}

function validateInput(input: string) {
  const regex = /^https?:\/\/[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\/#\/plan\/[a-zA-Z0-9_-]*$/;
  if (input === '') return true;
  if (!regex.test(input)) return false;
  try {
    parseJSONfromUrl(input);
  } catch {
    return false;
  }
  return true;
}

function parseJSONfromUrl(url: string) {
  const searchTarget = '/plan/';
  const fixedInput = url.replaceAll('-', '+')
    .replaceAll('_', '/')
    .substring(url.indexOf(searchTarget) + searchTarget.length);
  const binData = atob(fixedInput);
  const charData = binData.split('').map(x => x.charCodeAt(0));
  const zlibData = new Uint8Array(charData);
  const data = inflate(zlibData);
  // @ts-expect-error Uint16Array → String.fromCharCode variance
  return JSON.parse(String.fromCharCode.apply(null, new Uint16Array(data)));
}

function parseGistUrl(input: GitHubGist) {
  const regex = /([^\/]+)\/[^\/]+(\/[^\/]+)$/;
  const rawUrl = input.files['XIVPlan.json'].raw_url;
  return rawUrl.replace(regex, '$1$2');
}

function constructXIVPlanSharelink(url: string) {
  return url ? `https://xivplan.netlify.app/?url=${encodeURIComponent(url)}` : '';
}
