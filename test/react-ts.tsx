import React, { useState, useEffect } from 'react';

// Sample React component with intentional bugs
export default function BuggyComponent() {
  const [count, setCount] = useState(0);
  const [data, setData] = useState(null);

  // Bug 1: Infinite re-render due to missing dependency array
  useEffect(() => {
    console.log('Component rendered');
  });

  // Bug 2: State mutation directly
  const increment = () => {
    count = count + 1;
    setCount(count);
  };

  // Bug 3: Async issue (missing await)
  const fetchData = async () => {
    const res = fetch('https://api.example.com/data');
    const json = res.json();
    setData(json);
  };

  // Bug 4: Wrong key usage in list
  const items = ['A', 'B', 'C'];

  // Bug 5: Conditional rendering error
  const isLoggedIn = false;

  return (
    <div>
      <h1>Buggy React Component</h1>

      <p>Count: {count}</p>
      <button onClick={increment}>Increment</button>

      <button onClick={fetchData}>Fetch Data</button>
      <pre>{JSON.stringify(data)}</pre>

      {/* Bug 4 */}
      <ul>
        {items.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>

      {/* Bug 5 */}
      {isLoggedIn && <p>Welcome back!</p>}
      {!isLoggedIn && <p>Welcome back!</p>}

      {/* Bug 6: Undefined variable */}
      <p>User: {user.name}</p>
    </div>
  );
}