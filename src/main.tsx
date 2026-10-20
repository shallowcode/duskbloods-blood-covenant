import { Component, StrictMode, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './ui/App.tsx';
import './styles/base.css';
import './styles/selection.css';
import './styles/match.css';
import './styles/cards.css';
import './styles/dialogs.css';

class Boundary extends Component<{ children: ReactNode }, { error: boolean }> {
  state = { error: false };

  static getDerivedStateFromError() {
    return { error: true };
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="crash">
        <h1>夜之馆暂时失去了回应</h1>
        <p>自动存档仍保留在浏览器中，重新载入即可继续。</p>
        <button
          type="button"
          className="primary"
          onClick={() => location.reload()}
        >
          重新载入
        </button>
      </main>
    );
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Boundary>
      <App />
    </Boundary>
  </StrictMode>,
);
