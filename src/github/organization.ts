import type { GitHubOrganization, GitHubRepository, GitHubMember } from "../types/index.js";
import { GitHubGraphQLClient } from "./graphql/client.js";
import { GitHubRESTClient } from "./rest/client.js";
import {
  ORGANIZATION_QUERY,
  REPOSITORIES_QUERY,
  MEMBERS_QUERY,
} from "./graphql/queries.js";

interface RepoQueryResult {
  organization: {
    repositories: {
      totalCount: number;
      pageInfo: { hasNextPage: boolean; endCursor: string | null };
      nodes: Array<{
        id: string;
        name: string;
        description: string | null;
        isPrivate: boolean;
        isArchived: boolean;
        isFork: boolean;
        stargazerCount: number;
        forkCount: number;
        openIssues: { totalCount: number };
        defaultBranchRef: { name: string } | null;
        createdAt: string;
        updatedAt: string;
        pushedAt: string;
        repositoryTopics: {
          nodes: Array<{ topic: { name: string } }>;
        };
        primaryLanguage: { name: string } | null;
        languages: {
          edges: Array<{
            size: number;
            node: { name: string };
          }> | null;
        };
        licenseInfo: { key: string } | null;
      }>;
    };
  };
}

interface MemberQueryResult {
  organization: {
    membersWithRole: {
      totalCount: number;
      pageInfo: { hasNextPage: boolean; endCursor: string | null };
      nodes: Array<{
        login: string;
        avatarUrl: string;
        url: string;
      }>;
    };
  };
}

interface OrgQueryResult {
  organization: {
    login: string;
    name: string;
    description: string | null;
    avatarUrl: string;
    url: string;
    createdAt: string;
    updatedAt: string;
    membersWithRole: { totalCount: number };
  } | null;
}

export class OrganizationService {
  private graphql: GitHubGraphQLClient;
  private rest: GitHubRESTClient;

  constructor(token: string) {
    this.graphql = new GitHubGraphQLClient(token);
    this.rest = new GitHubRESTClient(token);
  }

  /**
   * Get organization profile information.
   */
  async getOrganization(org: string): Promise<GitHubOrganization | null> {
    try {
      const data = await this.graphql.query<OrgQueryResult>(
        ORGANIZATION_QUERY,
        { org }
      );

      if (!data.organization) return null;

      const o = data.organization;
      return {
        login: o.login,
        name: o.name,
        description: o.description,
        avatarUrl: o.avatarUrl,
        htmlUrl: o.url,
        publicRepos: 0, // Filled below
        membersCount: o.membersWithRole.totalCount,
        createdAt: o.createdAt,
        updatedAt: o.updatedAt,
      };
    } catch (error) {
      console.error(`Failed to fetch organization ${org}:`, error);
      return null;
    }
  }

  /**
   * Get all repositories for the organization.
   */
  async getRepositories(
    org: string,
    includePrivate: boolean = false
  ): Promise<GitHubRepository[]> {
    try {
      const privacy = includePrivate ? "PRIVATE" : "PUBLIC";
      const nodes = await this.graphql.paginate<RepoQueryResult["organization"]["repositories"]["nodes"][number]>(
        REPOSITORIES_QUERY,
        { org, privacy },
        (data: unknown) => {
          const d = data as RepoQueryResult;
          const repos = d.organization.repositories;
          return {
            nodes: repos.nodes,
            pageInfo: repos.pageInfo,
          };
        }
      );

      return nodes.map((repo) => ({
        id: repo.id,
        name: repo.name,
        fullName: `${org}/${repo.name}`,
        description: repo.description,
        isPrivate: repo.isPrivate,
        isArchived: repo.isArchived,
        isFork: repo.isFork,
        language: repo.primaryLanguage?.name ?? null,
        languages: (repo.languages?.edges ?? []).map((e) => ({
          name: e.node.name,
          size: e.size,
        })),
        stargazersCount: repo.stargazerCount,
        forksCount: repo.forkCount,
        openIssuesCount: repo.openIssues.totalCount,
        defaultBranch: repo.defaultBranchRef?.name ?? "main",
        createdAt: repo.createdAt,
        updatedAt: repo.updatedAt,
        pushedAt: repo.pushedAt,
        topics: repo.repositoryTopics.nodes.map((t) => t.topic.name),
        license: repo.licenseInfo?.key ?? null,
      }));
    } catch (error) {
      console.error(`Failed to fetch repositories for ${org}:`, error);
      return [];
    }
  }

  /**
   * Get organization members.
   */
  async getMembers(org: string): Promise<GitHubMember[]> {
    try {
      const nodes = await this.graphql.paginate<MemberQueryResult["organization"]["membersWithRole"]["nodes"][number]>(
        MEMBERS_QUERY,
        { org },
        (data: unknown) => {
          const d = data as MemberQueryResult;
          const members = d.organization.membersWithRole;
          return {
            nodes: members.nodes,
            pageInfo: members.pageInfo,
          };
        }
      );

      return nodes.map((member) => ({
        login: member.login,
        avatarUrl: member.avatarUrl,
        htmlUrl: member.url,
      }));
    } catch (error) {
      console.error(`Failed to fetch members for ${org}:`, error);
      return [];
    }
  }
}
