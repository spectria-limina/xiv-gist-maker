'use server'

import { GitHubGist } from "./types";
const token = process.env.API_SECRET_TOKEN;

export async function createGist(content:string, contentLength: number) {
  try {
    const response = await fetch('https://api.github.com/gists', {
      method: 'POST',
      headers: {
        'Accept': 'application/vnd.github+json',
        'Accept-Encoding': 'gzip, deflate, br',
        'Authorization': `Bearer ${token}`,
        'Cache-Control': 'no-cache',
        'Content-Type': 'application/json',
        'Content-Length': `${contentLength}`,
        'Host': 'www.cherrybee.moe',
        'UserAgent': 'XIVPlanGistCreator/0.1',
        'X-GitHub-Api-Version': '2026-03-10',
      },
      body: content,
    });

    if (!response.ok) {
      throw new Error('Failed to create Gist');
    }
    const data:GitHubGist = await response.json();
    return { success: true, data };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

export async function updateGist(id: string, content:string, contentLength: number) {
  try {
    const response = await fetch(`https://api.github.com/gists/${id}`, {
      method: 'POST',
      headers: {
        'Accept': 'application/vnd.github+json',
        'Accept-Encoding': 'gzip, deflate, br',
        'Authorization': `Bearer ${token}`,
        'Cache-Control': 'no-cache',
        'Content-Type': 'application/json',
        'Content-Length': `${contentLength}`,
        'Host': 'www.cherrybee.moe',
        'UserAgent': 'XIVPlanGistCreator/0.1',
        'X-GitHub-Api-Version': '2026-03-10',
      },
      body: content,
    });

    if (!response.ok) {
      throw new Error('Failed to update Gist');
    }
    const data:GitHubGist = await response.json();
    return { success: true, data };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}