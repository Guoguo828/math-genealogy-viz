document.addEventListener('DOMContentLoaded', function() {
    // 1. 请求数据
    fetch('/api/data')
        .then(response => response.json())
        .then(rawData => {
            const container = document.getElementById('mynetwork');
            
            // 2. 数据转换：将字典转换为 nodes 和 edges 数组
            const nodes = [];
            const edges = [];
            const addedNodes = new Set();

            // 辅助函数：根据年份获取颜色 (优化版)
            function getColorByYear(year) {
                if (!year) return { background: '#e0e0e0', border: '#bdbdbd' }; // 灰色：未知年份
                if (year < 1700) return { background: '#ff9a9e', border: '#ff758c' }; // 红色系：1700前
                if (year < 1800) return { background: '#fad0c4', border: '#f6a69f' }; // 橙红系：18世纪
                if (year < 1900) return { background: '#fbc2eb', border: '#d896cc' }; // 紫粉系：19世纪
                if (year < 1950) return { background: '#a18cd1', border: '#8571b3' }; // 紫色系：20世纪上半叶
                if (year < 2000) return { background: '#84fab0', border: '#6bd692' }; // 绿色系：20世纪下半叶
                return { background: '#8fd3f4', border: '#6bb5d6' }; // 蓝色系：2000后
            }

            for (const [id, person] of Object.entries(rawData)) {
                // 添加学生节点 (有详细数据的节点)
                if (!addedNodes.has(id)) {
                    // Use Chinese name if available for label, or append it
                    // Let's just use English name for label to keep graph clean, 
                    // but maybe show Chinese in title or search.
                    // User asked for "add Chinese translation", maybe they want to see it.
                    // Let's append it if it exists and is different.
                    let label = person.name;
                    if (person.name_zh && person.name_zh !== person.name) {
                        label += `\n(${person.name_zh})`;
                    }

                    nodes.push({ 
                        id: id, 
                        label: label, 
                        group: 'student',
                        title: `ID: ${id}\nYear: ${person.year || 'Unknown'}\nName: ${person.name_zh || ''}`, // 鼠标悬停显示
                        color: getColorByYear(person.year)
                    });
                    addedNodes.add(id);
                }

                // 处理导师关系
                if (person.advisors) {
                    person.advisors.forEach(advisor => {
                        // 确保导师节点也存在
                        if (!addedNodes.has(advisor.id)) {
                            let advisorYear = null;
                            let advisorLabel = advisor.name;
                            
                            // Check if we have full data for advisor to get Chinese name
                            if (rawData[advisor.id]) {
                                advisorYear = rawData[advisor.id].year;
                                if (rawData[advisor.id].name_zh && rawData[advisor.id].name_zh !== rawData[advisor.id].name) {
                                    advisorLabel += `\n(${rawData[advisor.id].name_zh})`;
                                }
                            }

                            nodes.push({ 
                                id: advisor.id, 
                                label: advisorLabel, 
                                group: 'advisor',
                                color: getColorByYear(advisorYear)
                            });
                            addedNodes.add(advisor.id);
                        }
                        
                        // 添加边：学生 -> 导师 (Student points to Teacher)
                        edges.push({ 
                            from: id, 
                            to: advisor.id, 
                            arrows: 'to'
                        });
                    });
                }
            }

            // 3. 配置 Vis.js 数据对象
            const data = {
                nodes: new vis.DataSet(nodes),
                edges: new vis.DataSet(edges)
            };

            // 优化2: 计算统计数据
            function calculateStats() {
                const totalScholars = nodes.length;
                let minYear = Infinity;
                const schoolCounts = {};

                nodes.forEach(node => {
                    // 从 rawData 获取更准确的年份和学校信息
                    const person = rawData[node.id];
                    if (person) {
                        if (person.year) {
                            minYear = Math.min(minYear, person.year);
                        }
                        if (person.school) {
                            schoolCounts[person.school] = (schoolCounts[person.school] || 0) + 1;
                        }
                    }
                });

                // 找到人数最多的学校
                let topSchool = "N/A";
                let maxCount = 0;
                for (const [school, count] of Object.entries(schoolCounts)) {
                    if (count > maxCount) {
                        maxCount = count;
                        topSchool = school;
                    }
                }

                document.getElementById('stat-total').textContent = totalScholars;
                document.getElementById('stat-year').textContent = minYear === Infinity ? "N/A" : minYear;
                document.getElementById('stat-school').textContent = topSchool;
            }
            calculateStats();

            const options = {
                nodes: {
                    shape: 'dot',
                    size: 20,
                    font: { 
                        size: 16,
                        face: 'arial',
                        background: 'rgba(255, 255, 255, 0.7)' 
                    },
                    borderWidth: 2,
                    shadow: true
                },
                edges: {
                    width: 2,
                    shadow: true,
                    smooth: {
                        type: 'cubicBezier',
                        forceDirection: 'vertical',
                        roundness: 0.4
                    }
                },
                layout: {
                    hierarchical: {
                        direction: "DU", // 下到上布局 (Down-Up): 学生在下，导师在上
                        sortMethod: "directed",
                        levelSeparation: 150, // 增加层级间距
                        nodeSpacing: 250,     // 增加节点间距，防止重叠
                        treeSpacing: 250,     // 树之间的间距
                        blockShifting: true,
                        edgeMinimization: true,
                        parentCentralization: true
                    }
                },
                interaction: {
                    dragNodes: false,
                    dragView: true,
                    zoomView: true,
                    hover: true,
                    navigationButtons: true, // 显示导航按钮
                    keyboard: true
                },
                physics: false
            };

            // 4. 渲染图表
            const network = new vis.Network(container, data, options);
            
            // Hide loading overlay when drawing is complete
            network.once("afterDrawing", function() {
                const overlay = document.getElementById('loading-overlay');
                if (overlay) {
                    overlay.style.opacity = '0';
                    setTimeout(() => {
                        overlay.style.display = 'none';
                    }, 500);
                }
            });

            // 优化1: 控制栏功能
            document.getElementById('reset-view-btn').addEventListener('click', () => {
                resetHighlight();
                currentDirection = "DU";
                options.layout.hierarchical.direction = currentDirection;
                network.setOptions(options);
                network.fit({ animation: true });
                searchInput.value = '';
                document.getElementById('details-container').style.display = 'none';
                document.getElementById('details-placeholder').style.display = 'block';
                document.getElementById('node-popup').style.display = 'none';
            });

            document.getElementById('fit-btn').addEventListener('click', () => {
                network.fit({ animation: true });
            });

            document.getElementById('export-btn').addEventListener('click', () => {
                const canvas = container.querySelector('canvas');
                const link = document.createElement('a');
                link.download = 'genealogy-tree.png';
                link.href = canvas.toDataURL();
                link.click();
            });

            // 优化4: 布局切换
            let currentDirection = "DU"; // 默认 Down-Up
            document.getElementById('layout-btn').addEventListener('click', () => {
                // 切换方向: DU -> UD -> LR -> RL -> DU
                if (currentDirection === "DU") currentDirection = "UD";
                else if (currentDirection === "UD") currentDirection = "LR";
                else if (currentDirection === "LR") currentDirection = "RL";
                else currentDirection = "DU";

                options.layout.hierarchical.direction = currentDirection;
                network.setOptions(options);
                network.fit({ animation: true });
            });

            const resetBtn = document.getElementById('reset-highlight-btn');
            resetBtn.addEventListener('click', () => {
                resetHighlight();
            });

            // 优化3: 智能高亮 (Lineage Tracing)
            let highlightActive = false;

            function highlightLineage(selectedNodeId) {
                let allNodes = data.nodes.get();
                const allEdges = data.edges.get();
                
                // Ensure originalColor is saved for all nodes
                const updatesForOriginalColor = [];
                allNodes = allNodes.map(node => {
                    if (!node.originalColor) {
                        node.originalColor = node.color;
                        updatesForOriginalColor.push({id: node.id, originalColor: node.color});
                    }
                    return node;
                });
                
                if (updatesForOriginalColor.length > 0) {
                    data.nodes.update(updatesForOriginalColor);
                }
                
                // 找出所有相关的节点（祖先和后代）
                // 这里简化处理：只高亮直接连接的节点，或者遍历整个图
                // 为了更好的效果，我们遍历找出所有上下游
                
                const connectedNodeIds = new Set([selectedNodeId]);
                const connectedEdgeIds = new Set();

                // 向上追溯 (Advisors)
                const queueUp = [selectedNodeId];
                while(queueUp.length > 0) {
                    const curr = queueUp.pop();
                    // 找到指向 curr 的边 (from student to advisor, so edge.from == curr)
                    // 我们的边是 from student to advisor
                    const outgoingEdges = allEdges.filter(e => e.from === curr);
                    outgoingEdges.forEach(e => {
                        connectedEdgeIds.add(e.id);
                        if (!connectedNodeIds.has(e.to)) {
                            connectedNodeIds.add(e.to);
                            queueUp.push(e.to);
                        }
                    });
                }

                // 向下追溯 (Students)
                const queueDown = [selectedNodeId];
                while(queueDown.length > 0) {
                    const curr = queueDown.pop();
                    // 找到指向 curr 的边 (edge.to == curr)
                    const incomingEdges = allEdges.filter(e => e.to === curr);
                    incomingEdges.forEach(e => {
                        connectedEdgeIds.add(e.id);
                        if (!connectedNodeIds.has(e.from)) {
                            connectedNodeIds.add(e.from);
                            queueDown.push(e.from);
                        }
                    });
                }

                // 更新节点样式
                const updateArray = [];
                allNodes.forEach(node => {
                    if (connectedNodeIds.has(node.id)) {
                        updateArray.push({
                            id: node.id, 
                            color: { 
                                background: node.originalColor.background,
                                border: node.originalColor.border
                            },
                            opacity: 1
                        });
                    } else {
                        updateArray.push({
                            id: node.id, 
                            color: { background: '#e0e0e0', border: '#cccccc' },
                            opacity: 0.4
                        });
                    }
                });
                data.nodes.update(updateArray);
                
                highlightActive = true;
                resetBtn.style.display = 'inline-block';
            }

            function resetHighlight() {
                if (!highlightActive) return;
                
                const allNodes = data.nodes.get();
                const updateArray = allNodes.map(node => {
                    return {
                        id: node.id,
                        color: node.originalColor || node.color,
                        opacity: 1
                    };
                });
                data.nodes.update(updateArray);
                
                highlightActive = false;
                resetBtn.style.display = 'none';
            }

            // --- 功能函数：更新详情面板 ---
            function updateDetails(nodeId) {
                const person = rawData[nodeId];
                const detailsContainer = document.getElementById('details-container');
                const placeholder = document.getElementById('details-placeholder');
                
                // 显示内容区域，隐藏占位符
                placeholder.style.display = 'none';
                detailsContainer.style.display = 'block';
                
                let content = '';
                if (person) {
                    // 构建更丰富的详情内容
                    const school = person.school ? `<p><strong>School:</strong> ${person.school}</p>` : '';
                    const year = person.year ? `<p><strong>Year:</strong> ${person.year}</p>` : '';
                    const dissertation = person.dissertation ? `<p><strong>Dissertation:</strong> <i>${person.dissertation}</i></p>` : '';
                    
                    // Display Chinese name if available
                    const nameDisplay = (person.name_zh && person.name_zh !== person.name) 
                        ? `${person.name}<br><span style="font-size: 0.85rem; color: #666; font-weight: normal;">${person.name_zh}</span>`
                        : person.name;

                    let advisorsHtml = '';
                    if (person.advisors && person.advisors.length > 0) {
                        advisorsHtml = '<h3>Advisors:</h3><ul>' + 
                            person.advisors.map(a => `<li>${a.name}</li>`).join('') + 
                            '</ul>';
                    }

                    let studentsHtml = '';
                    if (person.students && person.students.length > 0) {
                        studentsHtml = '<h3>Students (Top 3):</h3><ul>' + 
                            person.students.map(s => `<li>${s.name}</li>`).join('') + 
                            '</ul>';
                    }
                    
                    content = `
                        <h2>${nameDisplay}</h2>
                        <div class="person-meta">
                            <p><strong>ID:</strong> ${person.id}</p>
                            ${school}
                            ${year}
                        </div>
                        ${dissertation}
                        <div style="margin-top: 10px;">
                            <a href="https://www.mathgenealogy.org/id.php?id=${person.id}" target="_blank" class="external-link-btn">
                                🔗 View on Math Genealogy Project
                            </a>
                        </div>
                        ${advisorsHtml}
                        ${studentsHtml}
                        <button id="view-full-details-btn" class="view-details-btn" data-id="${person.id}">View Full Details</button>
                    `;
                } else {
                    // 如果是未爬取的导师节点，尝试从 vis data 中获取基本信息
                    const nodeData = data.nodes.get(nodeId);
                    if (nodeData) {
                            content = `
                                <h2>${nodeData.label}</h2>
                                <p><strong>ID:</strong> ${nodeId}</p>
                                <div style="margin-top: 10px;">
                                    <a href="https://www.mathgenealogy.org/id.php?id=${nodeId}" target="_blank" class="external-link-btn">
                                        🔗 View on Math Genealogy Project
                                    </a>
                                </div>
                                <p><i>(Detailed data not available)</i></p>
                            `;
                    }
                }
                detailsContainer.innerHTML = content;

                // Bind click event for View Details button
                const viewBtn = document.getElementById('view-full-details-btn');
                if (viewBtn) {
                    viewBtn.addEventListener('click', function() {
                        const id = this.getAttribute('data-id');
                        openModal(rawData[id]);
                    });
                }
            }

            // --- Modal Logic ---
            const modal = document.getElementById("details-modal");
            const closeModalSpan = document.getElementsByClassName("close-modal")[0];

            function openModal(person) {
                if (!person) return;

                const nameDisplay = (person.name_zh && person.name_zh !== person.name) 
                    ? `${person.name} (${person.name_zh})`
                    : (person.name || 'Unknown');

                document.getElementById('modal-name').textContent = nameDisplay;
                document.getElementById('modal-id').textContent = person.id || '-';
                document.getElementById('modal-year').textContent = person.year || '-';
                document.getElementById('modal-school').textContent = person.school || '-';
                document.getElementById('modal-hindex').textContent = person.h_index || '-';
                document.getElementById('modal-citations').textContent = person.total_citations || '-';
                document.getElementById('modal-affiliation').textContent = person.affiliation || '-';
                document.getElementById('modal-wiki').textContent = person.wiki_intro || 'No biography available.';

                // Image handling
                const img = document.getElementById('modal-image');
                if (person.image_path && person.image_path !== "无图片") {
                    const filename = person.image_path.split('\\').pop().split('/').pop();
                    img.src = `/images/${filename}`;
                    img.style.display = 'block';
                } else {
                    img.src = 'https://via.placeholder.com/300x400?text=No+Image';
                }

                // Papers
                const papersList = document.getElementById('modal-papers');
                papersList.innerHTML = '';
                if (person.top_papers && person.top_papers !== "未找到学术数据") {
                    const papers = person.top_papers.split('\n').filter(p => p.trim() !== '');
                    papers.forEach(p => {
                        const li = document.createElement('li');
                        li.textContent = p;
                        papersList.appendChild(li);
                    });
                } else {
                    const li = document.createElement('li');
                    li.textContent = 'No papers listed.';
                    papersList.appendChild(li);
                }

                // Links
                const linksContainer = document.getElementById('modal-links');
                linksContainer.innerHTML = '';
                if (person.source_link) {
                    const links = person.source_link.split('\n').filter(l => l.trim() !== '');
                    links.forEach(link => {
                        const a = document.createElement('a');
                        a.href = link;
                        a.target = '_blank';
                        a.textContent = link;
                        a.style.display = 'block';
                        a.style.marginBottom = '5px';
                        a.style.wordBreak = 'break-all';
                        linksContainer.appendChild(a);
                    });
                }

                // Add Advisors and Students to Modal for Navigation
                // We'll append them to the info-grid or a new section
                // Let's check if we already have a container for them in HTML.
                // The HTML structure is fixed in index.html.
                // We can dynamically add a section to .modal-info if needed, or just reuse existing logic.
                // But wait, the modal HTML structure I added earlier didn't have Advisors/Students sections.
                // I should add them.
                
                // Let's create a new section for Relations if it doesn't exist
                let relationsSection = document.getElementById('modal-relations');
                if (!relationsSection) {
                    relationsSection = document.createElement('div');
                    relationsSection.id = 'modal-relations';
                    relationsSection.className = 'info-section';
                    // Insert before Links
                    const linksSection = linksContainer.parentElement; // .info-section
                    linksSection.parentElement.insertBefore(relationsSection, linksSection);
                }
                
                let relationsHtml = '<h3>Academic Relations</h3><div class="info-grid">';
                
                // Advisors
                if (person.advisors && person.advisors.length > 0) {
                    relationsHtml += '<div class="info-item"><label>Advisors</label>';
                    person.advisors.forEach(a => {
                        relationsHtml += `<div><a href="#" class="modal-nav-link" data-id="${a.id}">${a.name}</a></div>`;
                    });
                    relationsHtml += '</div>';
                }
                
                // Students
                if (person.students && person.students.length > 0) {
                    relationsHtml += '<div class="info-item"><label>Students</label>';
                    person.students.forEach(s => {
                        relationsHtml += `<div><a href="#" class="modal-nav-link" data-id="${s.id}">${s.name}</a></div>`;
                    });
                    relationsHtml += '</div>';
                }
                relationsHtml += '</div>';
                relationsSection.innerHTML = relationsHtml;

                // Bind click events for navigation
                const navLinks = relationsSection.querySelectorAll('.modal-nav-link');
                navLinks.forEach(link => {
                    link.addEventListener('click', (e) => {
                        e.preventDefault();
                        const targetId = link.getAttribute('data-id');
                        modal.style.display = "none"; // Close modal
                        
                        // Navigate to node
                        // Check if node exists in dataset
                        if (data.nodes.get(targetId)) {
                            network.selectNodes([targetId]);
                            updateDetails(targetId);
                            focusNode(targetId);
                            highlightLineage(targetId);
                        } else {
                            alert("Node not found in the current graph.");
                        }
                    });
                });

                modal.style.display = "block";
            }

            closeModalSpan.onclick = function() {
                modal.style.display = "none";
            }

            window.onclick = function(event) {
                if (event.target == modal) {
                    modal.style.display = "none";
                }
            }

            // --- 功能函数：聚焦节点 ---
            function focusNode(nodeId) {
                network.focus(nodeId, {
                    scale: 1.5,
                    animation: {
                        duration: 1000,
                        easingFunction: "easeInOutQuad"
                    }
                });
            }

            // 5. 事件监听：点击节点显示详情并聚焦
            network.on("click", function (params) {
                const popup = document.getElementById('node-popup');
                
                if (params.nodes.length > 0) {
                    const nodeId = params.nodes[0];
                    updateDetails(nodeId);
                    focusNode(nodeId);
                    highlightLineage(nodeId); // 触发高亮

                    // 优化: 显示悬浮框
                    const person = rawData[nodeId];
                    if (person) {
                        popup.innerHTML = `
                            <h3>${person.name}</h3>
                            <p>🏫 ${person.school || 'Unknown School'}</p>
                            <p>📅 ${person.year || 'Unknown Year'}</p>
                        `;
                        
                        // 获取节点在 DOM 中的位置
                        const domCoords = network.canvasToDOM(network.getPositions([nodeId])[nodeId]);
                        
                        // 设置位置 (稍微偏移一点，避免遮挡节点)
                        popup.style.left = (domCoords.x + 20) + 'px';
                        popup.style.top = (domCoords.y - 20) + 'px';
                        popup.style.display = 'block';
                    } else {
                        // 对于没有详细数据的节点，显示基本信息
                        const nodeData = data.nodes.get(nodeId);
                        popup.innerHTML = `
                            <h3>${nodeData.label}</h3>
                            <p>ID: ${nodeId}</p>
                        `;
                        const domCoords = network.canvasToDOM(network.getPositions([nodeId])[nodeId]);
                        popup.style.left = (domCoords.x + 20) + 'px';
                        popup.style.top = (domCoords.y - 20) + 'px';
                        popup.style.display = 'block';
                    }

                } else {
                    // 点击空白处重置
                    resetHighlight();
                    popup.style.display = 'none';
                }
            });

            // 拖拽或缩放时隐藏悬浮框
            network.on("dragStart", function() {
                document.getElementById('node-popup').style.display = 'none';
            });
            network.on("zoom", function() {
                document.getElementById('node-popup').style.display = 'none';
            });

            // 6. 搜索功能实现 (Enhanced with Fuse.js)
            const searchInput = document.getElementById('search-input');
            const searchBtn = document.getElementById('search-btn');

            // Prepare data for Fuse.js
            const searchData = Object.values(rawData).map(p => ({
                id: p.id,
                name: p.name,
                name_zh: p.name_zh || '',
                school: p.school || '',
                year: p.year ? p.year.toString() : ''
            }));

            const fuseOptions = {
                keys: ['name', 'name_zh', 'school', 'id'],
                threshold: 0.3, // Fuzzy match threshold
                distance: 100
            };
            const fuse = new Fuse(searchData, fuseOptions);

            function performSearch() {
                const query = searchInput.value.trim();
                if (!query) return;

                const results = fuse.search(query);

                if (results.length > 0) {
                    const foundItem = results[0].item;
                    // 选中节点
                    network.selectNodes([foundItem.id]);
                    // 更新详情
                    updateDetails(foundItem.id);
                    // 聚焦节点
                    focusNode(foundItem.id);
                    highlightLineage(foundItem.id);
                } else {
                    alert('Mathematician not found!');
                }
            }

            searchBtn.addEventListener('click', performSearch);
            searchInput.addEventListener('keypress', function (e) {
                if (e.key === 'Enter') {
                    performSearch();
                }
            });

            // --- Statistics Charts ---
            const statsBtn = document.getElementById('stats-btn');
            const statsModal = document.getElementById('stats-modal');
            const closeStatsSpan = document.getElementById('close-stats');

            statsBtn.addEventListener('click', () => {
                statsModal.style.display = 'block';
                renderCharts();
            });

            closeStatsSpan.onclick = function() {
                statsModal.style.display = "none";
            }

            window.onclick = function(event) {
                if (event.target == statsModal) {
                    statsModal.style.display = "none";
                }
                if (event.target == modal) { // Existing modal
                    modal.style.display = "none";
                }
            }

            let chartsRendered = false;
            function renderCharts() {
                if (chartsRendered) return;

                // 1. Years Distribution
                const years = [];
                Object.values(rawData).forEach(p => {
                    if (p.year) years.push(p.year);
                });
                // Group by century
                const centuries = {};
                years.forEach(y => {
                    const c = Math.floor(y / 100) * 100;
                    const label = `${c}s`;
                    centuries[label] = (centuries[label] || 0) + 1;
                });
                // Sort
                const sortedCenturies = Object.keys(centuries).sort();
                const centuryData = sortedCenturies.map(c => centuries[c]);

                new Chart(document.getElementById('chart-years'), {
                    type: 'bar',
                    data: {
                        labels: sortedCenturies,
                        datasets: [{
                            label: 'Scholars Count',
                            data: centuryData,
                            backgroundColor: '#4a90e2'
                        }]
                    },
                    options: { responsive: true }
                });

                // 2. Top Schools
                const schools = {};
                Object.values(rawData).forEach(p => {
                    if (p.school) {
                        // Normalize school name slightly
                        const s = p.school.trim();
                        schools[s] = (schools[s] || 0) + 1;
                    }
                });
                const sortedSchools = Object.entries(schools)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 10);
                
                new Chart(document.getElementById('chart-schools'), {
                    type: 'bar',
                    data: {
                        labels: sortedSchools.map(s => s[0]),
                        datasets: [{
                            label: 'Scholars Count',
                            data: sortedSchools.map(s => s[1]),
                            backgroundColor: '#6bd692'
                        }]
                    },
                    options: { 
                        indexAxis: 'y',
                        responsive: true 
                    }
                });

                // 3. Geographic Distribution (Continent)
                const continents = {};
                Object.values(rawData).forEach(p => {
                    const c = p.continent || 'Unknown';
                    continents[c] = (continents[c] || 0) + 1;
                });
                
                new Chart(document.getElementById('chart-continents'), {
                    type: 'doughnut',
                    data: {
                        labels: Object.keys(continents),
                        datasets: [{
                            data: Object.values(continents),
                            backgroundColor: [
                                '#ff9a9e', '#fad0c4', '#fbc2eb', '#a18cd1', '#84fab0', '#8fd3f4', '#e0e0e0'
                            ]
                        }]
                    },
                    options: { responsive: true }
                });

                chartsRendered = true;
            }
        })
        .catch(error => console.error('Error loading the genealogy data:', error));
});