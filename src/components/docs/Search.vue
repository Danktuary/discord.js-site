<template>
  <div id="docs-search" class="docs-page">
    <em id="show-scores" :class="`fa fa-bar-chart ${!showScores ? 'disabled' : ''}`" :title="toggleScoresLabel" @click="toggleScores"></em>

    <h1>Search</h1>
    <input v-model.trim="search" type="search" />

    <div id="toggles">
      <label><input type="checkbox" v-model="toggles['classes']" /> Classes</label>
      <label><input type="checkbox" v-model="toggles['props']" /> Properties</label>
      <label><input type="checkbox" v-model="toggles['methods']" /> Methods</label>
      <label><input type="checkbox" v-model="toggles['events']" /> Events</label>
      <label><input type="checkbox" v-model="toggles['typedefs']" /> Typedefs</label>
    </div>

    <transition name="fade" mode="out-in">
      <div v-if="search && search.length >= 2">
        <h2 v-if="search && search.length >= 2">Results for "{{ search }}"</h2>

        <transition name="fade" mode="out-in">
          <transition-group name="animated-list" tag="ul" v-if="results.length > 0" key="results">
            <li v-for="result in results" :key="result.item.key || result.item.fullName || result.item.name" class="animated-list-item">
              <span v-if="showScores" class="score">{{ Math.round((1 - result.score) * 100) }}%</span>
              <router-link :to="result.item.route">
                <span class="badge" :title="result.item.type">{{ result.item.type[0] }}</span>
                {{ result.item.fullName || result.item.name }}{{ result.item.type === 'Method' ? '()' : '' }}
              </router-link>
            </li>
          </transition-group>

          <p v-else key="empty">No results.</p>
        </transition>
      </div>

      <p v-else key="short">Your search query must be at least two characters.</p>
    </transition>
  </div>
</template>

<script>
  import Fuse from 'fuse.js';
  import { scopedName } from '../../util';

  export default {
    name: 'docs-search',
    props: ['docs', 'showPrivate'],

    data() {
      const toggles = { classes: true, props: true, methods: true, events: true, typedefs: true };
      return {
        toggles,
        search: this.$route.query.q,
        showScores: false,
        fuse: this.buildFuse(toggles),
      };
    },

    computed: {
      results() {
        const results = this.fuse.search(this.search);

        // Add routes and other necessary info to all results
        for (const result of results) {
          if (result.item.type === 'Class') {
            result.item.route = {
              name: 'docs-class',
              params: { class: result.item.name },
            };
            continue;
          }
          if (result.item.type === 'Property' || result.item.type === 'Method') {
            result.item.fullName = fullName(result.item, result.item.parent);
            result.item.route = {
              name: 'docs-class',
              params: { class: result.item.parent },
              query: { scrollTo: scopedName(result.item) },
            };
            continue;
          }
          if (result.item.type === 'Event') {
            result.item.key = `e-${result.item.parent}#${result.item.name}`;
            result.item.fullName = fullName(result.item, result.item.parent);
            result.item.route = {
              name: 'docs-class',
              params: { class: result.item.parent },
              query: { scrollTo: `e-${result.item.name}` },
            };
            continue;
          }
          if (result.item.type === 'Typedef') {
            result.item.route = {
              name: 'docs-typedef',
              params: { typedef: result.item.name },
            };
            continue;
          }
        }

        // Remove class members where the class name is the only place a match is found
        // This avoids listing every member of a class just because the class name matched
        let r = 0;
        while (r < results.length) {
          const result = results[r];
          if (result.item.type === 'Property' || result.item.type === 'Method' || result.item.type === 'Event') {
            // Get a list of the keys that matched
            const keys = [];
            for (const match of result.matches) keys.push(match.key);

            // Remove the item if only the class name matched
            if (keys.length === 2 && keys.includes('parent') && keys.includes('fullName')) {
              results.splice(r, 1);
              continue;
            }
          }
          r++;
        }

        return results;
      },

      toggleScoresLabel() {
        return `Scores are ${this.showScores ? 'shown' : 'hidden'}. Click to toggle.`;
      },
    },

    methods: {
      toggleScores() {
        this.showScores = !this.showScores;
      },

      // Build an array of all doc items with minimal data
      buildFuse(toggles) {
        const items = [];

        for (const c of this.docs.classes) {
          if (!this.showPrivate && c.access === 'private') continue;

          if (toggles.classes) {
            items.push({
              type: 'Class',
              parent: c.name,
              name: c.name,
              fullName: c.name,
              scope: c.scope,
              access: c.access,
              route: null,
            });
          }

          if (c.props && toggles.props) {
            for (const p of c.props) {
              if (!this.showPrivate && p.access === 'private') continue;
              items.push({
                type: 'Property',
                parent: c.name,
                name: p.name,
                fullName: fullName(p, c.name),
                scope: p.scope,
                access: p.access,
                route: null,
              });
            }
          }

          if (c.methods && toggles.methods) {
            for (const m of c.methods) {
              if (!this.showPrivate && m.access === 'private') continue;
              items.push({
                type: 'Method',
                parent: c.name,
                name: m.name,
                fullName: fullName(m, c.name),
                scope: m.scope,
                access: m.access,
                route: null,
              });
            }
          }

          if (c.events && toggles.events) {
            for (const e of c.events) {
              if (!this.showPrivate && e.access === 'private') continue;
              items.push({
                type: 'Event',
                parent: c.name,
                name: e.name,
                fullName: `${c.name}#${e.name}`,
                scope: e.scope,
                access: e.access,
                key: null,
                route: null,
              });
            }
          }
        }

        if (toggles.typedefs) {
          for (const t of this.docs.typedefs) {
            if (!this.showPrivate && t.access === 'private') continue;
            items.push({
              type: 'Typedef',
              parent: t.name,
              name: t.name,
              fullName: t.name,
              scope: t.scope,
              access: t.access,
              route: null,
            });
          }
        }

        return new Fuse(items, {
          keys: [
            { name: 'name', weight: 0.5 },
            { name: 'parent', weight: 0.2 },
            { name: 'fullName', weight: 0.3 },
          ],
          shouldSort: true,
          includeScore: true,
          includeMatches: true,
          threshold: 0.4,
          minMatchCharLength: 3,
        });
      },
    },

    watch: {
      $route(to) {
        this.search = to.query.q;
      },

      search(q) {
        if (this.$route.query.q === q) return;
        if (this.$route.query.q) this.$router.replace({ name: 'docs-search', query: { q } });
        else this.$router.push({ name: 'docs-search', query: { q } });
      },

      toggles: {
        deep: true,
        handler() {
          this.fuse = this.buildFuse(this.toggles);
        },
      },

      showPrivate() {
        this.fuse = this.buildFuse(this.toggles);
      },
    },
  };

  function fullName(child, parentName) {
    return `${parentName + (child.scope === 'static' ? '.' : '#')}${child.name}`;
  }
</script>

<style lang="scss">
  @import '../../styles/theming';
  @import '../../styles/mq';

  #docs-search {
    padding: 16px 32px;

    input[type="search"] {
      margin: 4px 2px;
      width: 16rem;
      max-width: 100%;

      @include mq($from: tablet) {
        display: none;
      }
    }

    #show-scores {
      display: block;
      float: right;
      cursor: pointer;
      color: $color-primary;
      transition: color 0.3s;

      &.disabled {
        color: $color-content-text;

        &:hover {
          color: lighten($color-content-text, 50%);
        }
      }

      &:hover {
        color: lighten($color-primary, 20%);
      }
    }

    #toggles {
      display: flex;
      flex-direction: row;
      align-items: stretch;
      margin-top: 4px;

      label {
        flex: 1;
        margin: 4px;
      }

      input {
        position: relative;
        top: 2px;
        margin-right: 2px;
      }

      @include mq($until: desktop) {
        flex-direction: column;
      }
    }

    ul {
      padding-left: 24px;
      list-style: none;
    }

    li {
      margin-bottom: 4px;
    }

    .badge {
      display: inline-block;
      width: 0.8rem;
      margin-left: 0;
      margin-right: 8px;
      padding: 3px 4px;
      text-align: center;
      font-size: 0.9rem;
      opacity: 1;
      transition: background-color 0.3s;
    }

    .score {
      display: inline-block;
      position: relative;
      right: 1.7rem;
      width: 0;
      margin: 0;
      font-size: 0.7rem;
      overflow: visible;
      color: lighten($color-content-text, 40%);
    }

    a {
      display: inline-block;
      height: 100%;

      &:hover .badge {
        background: lighten($color-primary, 20%);
      }
    }
  }

  #app.dark #docs-search {
    #show-scores {
      &.disabled {
        color: darken($color-content-text-dark, 5%);

        &:hover {
          color: lighten($color-content-text-dark, 20%);
        }
      }

      &:hover {
        color: lighten($color-primary, 20%);
      }
    }

    .score {
      color: darken($color-content-text-dark, 40%);
    }
  }
</style>
