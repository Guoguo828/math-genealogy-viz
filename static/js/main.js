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
                    nodes.push({ 
                        id: id, 
                        label: person.name, 
                        group: 'student',
                        title: `ID: ${id}\nYear: ${person.year || 'Unknown'}`, // 鼠标悬停显示
                        color: getColorByYear(person.year)
                    });
                    addedNodes.add(id);
                }

                // 处理导师关系
                if (person.advisors) {
                    person.advisors.forEach(advisor => {
                        // 确保导师节点也存在
                        if (!addedNodes.has(advisor.id)) {
                            // 尝试从 rawData 中查找导师的详细信息（如果存在）以获取年份
                            // 注意：当前的 JSON 结构中，advisor 只是一个简单的对象 {id, name}，
                            // 除非它也是 rawData 的一个键。
                            // 如果导师也是 rawData 的一个键，我们会在主循环中处理它。
                            // 但为了防止它还没被处理就被作为 advisor 添加了，我们需要检查。
                            
                            let advisorYear = null;
                            if (rawData[advisor.id]) {
                                advisorYear = rawData[advisor.id].year;
                            }

                            nodes.push({ 
                                id: advisor.id, 
                                label: advisor.name, 
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

            // 优化1: 控制栏功能
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
                const allNodes = data.nodes.get();
                const allEdges = data.edges.get();
                
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
                                background: node.originalColor ? node.originalColor.background : undefined,
                                border: node.originalColor ? node.originalColor.border : undefined
                            },
                            opacity: 1
                        });
                    } else {
                        // 保存原始颜色以便恢复
                        if (!node.originalColor) {
                            node.originalColor = node.color;
                        }
                        updateArray.push({
                            id: node.id, 
                            color: { background: '#eeeeee', border: '#dddddd' },
                            opacity: 0.1
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
                
                let content = '';
                if (person) {
                    // 构建更丰富的详情内容
                    const school = person.school ? `<p><strong>School:</strong> ${person.school}</p>` : '';
                    const year = person.year ? `<p><strong>Year:</strong> ${person.year}</p>` : '';
                    const dissertation = person.dissertation ? `<p><strong>Dissertation:</strong> <i>${person.dissertation}</i></p>` : '';
                    
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
                        <h2>${person.name}</h2>
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
                if (params.nodes.length > 0) {
                    const nodeId = params.nodes[0];
                    updateDetails(nodeId);
                    focusNode(nodeId);
                    highlightLineage(nodeId); // 触发高亮
                } else {
                    // 点击空白处重置
                    resetHighlight();
                }
            });

            // 6. 搜索功能实现
            const searchInput = document.getElementById('search-input');
            const searchBtn = document.getElementById('search-btn');

            function performSearch() {
                const query = searchInput.value.trim().toLowerCase();
                if (!query) return;

                const allNodes = data.nodes.get();
                // 模糊匹配：查找名字中包含查询字符串的节点
                const foundNode = allNodes.find(node => node.label.toLowerCase().includes(query));

                if (foundNode) {
                    // 选中节点
                    network.selectNodes([foundNode.id]);
                    // 更新详情
                    updateDetails(foundNode.id);
                    // 聚焦节点
                    focusNode(foundNode.id);
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
        })
        .catch(error => console.error('Error loading the genealogy data:', error));
});