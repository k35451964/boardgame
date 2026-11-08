import { Component, type ReactNode } from 'react';

/** 화면 어딘가에서 오류가 나도 앱 전체가 하얗게 꺼지지 않게 */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('화면 오류', error);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="center-screen">
        <div className="panel">
          <h1>화면에 문제가 생겼어요</h1>
          <p>새로고침하면 같은 자리로 돌아와요.</p>
          <button className="btn btn-primary" onClick={() => location.reload()}>
            새로고침
          </button>
        </div>
      </div>
    );
  }
}
