import semver from 'semver';
import DocsSource from './DocsSource';

const branchBlacklist = new Set(['docs', 'gh-pages']);
export default new DocsSource({
  id: 'main',
  name: 'Main library',
  global: 'Akairo',
  repo: 'danktuary/discord-akairo',
  defaultTag: 'master',
  defaultClass: 'AkairoClient',
  defaultFile: {
    category: 'memes',
    id: 'one',
  },
  branchFilter: branch => !branchBlacklist.has(branch) && !branch.startsWith('dependabot/'),
  tagFilter: tag => semver.gte(tag, '7.0.0'),
});
