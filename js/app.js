let allModels = [];
let allWorkflows = [];
const BASE_SYSTEM_RAM_MB = 3400; // HyperOS baseline allocation
const SAFE_LIMIT_RAM_MB = 7400;  // Threshold before Android LMK termination

document.addEventListener('DOMContentLoaded', async () => {
  await loadData();
  setupFilters();
  setupSearch();
  setupModal();
  initSimulator();
});

async function loadData() {
  try {
    const [modelsRes, workflowsRes] = await Promise.all([
      fetch('data/models.json'),
      fetch('data/workflows.json')
    ]);
    allModels = await modelsRes.json();
    allWorkflows = await workflowsRes.json();

    document.getElementById('stat-model-count').textContent = allModels.length;

    renderModelCards(allModels);
    renderMatrixTable(allModels);
    renderWorkflows(allWorkflows);
  } catch (error) {
    console.error('Failed to load JSON datasets:', error);
  }
}

function renderModelCards(models) {
  const container = document.getElementById('models-container');
  container.innerHTML = '';

  models.forEach(model => {
    const card = document.createElement('article');
    card.className = 'model-card';
    card.onclick = () => openModelModal(model);

    card.innerHTML = `
      <div>
        <div class="model-head">
          <div>
            <div class="model-name">${model.name}</div>
            <div class="model-role">${model.role}</div>
          </div>
          <span class="tag tag-engine">${model.category.toUpperCase()}</span>
        </div>
        
        <div class="spec-matrix">
          <div><span>Params:</span> <strong>${model.parameters}</strong></div>
          <div><span>Format:</span> <strong>${model.format_quant}</strong></div>
          <div><span>Disk Size:</span> <strong>${model.disk_size}</strong></div>
          <div><span>Peak RAM:</span> <strong>${model.active_ram.total_peak}</strong></div>
        </div>
        
        <p class="model-desc">${model.description}</p>
      </div>

      <div class="model-footer">
        <span class="tag tag-engine">${model.runtime_engine}</span>
        <span class="tag tag-speed">${model.benchmarks.throughput || model.benchmarks.latency}</span>
      </div>
    `;
    container.appendChild(card);
  });
}

function renderMatrixTable(models) {
  const tbody = document.getElementById('matrix-tbody');
  tbody.innerHTML = '';

  models.forEach(m => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${m.name}</strong></td>
      <td>${m.role}</td>
      <td><code>${m.parameters}</code></td>
      <td><code>${m.format_quant}</code></td>
      <td>${m.disk_size}</td>
      <td><span class="tag tag-ram">${m.active_ram.total_peak}</span></td>
      <td><span class="tag tag-engine">${m.runtime_engine}</span></td>
      <td>${m.hardware_target}</td>
    `;
    tbody.appendChild(tr);
  });
}

function renderWorkflows(workflows) {
  const container = document.getElementById('workflows-container');
  container.innerHTML = '';

  workflows.forEach(wf => {
    const card = document.createElement('div');
    card.className = 'wf-card';

    const stepsHtml = wf.stages.map(s => `
      <div class="wf-step-row">
        <div>
          <span class="wf-step-name">${s.step}:</span>
          <span class="wf-step-sub">${s.model}</span>
        </div>
        <span class="tag tag-ram">${s.ram}</span>
      </div>
    `).join('');

    card.innerHTML = `
      <h3>${wf.title}</h3>
      <div class="wf-intent">"${wf.intent}"</div>
      <div class="wf-steps">${stepsHtml}</div>
      <div class="wf-meta">
        <span>Peak Orchestration RAM: <strong>${wf.peak_ram}</strong></span>
        <span>Latency: <strong>${wf.end_to_end_latency}</strong></span>
      </div>
    `;
    container.appendChild(card);
  });
}

function setupFilters() {
  const filterBtns = document.querySelectorAll('.filter-btn');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const filter = btn.dataset.filter;
      if (filter === 'all') {
        renderModelCards(allModels);
      } else {
        const filtered = allModels.filter(m => m.category === filter);
        renderModelCards(filtered);
      }
    });
  });
}

function setupSearch() {
  const searchInput = document.getElementById('model-search');
  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    const filtered = allModels.filter(m => 
      m.name.toLowerCase().includes(query) ||
      m.role.toLowerCase().includes(query) ||
      m.runtime_engine.toLowerCase().includes(query) ||
      m.description.toLowerCase().includes(query)
    );
    renderModelCards(filtered);
  });
}

function openModelModal(model) {
  const modal = document.getElementById('model-modal');
  document.getElementById('modal-title').textContent = model.name;
  document.getElementById('modal-category').textContent = `${model.category.toUpperCase()} • ${model.runtime_engine}`;

  const content = document.getElementById('modal-content');
  content.innerHTML = `
    <p>${model.description}</p>
    
    <div class="modal-section">
      <h4>Detailed RAM Footprint Breakdown</h4>
      <div class="spec-matrix">
        <div><span>Model Weights:</span> <strong>${model.active_ram.weights}</strong></div>
        <div><span>Runtime Buffers:</span> <strong>${model.active_ram.buffers}</strong></div>
        <div><span>KV Cache / Context:</span> <strong>${model.active_ram.context_cache}</strong></div>
        <div><span>Peak Total RAM:</span> <strong style="color:var(--accent-warn)">${model.active_ram.total_peak}</strong></div>
      </div>
    </div>

    <div class="modal-section">
      <h4>Hardware Execution &amp; Benchmarks (Dimensity 8400-Ultra)</h4>
      <p><strong>Target Cores:</strong> ${model.hardware_target}</p>
      <p><strong>Throughput:</strong> ${model.benchmarks.throughput || 'N/A'}</p>
      <p><strong>Latency:</strong> ${model.benchmarks.latency}</p>
      <p><strong>Power Profile:</strong> ${model.benchmarks.power_impact}</p>
    </div>

    <div class="modal-section">
      <h4>Memory Lifecycle Rule</h4>
      <p><code>${model.lifecycle}</code></p>
    </div>
  `;

  modal.classList.add('open');
}

function setupModal() {
  const modal = document.getElementById('model-modal');
  const closeBtn = document.getElementById('modal-close-btn');

  closeBtn.onclick = () => modal.classList.remove('open');
  modal.onclick = (e) => {
    if (e.target === modal) modal.classList.remove('open');
  };
}

function initSimulator() {
  const container = document.getElementById('sim-checkbox-list');
  container.innerHTML = '';

  allModels.forEach(m => {
    // Parse numeric megabytes from active_ram.total_peak
    const match = m.active_ram.total_peak.match(/([\d,\.]+)\s*(MB|GB)/i);
    let ramMb = 0;
    if (match) {
      const val = parseFloat(match[1].replace(',', ''));
      ramMb = match[2].toUpperCase() === 'GB' ? val * 1024 : val;
    }

    const item = document.createElement('div');
    item.className = 'sim-item';
    item.innerHTML = `
      <label>
        <input type="checkbox" data-ram="${Math.round(ramMb)}" ${m.id === 'silero-vad' ? 'checked' : ''}>
        <span>${m.name}</span>
      </label>
      <span class="tag tag-ram">+${Math.round(ramMb)} MB</span>
    `;
    container.appendChild(item);
  });

  container.querySelectorAll('input').forEach(input => {
    input.addEventListener('change', recalculateRam);
  });

  recalculateRam();
}

function recalculateRam() {
  const checkboxes = document.querySelectorAll('#sim-checkbox-list input:checked');
  let selectedMb = 0;

  checkboxes.forEach(cb => {
    selectedMb += parseFloat(cb.dataset.ram || 0);
  });

  const totalUsedMb = BASE_SYSTEM_RAM_MB + selectedMb;
  const percentage = Math.min((totalUsedMb / 8000) * 100, 100);

  const gaugeBar = document.getElementById('gauge-bar');
  const gaugeUsedVal = document.getElementById('gauge-used-val');
  const gaugeStatus = document.getElementById('gauge-status');
  const alertBox = document.getElementById('gauge-alert-box');

  gaugeBar.style.width = `${percentage}%`;
  gaugeUsedVal.textContent = `${Math.round(totalUsedMb)} MB`;

  if (totalUsedMb > SAFE_LIMIT_RAM_MB) {
    gaugeBar.style.backgroundColor = 'var(--accent-danger)';
    gaugeStatus.textContent = 'HIGH RISK: Low Memory Killer (LMK) will trigger';
    gaugeStatus.className = 'status-danger';
    alertBox.style.background = 'rgba(255, 107, 107, 0.1)';
    alertBox.style.borderColor = 'rgba(255, 107, 107, 0.3)';
    alertBox.textContent = `Warning: Requested memory (${Math.round(totalUsedMb)} MB) exceeds safe headroom on an 8 GB device. Android will terminate the process. Use sequential orchestration instead.`;
  } else {
    gaugeBar.style.backgroundColor = 'var(--accent)';
    gaugeStatus.textContent = 'SAFE: Headroom Available';
    gaugeStatus.className = 'status-safe';
    alertBox.style.background = 'rgba(120, 224, 194, 0.08)';
    alertBox.style.borderColor = 'rgba(120, 224, 194, 0.2)';
    alertBox.textContent = `System memory is stable (${Math.round(8000 - totalUsedMb)} MB free). Models can execute without process eviction.`;
  }
}