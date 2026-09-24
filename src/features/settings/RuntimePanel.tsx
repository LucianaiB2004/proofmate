export function RuntimePanel() {
  return (
    <section className="runtime-panel" aria-labelledby="runtime-title">
      <div className="panel-heading"><div><p className="section-kicker">RUNTIME MATRIX</p><h2 id="runtime-title">端云运行状态</h2></div><span>透明可查</span></div>
      <div className="runtime-grid">
        <article className="is-on"><span>当前</span><strong>演示模式</strong><p>内置项目回放，尚未连接实时模型；完整交互不受影响。</p></article>
        <article><span>端侧</span><strong>Qwen3-4B INT4</strong><p>OpenVINO · CPU · 模型下载后启用</p></article>
        <article><span>云端</span><strong>Qwen</strong><p>百炼 API · 配置 DASHSCOPE_API_KEY 后启用</p></article>
      </div>
    </section>
  );
}
