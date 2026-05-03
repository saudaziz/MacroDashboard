# Project Interface Surface Area

Generated at: 2026-05-03T11:56:58.387Z

## Python Exports

```
./backend/agent.py:def _load_daily_cache(provider_name: str) -> dict | None:
./backend/agent.py:def _save_cache(provider_name: str, dashboard_data: Any, raw_response: str) -> None:
./backend/agent.py:def _load_fallback_dashboard() -> dict | None:
./backend/agent.py:def _is_cloud(provider_name: str) -> bool:
./backend/agent.py:def _get_throttle_time(provider_name: str) -> float:
./backend/agent.py:def _extract_balanced_json_block(text: str) -> str | None:
./backend/agent.py:def _try_parse_json_payload(content: str) -> tuple[Any | None, str]:
./backend/agent.py:async def _call_sub_agent(state: AgentState, section: str, instruction: str, yield_callback=None) -> Dict[str, Any]:
./backend/agent.py:async def resume_workflow(decision: str):
./backend/agent.py:async def researcher_node(state: AgentState, yield_callback=None) -> Dict[str, Any]:
./backend/agent.py:    async def run_query(query: str) -> str:
./backend/agent.py:async def calendar_agent(state: AgentState, yield_callback=None) -> Dict[str, Any]:
./backend/agent.py:async def risk_agent(state: AgentState, yield_callback=None) -> Dict[str, Any]:
./backend/agent.py:async def credit_agent(state: AgentState, yield_callback=None) -> Dict[str, Any]:
./backend/agent.py:async def strategy_agent(state: AgentState, yield_callback=None) -> Dict[str, Any]:
./backend/agent.py:async def macro_indicators_agent(state: AgentState, yield_callback=None) -> Dict[str, Any]:
./backend/agent.py:async def _run_parallel_sections(state: AgentState, yield_callback=None) -> tuple[Dict[str, Any], Dict[str, bool], list[str], set[str], list[str]]:
./backend/agent.py:    async def wrapped_agent(name, fn):
./backend/agent.py:def aggregator_node(state: AgentState, reasoning_list: Optional[list[str]] = None) -> Dict[str, Any]:
./backend/agent.py:def _build_initial_state(provider_name: str) -> AgentState:
./backend/agent.py:def _normalize_macro_indicators_payload(raw_indicators: Any) -> Dict[str, Any]:
./backend/agent.py:def _normalize_calendar_payload(raw_calendar: Any) -> Dict[str, Any]:
./backend/agent.py:def _to_float(value: Any, default: float) -> float:
./backend/agent.py:def _normalize_risk_payload(raw_risk: Any) -> Dict[str, Any]:
./backend/agent.py:def _normalize_credit_payload(raw_credit: Any) -> Dict[str, Any]:
./backend/agent.py:def _normalize_strategy_payload(raw_strategy: Any) -> Dict[str, Any]:
./backend/agent.py:async def stream_macro_dashboard(provider_name: str, skip_cache: bool = False) -> AsyncGenerator[str, None]:
./backend/agent.py:    async def put_event(event):
./backend/agent.py:    async def run_orchestration():
./backend/agent.py:async def generate_macro_dashboard_async(provider_name: str, skip_cache: bool = False) -> MacroDashboardResponse:
./backend/agent.py:def generate_macro_dashboard(provider_name: str, skip_cache: bool = False) -> MacroDashboardResponse:
./backend/agent.py:def _load_latest_dashboard() -> dict | None:
./backend/main.py:def load_env_robust():
./backend/main.py:async def resume_dashboard_workflow(request: ResumeRequest):
./backend/main.py:def get_status():
./backend/main.py:def get_providers():
./backend/main.py:async def cancel_dashboard():
./backend/main.py:async def create_dashboard(request: Request, dashboard_request: DashboardRequest):
./backend/main.py:def latest_dashboard():
./backend/main.py:async def stream_dashboard(dashboard_request: DashboardRequest, request: Request):
./backend/main.py:    async def event_generator():
./backend/models.py:    def _coerce_score(cls, value):
./backend/models.py:    def _coerce_technical_to_string(cls, value):
./backend/models.py:    def _coerce_price(cls, value):
./backend/models.py:    def _coerce_optional_strings(cls, value):
./backend/models.py:    def _coerce_summary(cls, value):
./backend/models.py:    def _coerce_optional_meta_strings(cls, value):
./backend/models.py:    def _coerce_average_icr(cls, value):
./backend/models.py:    def _coerce_insider_selling(cls, value):
./backend/providers.py:def _get_env_var(names: list[str]) -> Tuple[Optional[str], Optional[str]]:
./backend/providers.py:def _require_dependency(dependency: object, package_name: str) -> None:
./backend/providers.py:    def get_model(self) -> BaseChatModel:
./backend/providers.py:    def get_model(self) -> BaseChatModel:
./backend/providers.py:    def get_model(self) -> BaseChatModel:
./backend/providers.py:    def get_model(self) -> BaseChatModel:
./backend/providers.py:    def get_model(self) -> BaseChatModel:
./backend/providers.py:    def get_model(self) -> BaseChatModel:
./backend/providers.py:    def get_model(self) -> BaseChatModel:
./backend/providers.py:    def get_model(self) -> BaseChatModel:
./backend/providers.py:            def _generate(self, messages, stop=None, run_manager=None, **kwargs):
./backend/providers.py:            def _llm_type(self): return "mock"
./backend/providers.py:def list_supported_providers(include_mock: bool = False) -> list[str]:
./backend/providers.py:def get_default_provider_name() -> str:
./backend/providers.py:def normalize_provider_name(provider_name: Optional[str]) -> str:
./backend/providers.py:def get_provider(provider_name: Optional[str]) -> LLMProvider:
./backend/test_gemini_request.py:def test_generate_dashboard_endpoint_placeholder():
./backend/test_imports.py:def test_backend_modules_import():
./backend/test_latest_dashboard.py:def test_load_latest_dashboard_round_trip(tmp_path, monkeypatch):
./backend/test_latest_dashboard.py:def test_latest_dashboard_endpoint(monkeypatch):
./backend/test_stream_request.py:def test_stream_dashboard_endpoint_placeholder():
./backend/logging_config.py:def configure_logging() -> None:
./backend/test_backend_improvements.py:def _valid_calendar() -> dict:
./backend/test_backend_improvements.py:def _valid_risk() -> dict:
./backend/test_backend_improvements.py:def _valid_credit() -> dict:
./backend/test_backend_improvements.py:def _valid_strategy() -> dict:
./backend/test_backend_improvements.py:def _valid_macro_indicators() -> dict:
./backend/test_backend_improvements.py:def test_provider_defaults_to_qwen_when_missing_name():
./backend/test_backend_improvements.py:def test_provider_validation_rejects_unknown_provider():
./backend/test_backend_improvements.py:def test_aggregator_preserves_crypto_contagion():
./backend/test_backend_improvements.py:def test_dashboard_validation_coerces_numeric_crypto_asset_fields():
./backend/test_backend_improvements.py:def test_parallel_orchestration_runs_concurrently(monkeypatch):
./backend/test_backend_improvements.py:    async def slow_calendar(state, yield_callback=None):
./backend/test_backend_improvements.py:    async def slow_risk(state, yield_callback=None):
./backend/test_backend_improvements.py:    async def slow_credit(state, yield_callback=None):
./backend/test_backend_improvements.py:    async def slow_strategy(state, yield_callback=None):
./backend/test_backend_improvements.py:    async def slow_macro(state, yield_callback=None):
./backend/test_backend_improvements.py:def test_stream_partial_failure_does_not_trigger_full_fallback(monkeypatch):
./backend/test_backend_improvements.py:    async def fake_researcher(state, yield_callback=None):
./backend/test_backend_improvements.py:    async def fake_run_parallel(state, yield_callback=None):
./backend/test_backend_improvements.py:def test_aggregator_recovers_from_malformed_nested_payloads():
./backend/test_backend_improvements.py:def test_aggregator_normalizes_calendar_alternate_shapes():
./backend/test_backend_improvements.py:def test_aggregator_normalizes_sparse_risk_and_credit_shapes():
./backend/test_backend_improvements.py:def test_json_payload_parser_handles_fenced_and_trailing_text():
./backend/test_backend_improvements.py:async def _collect_stream(stream):
./backend/test_bytedance_diagnostic.py:async def test_bytedance():
./backend/test_provider_diagnostic.py:def test_provider_diagnostics_placeholder():
./backend/test_skip_cache.py:def test_stream_skip_cache_bypasses_cache(monkeypatch):
./backend/test_skip_cache.py:    async def fake_researcher(state):
./backend/test_skip_cache.py:    async def fake_run_parallel(state):
./backend/test_skip_cache.py:async def _collect_stream(stream):
./backend/autogen_config.py:def get_autogen_config(provider_name: str) -> List[Dict[str, Any]]:
./backend/autogen_researcher.py:async def run_autogen_research(provider_name: str, yield_callback=None) -> str:
./backend/autogen_researcher.py:    async def search_func(query: str) -> str:
./backend/fred_tool.py:    def __init__(self):
./backend/fred_tool.py:    def get_series_latest(self, series_id: str) -> Optional[float]:
./backend/fred_tool.py:    def _get_mock_value(self, series_id: str) -> float:
./backend/fred_tool.py:    def get_macro_summary(self) -> str:
./backend/fred_tool.py:def fetch_fred_stats() -> str:

```

