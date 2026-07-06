import { InstallBar } from "./InstallBar";
import { LiveGraph } from "./LiveGraph";

export function App() {
  return (
    <div className="page">
      <header className="head">
        <div>
          <h1>react-flow-auto-layout</h1>
          <p>
            Auto layout for React Flow, built on dagre. Nodes are variable size,
            so the layout centers each parent on the true bounding box of its
            children and keeps linear chains straight. Change the direction, edge
            type, spacing, or branch count and watch it recenter live.
          </p>
        </div>
        <nav className="links">
          <a href="https://www.npmjs.com/package/react-flow-auto-layout">npm</a>
          <a href="https://github.com/DylanMerigaud/react-flow-auto-layout">
            GitHub
          </a>
        </nav>
      </header>

      <LiveGraph />

      <InstallBar />

      <footer className="foot">
        <span>
          Variable-size nodes, true bounding-box centering, straightened linear
          edges. No CSS to import. MIT, by Dylan Merigaud.
        </span>
      </footer>
    </div>
  );
}
