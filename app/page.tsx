import AppMain from "./client";
import { getToken } from "./lib/token-cookie";
import Box from '@mui/material/Box';

export default async function Home({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const [isAuthenticated, { error }] = await Promise.all([
    getToken().then(t => t !== null).catch(() => false),
    searchParams,
  ]);
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'start',
        alignItems: 'center',
        width: '100vw',
        minHeight: '100vh',
        flexDirection: 'column',
      }}
    >
      <AppMain isAuthenticated={isAuthenticated} loginError={error} />
    </Box>
  );
}
