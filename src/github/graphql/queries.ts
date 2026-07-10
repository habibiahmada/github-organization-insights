/**
 * GraphQL queries for GitHub data fetching.
 */

/** Fetch organization profile */
export const ORGANIZATION_QUERY = `
  query GetOrganization($org: String!) {
    organization(login: $org) {
      login
      name
      description
      avatarUrl
      url
      createdAt
      updatedAt
      membersWithRole(first: 1) {
        totalCount
      }
    }
  }
`;

/** Fetch repositories with pagination */
export const REPOSITORIES_QUERY = `
  query GetRepositories($org: String!, $after: String, $privacy: RepositoryPrivacy = PUBLIC) {
    organization(login: $org) {
      repositories(
        first: 100
        after: $after
        orderBy: { field: PUSHED_AT, direction: DESC }
        privacy: $privacy
      ) {
        totalCount
        pageInfo {
          hasNextPage
          endCursor
        }
        nodes {
          id
          name
          description
          isPrivate
          isArchived
          isFork
          stargazerCount
          forkCount
          openIssues: issues(states: OPEN) { totalCount }
          defaultBranchRef { name }
          createdAt
          updatedAt
          pushedAt
          repositoryTopics(first: 10) {
            nodes { topic { name } }
          }
          primaryLanguage { name }
          languages(first: 10, orderBy: { field: SIZE, direction: DESC }) {
            edges {
              size
              node { name }
            }
          }
          licenseInfo { key }
        }
      }
    }
  }
`;

/** Fetch organization members with pagination */
export const MEMBERS_QUERY = `
  query GetMembers($org: String!, $after: String) {
    organization(login: $org) {
      membersWithRole(first: 100, after: $after) {
        totalCount
        pageInfo {
          hasNextPage
          endCursor
        }
        nodes {
          login
          avatarUrl
          url
        }
      }
    }
  }
`;

/** Fetch commit history for a repository via default branch */
export const COMMIT_HISTORY_QUERY = `
  query GetCommitHistory($owner: String!, $repo: String!, $since: String!, $until: String!, $after: String) {
    repository(owner: $owner, name: $repo) {
      defaultBranchRef {
        target {
          ... on Commit {
            history(first: 100, after: $after, since: $since, until: $until) {
              totalCount
              pageInfo {
                hasNextPage
                endCursor
              }
              nodes {
                committedDate
                author {
                  name
                  user { login }
                }
              }
            }
          }
        }
      }
    }
  }
`;
