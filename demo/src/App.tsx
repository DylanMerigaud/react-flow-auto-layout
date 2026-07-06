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
            children and keeps linear chains straight. Watch it recenter live as
            the highlighted card grows and shrinks.
          </p>
        </div>
        <nav className="links">
          <a href="https://www.npmjs.com/package/react-flow-auto-layout">npm</a>
          <a href="https://github.com/DylanMerigaud/react-flow-auto-layout">
            GitHub
          </a>
        </nav>
      </header>

      <section className="stage">
        <LiveGraph />
      </section>

      <footer className="foot">
        <code>npm i react-flow-auto-layout</code>
        <span>
          Variable-size nodes, true bounding-box centering, straightened linear
          edges. MIT, by Dylan Merigaud.
        </span>
      </footer>
    </div>
  );
}
