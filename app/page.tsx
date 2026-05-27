import AppMain from "./client";
import { fetchUserGists } from "./server";
import Box from '@mui/material/Box';

export default async function Home() {
  const data = await fetchUserGists();
  //const data:GitHubGist[] = [];
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