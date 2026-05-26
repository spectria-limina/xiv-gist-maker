import AppMain from "./client";
import Box from '@mui/material/Box';
import { GitHubGist } from "./types";

export default async function Home() {
  const data = await fetchUserGists();
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'start',
        alignItems: 'center',
        width: '100vw',
        height: '100vh',
        flexDirection: 'column'
      }}
    >
      <AppMain data={data}/>
    </Box>
  )
}

async function fetchUserGists(): Promise<GitHubGist[]> {
  const token = process.env.GITHUB_ACCESS_TOKEN;
  
  const response = await fetch('https://api.github.com/gists', {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2026-03-10',
    },
    next: { revalidate: 60 },
  });

  if (!response.ok) {
    throw new Error('Auth Failure');
  }
  return response.json();
}