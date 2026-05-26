export interface PostContentFileContent {
    'content': string;
}

export interface PostContentFile {
    'XIVPlan.json': PostContentFileContent;
}

export interface PostContent {
    'files': PostContentFile,
    'description': string,
    'public': boolean,
}

export class PostBodyFileContent implements PostContentFileContent {
    'content';
    constructor(content:string) {
        this['content'] = content;
    }
}

export class PostBodyFile implements PostContentFile {
    'XIVPlan.json';
    constructor(content:string) {
        this['XIVPlan.json'] = new PostBodyFileContent(content);
    }
}

export default class PostBody implements PostContent {
    'files';
    'description';
    'public' = true;
    constructor(description: string, content:string) {
        this['description'] = description;
        this['files'] = new PostBodyFile(content);
    }
}

export interface GistFile {
  filename: string;
  type: string;
  language: string;
  raw_url: string;
  size: number;
}

export interface GistOwner {
  login: string;
  id: number;
  node_id: string;
  avatar_url: string;
  gravatar_id: string;
  url: string;
  html_url: string;
  followers_url: string;
  following_url: string;
  gists_url: string;
  starred_url: string;
  subscriptions_url: string;
  organizations_url: string;
  repos_url: string;
  events_url: string;
  received_events_url: string;
  type: string;
  site_admin: boolean;
}

export interface GitHubGist {
  url: string;
  forks_url: string;
  commits_url: string;
  id: string;
  node_id: string;
  git_pull_url: string;
  git_push_url: string;
  html_url: string;
  files: {
    [filename: string]: GistFile;
  };
  
  public: boolean;
  created_at: string;
  updated_at: string;
  description: string | null;
  comments: number;
  user: any | null;
  comments_url: string;
  owner: GistOwner;
  truncated: boolean;
}