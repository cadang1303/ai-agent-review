<template>
  <div>
    <h1>Buggy Vue Component</h1>

    <p>Count: {{ count }}</p>
    <button @click="increment">Increment</button>

    <button @click="fetchData">Fetch Data</button>
    <pre>{{ data }}</pre>

    <!-- Bug 1: Missing key in v-for -->
    <ul>
      <li v-for="item in items">{{ item }}</li>
    </ul>

    <!-- Bug 2: Wrong conditional rendering -->
    <p v-if="isLoggedIn">Welcome</p>
    <p v-if="!isLoggedIn">Welcome</p>

    <!-- Bug 3: Undefined variable -->
    <p>User: {{ user.name }}</p>
  </div>
</template>

<script>
export default {
  name: "BuggyComponent",

  data() {
    return {
      count: 0,
      data: null,
      items: ["A", "B", "C"],
      isLoggedIn: false,
    };
  },

  // Bug 4: Using arrow function in methods (wrong this binding)
  methods: {
    increment: () => {
      this.count++;
    },

    // Bug 5: Async issue (missing await)
    async fetchData() {
      const res = fetch("https://api.example.com/data");
      const json = res.json();
      this.data = json;
    },
  },

  // Bug 6: Lifecycle misuse
  created() {
    this.fetchData;
  },
};
</script>

<style>
/* Bug 7: Invalid CSS */
h1 {
  color: red;
}
</style>
