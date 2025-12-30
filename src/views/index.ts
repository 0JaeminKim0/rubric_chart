export function getIndexHtml(): string {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Task Scoring System - Ease vs Impact</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.jsdelivr.net/npm/echarts@5.4.3/dist/echarts.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"></script>
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    <style>
        .quadrant-label {
            position: absolute;
            font-size: 11px;
            font-weight: 600;
            color: rgba(100, 100, 100, 0.7);
            pointer-events: none;
        }
        .score-badge {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 28px;
            height: 28px;
            border-radius: 50%;
            font-weight: 600;
            font-size: 14px;
        }
        .slider-container {
            position: relative;
        }
        .slider-labels {
            display: flex;
            justify-content: space-between;
            padding: 0 8px;
            margin-top: 4px;
        }
        .slider-labels span {
            font-size: 11px;
            color: #6b7280;
        }
        input[type="range"] {
            -webkit-appearance: none;
            width: 100%;
            height: 8px;
            border-radius: 4px;
            background: linear-gradient(to right, #ef4444, #f59e0b, #22c55e);
            outline: none;
        }
        input[type="range"]::-webkit-slider-thumb {
            -webkit-appearance: none;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background: white;
            border: 2px solid #3b82f6;
            cursor: pointer;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        .fade-in {
            animation: fadeIn 0.3s ease-in;
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .step-indicator {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            font-weight: 600;
        }
        .step-active {
            background: #3b82f6;
            color: white;
        }
        .step-completed {
            background: #22c55e;
            color: white;
        }
        .step-pending {
            background: #e5e7eb;
            color: #9ca3af;
        }
    </style>
</head>
<body class="bg-gray-50 min-h-screen">
    <div class="max-w-7xl mx-auto px-4 py-6">
        <!-- Header -->
        <header class="mb-8">
            <div class="flex items-center gap-3 mb-2">
                <div class="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                    <i class="fas fa-chart-scatter text-white text-lg"></i>
                </div>
                <h1 class="text-2xl font-bold text-gray-800">Task Scoring System</h1>
            </div>
            <p class="text-gray-600">Ease vs Impact 4-Quadrant Analysis with LLM-based Scoring</p>
        </header>

        <!-- Progress Steps -->
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
            <div class="flex items-center justify-between max-w-2xl mx-auto">
                <div class="flex items-center gap-2">
                    <div id="step1-indicator" class="step-indicator step-active">1</div>
                    <span class="text-sm font-medium text-gray-700">Upload</span>
                </div>
                <div class="flex-1 h-1 bg-gray-200 mx-4 rounded" id="progress-1-2"></div>
                <div class="flex items-center gap-2">
                    <div id="step2-indicator" class="step-indicator step-pending">2</div>
                    <span class="text-sm font-medium text-gray-500">Rubric</span>
                </div>
                <div class="flex-1 h-1 bg-gray-200 mx-4 rounded" id="progress-2-3"></div>
                <div class="flex items-center gap-2">
                    <div id="step3-indicator" class="step-indicator step-pending">3</div>
                    <span class="text-sm font-medium text-gray-500">Score</span>
                </div>
                <div class="flex-1 h-1 bg-gray-200 mx-4 rounded" id="progress-3-4"></div>
                <div class="flex items-center gap-2">
                    <div id="step4-indicator" class="step-indicator step-pending">4</div>
                    <span class="text-sm font-medium text-gray-500">Analyze</span>
                </div>
            </div>
        </div>

        <!-- Main Content Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- Left Panel: Controls -->
            <div class="lg:col-span-1 space-y-6">
                <!-- Step 1: File Upload -->
                <div id="upload-section" class="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                    <h2 class="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <i class="fas fa-file-excel text-green-600"></i>
                        Step 1: Upload Tasks
                    </h2>
                    <div id="upload-area" class="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors cursor-pointer">
                        <i class="fas fa-cloud-upload-alt text-4xl text-gray-400 mb-3"></i>
                        <p class="text-gray-600 mb-2">Drag & drop Excel file here</p>
                        <p class="text-sm text-gray-500">or click to browse</p>
                        <input type="file" id="file-input" accept=".xlsx,.xls" class="hidden">
                    </div>
                    <div class="mt-4 flex gap-2">
                        <button id="download-template" class="flex-1 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                            <i class="fas fa-download mr-1"></i> Download Template
                        </button>
                    </div>
                    <div id="file-info" class="hidden mt-4 p-3 bg-green-50 rounded-lg">
                        <div class="flex items-center gap-2 text-green-700">
                            <i class="fas fa-check-circle"></i>
                            <span id="file-name" class="font-medium"></span>
                        </div>
                        <p id="task-count" class="text-sm text-green-600 mt-1"></p>
                    </div>
                </div>

                <!-- Step 2: Rubric Definition -->
                <div id="rubric-section" class="bg-white rounded-xl shadow-sm border border-gray-200 p-5 opacity-50 pointer-events-none">
                    <h2 class="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <i class="fas fa-ruler text-purple-600"></i>
                        Step 2: Define Rubric
                    </h2>
                    
                    <!-- Ease of Implementation (X) -->
                    <div class="mb-6">
                        <h3 class="font-medium text-gray-700 mb-3 flex items-center gap-2">
                            <span class="w-6 h-6 bg-blue-100 text-blue-700 rounded flex items-center justify-center text-sm font-bold">X</span>
                            Ease of Implementation
                        </h3>
                        <div class="space-y-2">
                            <div class="flex items-center gap-2">
                                <span class="score-badge bg-red-100 text-red-700">1</span>
                                <input type="text" id="ease-1" class="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Very difficult (e.g., 12+ months, new tech required)">
                            </div>
                            <div class="flex items-center gap-2">
                                <span class="score-badge bg-orange-100 text-orange-700">2</span>
                                <input type="text" id="ease-2" class="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Difficult (e.g., 6-12 months, significant effort)">
                            </div>
                            <div class="flex items-center gap-2">
                                <span class="score-badge bg-yellow-100 text-yellow-700">3</span>
                                <input type="text" id="ease-3" class="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Moderate (e.g., 3-6 months, standard effort)">
                            </div>
                            <div class="flex items-center gap-2">
                                <span class="score-badge bg-lime-100 text-lime-700">4</span>
                                <input type="text" id="ease-4" class="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Easy (e.g., 1-3 months, existing tools)">
                            </div>
                            <div class="flex items-center gap-2">
                                <span class="score-badge bg-green-100 text-green-700">5</span>
                                <input type="text" id="ease-5" class="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Very easy (e.g., < 1 month, quick win)">
                            </div>
                        </div>
                    </div>

                    <!-- Impact of Implementation (Y) -->
                    <div class="mb-4">
                        <h3 class="font-medium text-gray-700 mb-3 flex items-center gap-2">
                            <span class="w-6 h-6 bg-purple-100 text-purple-700 rounded flex items-center justify-center text-sm font-bold">Y</span>
                            Impact of Implementation
                        </h3>
                        <div class="space-y-2">
                            <div class="flex items-center gap-2">
                                <span class="score-badge bg-red-100 text-red-700">1</span>
                                <input type="text" id="impact-1" class="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Minimal impact (e.g., < 1% improvement)">
                            </div>
                            <div class="flex items-center gap-2">
                                <span class="score-badge bg-orange-100 text-orange-700">2</span>
                                <input type="text" id="impact-2" class="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Low impact (e.g., 1-5% improvement)">
                            </div>
                            <div class="flex items-center gap-2">
                                <span class="score-badge bg-yellow-100 text-yellow-700">3</span>
                                <input type="text" id="impact-3" class="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Moderate impact (e.g., 5-15% improvement)">
                            </div>
                            <div class="flex items-center gap-2">
                                <span class="score-badge bg-lime-100 text-lime-700">4</span>
                                <input type="text" id="impact-4" class="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="High impact (e.g., 15-30% improvement)">
                            </div>
                            <div class="flex items-center gap-2">
                                <span class="score-badge bg-green-100 text-green-700">5</span>
                                <input type="text" id="impact-5" class="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Transformative (e.g., > 30% improvement)">
                            </div>
                        </div>
                    </div>

                    <button id="run-scoring" class="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed">
                        <i class="fas fa-robot mr-2"></i>
                        Run LLM Scoring
                    </button>
                </div>

                <!-- Task List Panel -->
                <div id="task-list-section" class="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hidden">
                    <h2 class="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <i class="fas fa-list-check text-blue-600"></i>
                        Tasks (<span id="scored-count">0</span>/<span id="total-count">0</span>)
                    </h2>
                    <div id="task-list" class="space-y-2 max-h-80 overflow-y-auto">
                        <!-- Task items will be rendered here -->
                    </div>
                </div>
            </div>

            <!-- Right Panel: Chart & Details -->
            <div class="lg:col-span-2 space-y-6">
                <!-- Bubble Chart -->
                <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                    <div class="flex items-center justify-between mb-4">
                        <h2 class="text-lg font-semibold text-gray-800 flex items-center gap-2">
                            <i class="fas fa-chart-scatter text-blue-600"></i>
                            4-Quadrant Analysis
                        </h2>
                        <div class="flex gap-2">
                            <button id="export-chart" class="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors hidden">
                                <i class="fas fa-image mr-1"></i> Export
                            </button>
                            <button id="export-data" class="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors hidden">
                                <i class="fas fa-file-excel mr-1"></i> Export Data
                            </button>
                        </div>
                    </div>
                    <div id="chart-placeholder" class="h-96 flex items-center justify-center text-gray-400">
                        <div class="text-center">
                            <i class="fas fa-chart-scatter text-6xl mb-4 opacity-30"></i>
                            <p>Upload tasks and run scoring to see the chart</p>
                        </div>
                    </div>
                    <div id="chart-container" class="h-96 hidden relative">
                        <div id="bubble-chart" class="w-full h-full"></div>
                        <!-- Quadrant Labels -->
                        <div class="quadrant-label" style="top: 15%; right: 15%;">Quick Wins</div>
                        <div class="quadrant-label" style="top: 15%; left: 15%;">Major Projects</div>
                        <div class="quadrant-label" style="bottom: 15%; right: 15%;">Fill-ins</div>
                        <div class="quadrant-label" style="bottom: 15%; left: 15%;">Thankless Tasks</div>
                    </div>
                </div>

                <!-- Task Detail Panel -->
                <div id="detail-panel" class="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hidden">
                    <div class="flex items-center justify-between mb-4">
                        <h2 class="text-lg font-semibold text-gray-800 flex items-center gap-2">
                            <i class="fas fa-edit text-orange-600"></i>
                            <span id="detail-task-name">Task Details</span>
                        </h2>
                        <button id="close-detail" class="text-gray-400 hover:text-gray-600">
                            <i class="fas fa-times text-xl"></i>
                        </button>
                    </div>
                    
                    <div id="detail-description" class="text-sm text-gray-600 mb-4 p-3 bg-gray-50 rounded-lg hidden"></div>

                    <div class="grid grid-cols-2 gap-6">
                        <!-- Ease Score -->
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">
                                Ease of Implementation (X)
                                <span id="detail-ease-value" class="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 rounded font-bold">3</span>
                            </label>
                            <div class="slider-container">
                                <input type="range" id="detail-ease-slider" min="1" max="5" value="3" class="w-full">
                                <div class="slider-labels">
                                    <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span>
                                </div>
                            </div>
                            <p id="detail-ease-llm" class="text-xs text-gray-500 mt-2">
                                <i class="fas fa-robot mr-1"></i>LLM suggested: <span>-</span>
                            </p>
                        </div>

                        <!-- Impact Score -->
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">
                                Impact of Implementation (Y)
                                <span id="detail-impact-value" class="ml-2 px-2 py-0.5 bg-purple-100 text-purple-700 rounded font-bold">3</span>
                            </label>
                            <div class="slider-container">
                                <input type="range" id="detail-impact-slider" min="1" max="5" value="3" class="w-full">
                                <div class="slider-labels">
                                    <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span>
                                </div>
                            </div>
                            <p id="detail-impact-llm" class="text-xs text-gray-500 mt-2">
                                <i class="fas fa-robot mr-1"></i>LLM suggested: <span>-</span>
                            </p>
                        </div>
                    </div>

                    <div class="mt-4 flex items-center justify-between">
                        <div id="override-badge" class="hidden">
                            <span class="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-medium">
                                <i class="fas fa-user-edit mr-1"></i>Human Override
                            </span>
                        </div>
                        <button id="reset-to-llm" class="text-sm text-blue-600 hover:text-blue-800 hidden">
                            <i class="fas fa-undo mr-1"></i>Reset to LLM Score
                        </button>
                    </div>
                </div>

                <!-- Summary Statistics -->
                <div id="summary-section" class="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hidden">
                    <h2 class="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <i class="fas fa-chart-pie text-green-600"></i>
                        Quadrant Summary
                    </h2>
                    <div class="grid grid-cols-4 gap-4">
                        <div class="text-center p-4 bg-green-50 rounded-lg">
                            <div class="text-2xl font-bold text-green-600" id="quick-wins-count">0</div>
                            <div class="text-sm text-green-700">Quick Wins</div>
                            <div class="text-xs text-gray-500 mt-1">High Ease + High Impact</div>
                        </div>
                        <div class="text-center p-4 bg-blue-50 rounded-lg">
                            <div class="text-2xl font-bold text-blue-600" id="major-projects-count">0</div>
                            <div class="text-sm text-blue-700">Major Projects</div>
                            <div class="text-xs text-gray-500 mt-1">Low Ease + High Impact</div>
                        </div>
                        <div class="text-center p-4 bg-yellow-50 rounded-lg">
                            <div class="text-2xl font-bold text-yellow-600" id="fill-ins-count">0</div>
                            <div class="text-sm text-yellow-700">Fill-ins</div>
                            <div class="text-xs text-gray-500 mt-1">High Ease + Low Impact</div>
                        </div>
                        <div class="text-center p-4 bg-gray-50 rounded-lg">
                            <div class="text-2xl font-bold text-gray-600" id="thankless-count">0</div>
                            <div class="text-sm text-gray-700">Thankless Tasks</div>
                            <div class="text-xs text-gray-500 mt-1">Low Ease + Low Impact</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Loading Modal -->
    <div id="loading-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 hidden">
        <div class="bg-white rounded-xl p-8 text-center max-w-sm mx-4">
            <div class="animate-spin w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full mx-auto mb-4"></div>
            <h3 class="text-lg font-semibold text-gray-800 mb-2">Scoring Tasks...</h3>
            <p id="loading-progress" class="text-sm text-gray-600">Processing task 1 of 10</p>
        </div>
    </div>

    <!-- Toast Notification -->
    <div id="toast" class="fixed bottom-4 right-4 bg-gray-800 text-white px-4 py-3 rounded-lg shadow-lg transform translate-y-20 opacity-0 transition-all duration-300 z-50">
        <span id="toast-message"></span>
    </div>

    <script>
        // Application State
        const state = {
            tasks: [],
            rubric: null,
            sessionId: null,
            selectedTaskId: null,
            chart: null
        };

        // DOM Elements
        const elements = {
            uploadArea: document.getElementById('upload-area'),
            fileInput: document.getElementById('file-input'),
            fileInfo: document.getElementById('file-info'),
            fileName: document.getElementById('file-name'),
            taskCount: document.getElementById('task-count'),
            rubricSection: document.getElementById('rubric-section'),
            runScoring: document.getElementById('run-scoring'),
            taskListSection: document.getElementById('task-list-section'),
            taskList: document.getElementById('task-list'),
            chartPlaceholder: document.getElementById('chart-placeholder'),
            chartContainer: document.getElementById('chart-container'),
            bubbleChart: document.getElementById('bubble-chart'),
            detailPanel: document.getElementById('detail-panel'),
            summarySection: document.getElementById('summary-section'),
            loadingModal: document.getElementById('loading-modal'),
            loadingProgress: document.getElementById('loading-progress'),
            toast: document.getElementById('toast'),
            toastMessage: document.getElementById('toast-message')
        };

        // Initialize
        document.addEventListener('DOMContentLoaded', () => {
            setupEventListeners();
            initChart();
        });

        function setupEventListeners() {
            // File upload
            elements.uploadArea.addEventListener('click', () => elements.fileInput.click());
            elements.uploadArea.addEventListener('dragover', handleDragOver);
            elements.uploadArea.addEventListener('dragleave', handleDragLeave);
            elements.uploadArea.addEventListener('drop', handleDrop);
            elements.fileInput.addEventListener('change', handleFileSelect);

            // Download template
            document.getElementById('download-template').addEventListener('click', downloadTemplate);

            // Run scoring
            elements.runScoring.addEventListener('click', runScoring);

            // Detail panel
            document.getElementById('close-detail').addEventListener('click', closeDetailPanel);
            document.getElementById('detail-ease-slider').addEventListener('input', handleEaseChange);
            document.getElementById('detail-impact-slider').addEventListener('input', handleImpactChange);
            document.getElementById('reset-to-llm').addEventListener('click', resetToLLMScore);

            // Export buttons
            document.getElementById('export-chart').addEventListener('click', exportChart);
            document.getElementById('export-data').addEventListener('click', exportData);
        }

        // File Handling
        function handleDragOver(e) {
            e.preventDefault();
            elements.uploadArea.classList.add('border-blue-400', 'bg-blue-50');
        }

        function handleDragLeave(e) {
            e.preventDefault();
            elements.uploadArea.classList.remove('border-blue-400', 'bg-blue-50');
        }

        function handleDrop(e) {
            e.preventDefault();
            elements.uploadArea.classList.remove('border-blue-400', 'bg-blue-50');
            const file = e.dataTransfer.files[0];
            if (file) processFile(file);
        }

        function handleFileSelect(e) {
            const file = e.target.files[0];
            if (file) processFile(file);
        }

        async function processFile(file) {
            if (!file.name.match(/\\.xlsx?$/i)) {
                showToast('Please upload an Excel file (.xlsx)', 'error');
                return;
            }

            try {
                const buffer = await file.arrayBuffer();
                const response = await fetch('/api/parse-excel', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/octet-stream' },
                    body: buffer
                });

                const result = await response.json();
                
                if (!result.success) {
                    showToast(result.error || 'Failed to parse Excel file', 'error');
                    return;
                }

                state.tasks = result.tasks.map(task => ({
                    ...task,
                    x_score_final: 3,
                    y_score_final: 3,
                    human_override: false
                }));

                // Update UI
                elements.fileInfo.classList.remove('hidden');
                elements.fileName.textContent = file.name;
                elements.taskCount.textContent = state.tasks.length + ' tasks found';
                
                // Enable rubric section
                elements.rubricSection.classList.remove('opacity-50', 'pointer-events-none');
                updateStepIndicators(2);
                
                showToast('Excel file uploaded successfully!', 'success');
            } catch (error) {
                console.error('File processing error:', error);
                showToast('Failed to process file', 'error');
            }
        }

        function downloadTemplate() {
            fetch('/api/template')
                .then(res => res.blob())
                .then(blob => {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'task_template.xlsx';
                    a.click();
                    URL.revokeObjectURL(url);
                });
        }

        // Scoring
        async function runScoring() {
            const rubric = getRubricFromInputs();
            
            if (!validateRubric(rubric)) {
                showToast('Please fill in all rubric definitions', 'error');
                return;
            }

            state.rubric = rubric;
            elements.loadingModal.classList.remove('hidden');

            try {
                for (let i = 0; i < state.tasks.length; i++) {
                    const task = state.tasks[i];
                    elements.loadingProgress.textContent = 'Processing task ' + (i + 1) + ' of ' + state.tasks.length;

                    const response = await fetch('/api/score', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            taskId: task.task_id,
                            taskName: task.task_name,
                            taskDescription: task.description,
                            rubric: rubric
                        })
                    });

                    const result = await response.json();
                    
                    if (result.X > 0 && result.Y > 0) {
                        task.x_score_llm = result.X;
                        task.y_score_llm = result.Y;
                        task.x_score_final = result.X;
                        task.y_score_final = result.Y;
                    } else {
                        // LLM failed, use default
                        task.x_score_llm = null;
                        task.y_score_llm = null;
                    }

                    // Update UI progressively
                    updateChart();
                    updateTaskList();
                }

                // Show results
                elements.taskListSection.classList.remove('hidden');
                elements.chartPlaceholder.classList.add('hidden');
                elements.chartContainer.classList.remove('hidden');
                elements.summarySection.classList.remove('hidden');
                document.getElementById('export-chart').classList.remove('hidden');
                document.getElementById('export-data').classList.remove('hidden');
                
                updateStepIndicators(4);
                updateSummary();
                showToast('Scoring completed!', 'success');
            } catch (error) {
                console.error('Scoring error:', error);
                showToast('Scoring failed: ' + error.message, 'error');
            } finally {
                elements.loadingModal.classList.add('hidden');
            }
        }

        function getRubricFromInputs() {
            return {
                X: {
                    "1": document.getElementById('ease-1').value || 'Very difficult',
                    "2": document.getElementById('ease-2').value || 'Difficult',
                    "3": document.getElementById('ease-3').value || 'Moderate',
                    "4": document.getElementById('ease-4').value || 'Easy',
                    "5": document.getElementById('ease-5').value || 'Very easy'
                },
                Y: {
                    "1": document.getElementById('impact-1').value || 'Minimal impact',
                    "2": document.getElementById('impact-2').value || 'Low impact',
                    "3": document.getElementById('impact-3').value || 'Moderate impact',
                    "4": document.getElementById('impact-4').value || 'High impact',
                    "5": document.getElementById('impact-5').value || 'Transformative impact'
                }
            };
        }

        function validateRubric(rubric) {
            for (let i = 1; i <= 5; i++) {
                if (!rubric.X[i] || !rubric.Y[i]) return false;
            }
            return true;
        }

        // Chart
        function initChart() {
            state.chart = echarts.init(elements.bubbleChart);
            window.addEventListener('resize', () => state.chart.resize());
        }

        function updateChart() {
            const data = state.tasks.map(task => ({
                name: task.task_name,
                value: [
                    task.x_score_final,
                    task.y_score_final,
                    Math.max(20, (task.x_score_final + task.y_score_final) / 2 * 10)
                ],
                taskId: task.task_id,
                humanOverride: task.human_override,
                itemStyle: {
                    color: getQuadrantColor(task.x_score_final, task.y_score_final),
                    opacity: 0.85,
                    borderColor: '#fff',
                    borderWidth: 2
                }
            }));

            const option = {
                grid: {
                    left: 80,
                    right: 60,
                    top: 60,
                    bottom: 80,
                    containLabel: false
                },
                xAxis: {
                    type: 'value',
                    name: 'Ease of Implementation →',
                    nameLocation: 'middle',
                    nameGap: 45,
                    nameTextStyle: {
                        fontSize: 14,
                        fontWeight: 'bold',
                        color: '#374151'
                    },
                    min: 0.5,
                    max: 5.5,
                    interval: 1,
                    axisLabel: {
                        formatter: '{value}',
                        fontSize: 12,
                        color: '#6b7280'
                    },
                    splitLine: {
                        show: true,
                        lineStyle: { color: '#e5e7eb', type: 'solid' }
                    },
                    axisLine: { 
                        show: true,
                        lineStyle: { color: '#9ca3af', width: 2 } 
                    },
                    axisTick: {
                        show: true,
                        lineStyle: { color: '#9ca3af' }
                    }
                },
                yAxis: {
                    type: 'value',
                    name: '↑ Impact of Implementation',
                    nameLocation: 'middle',
                    nameGap: 55,
                    nameTextStyle: {
                        fontSize: 14,
                        fontWeight: 'bold',
                        color: '#374151'
                    },
                    min: 0.5,
                    max: 5.5,
                    interval: 1,
                    axisLabel: {
                        formatter: '{value}',
                        fontSize: 12,
                        color: '#6b7280'
                    },
                    splitLine: {
                        show: true,
                        lineStyle: { color: '#e5e7eb', type: 'solid' }
                    },
                    axisLine: { 
                        show: true,
                        lineStyle: { color: '#9ca3af', width: 2 } 
                    },
                    axisTick: {
                        show: true,
                        lineStyle: { color: '#9ca3af' }
                    }
                },
                series: [{
                    type: 'scatter',
                    symbolSize: function(data) {
                        return data[2];
                    },
                    data: data,
                    emphasis: {
                        focus: 'self',
                        itemStyle: {
                            shadowBlur: 15,
                            shadowColor: 'rgba(0, 0, 0, 0.4)',
                            borderWidth: 3
                        }
                    },
                    markLine: {
                        silent: true,
                        symbol: 'none',
                        lineStyle: { 
                            color: '#9ca3af', 
                            type: 'dashed', 
                            width: 2 
                        },
                        label: { show: false },
                        data: [
                            { xAxis: 3 },
                            { yAxis: 3 }
                        ]
                    },
                    markArea: {
                        silent: true,
                        data: [
                            [{ xAxis: 3, yAxis: 3 }, { xAxis: 5.5, yAxis: 5.5 }],
                        ],
                        itemStyle: {
                            color: 'rgba(34, 197, 94, 0.05)'
                        }
                    }
                }],
                tooltip: {
                    trigger: 'item',
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    borderColor: '#e5e7eb',
                    borderWidth: 1,
                    padding: [10, 15],
                    textStyle: {
                        color: '#374151',
                        fontSize: 13
                    },
                    formatter: function(params) {
                        const task = state.tasks.find(t => t.task_id === params.data.taskId);
                        if (!task) return '';
                        let html = '<div style="font-weight:600;margin-bottom:8px;font-size:14px;">' + params.data.name + '</div>';
                        html += '<div style="display:flex;gap:15px;">';
                        html += '<span>Ease (X): <strong>' + task.x_score_final + '</strong></span>';
                        html += '<span>Impact (Y): <strong>' + task.y_score_final + '</strong></span>';
                        html += '</div>';
                        if (task.human_override) {
                            html += '<div style="color:#f97316;margin-top:6px;font-size:12px;"><i class="fas fa-user-edit"></i> Human Override</div>';
                        }
                        return html;
                    }
                }
            };

            state.chart.setOption(option, true);

            // Click handler
            state.chart.off('click');
            state.chart.on('click', function(params) {
                if (params.data && params.data.taskId) {
                    openDetailPanel(params.data.taskId);
                }
            });
        }

        function getQuadrantColor(x, y) {
            if (x >= 3 && y >= 3) return '#22c55e'; // Quick Wins - Green
            if (x < 3 && y >= 3) return '#3b82f6';  // Major Projects - Blue
            if (x >= 3 && y < 3) return '#eab308';  // Fill-ins - Yellow
            return '#6b7280';                        // Thankless - Gray
        }

        // Task List
        function updateTaskList() {
            const scored = state.tasks.filter(t => t.x_score_llm != null).length;
            document.getElementById('scored-count').textContent = scored;
            document.getElementById('total-count').textContent = state.tasks.length;

            elements.taskList.innerHTML = state.tasks.map(task => {
                const quadrant = getQuadrantName(task.x_score_final, task.y_score_final);
                const colorClass = getQuadrantColorClass(task.x_score_final, task.y_score_final);
                
                return '<div class="p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors ' + 
                    (state.selectedTaskId === task.task_id ? 'ring-2 ring-blue-500' : '') + 
                    '" data-task-id="' + task.task_id + '">' +
                    '<div class="flex items-center justify-between">' +
                    '<span class="font-medium text-gray-800 truncate flex-1">' + task.task_name + '</span>' +
                    (task.human_override ? '<i class="fas fa-user-edit text-orange-500 ml-2"></i>' : '') +
                    '</div>' +
                    '<div class="flex items-center gap-2 mt-1">' +
                    '<span class="text-xs px-2 py-0.5 rounded ' + colorClass + '">' + quadrant + '</span>' +
                    '<span class="text-xs text-gray-500">X:' + task.x_score_final + ' Y:' + task.y_score_final + '</span>' +
                    '</div>' +
                    '</div>';
            }).join('');

            // Add click handlers
            elements.taskList.querySelectorAll('[data-task-id]').forEach(el => {
                el.addEventListener('click', () => openDetailPanel(el.dataset.taskId));
            });
        }

        function getQuadrantName(x, y) {
            if (x >= 3 && y >= 3) return 'Quick Win';
            if (x < 3 && y >= 3) return 'Major Project';
            if (x >= 3 && y < 3) return 'Fill-in';
            return 'Thankless';
        }

        function getQuadrantColorClass(x, y) {
            if (x >= 3 && y >= 3) return 'bg-green-100 text-green-700';
            if (x < 3 && y >= 3) return 'bg-blue-100 text-blue-700';
            if (x >= 3 && y < 3) return 'bg-yellow-100 text-yellow-700';
            return 'bg-gray-200 text-gray-700';
        }

        // Detail Panel
        function openDetailPanel(taskId) {
            const task = state.tasks.find(t => t.task_id === taskId);
            if (!task) return;

            state.selectedTaskId = taskId;
            
            document.getElementById('detail-task-name').textContent = task.task_name;
            
            const descEl = document.getElementById('detail-description');
            if (task.description) {
                descEl.textContent = task.description;
                descEl.classList.remove('hidden');
            } else {
                descEl.classList.add('hidden');
            }

            document.getElementById('detail-ease-slider').value = task.x_score_final;
            document.getElementById('detail-ease-value').textContent = task.x_score_final;
            document.getElementById('detail-impact-slider').value = task.y_score_final;
            document.getElementById('detail-impact-value').textContent = task.y_score_final;

            const easeLlm = document.getElementById('detail-ease-llm').querySelector('span');
            const impactLlm = document.getElementById('detail-impact-llm').querySelector('span');
            easeLlm.textContent = task.x_score_llm ?? 'N/A';
            impactLlm.textContent = task.y_score_llm ?? 'N/A';

            const overrideBadge = document.getElementById('override-badge');
            const resetBtn = document.getElementById('reset-to-llm');
            if (task.human_override) {
                overrideBadge.classList.remove('hidden');
                resetBtn.classList.remove('hidden');
            } else {
                overrideBadge.classList.add('hidden');
                resetBtn.classList.add('hidden');
            }

            elements.detailPanel.classList.remove('hidden');
            elements.detailPanel.classList.add('fade-in');
            updateTaskList();
        }

        function closeDetailPanel() {
            elements.detailPanel.classList.add('hidden');
            state.selectedTaskId = null;
            updateTaskList();
        }

        function handleEaseChange(e) {
            const value = parseInt(e.target.value);
            document.getElementById('detail-ease-value').textContent = value;
            updateTaskScore('x', value);
        }

        function handleImpactChange(e) {
            const value = parseInt(e.target.value);
            document.getElementById('detail-impact-value').textContent = value;
            updateTaskScore('y', value);
        }

        function updateTaskScore(axis, value) {
            const task = state.tasks.find(t => t.task_id === state.selectedTaskId);
            if (!task) return;

            if (axis === 'x') {
                task.x_score_final = value;
            } else {
                task.y_score_final = value;
            }

            // Check if this is a human override
            if (task.x_score_llm != null && task.y_score_llm != null) {
                task.human_override = task.x_score_final !== task.x_score_llm || 
                                      task.y_score_final !== task.y_score_llm;
            } else {
                task.human_override = true;
            }

            const overrideBadge = document.getElementById('override-badge');
            const resetBtn = document.getElementById('reset-to-llm');
            if (task.human_override) {
                overrideBadge.classList.remove('hidden');
                resetBtn.classList.remove('hidden');
            } else {
                overrideBadge.classList.add('hidden');
                resetBtn.classList.add('hidden');
            }

            updateChart();
            updateTaskList();
            updateSummary();
        }

        function resetToLLMScore() {
            const task = state.tasks.find(t => t.task_id === state.selectedTaskId);
            if (!task || task.x_score_llm == null) return;

            task.x_score_final = task.x_score_llm;
            task.y_score_final = task.y_score_llm;
            task.human_override = false;

            document.getElementById('detail-ease-slider').value = task.x_score_final;
            document.getElementById('detail-ease-value').textContent = task.x_score_final;
            document.getElementById('detail-impact-slider').value = task.y_score_final;
            document.getElementById('detail-impact-value').textContent = task.y_score_final;

            document.getElementById('override-badge').classList.add('hidden');
            document.getElementById('reset-to-llm').classList.add('hidden');

            updateChart();
            updateTaskList();
            updateSummary();
            showToast('Reset to LLM score', 'success');
        }

        // Summary
        function updateSummary() {
            let quickWins = 0, majorProjects = 0, fillIns = 0, thankless = 0;

            state.tasks.forEach(task => {
                const x = task.x_score_final;
                const y = task.y_score_final;
                if (x >= 3 && y >= 3) quickWins++;
                else if (x < 3 && y >= 3) majorProjects++;
                else if (x >= 3 && y < 3) fillIns++;
                else thankless++;
            });

            document.getElementById('quick-wins-count').textContent = quickWins;
            document.getElementById('major-projects-count').textContent = majorProjects;
            document.getElementById('fill-ins-count').textContent = fillIns;
            document.getElementById('thankless-count').textContent = thankless;
        }

        // Step Indicators
        function updateStepIndicators(currentStep) {
            for (let i = 1; i <= 4; i++) {
                const indicator = document.getElementById('step' + i + '-indicator');
                const textSpan = indicator.nextElementSibling;
                
                indicator.classList.remove('step-active', 'step-completed', 'step-pending');
                
                if (i < currentStep) {
                    indicator.classList.add('step-completed');
                    indicator.innerHTML = '<i class="fas fa-check"></i>';
                    textSpan.classList.remove('text-gray-500');
                    textSpan.classList.add('text-gray-700');
                } else if (i === currentStep) {
                    indicator.classList.add('step-active');
                    indicator.textContent = i;
                    textSpan.classList.remove('text-gray-500');
                    textSpan.classList.add('text-gray-700');
                } else {
                    indicator.classList.add('step-pending');
                    indicator.textContent = i;
                    textSpan.classList.add('text-gray-500');
                    textSpan.classList.remove('text-gray-700');
                }
            }

            // Update progress bars
            for (let i = 1; i <= 3; i++) {
                const bar = document.getElementById('progress-' + i + '-' + (i+1));
                if (i < currentStep) {
                    bar.classList.add('bg-green-500');
                    bar.classList.remove('bg-gray-200');
                } else {
                    bar.classList.remove('bg-green-500');
                    bar.classList.add('bg-gray-200');
                }
            }
        }

        // Export Functions
        function exportChart() {
            const url = state.chart.getDataURL({
                type: 'png',
                pixelRatio: 2,
                backgroundColor: '#fff'
            });
            const a = document.createElement('a');
            a.href = url;
            a.download = 'task_scoring_chart.png';
            a.click();
        }

        function exportData() {
            const exportData = state.tasks.map(task => ({
                '과제명': task.task_name,
                '과제 설명': task.description || '',
                'Ease (X) - LLM': task.x_score_llm ?? 'N/A',
                'Impact (Y) - LLM': task.y_score_llm ?? 'N/A',
                'Ease (X) - Final': task.x_score_final,
                'Impact (Y) - Final': task.y_score_final,
                'Human Override': task.human_override ? 'Yes' : 'No',
                'Quadrant': getQuadrantName(task.x_score_final, task.y_score_final)
            }));

            const ws = XLSX.utils.json_to_sheet(exportData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Task Scores');
            XLSX.writeFile(wb, 'task_scores_export.xlsx');
        }

        // Toast
        function showToast(message, type = 'info') {
            const colors = {
                success: 'bg-green-600',
                error: 'bg-red-600',
                info: 'bg-gray-800'
            };
            
            elements.toast.className = 'fixed bottom-4 right-4 ' + colors[type] + ' text-white px-4 py-3 rounded-lg shadow-lg transform transition-all duration-300 z-50';
            elements.toastMessage.textContent = message;
            elements.toast.classList.remove('translate-y-20', 'opacity-0');
            
            setTimeout(() => {
                elements.toast.classList.add('translate-y-20', 'opacity-0');
            }, 3000);
        }
    </script>
</body>
</html>`;
}
