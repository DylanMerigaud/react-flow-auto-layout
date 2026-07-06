import { AfterPanel, BeforePanel } from "./panels";

export function App() {
  return (
    <div className="page">
      <header className="head">
        <div>
          <h1>react-flow-auto-layout</h1>
          <p>
            Auto layout for React Flow, built on dagre. The same graph, same
            variable-height cards. Left: a naive fixed-size dagre pass. Right:
            this library.
          </p>
        </div>
        <nav className="links">
          <a href="https://www.npmjs.com/package/react-flow-auto-layout">npm</a>
          <a href="https://github.com/DylanMerigaud/react-flow-auto-layout">
            GitHub
          </a>
        </nav>
      </header>

      <div className="grid">
        <section className="panel">
          <div className="label label-before">
            Plain dagre (fixed height) — off-center, kinked
          </div>
          <div className="canvas">
            <BeforePanel />
          </div>
        </section>
        <section className="panel">
          <div className="label label-after">
            react-flow-auto-layout — centered, straight
          </div>
          <div className="canvas">
            <AfterPanel />
          </div>
        </section>
      </div>

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
