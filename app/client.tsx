"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { inflate } from "pako";
import { GitHubGist } from "./types";
import { fetchUserGists, createGist, updateGist, logout } from "./server";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Card from "@mui/material/Card";
import Paper from "@mui/material/Paper";
import Snackbar, { SnackbarCloseReason } from "@mui/material/Snackbar";
import IconButton from "@mui/material/IconButton";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CloseIcon from "@mui/icons-material/Close";
import CircularProgress from "@mui/material/CircularProgress";
import GitHubIcon from "@mui/icons-material/GitHub";
import LogoutIcon from "@mui/icons-material/Logout";

/* ---- Login component ---- */

function LoginScreen({ error }: { error?: string }) {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 3,
        padding: 4,
        minHeight: "60vh",
      }}
    >
      <Typography variant="h4">XIVPlan Sharelink Creator</Typography>
      <Typography variant="body1" color="text.secondary">
        Sign in with GitHub to manage your gists.
      </Typography>
      <Button
        variant="contained"
        size="large"
        startIcon={<GitHubIcon />}
        href="/api/auth/login"
      >
        Sign in with GitHub
      </Button>
      {error && (
        <Typography color="error" variant="body2">
          Sign-in failed: {error}
        </Typography>
      )}
    </Box>
  );
}

const defaultName = "Kefka Phase N";

/* ---- Main app ---- */

export default function AppMain({
  isAuthenticated,
  loginError,
}: {
  isAuthenticated: boolean;
  loginError?: string;
}) {
  const router = useRouter();
  const [gists, setGists] = useState<GitHubGist[]>([]);
  const [gistsLoading, setGistsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedGist, setSelectedGist] = useState<string>("new");
  const [sharelink, setSharelink] = useState("");
  const [isError, setIsError] = useState(false);
  const [submitButtonActive, setSubmitButtonActive] = useState(false);
  const [newGistName, setNewGistName] = useState(defaultName);
  const [displayedXIVPlanUrl, setDisplayedXIVPlanUrl] = useState<URL | null>(null);
  const [recentlyCreatedXIVPlanUrl, setRecentlyCreatedXIVPlanUrl] =
    useState<URL | null>(null);
  const [snackbarActive, setSnackbarActive] = useState(false);

  const loadGists = useCallback(async () => {
    setGistsLoading(true);
    setError(null);
    try {
      const data = await fetchUserGists();
      setGists(data);
    } catch {
      setError("Failed to load gists. Your session may have expired.");
      router.refresh();
    } finally {
      setGistsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (isAuthenticated) loadGists();
  }, [isAuthenticated, loadGists]);

  const handleLogout = async () => {
    await logout();
    router.refresh();
  };

  const handleSubmit = async () => {
    const planJson = JSON.stringify(parseJSONfromUrl(new URL(sharelink)), null, 2);

    let result;
    if (selectedGist === "new") {
      result = await createGist(newGistName, planJson);
    } else {
      const selectedObj = gists.find((g) => g.id === selectedGist);
      if (!selectedObj?.description) return;
      result = await updateGist(
        selectedGist,
        selectedObj.description,
        planJson,
      );
    }

    if (result.success && result.data) {
      setError(null);
      const newUrl = parseGistUrl(result.data);
      setDisplayedXIVPlanUrl(newUrl);
      setRecentlyCreatedXIVPlanUrl(newUrl);
      copyToClipboard(constructXIVPlanSharelink(newUrl));
      setSnackbarActive(true);
      setSharelink("");
      loadGists();
    } else {
      setError(result.message ?? "Failed to save gist.");
    }
  };

  const handleCardClick = (event: React.MouseEvent, id: string) => {
    if (event.detail > 0) {
      setSelectedGist(id);
      if (id === "new") {
        setDisplayedXIVPlanUrl(recentlyCreatedXIVPlanUrl);
      } else {
        const gist = gists.find((g) => g.id === id);
        if (gist && "XIVPlan.json" in gist.files) {
          setDisplayedXIVPlanUrl(parseGistUrl(gist));
        }
      }
    }
  };

  const handleCopyClick = () => {
    copyToClipboard(constructXIVPlanSharelink(displayedXIVPlanUrl));
    setSnackbarActive(true);
  };

  const handleSnackbarClose = (
    _event: React.SyntheticEvent | Event,
    reason?: SnackbarCloseReason,
  ) => {
    if (reason !== "clickaway") setSnackbarActive(false);
  };

  const handleEnterPress = (event: React.KeyboardEvent) => {
    if (event.key === "Enter") {
      event.preventDefault();
    }
  };

  const handleChange = (value: string) => {
    setSharelink(value);
    const isValid = validateInput(value);
    setIsError(value !== "" && !isValid);
    setSubmitButtonActive(value !== "" && isValid);
  };

  if (!isAuthenticated) {
    return <LoginScreen error={loginError} />;
  }

  const snackbarAction = (
    <IconButton
      size="small"
      aria-label="close"
      color="inherit"
      onClick={handleSnackbarClose}
    >
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
      <Box sx={{ display: "flex", justifyContent: "flex-end", padding: 1 }}>
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
          width: { xs: "100vw", sm: "80vw" },
          minWidth: { xs: "auto", sm: "600px" },
          height: "20vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          padding: 4,
          margin: "0 auto 16px",
          boxSizing: "border-box",
        }}
      >
        <SharelinkInput
          sharelink={sharelink}
          isError={isError}
          handleChange={handleChange}
          handleKeyDown={handleEnterPress}
          submitButtonActive={submitButtonActive}
          selected={selectedGist}
          clickHandler={handleSubmit}
        />
        <DisplayXIVPlanUrl
          url={displayedXIVPlanUrl}
          clickHandler={handleCopyClick}
        />
      </Paper>
      {error && (
        <Typography color="error" sx={{ textAlign: "center", mb: 2 }}>
          {error}
        </Typography>
      )}
      {gistsLoading ? (
        <Box sx={{ display: "flex", justifyContent: "center", padding: 4 }}>
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

function SharelinkInput({
  sharelink,
  isError,
  handleChange,
  handleKeyDown,
  submitButtonActive,
  selected,
  clickHandler,
}: {
  sharelink: string;
  isError: boolean;
  handleChange: (value: string) => void;
  handleKeyDown: (e: React.KeyboardEvent) => void;
  submitButtonActive: boolean;
  selected: string;
  clickHandler: () => Promise<void>;
}) {
  return (
    <>
      <Box
        component="form"
        sx={{ "& .MuiTextField-root": { m: 1, width: "50ch" } }}
        noValidate
        autoComplete="off"
      >
        <TextField
          label="XIVPlan Share Link"
          value={sharelink}
          error={isError}
          id="xivplan-input-textarea"
          placeholder="Paste link here"
          helperText={
            isError ? "Not an XIVPlan share link or malformed link" : ""
          }
          variant="outlined"
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
        />
      </Box>
      <Button
        disabled={!submitButtonActive}
        suppressHydrationWarning
        variant="contained"
        onClick={clickHandler}
      >
        {selected === "new" ? "Create New" : "Update Gist"}
      </Button>
    </>
  );
}

function DisplayXIVPlanUrl({
  url,
  clickHandler,
}: {
  url: URL | null;
  clickHandler: () => void;
}) {
  const formattedUrl = constructXIVPlanSharelink(url);
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        boxSizing: "border-box",
        padding: 1,
      }}
    >
      <TextField
        sx={{ width: "45ch" }}
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

const dateFormatOptions: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
};

function cardSx(isSelected: boolean) {
  return {
    display: "flex",
    flexDirection: "column",
    justifyContent: "start",
    alignItems: "start",
    width: "200px",
    height: "220px",
    padding: 2,
    margin: 1,
    overflow: "hidden",
    border: isSelected ? "2px solid #1976d2" : "2px solid transparent",
    backgroundColor: isSelected ? "#e3f2fd" : "background.paper",
    boxShadow: isSelected ? 6 : 1,
    transform: isSelected ? "scale(1.02)" : "none",
    "&:focus": { outline: "none" },
  };
}

function DisplayGists({
  data,
  selected,
  handleCardClick,
  newGistName,
  setNewGistName,
}: {
  data: GitHubGist[];
  selected: string | null;
  handleCardClick: (event: React.MouseEvent, id: string) => void;
  newGistName: string;
  setNewGistName: (value: string) => void;
}) {
  const handleUpdate = (event: React.ChangeEvent<HTMLInputElement>) => {
    setNewGistName(event.target.value);
  };
  const handleResetToDefault = () => setNewGistName(defaultName);

  return (
    <div
      style={{
        width: "100vw",
        display: "flex",
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Card
        key="newGistCreationCard"
        onClick={(e) => handleCardClick(e, "new")}
        sx={cardSx(selected === "new")}
      >
        <Typography variant="h6" gutterBottom>
          Create New Gist
        </Typography>
        <TextField
          required
          id="new-gist-name"
          label="New Gist Name"
          placeholder="Be Descriptive!"
          variant="standard"
          value={newGistName}
          onChange={handleUpdate}
        />
        <Button
          size="small"
          sx={{ margin: "auto", padding: 1 }}
          onClick={handleResetToDefault}
        >
          Default Name
        </Button>
      </Card>
      {data.map((jsonData) => {
        const isSelected = jsonData.id === selected;
        return (
          <Card
            key={jsonData.url}
            onClick={(e) => handleCardClick(e, jsonData.id)}
            sx={cardSx(isSelected)}
          >
            <Typography variant="h6" gutterBottom>
              {jsonData.description}
            </Typography>
            <Typography variant="body2" gutterBottom>
              <strong>Created On: </strong>
              {new Date(jsonData.created_at).toLocaleString(undefined, dateFormatOptions)}
            </Typography>
            <Typography variant="body2" gutterBottom>
              <strong>Last Updated: </strong>
              {new Date(jsonData.updated_at).toLocaleString(undefined, dateFormatOptions)}
            </Typography>
            <Typography
              variant="caption"
              style={{
                overflow: "hidden",
                whiteSpace: "nowrap",
                textOverflow: "ellipsis",
              }}
            >
              <a href={jsonData.html_url} target="_blank" rel="noreferrer">
                Click to view Gist online
              </a>
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
    console.error("Failed to copy text: ", err);
  }
}

function validateInput(input: string) {
  if (input === "") return true;
  let url: URL;
  try {
    url = new URL(input);
  } catch (e) {
    return false;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;
  if (!url.hash.startsWith("#/plan/")) return false;
  try {
    parseJSONfromUrl(url);
  } catch (e) {
    return false;
  }
  return true;
}

function parseJSONfromUrl(input: URL): unknown {
  const encoded = input.hash.substring("#/plan/".length);
  const zlibData = Uint8Array.fromBase64(encoded, { alphabet: "base64url" });
  const inflated = inflate(zlibData);
  const decoded = new TextDecoder().decode(inflated);
  return JSON.parse(decoded);
}

function parseGistUrl(input: GitHubGist): URL {
  const url = new URL(input.files["XIVPlan.json"].raw_url);
  // Raw URL format: /user/gist_id/raw/revision/filename — drop revision for a stable URL
  const parts = url.pathname.split("/");
  const rawIdx = parts.indexOf("raw");
  if (rawIdx !== -1 && rawIdx + 2 < parts.length) {
    parts.splice(rawIdx + 1, 1);
  }
  url.pathname = parts.join("/");
  return url;
}

function constructXIVPlanSharelink(url: URL | null) {
  return url
    ? `https://xivplan.netlify.app/?url=${encodeURIComponent(url.href)}`
    : "";
}
