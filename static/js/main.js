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

            // 辅助函数：根据年份获取颜色
            function getColorByYear(year) {
                if (!year) return { background: '#e0e0e0', border: '#bdbdbd' }; // 灰色：未知年份
                if (year < 1800) return { background: '#FFB7B2', border: '#FF6F61' }; // 红色系：1800前
                if (year < 1900) return { background: '#FFDAC1', border: '#FF9F80' }; // 橙色系：19世纪
                if (year < 1950) return { background: '#E2F0CB', border: '#88B04B' }; // 绿色系：20世纪上半叶
                if (year < 2000) return { background: '#B5EAD7', border: '#009B77' }; // 青色系：20世纪下半叶
                return { background: '#C7CEEA', border: '#6B5B95' }; // 紫色系：2000后
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
                    
                    content = `
                        <h2>${person.name}</h2>
                        <div class="person-meta">
                            <p><strong>ID:</strong> ${person.id}</p>
                            ${school}
                            ${year}
                        </div>
                        ${dissertation}
                        ${advisorsHtml}
                    `;
                } else {
                    // 如果是未爬取的导师节点，尝试从 vis data 中获取基本信息
                    const nodeData = data.nodes.get(nodeId);
                    if (nodeData) {
                            content = `<h2>${nodeData.label}</h2><p><strong>ID:</strong> ${nodeId}</p><p><i>(Detailed data not available)</i></p>`;
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