"use server";

import { getAuthToken } from "./lib/auth";
import { clearTokenCookie } from "./lib/token-cookie";
import {
  revokeGitHubToken,
  GITHUB_API,
  GITHUB_API_VERSION,
} from "./lib/github-oauth";
import { GitHubGist, buildPostBody } from "./types";

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getAuthToken();
  if (!token) throw new Error("Not authenticated");
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "X-GitHub-Api-Version": GITHUB_API_VERSION,
  };
}

export async function fetchUserGists(): Promise<GitHubGist[]> {
  const headers = await authHeaders();
  const res = await fetch(`${GITHUB_API}/gists`, {
    headers,
    next: { revalidate: 0 },
  });
  if (!res.ok) throw new Error("Failed to fetch gists");
  const all: GitHubGist[] = await res.json();
  return all.filter((g) => "XIVPlan.json" in g.files);
}

export async function createGist(
  description: string,
  planJson: string,
): Promise<{ success: boolean; data?: GitHubGist; message?: string }> {
  try {
    const headers = await authHeaders();
    const body = JSON.stringify(buildPostBody(description, planJson));
    const res = await fetch(`${GITHUB_API}/gists`, {
      method: "POST",
      headers,
      body,
    });
    if (!res.ok) throw new Error("Failed to create gist");
    return { success: true, data: await res.json() };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

export async function updateGist(
  id: string,
  description: string,
  planJson: string,
): Promise<{ success: boolean; data?: GitHubGist; message?: string }> {
  try {
    const headers = await authHeaders();
    const body = JSON.stringify(buildPostBody(description, planJson));
    const res = await fetch(`${GITHUB_API}/gists/${id}`, {
      method: "PATCH",
      headers,
      body,
    });
    if (!res.ok) throw new Error("Failed to update gist");
    return { success: true, data: await res.json() };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

export async function logout(): Promise<void> {
  const token = await getAuthToken();
  await Promise.all([
    token ? revokeGitHubToken(token) : Promise.resolve(),
    clearTokenCookie(),
  ]);
}
